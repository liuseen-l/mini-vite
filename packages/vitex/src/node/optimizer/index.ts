import type { ResolvedConfig } from 'vite'
import { build } from 'esbuild'
import { scanImports } from './scan'

export function discoverProjectDependencies(config: ResolvedConfig): {
  result: Promise<Record<string, string>>
} {
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
  return prepareEsbuildOptimizerRun(
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
      extractExportsData(id)
    }),
  )
}

export async function extractExportsData(
  filePath: string,
): Promise<any> {
  await build({
    entryPoints: [filePath],
    write: false,
    format: 'esm',
  })
}
