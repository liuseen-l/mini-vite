import path from 'node:path'
import fs from 'node:fs'
import { type ResolvedConfig } from 'vite'
import esbuild from 'esbuild'
import type { Plugin } from 'esbuild'
import { EXTERNAL_TYPES } from '../constants'

function esbuildScanPlugin(
  // container: PluginContainer,
  depImports: Record<string, string>,
): Plugin {
  // const seen = new Map<string, string | undefined>()

  // const resolve = async (
  //   id: string,
  //   importer?: string,
  //   options?: any,
  // ) => {
  //   const key = id + (importer && path.dirname(importer))
  //   if (seen.has(key))
  //     return seen.get(key)

  //   const resolved = await container.resolveId(
  //     id,
  //     importer && normalizePath(importer),
  //     {
  //       ...options,
  //       scan: true,
  //     },
  //   )
  //   const res = resolved?.id
  //   seen.set(key, res)
  //   return res
  // }

  return {
    name: 'vite:dep-scan',
    setup(build) {
      // 忽略的文件类型
      build.onResolve(
        { filter: new RegExp(`\\.(${EXTERNAL_TYPES.join('|')})$`) },
        (resolveInfo) => {
          return {
            path: resolveInfo.path,
            external: true,
          }
        },
      )
      // 记录依赖
      build.onResolve(
        {
          filter: /^[\w@][^:]/,
        },
        (resolveInfo) => {
          const { path: id } = resolveInfo
          // 排除了react/jsx-runtime
          if (!id.includes('/'))
            depImports[id] = id
          return {
            path: id,
            external: true,
          }
        },
      )
    },
  }
}

export function scanImports(config: ResolvedConfig): {
  result: Promise<{
    deps: Record<string, string>
    missing: Record<string, string>
  }>
} {
  const deps: Record<string, string> = {}
  // 生成扫描后的esbuild上下文
  const esbuildContext = prepareEsbuildScanner(config, deps)
  const result = esbuildContext.then((context) => {
    // context实例上调用rebuild方法，返回promise，promise的值为扫描到的所有依赖deps
    function disposeContext() {
      return context?.dispose().catch((e: Error) => {
        config.logger.error('Failed to dispose esbuild context', { error: e })
      })
    }
    return context
      .rebuild()
      .then(() => {
        return {
          deps,
        }
      })
      .finally(() => {
        return disposeContext()
      })
  })

  return {
    result,
  }
}

async function prepareEsbuildScanner(
  config: ResolvedConfig,
  deps: Record<string, string>,
): Promise<any | undefined> {
  // const container = await createPluginContainer(config)
  // const plugin = esbuildScanPlugin(container, deps)

  // 生成esbuild插件，用于记录项目当中的三方依赖
  const plugin = esbuildScanPlugin(deps)

  let entry = ''
  // 我们这里找一下入口，优先级为ts tsx js
  for (const i of ['ts', 'tsx', 'js']) {
    const entryPath = path.resolve(config.root, `src/main.${i}`)
    if (fs.existsSync(entryPath)) {
      entry = entryPath
      break
    }
  }

  return await esbuild.context({
    absWorkingDir: process.cwd(),
    entryPoints: [entry],
    write: false,
    bundle: true,
    plugins: [plugin],
  })
}
