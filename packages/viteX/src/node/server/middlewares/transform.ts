import { NextHandleFunction } from 'connect';
import { isCSSRequest, isJSRequest } from '../../utils';
import type { ViteDevServer } from '../index';
import { transformRequest } from '../transformRequest';

export function transformMiddleware(server: ViteDevServer): NextHandleFunction {
  return async function viteTransformMiddleware(req, res, next) {
    if (req.method !== 'GET') {
      return next();
    }

    const url: string = req.url!;
    
    if (isJSRequest(url) || isCSSRequest(url)) {
      // 解析模块路径
      const file = url.startsWith('/') ? '.' + url : url;

      // 遍历所有的插件
      const result = await transformRequest(file, server);
      
      res.setHeader('Content-Type', 'application/javascript');
      // 最终的 code 就是转换后的代码
      return res.end(result.code);
    }
    next();
  };
}
