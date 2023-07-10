import path from 'node:path'
import fs from 'node:fs'
import { exports, imports } from 'resolve.exports'
import { cleanUrl, deepImportRE, isInNodeModules, isObject, normalizePath, safeRealpathSync, tryStatSync } from '../utils'
import type { PackageData } from '../packages'
import { resolvePackageData } from '../packages'

interface PartialResolvedId {
  external?: boolean | 'absolute' | 'relative'
  id: string
  resolvedBy?: string
}

export function tryNodeResolve(
  id: string,
  importer: string | null | undefined,
  options: any,
  targetWeb: boolean,
  depsOptimizer?: any,
): PartialResolvedId | undefined {
  const { root, dedupe, preserveSymlinks } = options

  const deepMatch = id.match(deepImportRE)

  const pkgId = deepMatch ? deepMatch[1] || deepMatch[2] : id

  let basedir: string
  if (dedupe?.includes(pkgId))
    basedir = root

  else if (
    importer
    && path.isAbsolute(importer)
    && (importer[importer.length - 1] === '*' || fs.existsSync(cleanUrl(importer)))
  )
    basedir = path.dirname(importer)

  else
    basedir = root

  const pkg = resolvePackageData(pkgId, basedir, preserveSymlinks)

  if (!pkg)
    return

  const resolveId = resolvePackageEntry
  const unresolvedId = deepMatch ? `.${id.slice(pkgId.length)}` : pkgId

  let resolved: string | undefined
  try {
    console.log(123, unresolvedId)
    resolved = resolveId(unresolvedId, pkg, targetWeb, options)
  }
  catch (err) {
    if (!options.tryEsmOnly)
      throw err
  }

  if (!resolved)
    return

  if (
    !options.ssrOptimizeCheck
    && (!isInNodeModules(resolved) // linked
      || !depsOptimizer // resolving before listening to the server
      || options.scan) // initial esbuild scan phase
  )
    return { id: resolved }
}

function resolveExportsOrImports(
  pkg: PackageData['data'],
  key: string,
  options: any,
  targetWeb: boolean,
  type: 'imports' | 'exports',
) {
  const additionalConditions = new Set(
    options.overrideConditions || [
      'production',
      'development',
      'module',
      ...options.conditions,
    ],
  )

  const fn = type === 'imports' ? imports : exports
  const result = fn(pkg, key, {
    browser: targetWeb && !additionalConditions.has('node'),
    require: options.isRequire && !additionalConditions.has('import'),
  })

  return result ? result[0] : undefined
}

export function resolvePackageEntry(
  id: string,
  { dir, data }: PackageData,
  targetWeb: boolean,
  options: any,
): string | undefined {
  try {
    let entryPoint: string | undefined

    if (data.exports) {
      entryPoint = resolveExportsOrImports(
        data,
        '.',
        options,
        targetWeb,
        'exports',
      )
    }

    const resolvedFromExports = !!entryPoint

    // 如果这个包没有exports字段
    if (!resolvedFromExports && (!entryPoint || entryPoint.endsWith('.mjs'))) {
      for (const field of options.mainFields) {
        if (field === 'browser')
          continue // already checked above
        if (typeof data[field] === 'string') {
          entryPoint = data[field]
          break
        }
      }
    }
    entryPoint ||= data.main

    const entryPoints = entryPoint
      ? [entryPoint]
      : ['index.js', 'index.json', 'index.node']

    for (let entry of entryPoints) {
      // make sure we don't get scripts when looking for sass
      let skipPackageJson = false
      if (
        options.mainFields[0] === 'sass'
        && !options.extensions.includes(path.extname(entry))
      ) {
        entry = ''
        skipPackageJson = true
      }
      else {
        // resolve object browser field in package.json
        const { browser: browserField } = data
        if (targetWeb && options.browserField && isObject(browserField))
          entry = mapWithBrowserField(entry, browserField) || entry
      }

      const entryPointPath = path.join(dir, entry)
      const resolvedEntryPoint = tryFsResolve(
        entryPointPath,
        options,
      )
      if (resolvedEntryPoint)
        return resolvedEntryPoint
    }
  }
  catch (e) {
    console.log(id, 'g')
  }
}

function mapWithBrowserField(
  relativePathInPkgDir: string,
  map: Record<string, string | false>,
): string | false | undefined {
  const normalizedPath = path.posix.normalize(relativePathInPkgDir)

  for (const key in map) {
    const normalizedKey = path.posix.normalize(key)
    if (
      normalizedPath === normalizedKey
      || equalWithoutSuffix(normalizedPath, normalizedKey, '.js')
      || equalWithoutSuffix(normalizedPath, normalizedKey, '/index.js')
    )
      return map[key]
  }
}

function equalWithoutSuffix(path: string, key: string, suffix: string) {
  return key.endsWith(suffix) && key.slice(0, -suffix.length) === path
}

export function tryFsResolve(
  fsPath: string,
  options: any,
): string | undefined {
  const { file, postfix } = splitFileAndPostfix(fsPath)
  const res = tryCleanFsResolve(
    file,
    options,
  )
  if (res)
    return res + postfix
}

function splitFileAndPostfix(path: string) {
  const file = cleanUrl(path)
  return { file, postfix: path.slice(file.length) }
}

function tryResolveRealFile(
  file: string,
  preserveSymlinks: boolean,
): string | undefined {
  const stat = tryStatSync(file)
  if (stat?.isFile())
    return getRealPath(file, preserveSymlinks)
}

function tryResolveRealFileWithExtensions(
  filePath: string,
  extensions: string[],
  preserveSymlinks: boolean,
): string | undefined {
  for (const ext of extensions) {
    const res = tryResolveRealFile(filePath + ext, preserveSymlinks)
    if (res)
      return res
  }
}

const knownTsOutputRE = /\.(?:js|mjs|cjs|jsx)$/
const isPossibleTsOutput = (url: string): boolean => knownTsOutputRE.test(url)
function tryCleanFsResolve(
  file: string,
  options: any,
): string | undefined {
  const { tryPrefix, extensions, preserveSymlinks } = options

  const fileStat = tryStatSync(file)

  // Try direct match first
  if (fileStat?.isFile())
    return getRealPath(file, options.preserveSymlinks)

  let res: string | undefined

  // If path.dirname is a valid directory, try extensions and ts resolution logic
  const possibleJsToTs = options.isFromTsImporter && isPossibleTsOutput(file)
  if (possibleJsToTs || extensions.length || tryPrefix) {
    const dirPath = path.dirname(file)
    const dirStat = tryStatSync(dirPath)
    if (dirStat?.isDirectory()) {
      if (
        (res = tryResolveRealFileWithExtensions(
          file,
          extensions,
          preserveSymlinks,
        ))
      )
        return res
    }
  }
}

export const browserExternalId = '__vite-browser-external'
function getRealPath(resolved: string, preserveSymlinks?: boolean): string {
  if (!preserveSymlinks && browserExternalId !== resolved)
    resolved = safeRealpathSync(resolved)

  return normalizePath(resolved)
}
