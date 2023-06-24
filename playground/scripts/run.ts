import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const dir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dir, '../../packages/viteX/src/node/cli.ts')

async function run() {
  await execa(`esno ${rootDir}`, {
    stdio: 'inherit',
  })
}
run()
