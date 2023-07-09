#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const dir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dir, '../dist/cli.js');

(async () => {
  await execa(`esno ${rootDir}`, {
    stdio: 'inherit',
  })
})()
