/*
初始化内部插件
 */
import type { Plugin } from 'vite'
import { esbuildPlugin } from './esbuild'
import { cssPlugin, cssPostPlugin } from './css'

// import { importAnalysisPlugin } from './importAnalysis'
import { resolvePlugin } from './resolve'

// import { cssPlugin, cssPostPlugin } from './css'
// import { staticPlugin } from './static'
// import { esbuildPlugin } from './esbuild'

export function resolvePlugins(): Plugin[] {
  return [resolvePlugin(), esbuildPlugin(), cssPlugin(), cssPostPlugin()]
}

export function getSortedPluginsByHook(
  hookName: keyof Plugin,
  plugins: readonly Plugin[],
): Plugin[] {
  const pre: Plugin[] = []
  const normal: Plugin[] = []
  const post: Plugin[] = []
  for (const plugin of plugins) {
    const hook = plugin[hookName]
    if (hook) {
      if (typeof hook === 'object') {
        if (hook.order === 'pre') {
          pre.push(plugin)
          continue
        }
        if (hook.order === 'post') {
          post.push(plugin)
          continue
        }
      }
      normal.push(plugin)
    }
  }
  return [...pre, ...normal, ...post]
}
