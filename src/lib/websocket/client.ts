import type {
  WebSocketMessages,
  PongWithRtt,
  WSAuthRequiredResponse,
  WSAuthOkResponse,
  WSAuthCompleteResponse,
  WSAuthFailedResponse,
  WSReauthRequiredResponse,
  WSReauthOkResponse,
  CandleData,
} from '../../types/ws'
import { parseWsMessage } from '../schemas/ws'
import {
  WebSocketClientOptions,
  MessageHandler,
  ConnectionHandler,
  TypedMessageHandler,
  WebSocketMessageType,
} from './types'
import { v7 as uuid7 } from 'uuid'
import {
  getMessageTopic,
  shouldThrottle,
  buildMarketTopic,
  MARKET_TOPIC_PREFIX,
  ORDERS_COMMANDS_PREFIX,
  ORDERS_EVENTS_PREFIX,
  SIGNALS_TOPIC_PREFIX,
  HEARTBEATS_TOPIC_PREFIX,
  ALERTS_TOPIC_PREFIX,
  getSubscriptionTopics,
} from './topics'
import {
  calculateReconnectDelay,
  shouldReconnect,
  createHeartbeatMessage,
  flushThrottledMessages,
  buildWebSocketUrl,
} from './reconnect'
import { getWsToken, isAuthControlMessage, WsTicketNetworkError } from './auth'
import { APIError } from '../api/error'
import { getTracker } from '../sequenceTracker'

const TELEMETRY_TYPES = new Set(['ping'])
const CONTROL_TYPES = new Set([
  'authenticate',
  'reauth',
  'subscribe',
  'unsubscribe',
  'get_subscriptions',
])

function isTerminalAuthError(error: unknown): boolean {
  return error instanceof APIError && (error.status === 401 || error.status === 403)
}

