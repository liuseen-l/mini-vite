import type { NextHandleFunction } from 'connect'
import type { ViteDevServer } from 'vite'
import { isCSSRequest, isImportRequest, isJSRequest } from '../../utils'
import { transformRequest } from '../transformRequest'

export function transformMiddleware(server: Partial<ViteDevServer>): NextHandleFunction {
  return async function viteTransformMiddleware(req, res, next) {
    if (req.method !== 'GET')
      return next()

    // 这里clearUrl的话，isImport不会命中
    const url = req.url!

    // 在中间件中先判断一下当前引入的模块是否为需要处理的模块
    if (isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
      // /src/main.ts中才有svg，因此 /src/main.ts的时候能进入这里，执行完之后svg会被重写，添加?import，因此当请求到?import的时候也会走就来
      const result = await transformRequest(url, server)

      if (!result)
        return next()

      // if (result && typeof result !== 'string')
      //   result = result.code as any

      // 编译完成，返回响应给浏览器
      res.setHeader('Content-Type', 'application/javascript')
      // 最终的 code 就是转换后的代码
      return res.end(result.code)
    }
    next()
  }
}
