import type { ResolvedConfig, ViteDevServer } from 'vite'
import { discoverProjectDependencies, runOptimizeDeps } from './index'

async function createDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  const discover = discoverProjectDependencies(config)
  const deps = await discover.result;
  (config as any).optimizeDep = deps
  console.log(deps)
  runOptimizeDeps(config, deps)
}

export async function initDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  await createDepsOptimizer(config, server)
}
