import path from 'node:path'
import { createRequire } from 'node:module'
import type { ExportSpecifier } from 'es-module-lexer'
import { init, parse } from 'es-module-lexer'
import type { Loader, Plugin } from 'esbuild'
import resolve from 'resolve'
import fs from 'fs-extra'
import { BARE_IMPORT_RE } from '../constants'
import { normalizePath } from '../utils'

const _require = createRequire(import.meta.url)
export function preBundlePlugin(deps: Record<string, string>): Plugin {
  return {
    name: 'esbuild:pre-bundle',
    setup(build) {
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id, importer } = resolveInfo
          const isEntry = !importer
          console.log(id)

          // 命中需要预编译的依赖
          if (Object.values(deps).includes(id)) {
            // 若为入口，则标记 dep 的 namespace

            return isEntry
              ? {
                  path: id,
                  namespace: 'dep',
                }
              : {
                // 因为走到 onResolve 了，所以这里的 path 就是绝对路径了
                  path: resolve.sync(id, { basedir: process.cwd() }),
                }
          }
        },
      )

      // 拿到标记后的依赖，构造代理模块，交给 esbuild 打包
      build.onLoad(
        {
          filter: /.*/,
          namespace: 'dep',
        },
        async (loadInfo) => {
          await init
          const id = loadInfo.path

          const root = process.cwd()
          // console.log(root)

          // 获取到模块的node_modules路径
          const entryPath = normalizePath(resolve.sync(id, { basedir: root }))

          const code = await fs.readFile(entryPath, 'utf-8')

          // 解析这个模块的文件，看看导入和导出，对于它的导入我们也要构建
          const [imports, exports] = await parse(code)
          const proxyModule = []
          // cjs
          // eslint-disable-next-line antfu/no-cjs-exports
          if (!imports.length && !exports.length) {
            const res = _require(entryPath)
            const specifiers = Object.keys(res)
            proxyModule.push(
              `export { ${specifiers.join(',')} } from "${entryPath}"`,
              // `export default ("${entryPath}")`,
            )
          }
          else {
            // eslint-disable-next-line antfu/no-cjs-exports
            if (exports.includes('default' as any as ExportSpecifier))
              proxyModule.push(`import d from "${entryPath}";export default d`)

            proxyModule.push(`export * from "${entryPath}"`)
          }
          const loader = path.extname(entryPath).slice(1)

          return {
            loader: loader as Loader,
            contents: proxyModule.join('\n'),
            resolveDir: root,
          }
        },
      )
    },
  }
}
