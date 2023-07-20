import path from 'node:path'
import type { ResolvedConfig } from 'vite'
import { build } from 'esbuild'
import { scanImports } from './scan'
import { preBundlePlugin } from './preBundlePlugin.js'

export function discoverProjectDependencies(config: ResolvedConfig): {
  result: Promise<Record<string, string>>
} {
  // 开始扫描，返回的result是一个promise对象，当中的值为扫描到的依赖
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
  // 开始打包三方依赖
  prepareEsbuildOptimizerRun(
    resolvedConfig,
    depsInfo,
  )
}

async function prepareEsbuildOptimizerRun(
  resolvedConfig: ResolvedConfig,
  depsInfo: Record<string, any>,
) {
  // 编译依赖项，对每一个依赖进行单独打包
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
  const root = path.resolve(resolvedConfig.root, 'node_modules', '.vitex-bundle')
  await build({
    entryPoints: [filePath],
    write: true,
    bundle: true,
    format: 'esm',
    outdir: root,
    plugins: [preBundlePlugin((resolvedConfig as any).optimizeDep)],
  })
}
