// import path from 'node:path'

// import { resolvePlugins } from '../plugins'
import type { InlineConfig, ViteDevServer } from 'vite'
import { resolveConfig } from 'vite'

// import { resolveConfig } from '../config'

// import { transformMiddleware } from './middlewares/transform'

// import { createPluginContainer } from './pluginContainer'

export type ServerHook = (server: ViteDevServer) => (() => void) | void | Promise<(() => void) | void>

export type TransformResult = string | null | void

export type TransformHook = (code: string, id: string) => Promise<TransformResult> | TransformResult

export type ResolveId = (id: string, importer?: string) => Promise<any | null>

export type Load = (id: string) => Promise<any>

export interface Plugin {
  configureServer?: ServerHook
  transform?: TransformHook
  resolveId?: ResolveId
  load?: Load
}

export function createServer(inlineConfig: InlineConfig = {}): Promise<void> {
  return _createServer(inlineConfig, { ws: true })
}

export async function _createServer(
  inlineConfig: InlineConfig = {},
  options: { ws: boolean },
) {
  const config = await resolveConfig(inlineConfig, 'serve')

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
