import { create } from 'zustand'
import { useEffect } from 'react'
import WebSocketClient, { WebSocketTerminalError } from '../lib/websocket/client'
import type { WebSocketMessages } from '../types/ws'
import { useAuthStore } from './auth'
import { apiClient } from '../lib/apiClient'
import { buildWebSocketUrl } from '../lib/websocket/reconnect'

interface WebSocketState {
  wsClient: WebSocketClient | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  terminalFailure: WebSocketTerminalError | null
  connect: (url?: string) => Promise<void>
  disconnect: () => void
  subscribe: (topics: string[]) => void
  unsubscribe: (topics: string[]) => void
}
type WindowWithWsCallback = typeof globalThis & { wsDisconnectCallback?: () => void }

const noop = (): void => undefined
const isClientReady = (client: WebSocketClient): boolean =>
  client.isReady?.() ?? client.isConnected()

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  const win = globalThis as WindowWithWsCallback
  let connectGeneration = 0
  let cancelPendingConnect: (() => void) | null = null
  let unsubscribeClientEvents = noop
  let unsubscribeTerminal = noop

  const unbindClientEvents = () => {
    unsubscribeClientEvents()
    unsubscribeClientEvents = noop
  }

  win.wsDisconnectCallback = () => {
    get().disconnect()
  }

  return {
    wsClient: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    terminalFailure: null,
    connect: async (url?: string) => {
      const { wsClient, isConnected, isConnecting } = get()
      const wsUrl = url ?? buildWebSocketUrl()

      if (isConnected || isConnecting) {
        return
      }

      const attemptId = ++connectGeneration

      unbindClientEvents()
      unsubscribeTerminal()
      unsubscribeTerminal = noop
      set({ isConnecting: true, error: null, terminalFailure: null })

      try {
        let client = wsClient

        if (!client || !isClientReady(client)) {
          client?.disconnect()
          const authState = useAuthStore.getState()
          const hasAuthCookies = apiClient.hasAuthCookies()

          client =
            hasAuthCookies || authState.isAuthenticated
              ? new WebSocketClient({ url: wsUrl, secure: true })
              : new WebSocketClient({ url: wsUrl })
          set({ wsClient: client })
        }

        const activeClient = client

        const authErrorHandler = (message: WebSocketMessages) => {
          if (attemptId !== connectGeneration) return

          const reason = 'reason' in message ? (message.reason as string | undefined) : undefined
          const suffix = reason ? `: ${reason}` : ''

          set({ error: `WebSocket authentication failed${suffix}` })
        }

        await new Promise<void>((resolve, reject) => {
          let settled = false
          let timeoutId: ReturnType<typeof setTimeout> | null = null

          const cleanup = () => {
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
              timeoutId = null
            }

            cancelPendingConnect = null
          }

          const finish = (outcome?: unknown) => {
            if (settled) return

            settled = true
            cleanup()

            if (outcome === undefined) {
              resolve()
            } else {
              reject(outcome)
            }
          }

          const cancel = () => {
            finish(new Error('Connection cancelled'))
          }

          const markReady = () => {
            finish()
            set({ isConnected: true })
          }

          cancelPendingConnect = cancel
          const subscriptions = [
            activeClient.onMessage('auth_complete', () => {
              if (attemptId === connectGeneration) set({ error: null })
            }),
            activeClient.onMessage('auth_failed', authErrorHandler),
            activeClient.onMessage('auth_expired', () => {
              if (attemptId === connectGeneration) {
                set({ error: 'WebSocket session expired, attempting to reconnect…' })
              }
            }),
            activeClient.onConnection(connected => {
              if (attemptId !== connectGeneration) return

              if (connected && isClientReady(activeClient)) markReady()
              else set({ isConnected: false })
            }),
          ]

          unsubscribeClientEvents = () => {
            for (const unsubscribe of subscriptions) unsubscribe?.()
          }

          unsubscribeTerminal =
            activeClient.onTerminalFailure?.(terminalError => {
              finish(terminalError)
              set({ terminalFailure: terminalError, error: terminalError.message })
            }) ?? noop

          try {
            activeClient.connect()

            if (settled) return
            if (isClientReady(activeClient)) markReady()
            else timeoutId = setTimeout(() => finish(new Error('Connection timeout')), 10000)
          } catch (error) {
            finish(error)
          }
        })

        if (attemptId === connectGeneration) {
          set({ isConnecting: false })
        }
      } catch (error) {
        if (attemptId === connectGeneration) {
          unbindClientEvents()
          set(state => ({
            isConnecting: false,
            error:
              state.terminalFailure?.message ??
              (error instanceof Error ? error.message : 'Connection failed'),
          }))
        }

        throw error
      }
    },
    disconnect: () => {
      connectGeneration += 1
      cancelPendingConnect?.()
      unbindClientEvents()
      unsubscribeTerminal()
      unsubscribeTerminal = noop
      const { wsClient } = get()

      if (wsClient) {
        wsClient.disconnect()
        set({
          wsClient: null,
          isConnected: false,
          isConnecting: false,
          error: null,
          terminalFailure: null,
        })
      }
    },
    subscribe: (topics: string[]) => {
      const { wsClient, isConnected } = get()

      if (!wsClient) {
        console.warn('WebSocket client not available for subscribe')

        return
      }

      if (!isConnected) {
        console.warn('WebSocket not connected, cannot subscribe to topics:', topics)

        return
      }

      wsClient.subscribe(topics)
    },
    unsubscribe: (topics: string[]) => {
      const { wsClient, isConnected } = get()

      if (!wsClient) {
        console.warn('WebSocket client not available for unsubscribe')

        return
      }

      if (!isConnected) {
        console.warn('WebSocket not connected, skipping unsubscribe for topics:', topics)

        return
      }

      wsClient.unsubscribe(topics)
    },
  }
})
interface WebSocketConnectionOptions {
  autoDisconnect?: boolean
  retryDelayMs?: number
}

export function useWebSocketConnection(url?: string, options?: WebSocketConnectionOptions) {
  const { connect, disconnect, isConnected, isConnecting, error } = useWebSocketStore()
  const autoDisconnect = options?.autoDisconnect ?? false
  const retryDelay = options?.retryDelayMs ?? 5000

  useEffect(() => {
    let isMounted = true
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    const stopWatching = useWebSocketStore.subscribe(state => {
      if (state.terminalFailure && retryTimeout !== null) {
        clearTimeout(retryTimeout)
        retryTimeout = null
      }
    })

    const attemptConnection = async () => {
      if (!isMounted) {
        return
      }

      const authState = useAuthStore.getState()

      if (!authState.isAuthenticated) {
        return
      }

      try {
        await connect(url)
      } catch (connectError) {
        console.error('Failed to connect to WebSocket:', connectError)

        if (
          isMounted &&
          !(connectError instanceof WebSocketTerminalError) &&
          !useWebSocketStore.getState().terminalFailure &&
          useAuthStore.getState().isAuthenticated
        ) {
          retryTimeout = setTimeout(() => {
            retryTimeout = null
            void attemptConnection()
          }, retryDelay)
        }
      }
    }

    void attemptConnection()

    return () => {
      isMounted = false
      stopWatching()

      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }

      if (autoDisconnect) {
        disconnect()
      }
    }
  }, [connect, disconnect, url, autoDisconnect, retryDelay])

  return { isConnected, isConnecting, error }
}
