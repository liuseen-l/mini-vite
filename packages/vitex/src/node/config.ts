import { type ConfigEnv, type InlineConfig, type Plugin, type UserConfigExport } from 'vite'
import { resolveConfig as _reresolveConfig } from 'vite'
import { mergeConfig } from './utils'
import { getSortedPluginsByHook, resolvePlugins } from './plugins'

export function defineConfig(config: UserConfigExport) {
  return config
}

export function sortUserPlugins(
  plugins: (Plugin | Plugin[])[] | undefined,
): [Plugin[], Plugin[], Plugin[]] {
  const prePlugins: Plugin[] = []
  const postPlugins: Plugin[] = []
  const normalPlugins: Plugin[] = []

  if (plugins) {
    plugins.flat().forEach((p) => {
      if (p.enforce === 'pre')
        prePlugins.push(p)
      else if (p.enforce === 'post')
        postPlugins.push(p)
      else normalPlugins.push(p)
    })
  }

  return [prePlugins, normalPlugins, postPlugins]
}

async function runConfigHook(
  config: InlineConfig,
  plugins: Plugin[],
  configEnv: ConfigEnv,
): Promise<InlineConfig> {
  let conf = config

  for (const p of getSortedPluginsByHook('config', plugins)) {
    const hook = p.config
    const handler = hook && 'handler' in hook ? hook.handler : hook
    if (handler) {
      const res = await handler(conf, configEnv)
      if (res)
        conf = mergeConfig(conf, res)
    }
  }

  return conf
}

export async function resolveConfig(
  inlineConfig: InlineConfig = {},
) {
  // 这个过程会执行config 和 configResolved钩子
  //   const userPlugins = [...prePlugins, ...normalPlugins, ...postPlugins]
  //   config = await runConfigHook(config, userPlugins, configEnv)
  // call configResolved hooks
  // await Promise.all([
  //   ...resolved
  //     .getSortedPluginHooks('configResolved')
  //     .map(hook => hook(resolved)),
  //   ...resolvedConfig.worker
  //     .getSortedPluginHooks('configResolved')
  //     .map(hook => hook(workerResolved)),
  // ])
  const config = await _reresolveConfig(inlineConfig, 'serve');
  // 过滤掉vite自身的插件，我们自己手动实现，并合并我们内置的vitex插件
  (config as any).plugins = [...(config.plugins.filter((p) => {
    return p.name.includes('vitex:')
  }) || []), ...resolvePlugins()]

  return config
}
