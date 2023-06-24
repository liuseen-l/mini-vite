import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from './server'

export interface UserConfig {
  root?: string
  plugins?: Plugin[]
}

export type UserConfigExport = UserConfig | Promise<UserConfig>

export function defineConfig(config: UserConfigExport) {
  return config
}

export type ResolvedConfig = Readonly<{
  plugins?: Plugin[]
}>

export async function resolveConfig(): Promise<ResolvedConfig | undefined> {
  const configFilePath = pathToFileURL(resolve(process.cwd(), './vite.config.js'))

  try {
    const config = await import(configFilePath.href)

    return config.default
  }
  catch (error) {
    console.log('gg')
  }
}
