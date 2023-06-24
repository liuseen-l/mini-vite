import http from 'node:http'
import path from 'node:path'
import connect from 'connect'
import { resolvePlugins } from '../plugins'
import type { ResolvedConfig } from '../config'
import { resolveConfig } from '../config'
import { transformMiddleware } from './middlewares/transform'
import type { PluginContainer } from './pluginContainer'
import { createPluginContainer } from './pluginContainer'

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

export interface ViteDevServer {
  plugins: Plugin[]
  app: connect.Server
  config: ResolvedConfig
  pluginContainer?: PluginContainer
  root: string
}

export function createServer(): Promise<void> {
  return _createServer()
}

export async function _createServer() {
  const config = await resolveConfig()

  if (!config)
    return

  const plugins = [...(config.plugins || []), ...resolvePlugins()]
  const app = connect()

  // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  let server: ViteDevServer = {
    plugins,
    app,
    config,
    root: path.resolve(__dirname, '../../../playground'),
  }

  const container = createPluginContainer(server)

  server = {
    ...server,
    pluginContainer: container,
  }

  app.use(transformMiddleware(server))

  for (const plugin of plugins) plugin?.configureServer?.(server)

  http.createServer(app).listen(3000)

  console.log('open http://localhost:3000/')
}
