import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWebSocketStore } from '../../../stores/websocket'
import { useAlertsLiveSubscription } from './useAlertsLiveSubscription'

type ConnectionHandler = (connected: boolean) => void

interface MockWsClient {
  subscribeToAlerts: ReturnType<typeof vi.fn>
  unsubscribeFromAlerts: ReturnType<typeof vi.fn>
  onConnection: ReturnType<typeof vi.fn>
}

function buildMockClient(): {
  client: MockWsClient
  triggerConnection: (connected: boolean) => void
  unsubscribeConnection: ReturnType<typeof vi.fn>
} {
  let connectionHandler: ConnectionHandler | null = null
  const unsubscribeConnection = vi.fn()
  const client: MockWsClient = {
    subscribeToAlerts: vi.fn(),
    unsubscribeFromAlerts: vi.fn(),
    onConnection: vi.fn((handler: ConnectionHandler) => {
      connectionHandler = handler

      return unsubscribeConnection
    }),
  }

  return {
    client,
    triggerConnection: (connected: boolean) => connectionHandler?.(connected),
    unsubscribeConnection,
  }
}

describe('useAlertsLiveSubscription', () => {
  beforeEach(() => {
    useWebSocketStore.setState({ wsClient: null })
  })

  it('no-ops when wsClient is null', () => {
    const { unmount } = renderHook(() => useAlertsLiveSubscription())

    expect(true).toBe(true)
    unmount()
  })

  it('subscribes to alerts on mount and unsubscribes on unmount', () => {
    const { client, unsubscribeConnection } = buildMockClient()

    useWebSocketStore.setState({ wsClient: client as never })

    const { unmount } = renderHook(() => useAlertsLiveSubscription())

    expect(client.subscribeToAlerts).toHaveBeenCalledTimes(1)
    expect(client.onConnection).toHaveBeenCalledTimes(1)
    expect(client.unsubscribeFromAlerts).not.toHaveBeenCalled()
    expect(unsubscribeConnection).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribeConnection).toHaveBeenCalledTimes(1)
    expect(client.unsubscribeFromAlerts).toHaveBeenCalledTimes(1)
  })

  it('re-subscribes when the connection callback fires with connected=true', () => {
    const { client, triggerConnection } = buildMockClient()

    useWebSocketStore.setState({ wsClient: client as never })

    renderHook(() => useAlertsLiveSubscription())

    expect(client.subscribeToAlerts).toHaveBeenCalledTimes(1)

    triggerConnection(true)
    expect(client.subscribeToAlerts).toHaveBeenCalledTimes(2)

    triggerConnection(false)
    expect(client.subscribeToAlerts).toHaveBeenCalledTimes(2)
  })
})
