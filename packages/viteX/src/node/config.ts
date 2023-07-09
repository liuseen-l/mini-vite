import path, { resolve } from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { dynamicImport, isBuiltin, isObject, lookupFile, normalizePath } from './utils'
import { DEFAULT_CONFIG_FILES, DEFAULT_EXTENSIONS } from './constants'
import type { Plugin } from './server'
import { tryNodeResolve } from './plugins/resolve'

export interface UserConfig {
  root?: string
  plugins?: Plugin[]
}

export interface ConfigEnv {
  command: 'build' | 'serve'
  mode: string
  ssrBuild?: boolean
}
export type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>
export type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn

export function defineConfig(config: UserConfigExport) {
  return config
}

export type ResolvedConfig = Readonly<{
  plugins?: Plugin[]
}>

export async function resolveConfig(
  command: 'build' | 'serve',
  defaultMode = 'development',
): Promise<ResolvedConfig | undefined> {
  const mode = defaultMode

  const configEnv = {
    mode,
    command,
  }
  try {
    const config = await loadConfigFromFile(configEnv)

    return undefined
  }
  catch (error) {
    console.log('resolve config error')
  }
}

export async function loadConfigFromFile(
  configEnv: ConfigEnv,
  configRoot: string = process.cwd(),
  configFile?: string,
): Promise<{
  path: string
  config: UserConfig
  dependencies: string[]
} | null> {
  // 配置文件的路径
  let resolvedPath: string | undefined

  if (configFile) {
    resolvedPath = resolve(configFile)
  }

  else {
    for (const filename of DEFAULT_CONFIG_FILES) {
      const filePath = resolve(configRoot, filename)
      if (!fs.existsSync(filePath))
        continue
      resolvedPath = filePath
      break
    }
  }

  if (!resolvedPath)
    return null

  let isESM = false
  if (/\.m[jt]s$/.test(resolvedPath)) {
    isESM = true
  }
  else if (/\.c[jt]s$/.test(resolvedPath)) {
    isESM = false
  }
  else {
    try {
      // pkg是package.json的文件路径
      const pkg = lookupFile(configRoot, ['package.json'])
      isESM
        = !!pkg && JSON.parse(fs.readFileSync(pkg, 'utf-8')).type === 'module'
    }
    catch (e) { }
  }

  try {
    const bundled = await bundleConfigFile(resolvedPath, isESM)
    // console.log(bundled.code);

    const userConfig = await loadConfigFromBundledFile(
      resolvedPath,
      bundled.code,
      isESM,
    )
    console.log(userConfig)

    const config = await (typeof userConfig === 'function'
      ? userConfig(configEnv)
      : userConfig)

    if (!isObject(config))
      throw new Error('config must export or return an object.')

    return {
      path: normalizePath(resolvedPath),
      config,
      dependencies: bundled.dependencies,
    }
  }
  catch (e) {
    throw e
  }
}

