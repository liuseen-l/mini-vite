import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { builtinModules, createRequire } from 'node:module'
import { exec } from 'node:child_process'
import { createFilter as _createFilter } from '@rollup/pluginutils'

const knownJsSrcRE = /\.((j|t)sx?)$/
export function isJSRequest(url: string): boolean {
  url = cleanUrl(url)
  return knownJsSrcRE.test(url)
}

const cssLangs = '\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)'
const cssLangRE = new RegExp(cssLangs)
export const isCSSRequest = (request: string): boolean => cssLangRE.test(request)

export const queryRE = /\?.*$/s
export const hashRE = /#.*$/s

export const cleanUrl = (url: string): string => url.replace(hashRE, '').replace(queryRE, '')

// -------

export function tryStatSync(file: string): fs.Stats | undefined {
  try {
    return fs.statSync(file, { throwIfNoEntry: false })
  }
  catch {
    // Ignore errors
  }
}
export function lookupFile(
  dir: string,
  fileNames: string[],
): string | undefined {
  // dir是fileNames的路径，这个dir的路径为vite的配置文件路径
  while (dir) {
    for (const fileName of fileNames) {
      // 这里获取到的用户项目的package.json路径，一般和vite的配置文件路径同级
      const fullPath = path.join(dir, fileName)
      if (tryStatSync(fullPath)?.isFile()) {
        // 返回路径
        return fullPath
      }
    }
    const parentDir = path.dirname(dir)
    if (parentDir === dir)
      return
    // vite配置文件路径下找不到package.json文件的话就继续向上找
    dir = parentDir
  }
}

// @ts-expect-error jest only exists when running Jest
export const usingDynamicImport = typeof jest === 'undefined'
const _require = createRequire(import.meta.url)
export const dynamicImport = usingDynamicImport
  ? new Function('file', 'return import(file)') // 一般返回这个
  : _require

const builtins = new Set([
  ...builtinModules,
  'assert/strict',
  'diagnostics_channel',
  'dns/promises',
  'fs/promises',
  'path/posix',
  'path/win32',
  'readline/promises',
  'stream/consumers',
  'stream/promises',
  'stream/web',
  'timers/promises',
  'util/types',
  'wasi',
])

const NODE_BUILTIN_NAMESPACE = 'node:'
export function isBuiltin(id: string): boolean {
  return builtins.has(
    id.startsWith(NODE_BUILTIN_NAMESPACE)
      ? id.slice(NODE_BUILTIN_NAMESPACE.length)
      : id,
  )
}

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}
export const isWindows = os.platform() === 'win32'
export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

export const bareImportRE = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/
export const deepImportRE = /^([^@][^/]*)\/|^(@[^/]+\/[^/]+)\//

export let safeRealpathSync = isWindows
  ? windowsSafeRealPathSync
  : fs.realpathSync.native

let firstSafeRealPathSyncRun = false

const parseNetUseRE = /^(\w+)? +(\w:) +([^ ]+)\s/

const windowsNetworkMap = new Map()
function windowsMappedRealpathSync(path: string) {
  const realPath = fs.realpathSync.native(path)
  if (realPath.startsWith('\\\\')) {
    for (const [network, volume] of windowsNetworkMap) {
      if (realPath.startsWith(network))
        return realPath.replace(network, volume)
    }
  }
  return realPath
}

function windowsSafeRealPathSync(path: string): string {
  if (!firstSafeRealPathSyncRun) {
    optimizeSafeRealPathSync()
    firstSafeRealPathSyncRun = true
  }
  return fs.realpathSync(path)
}

function optimizeSafeRealPathSync() {
  // Skip if using Node <16.18 due to MAX_PATH issue: https://github.com/vitejs/vite/issues/12931
  const nodeVersion = process.versions.node.split('.').map(Number)
  if (nodeVersion[0] < 16 || (nodeVersion[0] === 16 && nodeVersion[1] < 18)) {
    safeRealpathSync = fs.realpathSync
    return
  }

  exec('net use', (error, stdout) => {
    if (error)
      return
    const lines = stdout.split('\n')
    // OK           Y:        \\NETWORKA\Foo         Microsoft Windows Network
    // OK           Z:        \\NETWORKA\Bar         Microsoft Windows Network
    for (const line of lines) {
      const m = line.match(parseNetUseRE)
      if (m)
        windowsNetworkMap.set(m[3], m[2])
    }
    if (windowsNetworkMap.size === 0)
      safeRealpathSync = fs.realpathSync.native

    else
      safeRealpathSync = windowsMappedRealpathSync
  })
}

export type FilterPattern =
  | ReadonlyArray<string | RegExp>
  | string
  | RegExp
  | null
export const createFilter = _createFilter as (
  include?: FilterPattern,
  exclude?: FilterPattern,
  options?: { resolve?: string | false | null },
) => (id: string | unknown) => boolean

export function isInNodeModules(id: string): boolean {
  return id.includes('node_modules')
}
