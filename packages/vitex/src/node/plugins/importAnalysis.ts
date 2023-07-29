// 新建 src/node/plugins/importAnalysis.ts
import path from 'node:path'
import { init, parse } from 'es-module-lexer'
import MagicString from 'magic-string'
import type { Plugin, ViteDevServer } from 'vite'
import {
  cleanUrl,
  getShortName,
  isInternalRequest,
  isJSRequest,
  normalizePath,
} from '../utils'
import { BARE_IMPORT_RE, CLIENT_PUBLIC_PATH, PRE_BUNDLE_DIR } from '../constants'

// 在esbuildPlugin将 tsx ts 转换为浏览器可以识别的语法之后，是不是就可以直接返回给浏览器执行了呢？
// 显然不是，我们还考虑如下的一些问题:
// 对于第三方依赖路径(bare import)，需要重写为预构建产物路径；
// 对于绝对路径和相对路径，需要借助之前的路径解析插件进行解析。
export function importAnalysisPlugin(): Plugin {
  let serverContext: ViteDevServer
  return {
    name: 'vitex:import-analysis',
    configureServer(s) {
      // 保存服务端上下文
      serverContext = s
    },
    // id是绝对路径
    async transform(code: string, id: string) {
      // 只处理 JS 相关的请求
      if (!isJSRequest(id) || isInternalRequest(id))
        return null

      await init
      // 解析 import 语句
      const [imports] = parse(code)
      const ms = new MagicString(code)
      const resolve = async (id: string, importer?: string) => {
        const resolved = await serverContext.pluginContainer.resolveId(
          id,
          normalizePath(importer!),
        )
        if (!resolved)
          return

        const cleanedId = cleanUrl(resolved as any as string)
        const mod = moduleGraph.getModuleById(cleanedId)

        let resolvedId = `/${getShortName(resolved as any as string, serverContext.config.root)}`

        if (mod && mod.lastHMRTimestamp > 0)
          resolvedId += `?t=${mod.lastHMRTimestamp}`

        return resolvedId
      }

      const { moduleGraph } = serverContext
      const curMod = moduleGraph.getModuleById(id)!
      const importedModules = new Set<string>()

      // 对每一个 import 语句依次进行分析
      for (const importInfo of imports) {
        // 举例说明: const str = `import React from 'react'`
        // str.slice(s, e) => 'react'
        const { s: modStart, e: modEnd, n: modSource } = importInfo
        if (!modSource)
          continue
        // 静态资源，解析到当前代码中含有svg图片，重写路径返回类似于/src/logo.svg?import
        if (modSource.endsWith('.svg')) {
          // 加上 ?import 后缀，并将window改为unix风格，且改为绝对路径
          const resolvedUrl = await resolve(modSource, id)
          ms.overwrite(modStart, modEnd, `${resolvedUrl}?import`)
          continue
        }
        // // 第三方库: 路径重写到预构建产物的路径
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join('/', PRE_BUNDLE_DIR, `${modSource}.js`),
          )
          importedModules.add(bundlePath)
          // 重写三方库路径
          ms.overwrite(modStart, modEnd, bundlePath)
        }
        else if (modSource.startsWith('.') || modSource.startsWith('/')) {
          // 直接调用插件上下文的 resolve 方法，会自动经过路径解析插件的处理
          const resolved = await resolve(modSource, id) as any as string
          if (resolved) {
            // 重写业务代码路径，将相对路径转为项目绝对路径，./src/main.ts -> /src/main.ts
            ms.overwrite(modStart, modEnd, resolved)
            importedModules.add(resolved)
          }
        }
      }

      // 只对业务源码注入
      if (!id.includes('node_modules')) {
        // 注入 HMR 相关的工具函数
        ms.prepend(
          `import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";`
          + `import.meta.hot = __vite__createHotContext(${JSON.stringify(
            cleanUrl(curMod.url),
          )});`,
        )
      }

      // 比如/src/main.ts 引入了2个文件，那么这两件个文件都会被添加到 main.ts模块中的importModules当中
      (moduleGraph as any).updateModuleInfo(curMod, importedModules)

      return {
        code: ms.toString(),
        // 生成 SourceMap
        map: ms.generateMap(),
      }
    },
  }
}
