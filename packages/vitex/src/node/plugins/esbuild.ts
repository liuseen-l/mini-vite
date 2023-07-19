import path from 'node:path'
import fsp from 'node:fs/promises'
import esbuild from 'esbuild'
import type { Plugin } from 'vite'
import { isJSRequest } from '../utils'

export function esbuildPlugin(): Plugin {
  return {
    name: 'vitex:esbuild',
    async load(id) {
      if (isJSRequest(id)) {
        try {
          const code = await fsp.readFile(id, 'utf-8')
          return code
        }
        catch (e) {
          return null
        }
      }
    },
    async transform(code, id) {
      if (isJSRequest(id)) {
        const extname = path.extname(id).slice(1)

        const { code: transformedCode, map } = await esbuild.transform(code, {
          target: 'esnext',
          format: 'esm',
          sourcemap: true,
          loader: extname as 'js' | 'ts' | 'jsx' | 'tsx',
        })

        return {
          code: transformedCode,
          map,
        }
      }
      return null
    },
  }
}
