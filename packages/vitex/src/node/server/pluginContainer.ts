import { join } from 'node:path'
import type { ResolvedConfig, TransformResult } from 'vite'
import type {
  ResolvedId,
  PluginContext as RollupPluginContext,
} from 'rollup'

export interface PluginContainer {
  buildStart(options: any): Promise<void>
  resolveId(id: string, importer?: string): Promise<any | null>
  transform(code: string, id: string): Promise<any>
  load(id: string): Promise<any>
}

export function createPluginContainer(config: ResolvedConfig): PluginContainer {
  const { plugins, root, server } = config

  class Context implements Partial<RollupPluginContext> {
    async resolve(id: string, importer?: string) {
      let out = await container.resolveId(id, importer)
      if (typeof out === 'string')
        out = { id: out }
      return out as ResolvedId | null
    }
  }
  const container: PluginContainer = {
    // 立即执行，执行各个plugin的options钩子，内部也会根据options的order进行排序
    // 异步，串行
    // 等会sercer/index.ts中会进行调用
    async buildStart() {
      for (const plugin of plugins) (plugin as any)?.configureServer?.(server)
    },

    // 异步，first优先
    async resolveId(rawId, importer = join(root, 'index.html')) {
      let id: string | null = null
      const ctx = new Context() as any
      for (const plugin of plugins) {
        if (!plugin.resolveId)
          continue
        let result
        try {
          result = await (plugin.resolveId as any).call(ctx, rawId, importer)
        }
        catch (e) {
          console.error(e)
        }
        if (!result)
          continue
        id = result
        // first 类型
        break
      }
      return id
    },

    // 异步，first优先
    async load(id) {
      const ctx = new Context() as any
      for (const plugin of plugins) {
        if (!plugin.load)
          continue
        const result = await (plugin.load as any).call(ctx, id)
        if (result != null) {
          // first 类型
          return result
        }
      }
      return null
    },

    // 异步串行
    async transform(code, id) {
      const ctx = new Context() as any
      for (const plugin of config.plugins) {
        if (!plugin.transform)
          continue
        let result: TransformResult | null = null
        try {
          result = await (plugin.transform as any).call(ctx, code, id)
        }
        catch (e) {
          console.error(e)
        }
        // 如果返回为空，则表示当前钩子不转换当前模块
        if (!result)
          continue
        // 如果有返回值，用结果覆盖 code，作为入参传给下一个 transform 钩子
        code = result as any
      }
      return code
    },
  }
  return container
}
