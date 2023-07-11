// import path from 'node:path'

// import { resolvePlugins } from '../plugins'
import type { InlineConfig } from 'vite'
import { resolveConfig } from '../config'
import { initDepsOptimizer } from '../../node/optimizer/optimizer'

// import { resolveConfig } from '../config'

// import { transformMiddleware } from './middlewares/transform'

// import { createPluginContainer } from './pluginContainer'

export function createServer(inlineConfig: InlineConfig = {}): Promise<void> {
  return _createServer(inlineConfig, { ws: true })
}

export async function _createServer(
  inlineConfig: InlineConfig = {},
  options: { ws: boolean },
) {
  const config = await resolveConfig(inlineConfig)
  console.log(config)

  let initingServer: Promise<void> | undefined
  const initServer = async () => {
    initingServer = (async function () {
      // await container.buildStart({})
      // start deps optimizer after all container plugins are ready
      // 依赖预构建入口
      await initDepsOptimizer(config)
      initingServer = undefined
    })()
    return initingServer
  }

  // if (!config)
  //   return

  // const plugins = [...(config.plugins || []), ...resolvePlugins()]
  // const app = connect()

  // // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  // let server: ViteDevServer = {
  //   plugins,
  //   app,
  //   config,
  //   root: path.resolve(__dirname, '../../../playground'),
  // }

  // const container = createPluginContainer(server)

  // server = {
  //   ...server,
  //   pluginContainer: container,
  // }

  // app.use(transformMiddleware(server))

  // for (const plugin of plugins) plugin?.configureServer?.(server)

  // app.listen(3000, () => {
  //   console.log('服务启动')
  // })

  // console.log('open http://localhost:3000/')
}
