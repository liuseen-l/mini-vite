import path from 'node:path'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'packages/vitex/src/node/cli.ts',
    // client: 'package/vitex/src/client/client.ts',
  },
  outDir: path.resolve(__dirname, 'packages/vitex/dist'),
  format: ['esm', 'cjs'],
  target: 'es2020',
  sourcemap: true,
  splitting: false,
  external: ['@babel/core', 'react-refresh', 'vite'],
})
