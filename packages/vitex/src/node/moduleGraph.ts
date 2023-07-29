import type { TransformResult } from 'rollup'
import { cleanUrl } from './utils'

export class ModuleNode {
  // 资源访问 url
  url: string
  // 资源绝对路径
  id: string | null = null
  // 该模块的引用方
  importers = new Set<ModuleNode>()
  // 该模块所依赖的模块
  importedModules = new Set<ModuleNode>()
  // 经过 transform 钩子后的编译结果
  transformResult: TransformResult | null = null
  // 上一次热更新的时间戳
  lastHMRTimestamp = 0
  constructor(url: string) {
    this.url = url
  }
}

export class ModuleGraph {
  // 资源 url 到 ModuleNode 的映射表
  urlToModuleMap = new Map<string, ModuleNode>()
  // 资源绝对路径到 ModuleNode 的映射表
  idToModuleMap = new Map<string, ModuleNode>()

  constructor(
    private resolveId: (url: string) => Promise<string | null>,
  ) { }

  getModuleById(id: string): ModuleNode | undefined {
    return this.idToModuleMap.get(id)
  }

  // rawUrl 为/src/main.ts 这种路径
  async getModuleByUrl(rawUrl: string): Promise<ModuleNode | undefined> {
    // 这里我们的实现上 url 实际上等于 rawUrl，但是vite源码会在_resolve中对rawUrl进行一些处理
    const { url } = await this._resolve(rawUrl)
    // 返回该url所对应的模块
    return this.urlToModuleMap.get(url)
  }

  // rawUrl 为/src/main.ts 这种路径
  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    // url为请求路径 /src/main.ts ，resolveId为绝对路径
    const { url, resolvedId } = await this._resolve(rawUrl)

    // 首先检查缓存
    if (this.urlToModuleMap.has(url))
      return this.urlToModuleMap.get(url) as ModuleNode

    // 若无缓存，更新 urlToModuleMap 和 idToModuleMap
    const mod = new ModuleNode(url)
    mod.id = resolvedId
    // 一个用原始路径存，一个用绝对路径存
    this.urlToModuleMap.set(url, mod)
    this.idToModuleMap.set(resolvedId, mod)
    return mod
  }

  async updateModuleInfo(
    mod: ModuleNode,
    importedModules: Set<string | ModuleNode>,
  ) {
    const prevImports = mod.importedModules
    for (const curImports of importedModules) {
      const dep
        = typeof curImports === 'string'
          ? await this.ensureEntryFromUrl(cleanUrl(curImports))
          : curImports
      if (dep) {
        mod.importedModules.add(dep)
        dep.importers.add(mod)
      }
    }
    // 清除已经不再被引用的依赖
    for (const prevImport of prevImports) {
      if (!importedModules.has(prevImport.url))
        prevImport.importers.delete(mod)
    }
  }

  // HMR 触发时会执行这个方法
  // 将路径所对应模块的缓存清空，以及引入了该模块的上层模块的缓存也清空
  /**
   *
   *  /src/main.ts（transformResult中引入了App.tsx）
   *     | transformResult清空
   *     | /src/App.tsx（如果这个文件变化了）
   *       | transformResult清空
   *
   *
   */
  invalidateModule(file: string) {
    // 由于idToModuleMap 和 urlToModuleMap存入的模块是同一个对象，因此操作一个另一个也变了，因此只需操作一个
    const mod = this.idToModuleMap.get(file)
    if (mod) {
      // 更新时间戳
      mod.lastHMRTimestamp = Date.now()
      // 这里设置为null，那么transformRequest当中判断是否命中缓存就会为否
      mod.transformResult = null
      // 递归向上，将引入了该模块的上层代码的缓存也都清空
      mod.importers.forEach((importer) => {
        this.invalidateModule(importer.id!)
      })
    }
  }

  private async _resolve(
    url: string,
  ): Promise<{ url: string; resolvedId: string }> {
    // 调用container.reolveId处理路径
    const resolved = await this.resolveId(url)
    const resolvedId = resolved || url
    return { url, resolvedId }
  }
}
