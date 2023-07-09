import { cac } from 'cac'
import { createServer } from './server'

const cli = cac()

cli
  .command('[root]')
  .alias('serve') // the command is called 'serve' in Vite's API
  .alias('dev') // alias to align with the script name
  .action(async () => {
    await createServer()
  })

cli.parse()
