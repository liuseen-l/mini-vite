import type { ResolvedConfig, ViteDevServer } from 'vite'
import { build } from 'esbuild'
import { discoverProjectDependencies, runOptimizeDeps } from './index'

async function createDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  const discover = discoverProjectDependencies(config)
  const deps = await discover.result

  const result = await runOptimizeDeps(config, deps)
  console.log(result)
}

export async function initDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  await createDepsOptimizer(config, server)
}

export async function extractExportsData(
  filePath: string,
): Promise<any> {
  const result = await build({
    entryPoints: [filePath],
    write: false,
    format: 'esm',
  })

  return result
}
