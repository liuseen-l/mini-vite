import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    client: 'packages/vitex/src/client/client.ts',
  },
  outDir: 'packages/vitex/dist',
  format: ['esm', 'cjs'],
  target: 'es2020',
  sourcemap: true,
  splitting: false,
  external: ['@babel/core', 'react-refresh'],
})
