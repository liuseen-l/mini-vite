import fsp from 'node:fs/promises'
import type { ViteDevServer } from 'vite'

export function transformRequest(url: string, server: Partial<ViteDevServer>) {
  const request = doTransform(url, server)
  return request
}

async function doTransform(url: string, server: Partial<ViteDevServer>) {
  const { pluginContainer } = server
  // 原则上需要通过判断当前的模块是不是第三方模块才执行resolveId,但在这里我们都执行了
  const resolved = (await pluginContainer!.resolveId(url, undefined)) ?? undefined
  const result = loadAndTransform(url, server, (resolved as any))
  return result
}

async function loadAndTransform(url: string, server: Partial<ViteDevServer>, resolved?: string) {
  const { pluginContainer } = server

  let code: string | null = null
  const fileUrl = resolved || url

  // 传入解析文件的路径，看用户是否需要对该路径的文件内容做出更改

  const loadResult = await pluginContainer!.load(fileUrl)

  // 如果内容为空，那么直接读取
  if (loadResult === null) {
    try {
      // 加载文件，获取文件的内容
      code = await fsp.readFile(fileUrl, 'utf-8')
    }
    catch (e) {
      return {
        code: 'error',
      }
    }
  }
  else {
    // 如果用户做出了操作，那么就用用户操作后的内容
    code = loadResult as any
  }

  if (code == null) {
    return {
      code: 'error',
    }
  }

  const transformResult = await pluginContainer!.transform(code, fileUrl)

  code = (transformResult || code) as any

  return {
    code,
  }
}
