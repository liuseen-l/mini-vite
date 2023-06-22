import type { Plugin } from '../server'
import { staticMiddleware } from '../server/middlewares/static'

export function staticPlugin(): Plugin {
  return {
    configureServer(server) {
      server.app.use(staticMiddleware())
    },
  }
}
