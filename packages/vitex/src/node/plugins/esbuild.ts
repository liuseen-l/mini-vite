import path from 'node:path'
import { transform } from 'esbuild'
import type { Plugin } from 'vite'
import { isJSRequest } from '../utils'

export function esbuildPlugin(): Plugin {
  return {
    name: 'vite-esbuild',
    async transform(code, url) {
      if (isJSRequest(url)) {
        const extname = path.extname(url).slice(1)

        const { code: resCode } = await transform(code, {
          target: 'esnext',
          format: 'esm',
          sourcemap: true,
          loader: extname as 'js' | 'ts' | 'jsx' | 'tsx',
        })
        return resCode
      }
    },
  }
}
