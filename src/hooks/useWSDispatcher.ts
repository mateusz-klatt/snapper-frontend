import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketStore } from '../stores/websocket'
import { WSDispatcher, getDispatcher, releaseDispatcher } from '../stores/wsDispatcher'
import { useProcessMetricsStore } from '../stores/processMetrics'

interface UseWSDispatcherOptions {
  enabled?: boolean
  topics?: string[]
}

export function useWSDispatcher(options: UseWSDispatcherOptions = {}): WSDispatcher | null {
  const { enabled = true, topics } = options
  const queryClient = useQueryClient()
  const { wsClient, isConnected } = useWebSocketStore()
  const [dispatcher, setDispatcher] = useState<WSDispatcher | null>(null)

  useEffect(() => {
    if (!enabled) {
      setDispatcher(null)

      return
    }

    let newDispatcher: WSDispatcher

    if (topics) {
      useProcessMetricsStore.getState().reset()
      newDispatcher = new WSDispatcher({
        queryClient,
        topics,
      })
    } else {
      newDispatcher = getDispatcher(queryClient)
    }

    setDispatcher(newDispatcher)

    return () => {
      if (topics) newDispatcher.detach()
      else releaseDispatcher(newDispatcher)
    }
  }, [enabled, queryClient, topics])
  useEffect(() => {
    if (!enabled || !dispatcher) {
      return
    }

    if (wsClient && isConnected) {
      dispatcher.attach(wsClient)
    } else {
      dispatcher.detach()
    }

    return () => dispatcher.detach()
  }, [enabled, dispatcher, wsClient, isConnected])

  return dispatcher
}
