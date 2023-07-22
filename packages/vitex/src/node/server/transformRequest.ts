import fsp from 'node:fs/promises'
import type { ViteDevServer } from 'vite'
import type { ModuleNode } from '../moduleGraph'
import { cleanUrl } from '../utils'

export function transformRequest(url: string, server: Partial<ViteDevServer>) {
  const request = doTransform(url, server)
  return request
}

async function doTransform(url: string, server: Partial<ViteDevServer>) {
  const { pluginContainer } = server

  // /src/main.ts这种路径
  url = cleanUrl(url)

  const module = await server!.moduleGraph!.getModuleByUrl(url)

  // check if we have a fresh cache
  const cached
    = module && (module.transformResult)
  /**
   * 第一次：undefined
   * 第二次：ModuleNode {
      id: 'F:\\forProjects\\mini-vite\\playground\\src\\main.ts',
      importers: Set(0) {},
      importedModules: Set(0) {},
      transformResult: 'import { head } from "/node_modules/.vitex-bundle/lodash-es.js";\n' +
        'import { subModule } from "/src/sub-module.ts";\n' +
        'import { ReactComponent } from "/src/react-component.tsx";\n' +
        'import "/src/style/style.css";\n' +
        'console.log(head([1, 2, 3]));\n' +
        'const app = document.getElementById("app");\n' +
        'app.innerText = "Hello World";\n' +
        'subModule(app);\n' +
        'const comp = ReactComponent();\n' +
        'const root = ReactDOM.createRoot(document.getElementById("react-root"));\n' +
        'root.render(comp);\n',
      lastHMRTimestamp: 0,
      url: '/src/main.ts'
    }
   *
   */

  if (cached) {
    return {
      code: cached,
    }
  }

  // 原则上需要通过判断当前的模块是不是第三方模块才执行resolveId,但在这里我们都执行了
  // const resolved = (await pluginContainer!.resolveId(url, undefined)) ?? undefined
  const resolved = module
    ? undefined
    : (await pluginContainer!.resolveId(url, undefined)) ?? undefined

  // F:\forProjects\mini-vite\playground\src\main.ts 这种路径
  // console.log(resolved)

  // resolve
  const id = (module?.id ?? resolved ?? url) as string
  // 当被处理后的svg比如/src/logo.svg?import 走到这里的时候，经过resolve插件的处理会被转回成 /src/logo.svg

  const result = loadAndTransform(id, server, url, module, (resolved as any))
  return result
}

async function loadAndTransform(url: string, server: Partial<ViteDevServer>, rawUrl: string, mod?: ModuleNode, resolved?: string) {
  const { pluginContainer, moduleGraph } = server

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
  // ensure module in graph after successful load
  mod ??= await moduleGraph!.ensureEntryFromUrl(rawUrl)

  // 这里可以将含有svg的代码传进去
  const transformResult = await pluginContainer!.transform(code, fileUrl)
  // 当中执行importAnalysis插件的时候会缓存业务代码

  code = (transformResult || code) as any

  // 缓存xxx路径中的代码片段
  /**
   * ModuleNode {
    id: 'F:\\forProjects\\mini-vite\\playground\\src\\main.ts',
    transformResult: 'import { head } from "/node_modules/.vitex-bundle/lodash-es.js";\n' +
      'import { subModule } from "/src/sub-module.ts";\n' +
      'import { ReactComponent } from "/src/react-component.tsx";\n' +
      'import "/src/style/style.css";\n' +
      'console.log(head([1, 2, 3]));\n' +
      'const app = document.getElementById("app");\n' +
      'app.innerText = "Hello World";\n' +
      'subModule(app);\n' +
      'const comp = ReactComponent();\n' +
      'const root = ReactDOM.createRoot(document.getElementById("react-root"));\n' +
      'root.render(comp);\n',
    url: '/src/main.ts'，
    .......
  }
   */
  if (mod)
    mod.transformResult = code

  return {
    code,
  }
}
