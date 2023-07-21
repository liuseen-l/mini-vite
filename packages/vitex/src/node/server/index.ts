import type { InlineConfig, ViteDevServer, ModuleGraph as _ModuleGraph } from 'vite'
import connect from 'connect'
import { initDepsOptimizer } from '../../node/optimizer/optimizer'
import { resolveConfig } from '../config'

// import { indexHtmlMiddware } from './middlewares/indexHtml'
import { ModuleGraph } from '../moduleGraph'
import { createPluginContainer } from './pluginContainer'
import { transformMiddleware } from './middlewares/transform'
import { serveStaticMiddleware } from './middlewares/static'

export function createServer(inlineConfig: InlineConfig = {}): Promise<Partial<ViteDevServer>> {
  return _createServer(inlineConfig)
}

export async function _createServer(
  inlineConfig: InlineConfig = {},
) {
  const config = await resolveConfig(inlineConfig)

  // 依赖预构建
  const initServer = async () => {
    return (async function () {
      // 依赖预构建入口
      await initDepsOptimizer(config)
    })()
  }
  initServer()

  // 生成服务器实例
  const middlewares = connect()

  // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  let server: Partial<ViteDevServer> = {
    middlewares,
    config, // 将配置文件挂在server上
  }

  // 生成插件容器，通过调用容器方法，调用各个插件的钩子
  const container = createPluginContainer(config)

  const moduleGraph = new ModuleGraph(url => container.resolveId(url)) as any as _ModuleGraph

  server = {
    ...server,
    moduleGraph,
    pluginContainer: container as any,
  }

  // 执行configServer钩子
  for (const plugin of config.plugins) {
    if (plugin.configureServer)
      await (plugin as any).configureServer(server)
  }

  // 注册中间件
  middlewares.use(transformMiddleware(server))
  // middlewares.use(indexHtmlMiddware(server))
  middlewares.use(serveStaticMiddleware())

  return server
}
