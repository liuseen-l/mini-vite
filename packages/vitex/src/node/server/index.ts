// import path from 'node:path'

// import { resolvePlugins } from '../plugins'
import path from 'node:path'
import type { InlineConfig } from 'vite'
import connect from 'connect'
import { resolveConfig } from '../config'
import { initDepsOptimizer } from '../../node/optimizer/optimizer'

import { createPluginContainer } from './pluginContainer'
import { transformMiddleware } from './middlewares/transform'

// import { resolveConfig } from '../config'

// import { transformMiddleware } from './middlewares/transform'

export function createServer(inlineConfig: InlineConfig = {}): Promise<void> {
  return _createServer(inlineConfig, { ws: true })
}

export async function _createServer(
  inlineConfig: InlineConfig = {},
  options: { ws: boolean },
) {
  const config = await resolveConfig(inlineConfig)

  const initServer = async () => {
    return (async function () {
      // 依赖预构建入口
      await initDepsOptimizer(config)
    })()
  }
  initServer()

  if (!config)
    return

  const app = connect()

  // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  let server: any = {
    app,
    config,
    root: path.resolve(__dirname, '../../../playground'),
  }

  const container = createPluginContainer(config)

  server = {
    ...server,
    pluginContainer: container,
  }

  app.use(transformMiddleware(server))

  // for (const plugin of plugins) plugin?.configureServer?.(server)

  // app.listen(3000, () => {
  //   console.log('服务启动')
  // })

  // console.log('open http://localhost:3000/')
}
