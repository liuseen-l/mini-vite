import type { Plugin } from 'vite'
import { staticMiddleware } from '../server/middlewares/static'

export function staticPlugin(): Plugin {
  return {
    name: 'vite-static',
    configureServer(server) {
      server.middlewares.use(staticMiddleware())
    },
  }
}
