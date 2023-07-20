import type { ResolvedConfig, ViteDevServer } from 'vite'
import { discoverProjectDependencies, runOptimizeDeps } from './index'

async function createDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  // 分析项目当中的三方依赖
  const discover = discoverProjectDependencies(config)
  // 拿到项目当中所记录的三方依赖
  const deps = await discover.result;
  // 将这些依赖挂在optizeDep上
  (config as any).optimizeDep = deps
  // 对这些三方依赖进行依赖预构建
  runOptimizeDeps(config, deps)
}

export async function initDepsOptimizer(
  config: ResolvedConfig,
  server?: ViteDevServer,
): Promise<void> {
  await createDepsOptimizer(config, server)
}