async function bundleConfigFile(
  fileName: string,
  isESM: boolean,
): Promise<{ code: string; dependencies: string[] }> {
  const dirnameVarName = '__vite_injected_original_dirname'
  const filenameVarName = '__vite_injected_original_filename'
  const importMetaUrlVarName = '__vite_injected_original_import_meta_url'
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    outfile: 'out.js',
    write: false,
    target: ['node14.18', 'node16'],
    platform: 'node',
    bundle: true,
    format: isESM ? 'esm' : 'cjs',
    mainFields: ['main'],
    sourcemap: 'inline',
    metafile: true,
    define: {
      '__dirname': dirnameVarName,
      '__filename': filenameVarName,
      'import.meta.url': importMetaUrlVarName,
    },
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          const packageCache = new Map()
          const resolveByViteResolver = (
            id: string,
            importer: string,
            isRequire: boolean,
          ) => {
            return tryNodeResolve(
              id,
              importer,
              {
                root: path.dirname(fileName), // 配置文件路径
                isBuild: true,
                isProduction: true,
                preferRelative: false,
                tryIndex: true,
                mainFields: [],
                browserField: false,
                conditions: [],
                overrideConditions: ['node'],
                dedupe: [],
                extensions: DEFAULT_EXTENSIONS,
                preserveSymlinks: false,
                packageCache,
                isRequire,
              },
              false,
            )?.id
          }
          const isESMFile = (id: string): boolean => {
            if (id.endsWith('.mjs'))
              return true
            if (id.endsWith('.cjs'))
              return false

            const nearestPackageJson = false

            return (
              !!nearestPackageJson
            )
          }

          // externalize bare imports
          build.onResolve(
            { filter: /^[^.].*/ },
            // id为模块路径,importer为父模块路径，kind为导入方式(import,require)
            async ({ path: id, importer, kind }) => {
              if (
                kind === 'entry-point'
                || path.isAbsolute(id)
                || isBuiltin(id)
              )
                return

              // partial deno support as `npm:` does not work with esbuild
              if (id.startsWith('npm:'))
                return { external: true }

              // 配置文件的类型
              const isImport = isESM || kind === 'dynamic-import'
              let idFsPath: string | undefined
              try {
                idFsPath = resolveByViteResolver(id, importer, !isImport)
                console.log(idFsPath)
              }
              catch (e) {
                // 如果是 cjs
                if (!isImport) {
                  let canResolveWithImport = false
                  try {
                    canResolveWithImport = !!resolveByViteResolver(
                      id,
                      importer,
                      false,
                    )
                  }
                  catch { }
                  if (canResolveWithImport) {
                    throw new Error(
                      `Failed to resolve ${JSON.stringify(
                        id,
                      )}. This package is ESM only but it was tried to load by \`require\`. See http://vitejs.dev/guide/troubleshooting.html#this-package-is-esm-only for more details.`,
                    )
                  }
                }
                throw e
              }
              if (idFsPath && isImport)
                idFsPath = pathToFileURL(idFsPath).href

              if (idFsPath && !isImport && isESMFile(idFsPath)) {
                throw new Error(
                  `${JSON.stringify(
                    id,
                  )} resolved to an ESM file. ESM file cannot be loaded by \`require\`. See http://vitejs.dev/guide/troubleshooting.html#this-package-is-esm-only for more details.`,
                )
              }
              return {
                path: idFsPath,
                external: true,
              }
            },
          )
        },
      },
      {
        name: 'inject-file-scope-variables',
        setup(build) {
          build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
            const contents = await fsp.readFile(args.path, 'utf8')
            const injectValues
              = `const ${dirnameVarName} = ${JSON.stringify(
                path.dirname(args.path),
              )};`
              + `const ${filenameVarName} = ${JSON.stringify(args.path)};`
              + `const ${importMetaUrlVarName} = ${JSON.stringify(
                pathToFileURL(args.path).href,
              )};`

            return {
              loader: args.path.endsWith('ts') ? 'ts' : 'js',
              contents: injectValues + contents,
            }
          })
        },
      },
    ],
  })
  const { text } = result.outputFiles[0]
  return {
    code: text,
    dependencies: result.metafile ? Object.keys(result.metafile.inputs) : [],
  }
}

const _require = createRequire(import.meta.url)
const promisifiedRealpath = promisify(fs.realpath)

interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any
}
async function loadConfigFromBundledFile(
  fileName: string,
  bundledCode: string,
  isESM: boolean,
): Promise<UserConfigExport> {
  if (isESM) {
    const fileBase = `${fileName}.timestamp-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`
    const fileNameTmp = `${fileBase}.mjs`
    const fileUrl = `${pathToFileURL(fileBase)}.mjs`

    // 将打包好的配置文件存入文件系统
    await fsp.writeFile(fileNameTmp, bundledCode)
    try {
      // 为什么要new Function，因为防止打包vite源码的时候，将这部分代码打进去
      return (await dynamicImport(fileUrl)).default
    }
    finally {
      // 引入完再删掉
      fs.unlink(fileNameTmp, () => { })
    }
  }
  else {
    const extension = path.extname(fileName)
    const realFileName = await promisifiedRealpath(fileName)
    const loaderExt = extension in _require.extensions ? extension : '.js'
    const defaultLoader = _require.extensions[loaderExt]!
    _require.extensions[loaderExt] = (module: NodeModule, filename: string) => {
      if (filename === realFileName)
        (module as NodeModuleWithCompile)._compile(bundledCode, filename)

      else
        defaultLoader(module, filename)
    }
    // clear cache in case of server restart
    delete _require.cache[_require.resolve(fileName)]
    const raw = _require(fileName)
    _require.extensions[loaderExt] = defaultLoader
    return raw.__esModule ? raw.default : raw
  }
}
