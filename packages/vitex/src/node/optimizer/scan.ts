import path from 'node:path'
import { type PluginContainer, type ResolvedConfig, normalizePath } from 'vite'
import esbuild from 'esbuild'
import type { Plugin } from 'esbuild'
import { BARE_IMPORT_RE, EXTERNAL_TYPES } from '../constants'

function esbuildScanPlugin(
  container: PluginContainer,
  depImports: Record<string, string>,
): Plugin {
  const seen = new Map<string, string | undefined>()

  const resolve = async (
    id: string,
    importer?: string,
    options?: any,
  ) => {
    const key = id + (importer && path.dirname(importer))
    if (seen.has(key))
      return seen.get(key)

    const resolved = await container.resolveId(
      id,
      importer && normalizePath(importer),
      {
        ...options,
        scan: true,
      },
    )
    const res = resolved?.id
    seen.set(key, res)
    return res
  }

  return {
    name: 'vite:dep-scan',
    setup(build) {
      // 忽略的文件类型
      build.onResolve(
        { filter: new RegExp(`\\.(${EXTERNAL_TYPES.join('|')})$`) },
        (resolveInfo) => {
          return {
            path: resolveInfo.path,
            external: true,
          }
        },
      )
      // 记录依赖
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id } = resolveInfo
          depImports[id] = id
          return {
            path: id,
            external: true,
          }
        },
      )
    },
  }
}

export function scanImports(config: ResolvedConfig): {
  result: Promise<{
    deps: Record<string, string>
    missing: Record<string, string>
  }>
} {
  const deps: Record<string, string> = {}

  const result = prepareEsbuildScanner(config, deps)

  return {
    result,
  }
}

async function prepareEsbuildScanner(
  config: ResolvedConfig,
  deps: Record<string, string>,
): Promise<any | undefined> {
  const container = await createPluginContainer(config)

  const plugin = esbuildScanPlugin(container, deps)

  return await esbuild.context({
    absWorkingDir: process.cwd(),
    write: false,
    bundle: true,
    format: 'esm',
    logLevel: 'silent',
    plugins: [plugin],
  })
}
