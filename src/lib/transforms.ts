import type { PositionData } from '../types/api'
import type {
  OrderData as WsOrderData,
  ExecutionData as WsExecutionData,
  SignalData as WsSignalData,
  CandleData,
  TickData,
  HeartbeatData,
} from '../types/ws'
import type {
  Order,
  Execution,
  Signal,
  Position,
  Candle,
  Tick,
  Heartbeat,
  OrderType,
  TradeSide,
} from '../types/entities'

interface OrderApiInput {
  sequence_id: number
  public_id: string
  timestamp: string
  session_id: string
  client_order_id: string
  exchange_order_id?: string | null | undefined
  instrument: string
  exchange: Order['exchange']
  side: string
  order_type: string
  size: number
  filled_size: number
  price?: number | null | undefined
  average_price?: number | null | undefined
  status: string
  reason?: string | null | undefined
  time_in_force?: string | null | undefined
  error?: string | null | undefined
  leverage?: number | null | undefined
  reduce_only?: boolean | undefined
  created_at?: string | undefined
  updated_at?: string | null | undefined
}

interface ExecutionApiInput {
  sequence_id: number
  public_id: string
  timestamp: string
  session_id: string
  client_order_id: string
  trade_id?: string | null | undefined
  exchange_order_id?: string | null | undefined
  exchange: Execution['exchange']
  instrument: string
  side: string
  size: number
  price: number
  last_size: number
  last_price: number
  fee: number
  fee_asset: string
  status: Execution['status']
  executed_at?: string | undefined
}

interface SignalApiInput {
  sequence_id: number
  public_id: string
  timestamp: string
  session_id: string
  exchange: Signal['exchange']
  instrument: string
  side: string
  strength: number
  reason: string
  strategy_name?: string | null | undefined
  price?: number | null | undefined
  fired_at?: string | undefined
}

