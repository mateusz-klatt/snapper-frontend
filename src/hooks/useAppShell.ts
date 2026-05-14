import { useAppStore } from '../stores/app'
import { useWebSocketConnection } from '../stores/websocket'
import { useWSDispatcher } from './useWSDispatcher'

interface AppShellState {
  isConnected: boolean
  connectionLag: number
  subscribedTopicsCount: number
}

const APP_SHELL_TOPICS: readonly string[] = Object.freeze([
  'ai_reviews.',
  'processes.events.summary.',
  'processes.events.configured.',
  'processes.events.runs.',
  'strategies.events.list.',
])

export function useAppShell(): AppShellState {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  useWSDispatcher({ enabled: !isTimeTraveling, topics: APP_SHELL_TOPICS as string[] })
  useWebSocketConnection(undefined, { autoDisconnect: true })
  const { isConnected, connectionLag, subscribedTopics } = useAppStore()

  return {
    isConnected,
    connectionLag,
    subscribedTopicsCount: subscribedTopics.length,
  }
}
