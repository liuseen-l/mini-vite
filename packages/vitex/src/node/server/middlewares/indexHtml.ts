import path from 'node:path'
import fsp from 'node:fs/promises'
import fs from 'node:fs'
import type { NextHandleFunction } from 'connect'

export function indexHtmlMiddware(
  serverContext: any,
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.url === '/') {
      const { root, plugins } = serverContext.config
      const { pluginContainer } = serverContext
      // 获取入口index.html
      const indexHtmlPath = path.join(root, 'index.html')

      // 判断入口是否存在
      if (fs.existsSync(indexHtmlPath)) {
        // 读取文件内容
        const rawHtml = await fsp.readFile(indexHtmlPath, 'utf-8')
        let html = rawHtml
        // 遍历plugins
        for (const plugin of plugins) {
          if (plugin.transformIndexHtml)
            // 执行plugin的transformIndexHtml方法
            html = await pluginContainer.transformIndexHtml(html)
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        return res.end(html)
      }
    }
    return next()
  }
}