function requireTimestamp(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${context} missing required field: timestamp`)
  }

  return value
}

function normalizeSide(side: string): TradeSide {
  const normalized = side.toLowerCase()

  if (normalized === 'buy' || normalized === 'sell') {
    return normalized
  }

  throw new Error(`Invalid trade side: "${side}". Expected "buy" or "sell".`)
}

export function orderFromAPI(api: OrderApiInput): Order {
  const ts = requireTimestamp(api.timestamp, 'OrderData')

  return {
    sequenceId: api.sequence_id,
    publicId: api.public_id,
    timestamp: new Date(ts),
    sessionId: api.session_id,
    clientOrderId: api.client_order_id,
    exchangeOrderId: api.exchange_order_id ?? null,
    instrument: api.instrument,
    exchange: api.exchange,
    side: normalizeSide(api.side),
    orderType: normalizeOrderType(api.order_type),
    size: api.size,
    filledSize: api.filled_size,
    price: api.price ?? null,
    averagePrice: api.average_price ?? null,
    status: api.status,
    reason: api.reason ?? null,
    timeInForce: api.time_in_force ?? null,
    error: api.error ?? null,
    leverage: api.leverage ?? null,
    reduceOnly: api.reduce_only ?? false,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : null,
  }
}

export function orderFromWS(ws: WsOrderData): Order {
  const ts = requireTimestamp(ws.timestamp, 'OrderData')

  if (!ws.created_at) {
    throw new Error('OrderData missing required field: created_at')
  }

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    clientOrderId: ws.client_order_id,
    exchangeOrderId: ws.exchange_order_id ?? null,
    instrument: ws.instrument,
    exchange: ws.exchange,
    side: ws.side,
    orderType: ws.order_type,
    size: ws.size,
    filledSize: ws.filled_size,
    price: ws.price ?? null,
    averagePrice: ws.average_price ?? null,
    status: ws.status,
    reason: ws.reason ?? null,
    leverage: ws.leverage ?? null,
    reduceOnly: ws.reduce_only ?? false,
    createdAt: new Date(ws.created_at),
    updatedAt: ws.updated_at ? new Date(ws.updated_at) : null,
  }
}

function normalizeOrderType(type: string): OrderType {
  const normalized = type.toLowerCase()

  if (
    normalized === 'market' ||
    normalized === 'limit' ||
    normalized === 'stop' ||
    normalized === 'stop_limit'
  ) {
    return normalized
  }

  throw new Error(
    `Invalid order type: "${type}". Expected "market", "limit", "stop", or "stop_limit".`
  )
}

export function executionFromAPI(api: ExecutionApiInput): Execution {
  const ts = requireTimestamp(api.timestamp, 'ExecutionData')

  return {
    sequenceId: api.sequence_id,
    publicId: api.public_id,
    timestamp: new Date(ts),
    sessionId: api.session_id,
    clientOrderId: api.client_order_id,
    tradeId: api.trade_id ?? null,
    exchangeOrderId: api.exchange_order_id ?? null,
    exchange: api.exchange,
    instrument: api.instrument,
    side: normalizeSide(api.side),
    size: api.size,
    price: api.price,
    lastSize: api.last_size,
    lastPrice: api.last_price,
    fee: api.fee,
    feeAsset: api.fee_asset,
    status: api.status,
    executedAt: api.executed_at ? new Date(api.executed_at) : new Date(),
  }
}

export function executionFromWS(ws: WsExecutionData): Execution {
  const ts = requireTimestamp(ws.timestamp, 'ExecutionData')

  if (!ws.executed_at) {
    throw new Error('ExecutionData missing required field: executed_at')
  }

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    clientOrderId: ws.client_order_id,
    tradeId: ws.trade_id ?? null,
    exchangeOrderId: ws.exchange_order_id ?? null,
    exchange: ws.exchange,
    instrument: ws.instrument,
    side: ws.side,
    size: ws.size,
    price: ws.price,
    lastSize: ws.last_size,
    lastPrice: ws.last_price,
    fee: ws.fee,
    feeAsset: ws.fee_asset,
    status: ws.status,
    executedAt: new Date(ws.executed_at),
  }
}

export function signalFromAPI(api: SignalApiInput): Signal {
  const ts = requireTimestamp(api.timestamp, 'SignalData')

  return {
    sequenceId: api.sequence_id,
    publicId: api.public_id,
    timestamp: new Date(ts),
    sessionId: api.session_id,
    exchange: api.exchange,
    instrument: api.instrument,
    side: normalizeSide(api.side),
    strength: api.strength,
    reason: api.reason,
    strategyName: api.strategy_name ?? null,
    price: api.price ?? null,
    firedAt: new Date(api.fired_at ?? api.timestamp),
  }
}

export function signalFromWS(ws: WsSignalData): Signal {
  const ts = requireTimestamp(ws.timestamp, 'SignalData')
  const firedAtSource = ws.fired_at ?? ts

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    exchange: ws.exchange,
    instrument: ws.instrument,
    side: ws.side,
    strength: ws.strength,
    reason: ws.reason,
    strategyName: ws.strategy_name ?? null,
    price: ws.price ?? null,
    firedAt: new Date(firedAtSource),
  }
}

export function positionFromAPI(api: PositionData): Position {
  const ts = requireTimestamp(api.timestamp, 'PositionData')

  return {
    sequenceId: api.sequence_id,
    publicId: api.public_id,
    timestamp: new Date(ts),
    sessionId: api.session_id,
    instrument: api.instrument,
    exchange: api.exchange,
    mode: api.mode,
    quantity: api.quantity,
    averagePrice: api.average_price ?? null,
    unrealizedPnl: api.unrealized_pnl ?? null,
    realizedPnl: api.realized_pnl,
    markPrice: api.mark_price ?? null,
    markedAt: api.marked_at ? new Date(api.marked_at) : null,
    sourceVenueEventId: api.source_venue_event_id ?? null,
    positionCyclePublicId: api.position_cycle_public_id ?? null,
  }
}

export function candleFromAPI(api: CandleData): Candle {
  const ts = requireTimestamp(api.timestamp, 'CandleData')

  return {
    sequenceId: api.sequence_id,
    publicId: api.public_id,
    timestamp: new Date(ts),
    sessionId: api.session_id,
    instrument: api.instrument,
    exchange: api.exchange,
    timeframe: api.timeframe,
    open: api.open,
    high: api.high,
    low: api.low,
    close: api.close,
    volume: api.volume,
    ...(api.vwap == null ? {} : { vwap: api.vwap }),
    ...(api.trades == null ? {} : { trades: api.trades }),
    openAt: new Date(api.open_at),
  }
}

export function candleFromWS(ws: CandleData): Candle {
  const ts = requireTimestamp(ws.timestamp, 'CandleData')

  if (ws.timeframe === null || ws.timeframe === undefined) {
    throw new Error('CandleData missing required field: timeframe')
  }

  if (ws.open === null || ws.open === undefined) {
    throw new Error('CandleData missing required field: open')
  }

  if (ws.high === null || ws.high === undefined) {
    throw new Error('CandleData missing required field: high')
  }

  if (ws.low === null || ws.low === undefined) {
    throw new Error('CandleData missing required field: low')
  }

  if (ws.close === null || ws.close === undefined) {
    throw new Error('CandleData missing required field: close')
  }

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    instrument: ws.instrument,
    timeframe: ws.timeframe,
    open: ws.open,
    high: ws.high,
    low: ws.low,
    close: ws.close,
    volume: ws.volume,
    ...(ws.vwap == null ? {} : { vwap: ws.vwap }),
    ...(ws.trades == null ? {} : { trades: ws.trades }),
    openAt: new Date(ws.open_at),
    exchange: ws.exchange,
  }
}

export function tickFromWS(ws: TickData): Tick {
  const ts = requireTimestamp(ws.timestamp, 'TickData')

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    instrument: ws.instrument,
    bid: ws.bid ?? null,
    ask: ws.ask ?? null,
    ...(ws.last == null ? {} : { last: ws.last }),
    volume: ws.volume,
    exchange: ws.exchange,
  }
}

export function heartbeatFromWS(ws: HeartbeatData): Heartbeat {
  const ts = requireTimestamp(ws.timestamp, 'HeartbeatData')

  return {
    sequenceId: ws.sequence_id,
    publicId: ws.public_id,
    timestamp: new Date(ts),
    sessionId: ws.session_id,
    component: ws.component,
    status: ws.status,
    sequence: ws.sequence,
    lagMs: ws.lag_ms,
  }
}

export function orderDataFromEnvelope(env: WsOrderData): WsOrderData {
  return {
    type: env.type,
    sequence_id: env.sequence_id,
    public_id: env.public_id,
    timestamp: env.timestamp,
    session_id: env.session_id,
    ...(env.exchange_order_id === undefined ? {} : { exchange_order_id: env.exchange_order_id }),
    client_order_id: env.client_order_id,
    instrument: env.instrument,
    exchange: env.exchange,
    side: env.side,
    status: env.status,
    order_type: env.order_type,
    size: env.size,
    filled_size: env.filled_size,
    ...(env.price === undefined ? {} : { price: env.price }),
    ...(env.average_price === undefined ? {} : { average_price: env.average_price }),
    ...(env.reason === undefined ? {} : { reason: env.reason }),
    ...(env.time_in_force === undefined ? {} : { time_in_force: env.time_in_force }),
    ...(env.error === undefined ? {} : { error: env.error }),
    ...(env.leverage === undefined ? {} : { leverage: env.leverage }),
    ...(env.reduce_only === undefined ? {} : { reduce_only: env.reduce_only }),
    created_at: env.created_at,
    ...(env.updated_at === undefined ? {} : { updated_at: env.updated_at }),
  }
}

export function executionDataFromEnvelope(env: WsExecutionData): WsExecutionData {
  return {
    type: env.type,
    sequence_id: env.sequence_id,
    public_id: env.public_id,
    timestamp: env.timestamp,
    session_id: env.session_id,
    ...(env.trade_id === undefined ? {} : { trade_id: env.trade_id }),
    ...(env.exchange_order_id === undefined ? {} : { exchange_order_id: env.exchange_order_id }),
    client_order_id: env.client_order_id,
    instrument: env.instrument,
    exchange: env.exchange,
    side: env.side,
    size: env.size,
    price: env.price,
    last_size: env.last_size,
    last_price: env.last_price,
    fee: env.fee,
    fee_asset: env.fee_asset,
    status: env.status,
    executed_at: env.executed_at,
  }
}

export function signalDataFromEnvelope(env: WsSignalData): WsSignalData {
  return {
    type: env.type,
    sequence_id: env.sequence_id,
    public_id: env.public_id,
    timestamp: env.timestamp,
    session_id: env.session_id,
    instrument: env.instrument,
    exchange: env.exchange,
    side: env.side,
    strength: env.strength,
    reason: env.reason,
    ...(env.price === undefined ? {} : { price: env.price }),
    ...(env.strategy_name === undefined ? {} : { strategy_name: env.strategy_name }),
    fired_at: env.fired_at,
  }
}

export function ordersFromAPI(apis: OrderApiInput[]): Order[] {
  return apis.map(orderFromAPI)
}

export function executionsFromAPI(apis: ExecutionApiInput[]): Execution[] {
  return apis.map(executionFromAPI)
}

export function signalsFromAPI(apis: SignalApiInput[]): Signal[] {
  return apis.map(signalFromAPI)
}

export function positionsFromAPI(apis: PositionData[]): Position[] {
  return apis.map(positionFromAPI)
}

export function candlesFromAPI(apis: CandleData[]): Candle[] {
  return apis.map(candleFromAPI)
}

export function isTradeSide(value: unknown): value is TradeSide {
  return value === 'buy' || value === 'sell'
}

export function isOrderStatus(value: unknown): value is string {
  return (
    value === 'new' ||
    value === 'submitted' ||
    value === 'open' ||
    value === 'filled' ||
    value === 'partially_filled' ||
    value === 'cancelled' ||
    value === 'rejected'
  )
}

export function isOrderType(value: unknown): value is OrderType {
  return value === 'market' || value === 'limit' || value === 'stop' || value === 'stop_limit'
}

export function safeOrderFromAPI(api: OrderApiInput): Order | null {
  try {
    return orderFromAPI(api)
  } catch (error) {
    console.error('Failed to transform order from API:', error, api)

    return null
  }
}

export function safeExecutionFromAPI(api: ExecutionApiInput): Execution | null {
  try {
    return executionFromAPI(api)
  } catch (error) {
    console.error('Failed to transform execution from API:', error, api)

    return null
  }
}

export function safeSignalFromAPI(api: SignalApiInput): Signal | null {
  try {
    return signalFromAPI(api)
  } catch (error) {
    console.error('Failed to transform signal from API:', error, api)

    return null
  }
}
