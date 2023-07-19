import path from 'node:path'
import fs from 'node:fs'
import resolve from 'resolve'
import type { Plugin, ViteDevServer } from 'vite'
import { DEFAULT_EXTERSIONS } from '../constants'
import { cleanUrl, isInternalRequest, normalizePath, removeImportQuery } from '../utils'

export function resolvePlugin(): Plugin {
  let serverContext: ViteDevServer
  return {
    name: 'vitex:resolve',
    configureServer(s) {
      serverContext = s
    },
    async resolveId(id: string, importer?: string) {
      id = removeImportQuery(cleanUrl(id))

      if (isInternalRequest(id))
        return null

      if (path.isAbsolute(id)) {
        if (fs.existsSync(id))
          return id

        // 加上 root 路径前缀，处理 /src/main.tsx 的情况
        id = path.join(serverContext.config.root, id)

        if (fs.existsSync(id))
          return id
      }
      // 相对路径
      else if (id.startsWith('.')) {
        if (!importer)
          throw new Error('`importer` should not be undefined')

        const hasExtension = path.extname(id).length > 1
        let resolvedId: string
        // ./App.tsx
        if (hasExtension) {
          resolvedId = normalizePath(resolve.sync(id, { basedir: path.dirname(importer) }))
          if (fs.existsSync(resolvedId))
            return resolvedId
        }
        else {
          // ./App -> ./App.tsx
          for (const extname of DEFAULT_EXTERSIONS) {
            try {
              const withExtension = `${id}${extname}`
              resolvedId = normalizePath(resolve.sync(withExtension, {
                basedir: path.dirname(importer),
              }))
              if (fs.existsSync(resolvedId))
                return resolvedId
            }
            catch (e) {
              continue
            }
          }
        }
      }
      return null
    },
  }
}
