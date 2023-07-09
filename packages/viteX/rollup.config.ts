import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import MagicString from 'magic-string'
import type { Plugin, RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url)).toString(),
)

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function createNodePlugins(
  isProduction: boolean,
  sourceMap: boolean,
  declarationDir: string | false,
): (Plugin | false)[] {
  return [
    nodeResolve({ preferBuiltins: true }),
    typescript({
      tsconfig: path.resolve(__dirname, 'src/node/tsconfig.json'),
      sourceMap,
      declaration: declarationDir !== false,
      declarationDir: declarationDir !== false ? declarationDir : undefined,
    }),
    commonjs({
      extensions: ['.js'],
      ignore: ['bufferutil', 'utf-8-validate'],
    }),
    json(),
    isProduction
    && cjsPatchPlugin(),
  ]
}

function createNodeConfig(isProduction: boolean) {
  return defineConfig({
    input: {
      index: path.resolve(__dirname, 'src/node/index.ts'),
      cli: path.resolve(__dirname, 'src/node/cli.ts'),
      constants: path.resolve(__dirname, 'src/node/constants.ts'),
    },
    output: {
      dir: path.resolve(__dirname, 'dist'),
      sourcemap: !isProduction,
    },
    external: [
      ...Object.keys(pkg.dependencies),
      ...(isProduction ? [] : Object.keys(pkg.devDependencies)),
    ],
    plugins: createNodePlugins(
      isProduction,
      !isProduction,
      isProduction ? false : './dist/node',
    ),
  })
}

export default (commandLineArgs: any): RollupOptions[] => {
  const isDev = commandLineArgs.watch
  const isProduction = !isDev

  return defineConfig([
    createNodeConfig(isProduction),
    // createCjsConfig(isProduction),
  ])
}

/**
 * Inject CJS Context for each deps chunk
 */
function cjsPatchPlugin(): Plugin {
  const cjsPatch = `
import { fileURLToPath as __cjs_fileURLToPath } from 'node:url';
import { dirname as __cjs_dirname } from 'node:path';
import { createRequire as __cjs_createRequire } from 'node:module';

const __filename = __cjs_fileURLToPath(import.meta.url);
const __dirname = __cjs_dirname(__filename);
const require = __cjs_createRequire(import.meta.url);
const __require = require;
`.trimStart()

  return {
    name: 'cjs-chunk-patch',
    renderChunk(code, chunk) {
      if (!chunk.fileName.includes('chunks/dep-'))
        return

      const match = code.match(/^(?:import[\s\S]*?;\s*)+/)
      const index = match ? match.index! + match[0].length : 0
      const s = new MagicString(code)
      // inject after the last `import`
      s.appendRight(index, cjsPatch)
      console.log(`patched cjs context: ${chunk.fileName}`)

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      }
    },
  }
}

// #endregion
