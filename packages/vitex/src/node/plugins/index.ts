/*
初始化内部插件
 */
import type { Plugin } from '../server'
import { cssPlugin, cssPostPlugin } from './css'
import { staticPlugin } from './static'
import { esbuildPlugin } from './esbuild'

export function resolvePlugins(): Plugin[] {
  return [esbuildPlugin(), cssPlugin(), cssPostPlugin(), staticPlugin()]
}
