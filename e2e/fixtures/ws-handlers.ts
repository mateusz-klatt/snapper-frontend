import type { Page, WebSocketRoute } from '@playwright/test'

interface WsControl {
  pushFrame: (frame: object) => Promise<void>
  closeAll: () => Promise<void>
}

/**
 * Mock the application's WebSocket so REST mocks don't trigger real
 * connection attempts. The route accepts the connection and stays
 * silent until a test scripts a frame via `pushFrame()`.
 *
 * Returns a control object so the caller can drive the WS deterministically:
 *
 *   const ws = await mockWebSocket(page)
 *   await page.goto('/')
 *   await ws.pushFrame(makeCandle({ ... }))
 *
 * The control object's `closeAll()` is a teardown helper for tests
 * that want to assert reconnect behaviour (not used in the v1.3 flows).
 */
export async function mockWebSocket(page: Page): Promise<WsControl> {
  const sockets: WebSocketRoute[] = []

  await page.routeWebSocket(/\/ws/, ws => {
    sockets.push(ws)
    // Swallow client → server messages so subscribe/heartbeat traffic
    // is harmless. Tests can override per-frame logic if needed.
    ws.onMessage(() => {})
    ws.onClose(() => {
      const idx = sockets.indexOf(ws)

      if (idx >= 0) sockets.splice(idx, 1)
    })
  })

  return {
    pushFrame: async frame => {
      for (const ws of sockets) {
        ws.send(JSON.stringify(frame))
      }
    },
    closeAll: async () => {
      for (const ws of sockets.splice(0)) {
        ws.close()
      }
    },
  }
}
