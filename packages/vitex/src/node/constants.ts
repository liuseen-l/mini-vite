import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_CONFIG_FILES = [
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'vite.config.cjs',
  'vite.config.mts',
  'vite.config.cts',
]
export const HMR_PORT = 24678
export const PRE_BUNDLE_DIR = path.join('node_modules', '.vitex-bundle')
export const DEFAULT_EXTENSIONS = [
  '.mjs',
  '.js',
  '.mts',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
]
export const DEFAULT_EXTERSIONS = ['.tsx', '.ts', '.jsx', 'js']
export const VITE_PACKAGE_DIR = resolve(
  // import.meta.url is `dist/node/constants.js` after bundle
  fileURLToPath(import.meta.url),
  '../../..',
)
export const FS_PREFIX = '/@fs/'
export const CLIENT_ENTRY = resolve(VITE_PACKAGE_DIR, 'dist/client/client.mjs')
export const ENV_ENTRY = resolve(VITE_PACKAGE_DIR, 'dist/client/env.mjs')

export const DEFAULT_MAIN_FIELDS = [
  'module',
  'jsnext:main', // moment still uses this...
  'jsnext',
]

export const BARE_IMPORT_RE = /^[\w@][^:]/

export const EXTERNAL_TYPES = [
  'css',
  'less',
  'sass',
  'scss',
  'styl',
  'stylus',
  'pcss',
  'postcss',
  'vue',
  'svelte',
  'marko',
  'astro',
  'png',
  'jpe?g',
  'gif',
  'svg',
  'ico',
  'webp',
  'avif',
]
export const CLIENT_PUBLIC_PATH = '/@vite/client'
