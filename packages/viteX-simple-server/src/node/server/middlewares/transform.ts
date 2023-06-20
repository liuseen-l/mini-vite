import { NextHandleFunction } from 'connect';
import { isJSRequest } from '../../utils';
import { transform } from 'esbuild';
import path from 'path';
import { readFile } from 'fs-extra';
import { getCodeWithSourcemap } from '../sourcemap';

export async function doTransform(url: string) {
  // 获取文件类型
  const extname = path.extname(url).slice(1);
  console.log(url);

  const file = url.startsWith('/') ? '.' + url : url;
  const rawCode = await readFile(file, 'utf-8');

  const { code, map } = await transform(rawCode, {
    target: 'esnext',
    format: 'esm',
    sourcemap: true,
    loader: extname as 'js' | 'ts' | 'jsx' | 'tsx',
  });

  return {
    code,
    map,
  };
}

export function transformMiddleware(): NextHandleFunction {
  return async function viteTransformMiddleware(req, res, next) {
    // 只处理get请求
    if (req.method !== 'GET') {
      return next();
    }

    const url: string = req.url!;

    // 判断是否是ts js jsx tsx
    if (isJSRequest(url)) {
      const result = await doTransform(url);
      if (result) {
        // const code = result.code;
        const code = getCodeWithSourcemap(result.code, result.map);
        res.setHeader('Content-Type', 'application/javascript');
        // 处理完直接就返回了
        return res.end(code);
      }
    }
    // 如果是css交给下一个中间件
    next();
  };
}
