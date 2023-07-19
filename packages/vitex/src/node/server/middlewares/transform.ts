import type { NextHandleFunction } from 'connect'
import type { ViteDevServer } from 'vite'
import { cleanUrl, isCSSRequest, isJSRequest } from '../../utils'
import { transformRequest } from '../transformRequest'

export function transformMiddleware(server: Partial<ViteDevServer>): NextHandleFunction {
  return async function viteTransformMiddleware(req, res, next) {
    if (req.method !== 'GET')
      return next()

    const url = cleanUrl(req.url!)

    if (isJSRequest(url) || isCSSRequest(url)) {
      // resolve the module path
      // const file = url.startsWith('/') ? `.${url}` : url
      console.log(url)

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
