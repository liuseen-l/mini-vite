import type { NextHandleFunction } from 'connect'

// 一个用于加载静态资源的中间件
import sirv from 'sirv'
import { isImportRequest } from '../../utils'

export function serveStaticMiddleware(): NextHandleFunction {
  const serveFromRoot = sirv('./', { dev: true })
  return async function viteServeStaticMiddleware(req, res, next) {
    serveFromRoot(req, res, next)
    // 不处理 ?import 请求
    if (isImportRequest(req.url!))
      return

    next()
  }
}
