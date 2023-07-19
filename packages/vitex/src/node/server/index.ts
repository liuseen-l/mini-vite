import type { InlineConfig, ViteDevServer } from 'vite'
import connect from 'connect'

// import { initDepsOptimizer } from '../../node/optimizer/optimizer'
import { resolveConfig } from '../config'

// import { indexHtmlMiddware } from './middlewares/indexHtml'
import { createPluginContainer } from './pluginContainer'
import { transformMiddleware } from './middlewares/transform'
import { serveStaticMiddleware } from './middlewares/static'

export function createServer(inlineConfig: InlineConfig = {}): Promise<Partial<ViteDevServer> > {
  return _createServer(inlineConfig)
}

export async function _createServer(
  inlineConfig: InlineConfig = {},
) {
  const config = await resolveConfig(inlineConfig)

  // const initServer = async () => {
  //   return (async function () {
  //     // 依赖预构建入口
  //     await initDepsOptimizer(config)
  //   })()
  // }
  // initServer()

  const middlewares = connect()

  // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  let server: Partial<ViteDevServer> = {
    middlewares,
    config,
  }

  const container = createPluginContainer(config)

  server = {
    ...server,
    pluginContainer: container as any,
  }

  //
  for (const plugin of config.plugins) {
    if (plugin.configureServer)
      await (plugin as any).configureServer(server)
  }

  middlewares.use(transformMiddleware(server))
  // middlewares.use(indexHtmlMiddware(server))
  middlewares.use(serveStaticMiddleware())

  return server
}
