import { cac } from 'cac'
import { createServer } from './server'

// 引入
const cli = cac()// 实例化

cli
  .command('[root]')// --前面没匹配到的
  .alias('serve') // the command is called 'serve' in Vite's API
  .alias('dev') // alias to align with the script name
  .action(async (cmd, options) => {
    await createServer()
  })

cli.parse()
