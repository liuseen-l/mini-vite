import type { Plugin, ViteDevServer } from 'vite'
import { cleanUrl, getShortName, normalizePath, removeImportQuery } from '../utils'

export function assetPlugin(): Plugin {
  let serverContext: ViteDevServer

  return {
    name: 'vitex:asset',
    configureServer(s) {
      serverContext = s
    },
    async load(id) {
      const cleanedId = removeImportQuery(cleanUrl(id))
      const resolvedId = `/${getShortName(normalizePath(id), serverContext.config.root)}`

      // 这里仅处理 svg
      if (cleanedId.endsWith('.svg'))
        return `export default "${resolvedId}"`
    },
  }
}
