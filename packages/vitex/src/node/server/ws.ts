import type connect from 'connect'
import { WebSocket, WebSocketServer } from 'ws'
import { HMR_PORT } from '../constants'

export function createWebSocketServer(server: connect.Server): {
  send: (msg: string) => void
  close: () => void
} {
  const wss: WebSocketServer = new WebSocketServer({ port: HMR_PORT })
  wss.on('connection', (socket: any) => {
    socket.send(JSON.stringify({ type: 'connected' }))
  })

  wss.on('error', (e: Error & { code: string }) => {
    if (e.code !== 'EADDRINUSE')
      console.error(`WebSocket server error:\n${e.stack || e.message}`)
  })

  return {
    send(payload: Object) {
      const stringified = JSON.stringify(payload)
      // 遍历每个连接了socket的client实例
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN)
          client.send(stringified)
      })
    },

    close() {
      wss.close()
    },
  }
}
