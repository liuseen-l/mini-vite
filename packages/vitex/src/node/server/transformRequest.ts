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
  // 当被处理后的svg比如/src/logo.svg?import 走到这里的时候，经过resolve插件的处理会被转回成 /src/logo.svg

  const result = loadAndTransform(url, server, (resolved as any))
  return result
}

async function loadAndTransform(url: string, server: Partial<ViteDevServer>, resolved?: string) {
  const { pluginContainer } = server

  let code: string | null = null
  const fileUrl = resolved || url

  // 传入解析文件的路径，看用户是否需要对该路径的文件内容做出更改
  const loadResult = await pluginContainer!.load(fileUrl)
  // 这里可以加载/src/main.ts文件当中内容，当中会有svg
  // 当被处理后的svg比如/src/logo.svg?import 走到这里的时候，此时的路径为/src/logo.svg，因此会被asstes插件的load处理，
  // 返回虚拟模块,而虚拟模块就是返回静态资源，会被sirv处理返回

  // 如果内容为空，那么直接读取
  if (loadResult === null) {
    try {
      // 加载文件，获取文件的内容,为了传给transform，保证code是有值的
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
  // 这里可以将含有svg的代码传进去
  const transformResult = await pluginContainer!.transform(code, fileUrl)

  code = (transformResult || code) as any

  return {
    code,
  }
}
