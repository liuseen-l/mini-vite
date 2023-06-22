import connect from 'connect';
import http from 'http';
import { loadInternalPlugins } from '../plugins';
import { resolveConfig, ResolvedConfig } from '../config';
import { transformMiddleware } from './middlewares/transform';
import { createPluginContainer, PluginContainer } from './pluginContainer';
import path from 'node:path';

export type ServerHook = (server: ViteDevServer) => (() => void) | void | Promise<(() => void) | void>;

export type TransformResult = string | null | void;

export type TransformHook = (code: string, id: string) => Promise<TransformResult> | TransformResult;

export type ResolveId = (id: string, importer?: string) => Promise<any | null>

export type Load = (id: string) => Promise<any>

export interface Plugin {
  configureServer?: ServerHook;
  transform?: TransformHook;
  resolveId?: ResolveId;
  load?: Load
}

export interface ViteDevServer {
  plugins: Plugin[];
  app: connect.Server;
  config: ResolvedConfig;
  pluginContainer?: PluginContainer
  root: string
}


export async function createServer() {
  const config = await resolveConfig();

  const plugins = [...(config.plugins || []), ...loadInternalPlugins()];
  const app = connect();

  // server 作为上下文对象，用于保存一些状态和对象，将会在 Server 的各个流程中被使用
  let server: ViteDevServer = {
    plugins,
    app,
    config,
    root: path.resolve(__dirname, '../../../playground')
  };

  const container = createPluginContainer(server);

  server = {
    ...server,
    pluginContainer: container,
  };

  app.use(transformMiddleware(server));

  for (const plugin of plugins) {
    plugin?.configureServer?.(server);
  }
  
  http.createServer(app).listen(3000);

  console.log('open http://localhost:3000/');
}
