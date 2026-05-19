import { useEffect } from 'react'
import { useWebSocketStore } from '../../../stores/websocket'

/**
 * Live subscription to the ``alerts.*`` ZMQ topic family.
 *
 * Owns the WS subscription lifecycle scoped to the Alerts tab. The
 * Phase E sidecar fanout publishes one ``AlertEventData`` frame per
 * persisted alert; the bridge forwards frames whose
 * ``user_public_id`` matches the authenticated principal. The
 * dispatcher (see ``stores/wsDispatcher.ts``) invalidates the
 * ``['alerts', 'history']`` query family on each received frame and
 * spawns a priority-tinted toast.
 *
 * Subscribe-on-mount mirrors the
 * ``useBacktestProgressSubscription`` precedent: users who never
 * open the Alerts tab don't need the ZMQ stream open. On
 * reconnect (``onConnection(true)``) we re-issue the subscribe so
 * the bridge re-creates its per-prefix SUB socket.
 *
 * Calling code: invoke once at the top of `Notifications.tsx` body —
 * the cleanup returned by `useEffect` handles unsubscribe on
 * unmount.
 */
export function useAlertsLiveSubscription(): void {
  const { wsClient } = useWebSocketStore()

  useEffect(() => {
    if (!wsClient) {
      return
    }

    wsClient.subscribeToAlerts()
    const unsubscribeConnection = wsClient.onConnection((connected: boolean) => {
      if (connected) {
        wsClient.subscribeToAlerts()
      }
    })

    return () => {
      unsubscribeConnection()
      wsClient.unsubscribeFromAlerts()
    }
  }, [wsClient])
}
