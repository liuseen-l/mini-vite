import path from 'node:path'
import fs from 'node:fs'
import { exports, imports } from 'resolve.exports'
import { cleanUrl, deepImportRE, isInNodeModules } from '../utils'
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
    console.log(id)

    if (data.exports) {
      entryPoint = resolveExportsOrImports(
        data,
        '.',
        options,
        targetWeb,
        'exports',
      )
    }

    entryPoint ||= data.main

    const entryPoints = entryPoint
      ? [entryPoint]
      : ['index.js', 'index.json', 'index.node']

    for (const entry of entryPoints) {
      const entryPointPath = path.join(dir, entry)
      return entryPointPath
    }
  }
  catch (e) {
    console.log(id, 'g')
  }
}
