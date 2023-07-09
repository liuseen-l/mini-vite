import path from 'node:path'
import fs from 'node:fs'
import { createFilter, safeRealpathSync } from './utils'

export interface PackageData {
  dir: string
  hasSideEffects: (id: string) => boolean | 'no-treeshake'
  webResolvedImports: Record<string, string | undefined>
  nodeResolvedImports: Record<string, string | undefined>
  setResolvedCache: (key: string, entry: string, targetWeb: boolean) => void
  getResolvedCache: (key: string, targetWeb: boolean) => string | undefined
  data: {
    [field: string]: any
    name: string
    type: string
    version: string
    main: string
    module: string
    browser: string | Record<string, string | false>
    exports: string | Record<string, any> | string[]
    imports: Record<string, any>
    dependencies: Record<string, string>
  }
}

export function resolvePackageData(
  pkgName: string,
  basedir: string,
  preserveSymlinks = false,
): PackageData | null {
  while (basedir) {
    const pkg = path.join(basedir, 'node_modules', pkgName, 'package.json')
    try {
      if (fs.existsSync(pkg)) {
        const pkgPath = preserveSymlinks ? pkg : safeRealpathSync(pkg)
        const pkgData = loadPackageData(pkgPath)

        return pkgData
      }
    }
    catch { }

    const nextBasedir = path.dirname(basedir)
    if (nextBasedir === basedir)
      break
    basedir = nextBasedir
  }

  return null
}

export function loadPackageData(pkgPath: string): PackageData {
  const data = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const pkgDir = path.dirname(pkgPath)
  const { sideEffects } = data
  let hasSideEffects: (id: string) => boolean
  if (typeof sideEffects === 'boolean') {
    hasSideEffects = () => sideEffects
  }
  else if (Array.isArray(sideEffects)) {
    const finalPackageSideEffects = sideEffects.map((sideEffect) => {
      /*
       * The array accepts simple glob patterns to the relevant files... Patterns like *.css, which do not include a /, will be treated like **\/*.css.
       * https://webpack.js.org/guides/tree-shaking/
       * https://github.com/vitejs/vite/pull/11807
       */
      if (sideEffect.includes('/'))
        return sideEffect

      return `**/${sideEffect}`
    })

    hasSideEffects = createFilter(finalPackageSideEffects, null, {
      resolve: pkgDir,
    })
  }
  else {
    hasSideEffects = () => true
  }

  const pkg: PackageData = {
    dir: pkgDir,
    data,
    hasSideEffects,
    webResolvedImports: {},
    nodeResolvedImports: {},
    setResolvedCache(key: string, entry: string, targetWeb: boolean) {
      if (targetWeb)
        pkg.webResolvedImports[key] = entry
      else
        pkg.nodeResolvedImports[key] = entry
    },
    getResolvedCache(key: string, targetWeb: boolean) {
      if (targetWeb)
        return pkg.webResolvedImports[key]
      else
        return pkg.nodeResolvedImports[key]
    },
  }

  return pkg
}
