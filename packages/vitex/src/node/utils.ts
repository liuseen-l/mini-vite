import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { builtinModules, createRequire } from 'node:module'
import { exec } from 'node:child_process'
import { createFilter as _createFilter } from '@rollup/pluginutils'
import type { Alias, AliasOptions } from 'vite'
import { CLIENT_PUBLIC_PATH } from './constants'

/// dadwadwadwadwad
// src/node/utils.ts
export function removeImportQuery(url: string): string {
  return url.replace(/\?import$/, '')
}

const INTERNAL_LIST = [CLIENT_PUBLIC_PATH, '/@react-refresh']
export function isInternalRequest(url: string): boolean {
  return INTERNAL_LIST.includes(url)
}

export function getShortName(file: string, root: string) {
  return file.startsWith(`${root}/`) ? path.posix.relative(root, file) : file
}

const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/
export function isJSRequest(id: string): boolean {
  id = cleanUrl(id)
  if (JS_TYPES_RE.test(id))
    return true

  if (!path.extname(id) && !id.endsWith('/'))
    return true

  return false
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
export function isImportRequest(url: string): boolean {
  return url.endsWith('?import')
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

export async function asyncFlatten<T>(arr: T[]): Promise<T[]> {
  do
    arr = (await Promise.all(arr)).flat(Infinity) as any
  while (arr.some((v: any) => v?.then))
  return arr
}

function normalizeSingleAlias({
  find,
  replacement,
  customResolver,
}: Alias): Alias {
  if (
    typeof find === 'string'
    && find[find.length - 1] === '/'
    && replacement[replacement.length - 1] === '/'
  ) {
    find = find.slice(0, find.length - 1)
    replacement = replacement.slice(0, replacement.length - 1)
  }

  const alias: Alias = {
    find,
    replacement,
  }
  if (customResolver)
    alias.customResolver = customResolver

  return alias
}

export function normalizeAlias(o: AliasOptions = []): Alias[] {
  return Array.isArray(o)
    ? o.map(normalizeSingleAlias)
    : Object.keys(o).map(find =>
      normalizeSingleAlias({
        find,
        replacement: (o as any)[find],
      }),
    )
}

export function mergeAlias(
  a?: AliasOptions,
  b?: AliasOptions,
): AliasOptions | undefined {
  if (!a)
    return b
  if (!b)
    return a
  if (isObject(a) && isObject(b))
    return { ...a, ...b }

  // the order is flipped because the alias is resolved from top-down,
  // where the later should have higher priority
  return [...normalizeAlias(b), ...normalizeAlias(a)]
}

export function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target]
}

function mergeConfigRecursively(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath: string,
) {
  const merged: Record<string, any> = { ...defaults }
  for (const key in overrides) {
    const value = overrides[key]
    if (value == null)
      continue

    const existing = merged[key]

    if (existing == null) {
      merged[key] = value
      continue
    }

    if (key === 'alias' && (rootPath === 'resolve' || rootPath === '')) {
      merged[key] = mergeAlias(existing, value)
      continue
    }
    else if (key === 'assetsInclude' && rootPath === '') {
      merged[key] = [].concat(existing, value)
      continue
    }
    else if (
      key === 'noExternal'
      && rootPath === 'ssr'
      && (existing === true || value === true)
    ) {
      merged[key] = true
      continue
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...arraify(existing ?? []), ...arraify(value ?? [])]
      continue
    }
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key,
      )
      continue
    }

    merged[key] = value
  }
  return merged
}

export function mergeConfig<
  D extends Record<string, any>,
  O extends Record<string, any>,
>(
  defaults: D extends Function ? never : D,
  overrides: O extends Function ? never : O,
  isRoot = true,
): Record<string, any> {
  if (typeof defaults === 'function' || typeof overrides === 'function')
    throw new Error('Cannot merge config in form of callback')

  return mergeConfigRecursively(defaults, overrides, isRoot ? '' : '.')
}
