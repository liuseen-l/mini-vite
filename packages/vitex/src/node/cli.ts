import { cac } from 'cac'
import { createServer } from './server'

const cli = cac()

cli
  .command('[root]')
  .alias('serve') // the command is called 'serve' in Vite's API
  .alias('dev') // alias to align with the script name
  .action(async () => {
    const startTime = Date.now()
    try {
      const server = await createServer()

      const { middlewares: app } = server
      app!.listen(3000, async () => {
        // await optimize(root)
        console.log(
          ('🚀 No-Bundle 服务已经成功启动!'),
          `耗时: ${Date.now() - startTime}ms`,
        )
        console.log(`> 本地访问路径: ${('http://localhost:3000')}`)
      })
    }
    catch (error) {

    }
  })

cli.parse()
