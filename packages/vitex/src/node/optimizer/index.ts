import path from 'node:path'
import type { ResolvedConfig } from 'vite'
import { build } from 'esbuild'
import { scanImports } from './scan'
import { preBundlePlugin } from './preBundlePlugin.js'

export function discoverProjectDependencies(config: ResolvedConfig): {
  result: Promise<Record<string, string>>
} {
  // result 是一个 promise
  const { result } = scanImports(config)

  return {
    result: result.then(({ deps }) => {
      return deps
    }),
  }
}

export function runOptimizeDeps(
  resolvedConfig: ResolvedConfig,
  depsInfo: Record<string, any>,
) {
  prepareEsbuildOptimizerRun(
    resolvedConfig,
    depsInfo,
  )
}

async function prepareEsbuildOptimizerRun(
  resolvedConfig: ResolvedConfig,
  depsInfo: Record<string, any>,
) {
  await Promise.all(
    Object.keys(depsInfo).map(async (id) => {
      extractExportsData(resolvedConfig, id)
    }),
  )
}

export async function extractExportsData(
  resolvedConfig: ResolvedConfig,
  filePath: string,
): Promise<any> {
  const root = path.resolve(resolvedConfig.root, 'node_modules', '.mini-vite')
  console.log(root)
  await build({
    entryPoints: [filePath],
    write: true,
    bundle: true,
    format: 'esm',
    outdir: root,
    plugins: [preBundlePlugin((resolvedConfig as any).optimizeDep)],
  })
}