function isTransientTicketError(error: unknown): boolean {
  if (error instanceof WsTicketNetworkError) {
    return true
  }

  if (!(error instanceof APIError)) {
    return false
  }

  return error.status === 408 || error.status === 429 || (error.status >= 500 && error.status < 600)
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly reconnectInterval: number
  private readonly maxReconnectAttempts: number
  private readonly heartbeatInterval: number
  private readonly throttleInterval: number
  private readonly secure: boolean
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private hasEstablishedConnection = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private throttleTimer: ReturnType<typeof setInterval> | null = null
  private isAuthenticated = false
  private sessionExpiresAt: string | null = null
  private pendingWsTokenExp: number | null = null
  private reauthTimer: ReturnType<typeof setTimeout> | null = null
  private reauthScheduledAt: number | null = null
  private lastReauthDeadlineMs: number | null = null
  private authenticatingSocket: WebSocket | null = null
  private readonly reauthLeadTimeMs = 45000
  private readonly messageHandlers = new Map<string, MessageHandler[]>()
  private readonly connectionHandlers: ConnectionHandler[] = []
  private readonly subscribedTopics = new Set<string>()
  private readonly pendingMessages = new Map<string, WebSocketMessages | CandleData[]>()
  private readonly lastMessageTime = new Map<string, number>()
  private pingSentAt: number | null = null
  private readonly pendingSubscribes = new Set<string>()
  private readonly pendingUnsubscribes = new Set<string>()
  private subscriptionFlushScheduled = false
  constructor(options: WebSocketClientOptions = {}) {
    this.secure = options.secure || false
    this.url = options.url || buildWebSocketUrl()
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
    this.heartbeatInterval = options.heartbeatInterval || 5000
    this.throttleInterval = options.throttleInterval || 200
    this.setupThrottling()
  }
  private setupThrottling(): void {
    this.throttleTimer = setInterval(() => {
      flushThrottledMessages(
        this.pendingMessages,
        this.lastMessageTime,
        this.throttleInterval,
        message => {
          if (Array.isArray(message)) {
            message.forEach(candle => this.notifyHandlers(candle))
          } else {
            this.notifyHandlers(message)
          }
        }
      )
    }, this.throttleInterval)
  }
  connect(): void {
    if (this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (!this.throttleTimer) {
      this.setupThrottling()
    }

    this.clearReconnectTimer()
    this.sessionExpiresAt = null
    this.pendingWsTokenExp = null
    this.clearReauthTimer()
    this.lastReauthDeadlineMs = null

    try {
      const socket = new WebSocket(this.url)

      this.ws = socket

      socket.onopen = () => {
        if (this.ws === socket) this.handleOpen()
      }

      socket.onmessage = event => {
        if (this.ws === socket) this.handleMessage(event)
      }

      socket.onclose = () => {
        if (this.ws === socket) this.handleClose()
      }

      socket.onerror = this.handleError.bind(this)
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.scheduleReconnect()
    }
  }
  disconnect(): void {
    this.clearReconnectTimer()
    this.reconnectAttempts = 0
    this.hasEstablishedConnection = false
    this.isAuthenticated = false
    this.sessionExpiresAt = null
    this.pendingWsTokenExp = null
    this.clearReauthTimer()
    this.lastReauthDeadlineMs = null
    this.pendingMessages.clear()
    this.lastMessageTime.clear()

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.throttleTimer) {
      clearInterval(this.throttleTimer)
      this.throttleTimer = null
    }

    if (this.ws) {
      const socket = this.ws

      this.ws = null
      socket.close()
      this.notifyConnectionHandlers(false)
    }
  }
  private handleOpen(): void {
    this.isAuthenticated = false

    if (!this.secure) {
      this.onConnectionReady()
    }
  }
  private onConnectionReady(): void {
    this.reconnectAttempts = 0
    this.hasEstablishedConnection = true
    this.isAuthenticated = true
    this.resubscribeTopics()
    this.notifyConnectionHandlers(true)
    this.startHeartbeat()
  }
  private handleMessage(event: MessageEvent): void {
    try {
      const parsed = JSON.parse(event.data)

      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
        console.warn('Received malformed WebSocket message (missing type):', parsed)

        return
      }

      const validated = parseWsMessage(parsed)

      if (!validated) {
        console.warn('Received invalid WebSocket message structure:', parsed)

        return
      }

      const message = validated as WebSocketMessages

      if (isAuthControlMessage(message)) {
        void this.handleAuthMessage(message)

        return
      }

      if (message.type === 'pong') {
        if (this.pingSentAt !== null) {
          const rtt = Date.now() - this.pingSentAt

          this.pingSentAt = null
          const pongWithRtt: PongWithRtt = { ...message, rtt_ms: rtt }

          this.notifyHandlers(pongWithRtt)
        }

        return
      }

      if (this.secure && !this.isAuthenticated) {
        console.debug('Ignoring message received before authentication is complete:', message.type)

        return
      }

      const topic = getMessageTopic(message)

      if (topic && shouldThrottle(message.type)) {
        if (message.type === 'candle') {
          const pending = this.pendingMessages.get(topic)
          const candles = Array.isArray(pending) ? pending : []
          const byOpen = new Map(candles.map(candle => [Date.parse(candle.open_at), candle]))
          const openMs = Date.parse(message.open_at)
          const previous = byOpen.get(openMs)
          const authorMs = Date.parse(message.timestamp)
          const previousAuthorMs = previous ? Date.parse(previous.timestamp) : 0

          if (
            !previous ||
            (authorMs >= previousAuthorMs &&
              !(
                authorMs === previousAuthorMs &&
                previous.complete === true &&
                message.complete === false
              ))
          ) {
            byOpen.set(openMs, message)
          }

          const batch = [...byOpen.values()].sort(
            (left, right) => Date.parse(right.open_at) - Date.parse(left.open_at)
          )

          this.pendingMessages.set(topic, batch.slice(0, 32))

          for (const overflow of batch.slice(32)) {
            this.notifyHandlers(overflow)
          }
        } else {
          this.pendingMessages.set(topic, message)
        }
      } else {
        this.notifyHandlers(message)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }
  private handleClose(): void {
    this.ws = null
    this.pendingMessages.clear()
    this.lastMessageTime.clear()
    this.isAuthenticated = false
    this.sessionExpiresAt = null
    this.pendingWsTokenExp = null
    this.clearReauthTimer()
    this.lastReauthDeadlineMs = null

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.scheduleReconnect()
    this.notifyConnectionHandlers(false)
  }
  private handleError(error: Event): void {
    console.error('WebSocket error:', error)
  }
  private async handleAuthMessage(message: WebSocketMessages): Promise<void> {
    switch (message.type) {
      case 'auth_required':
        this.notifyHandlers(message)
        await this.handleAuthRequired(message)
        break
      case 'auth_ok':
        this.handleAuthOk(message)
        break
      case 'auth_complete':
        this.handleAuthComplete(message)
        break
      case 'auth_failed':
        this.handleAuthFailure(message)
        break
      case 'reauth_required':
        this.notifyHandlers(message)
        await this.handleReauthRequired(message)
        break
      case 'reauth_ok':
        this.handleReauthOk(message)
        break
      case 'auth_expired':
        this.notifyHandlers(message)
        this.handleAuthExpired()
        break
      default:
        console.warn('Unexpected authentication message:', message)
        this.notifyHandlers(message)
    }
  }
  private async handleAuthRequired(_message: WSAuthRequiredResponse): Promise<void> {
    if (!this.secure) {
      return
    }

    await this.performAuthentication('authenticate')
  }
  private resolveExpirationMs(exp: unknown): number | null {
    if (typeof exp === 'string') return new Date(exp).getTime()
    if (typeof this.pendingWsTokenExp === 'number') return this.pendingWsTokenExp * 1000

    return null
  }
  private handleAuthOk(message: WSAuthOkResponse): void {
    const expirationMs = this.resolveExpirationMs(message.exp)

    this.pendingWsTokenExp = null

    if (typeof expirationMs === 'number' && !Number.isNaN(expirationMs)) {
      this.scheduleReauthFromMs(expirationMs)
    }

    this.notifyHandlers({ ...message, type: 'auth_ok' })
  }
  private handleAuthComplete(message: WSAuthCompleteResponse): void {
    this.sessionExpiresAt = message.session_expires_at ?? null
    this.onConnectionReady()
    this.notifyHandlers({ ...message, type: 'auth_complete' })
  }
  private resetAuthFailureState(): void {
    this.sessionExpiresAt = null
    this.isAuthenticated = false
    this.clearReauthTimer()
    this.reconnectAttempts = this.maxReconnectAttempts
  }
  private completeAuthFailure(socket: WebSocket | null): void {
    const authCallback = (globalThis as { authLogoutCallback?: () => void }).authLogoutCallback

    if (authCallback) {
      authCallback()
    }

    if (this.ws === socket) this.closeForAuthFailure()
  }
  private handleAuthFailure(message: WSAuthFailedResponse): void {
    const socket = this.ws

    console.error('WebSocket authentication failed:', message)
    this.resetAuthFailureState()
    this.notifyHandlers({ ...message, type: 'auth_failed' })
    this.completeAuthFailure(socket)
  }
  private async handleReauthRequired(message: WSReauthRequiredResponse): Promise<void> {
    if (!this.secure) {
      return
    }

    const deadlineMs =
      typeof message.deadline === 'string' ? new Date(message.deadline).getTime() : null

    if (deadlineMs !== null && !Number.isNaN(deadlineMs)) {
      if (this.lastReauthDeadlineMs !== null && deadlineMs <= this.lastReauthDeadlineMs) {
        return
      }

      this.lastReauthDeadlineMs = deadlineMs
    } else {
      this.lastReauthDeadlineMs = null
    }

    const scheduledAt = this.reauthScheduledAt
    const now = Date.now()

    if (
      deadlineMs !== null &&
      scheduledAt !== null &&
      scheduledAt > now &&
      scheduledAt <= deadlineMs
    ) {
      return
    }

    if (this.reauthTimer !== null) {
      this.clearReauthTimer()
    }

    await this.performAuthentication('reauth')
  }
  private handleReauthOk(message: WSReauthOkResponse): void {
    const expirationMs = this.resolveExpirationMs(message.exp)

    this.pendingWsTokenExp = null

    if (typeof expirationMs === 'number' && !Number.isNaN(expirationMs)) {
      this.scheduleReauthFromMs(expirationMs)
    }

    this.notifyHandlers({ ...message, type: 'reauth_ok' })
  }
  private handleAuthExpired(): void {
    console.warn('WebSocket authentication expired - awaiting reconnect')
    this.isAuthenticated = false
    this.sessionExpiresAt = null
    this.clearReauthTimer()
    this.lastReauthDeadlineMs = null
  }
  private async performAuthentication(mode: 'authenticate' | 'reauth'): Promise<void> {
    if (!this.secure) {
      return
    }

    const socket = this.ws

    if (socket?.readyState !== WebSocket.OPEN || this.authenticatingSocket === socket) {
      return
    }

    this.authenticatingSocket = socket

    try {
      const ticket = await getWsToken(socket, () => this.isCurrentOpenSocket(socket))

      if (!ticket || !this.isCurrentOpenSocket(socket)) return

      this.pendingWsTokenExp = ticket.exp
      const payload =
        mode === 'authenticate'
          ? { type: 'authenticate', ws_token: ticket.token }
          : { type: 'reauth', ws_token: ticket.token }

      this.send(payload)
    } catch (error) {
      if (!this.isCurrentOpenSocket(socket)) return

      console.error('Failed to perform WebSocket authentication:', error)

      if (isTerminalAuthError(error)) {
        this.resetAuthFailureState()
        this.completeAuthFailure(socket)
      } else if (this.hasEstablishedConnection && isTransientTicketError(error)) {
        socket.close()
      } else if (mode === 'authenticate') {
        this.reconnectAttempts = this.maxReconnectAttempts
        this.closeForAuthFailure()
      }
    } finally {
      if (this.authenticatingSocket === socket) this.authenticatingSocket = null
    }
  }
  private isCurrentOpenSocket(socket: WebSocket): boolean {
    return this.ws === socket && socket.readyState === WebSocket.OPEN
  }
  private scheduleReauthFromMs(expirationMs: number): void {
    if (!this.secure) {
      return
    }

    this.clearReauthTimer()
    const now = Date.now()
    const delay = expirationMs - now - this.reauthLeadTimeMs

    if (!Number.isFinite(delay) || delay < 0) {
      this.reauthScheduledAt = null

      return
    }

    this.reauthScheduledAt = expirationMs - this.reauthLeadTimeMs
    this.reauthTimer = setTimeout(() => {
      this.reauthTimer = null
      this.reauthScheduledAt = null
      void this.performAuthentication('reauth')
    }, delay)
  }
  private clearReauthTimer(): void {
    if (this.reauthTimer !== null) {
      clearTimeout(this.reauthTimer)
      this.reauthTimer = null
    }

    this.reauthScheduledAt = null
  }
  private closeForAuthFailure(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close(4401, 'Authentication failure')
    }
  }
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
  private scheduleReconnect(): void {
    if (
      !shouldReconnect(
        this.reconnectTimer !== null,
        this.reconnectAttempts,
        this.maxReconnectAttempts
      )
    ) {
      return
    }

    this.reconnectAttempts++
    const delay = calculateReconnectDelay(this.reconnectAttempts, this.reconnectInterval)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.pingSentAt = Date.now()
        this.send(createHeartbeatMessage())
      }
    }, this.heartbeatInterval)
  }
  private resubscribeTopics(): void {
    if (this.subscribedTopics.size > 0) {
      this.subscribe(Array.from(this.subscribedTopics))
    }
  }
  private notifyHandlers(message: WebSocketMessages): void {
    const handlers = this.messageHandlers.get(message.type) || []
    const globalHandlers = this.messageHandlers.get('*') || []
    const allHandlers = [...handlers, ...globalHandlers]

    allHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Error in message handler:', error)
      }
    })
  }
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })
  }
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
  send(message: string | object): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, cannot send message')

      return
    }

    let data: string

    if (typeof message === 'string') {
      data = message
    } else {
      const stamped = this.stampProvenance(message)

      data = JSON.stringify(stamped)
    }

    if (this.ws) {
      this.ws.send(data)
    }
  }
  private stampProvenance(message: object): object {
    const msg = message as { type?: string }
    const type = msg.type

    if (!type) return message

    let counterKey: string | null = null

    if (TELEMETRY_TYPES.has(type)) {
      counterKey = 'telemetry'
    } else if (CONTROL_TYPES.has(type)) {
      counterKey = 'control'
    }

    if (!counterKey) return message

    const tracker = getTracker()

    return {
      ...message,
      public_id: uuid7(),
      session_id: tracker.sessionId,
      sequence_id: tracker.nextSequence(counterKey),
      timestamp: new Date().toISOString(),
    }
  }
  subscribe(topics: string[]): void {
    topics.forEach(topic => {
      this.subscribedTopics.add(topic)
      this.pendingSubscribes.add(topic)
      this.pendingUnsubscribes.delete(topic)
    })
    this.scheduleSubscriptionFlush()
  }
  unsubscribe(topics: string[]): void {
    topics.forEach(topic => {
      for (const key of this.pendingMessages.keys()) {
        if (key.startsWith(topic)) {
          this.pendingMessages.delete(key)
          this.lastMessageTime.delete(key)
        }
      }

      this.subscribedTopics.delete(topic)
      this.pendingUnsubscribes.add(topic)
      this.pendingSubscribes.delete(topic)
    })
    this.scheduleSubscriptionFlush()
  }
  private scheduleSubscriptionFlush(): void {
    if (this.subscriptionFlushScheduled) {
      return
    }

    this.subscriptionFlushScheduled = true
    queueMicrotask(() => {
      this.subscriptionFlushScheduled = false
      this.flushSubscriptionChanges()
    })
  }
  private flushSubscriptionChanges(): void {
    if (!this.isConnected()) {
      this.pendingSubscribes.clear()
      this.pendingUnsubscribes.clear()

      return
    }

    if (this.pendingSubscribes.size > 0) {
      const topics = Array.from(this.pendingSubscribes)

      this.pendingSubscribes.clear()
      this.send({ type: 'subscribe', topics })
    }

    if (this.pendingUnsubscribes.size > 0) {
      const topics = Array.from(this.pendingUnsubscribes)

      this.pendingUnsubscribes.clear()
      this.send({ type: 'unsubscribe', topics })
    }
  }
  onMessage<T extends WebSocketMessageType>(type: T, handler: TypedMessageHandler<T>): () => void
  onMessage(type: string, handler: MessageHandler): () => void
  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }

    const handlers = this.messageHandlers.get(type)

    if (handlers) {
      handlers.push(handler)
    }

    return () => {
      const handlers = this.messageHandlers.get(type)

      if (handlers) {
        const index = handlers.indexOf(handler)

        if (index >= 0) {
          handlers.splice(index, 1)
        }
      }
    }
  }
  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler)

    return () => {
      const index = this.connectionHandlers.indexOf(handler)

      if (index >= 0) {
        this.connectionHandlers.splice(index, 1)
      }
    }
  }
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics)
  }
  subscribeToCandles(instrument?: string): void {
    if (instrument) {
      const topic = buildMarketTopic('candles', instrument)

      this.subscribe([topic])
    } else {
      this.subscribe([MARKET_TOPIC_PREFIX])
    }
  }
  subscribeToTicks(instrument?: string): void {
    if (instrument) {
      const topic = buildMarketTopic('ticks', instrument)

      this.subscribe([topic])
    } else {
      this.subscribe([MARKET_TOPIC_PREFIX])
    }
  }
  subscribeToOrders(): void {
    this.subscribe([ORDERS_COMMANDS_PREFIX, ORDERS_EVENTS_PREFIX])
  }
  subscribeToExecutions(): void {
    this.subscribe([ORDERS_EVENTS_PREFIX])
  }
  subscribeToSignals(): void {
    this.subscribe([SIGNALS_TOPIC_PREFIX])
  }
  subscribeToHeartbeats(): void {
    this.subscribe([HEARTBEATS_TOPIC_PREFIX])
  }
  subscribeToAlerts(): void {
    this.subscribe([ALERTS_TOPIC_PREFIX])
  }
  unsubscribeFromAlerts(): void {
    this.unsubscribe([ALERTS_TOPIC_PREFIX])
  }
  subscribeToAll(): void {
    this.subscribe(getSubscriptionTopics())
  }
  async getAvailableTopics(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket not connected'))

        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for topics response'))
      }, 5000)
      const unsubscribe = this.onMessage('subscriptions_list', (message: WebSocketMessages) => {
        clearTimeout(timeout)
        unsubscribe()
        const listMessage = message as { available_topics?: string[] }

        resolve(listMessage.available_topics || [])
      })

      this.send({ type: 'get_subscriptions' })
    })
  }
  getConnectionStats(): object {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscribedTopics),
      isReconnecting: this.reconnectTimer !== null,
      sessionExpiresAt: this.sessionExpiresAt,
    }
  }
}

export default WebSocketClient
