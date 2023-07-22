import type { ViteDevServer } from 'vite'
import { getShortName } from '../utils'

export function bindingHMREvents(serverContext: ViteDevServer) {
  const { watcher, ws } = serverContext
  const { root } = serverContext.config

  // 当文件发生变化的时候
  watcher.on('change', async (file) => {
    console.log(`✨${'[hmr]'} ${file} changed`)
    const { moduleGraph } = serverContext
    // 清除模块依赖图中的缓存
    await moduleGraph.invalidateModule(file as any)
    // 向客户端发送更新信息

    ws.send({
      type: 'update',
      updates: [
        {
          type: 'js-update',
          timestamp: Date.now(),
          path: `/${getShortName(file, root)}`,
          acceptedPath: `/${getShortName(file, root)}`,
        },
      ],
    })
  })
}
