/**
 * Generated Zod fragments shared by REST and WebSocket schemas.
 * DO NOT EDIT - regenerate with: make ui-gen-types
 */

import { z } from 'zod/v4'

export const JsonPrimitiveSchema = z.unknown()

export const CandleDataSchema = z
  .object({
    type: z.literal('candle'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    exchange: z.enum(['kraken', 'kraken_futures', 'kraken_equities', 'walutomat', 'polygon']),
    timeframe: z.string(),
    open_at: z.iso.datetime(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    vwap: z.number().nullable().optional(),
    trades: z.number().int().nullable().optional(),
    complete: z.boolean(),
    origin: z.enum(['live', 'replay']),
    replay_window_start: z.iso.datetime().nullable().optional(),
    replay_window_end: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const ContinuousCandleDataSchema = z
  .object({
    type: z.literal('continuous_candle'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    open_at: z.iso.datetime(),
    timeframe: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    vwap: z.number().nullable(),
    trades: z.number().int().nullable(),
    source_contract: z.string(),
    adjustment_factor: z.number().nullable(),
  })
  .strict()

export const ContractDataSchema = z
  .object({
    type: z.literal('contract'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument_public_id: z.string(),
    native_symbol: z.string(),
    exchange: z.string(),
    expiry_at: z.iso.datetime().nullable(),
    instrument_kind: z.string().nullable(),
    relationship_type: z.string(),
    contract_family: z.string().nullable(),
    is_front_month: z.boolean(),
  })
  .strict()

export const EgressActiveReservationSnapshotSchema = z
  .object({
    exchange: z.string(),
    traffic_class: z.enum(['public', 'private']),
    container: z.string(),
  })
  .strict()

export const EgressConnectionSnapshotSchema = z
  .object({
    host: z.string(),
    kind: z.enum(['ws', 'rest']),
    exchange: z.string(),
    traffic_class: z.enum(['public', 'private']),
    container: z.string(),
    count: z.number().int(),
    last_seen_at: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const EgressTransferSnapshotSchema = z
  .object({
    interface: z.string(),
    socks5_listen_port: z.number().int(),
    rx_bytes: z.number().int(),
    tx_bytes: z.number().int(),
    rx_rate_bytes_per_second: z.number().nullable().optional(),
    tx_rate_bytes_per_second: z.number().nullable().optional(),
    latest_handshake_at: z.iso.datetime().nullable().optional(),
    counter_reset: z.boolean(),
    sampled_at: z.iso.datetime(),
    sample_age_seconds: z.number(),
    stale: z.boolean(),
  })
  .strict()

export const ExecutionDataSchema = z
  .object({
    type: z.literal('execution'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    trade_id: z.string().nullable().optional(),
    exchange_order_id: z.string().nullable().optional(),
    client_order_id: z.string(),
    instrument: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    side: z.enum(['buy', 'sell']),
    size: z.number(),
    price: z.number(),
    last_size: z.number(),
    last_price: z.number(),
    fee: z.number(),
    fee_asset: z.string(),
    status: z.enum(['filled', 'partial']),
    executed_at: z.iso.datetime(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
    liquidity_role: z.string(),
    paired_group_id: z.string().nullable().optional(),
    paired_group_size: z.number().int().nullable().optional(),
    paired_group_index: z.number().int().nullable().optional(),
    paired_group_policy: z.enum(['simultaneous', 'sequential_handoff']).nullable().optional(),
  })
  .strict()

export const ExecutionPlanDataSchema = z
  .object({
    type: z.literal('execution_plan'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    plan_type: z.string(),
    status: z.string(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    mode: z.string(),
    side: z.string(),
    total_quantity: z.number(),
    filled_quantity: z.number(),
    created_at: z.iso.datetime(),
    created_via: z.string(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable(),
    params: z.record(z.string(), z.unknown()),
    position_cycle_public_id: z.string().nullable(),
    parent_plan_public_id: z.string().nullable(),
    last_error: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  })
  .strict()

export const FrontMonthDataSchema = z
  .object({
    type: z.literal('front_month'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument_public_id: z.string(),
    native_symbol: z.string(),
    exchange: z.string(),
    expiry_at: z.iso.datetime(),
    relationship_type: z.string(),
    contract_family: z.string().nullable(),
  })
  .strict()

export const InstrumentCapabilityDataSchema = z
  .object({
    type: z.literal('instrument_capability'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    supported_order_types: z.array(z.string()),
    supports_post_only: z.boolean(),
    supports_reduce_only: z.boolean(),
    supports_amend_in_place: z.boolean(),
    supports_native_stop_loss: z.boolean(),
    supports_native_take_profit: z.boolean(),
    supports_trailing_stop_client_side: z.boolean(),
    supports_market_making: z.boolean(),
    supports_short_selling: z.boolean(),
    supports_leverage: z.boolean(),
    max_leverage_long: z.number(),
    max_leverage_short: z.number(),
    min_notional: z.number().nullable(),
    max_order_size: z.number().nullable(),
    top_of_book_quality: z.string(),
  })
  .strict()

export const InstrumentDetailDataSchema = z
  .object({
    type: z.literal('instrument_detail'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument_public_id: z.string(),
    symbol_public_id: z.string(),
    symbol: z.string(),
    exchange: z.string(),
    can_trade: z.boolean(),
    can_market_data: z.boolean(),
    instrument_resolved: z.boolean(),
    instrument_kind: z.string().nullable(),
    expiry_at: z.iso.datetime().nullable(),
  })
  .strict()

export const OrderDataSchema = z
  .object({
    type: z.literal('order'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchange_order_id: z.string().nullable().optional(),
    client_order_id: z.string(),
    instrument: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    mode: z.enum(['live', 'paper']),
    side: z.enum(['buy', 'sell']),
    status: z.string(),
    order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
    size: z.number(),
    filled_size: z.number(),
    price: z.number().nullable().optional(),
    average_price: z.number().nullable().optional(),
    reason: z.string().nullable().optional(),
    time_in_force: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime().nullable().optional(),
    leverage: z.number().int().nullable().optional(),
    reduce_only: z.boolean(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
    plan_public_id: z.string().nullable().optional(),
    paired_group_id: z.string().nullable().optional(),
    paired_group_size: z.number().int().nullable().optional(),
    paired_group_index: z.number().int().nullable().optional(),
    paired_group_policy: z.enum(['simultaneous', 'sequential_handoff']).nullable().optional(),
  })
  .strict()

export const PositionDisplayFieldsSchema = z
  .object({
    is_dust: z.boolean().optional(),
    quantity_decimals: z.number().int().nullable().optional(),
    price_decimals: z.number().int().nullable().optional(),
  })
  .strict()

export const ProcessSummaryItemSchema = z
  .object({
    name: z.string(),
    running: z.boolean(),
    enabled: z.boolean(),
    role: z.string(),
    lifecycle: z.string(),
    active_public_id: z.string().nullable().optional(),
    rss_bytes: z.number().int().nullable().optional(),
    cpu_percent: z.number().nullable().optional(),
    owned: z.boolean(),
  })
  .strict()

const _RelatedInstrumentDataUnderlyingInstrumentDataFieldsSchema = z.object({
  sequence_id: z.number().int(),
  public_id: z.string(),
  timestamp: z.iso.datetime(),
  session_id: z.string(),
  topic: z.string().nullable().optional(),
  instrument_public_id: z.string(),
  native_symbol: z.string(),
  exchange: z.string(),
  asset_type: z.string(),
  relationship_type: z.string(),
  contract_family: z.string().nullable(),
})

export const RelatedInstrumentDataSchema = z
  .object({
    type: z.literal('related_instrument'),
  })
  .extend(_RelatedInstrumentDataUnderlyingInstrumentDataFieldsSchema.shape)
  .extend({
    is_selected: z.boolean(),
  })
  .strict()

export const SignalDataSchema = z
  .object({
    type: z.literal('signal'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    side: z.enum(['buy', 'sell']),
    strength: z.number(),
    reason: z.string(),
    price: z.number().nullable().optional(),
    strategy_name: z.string().nullable().optional(),
    fired_at: z.iso.datetime(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
    ai_review_public_id: z.string().nullable().optional(),
    ai_review_dispatch_version: z.number().int().nullable().optional(),
    paired_group_id: z.string().nullable().optional(),
    paired_group_size: z.number().int().nullable().optional(),
    paired_group_index: z.number().int().nullable().optional(),
    paired_group_policy: z.enum(['simultaneous', 'sequential_handoff']).nullable().optional(),
    paired_group_key: z.string().nullable().optional(),
    origin: z.enum(['live', 'replay']),
    replay_window_start: z.iso.datetime().nullable().optional(),
    replay_window_end: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const UnderlyingAssetDataSchema = z
  .object({
    type: z.literal('underlying_asset'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    ticker: z.string(),
    name: z.string(),
    asset_class: z.string(),
    sector: z.string().nullable(),
    description: z.string().nullable(),
    instrument_count: z.number().int(),
  })
  .strict()

export const UnderlyingInstrumentDataSchema = z
  .object({
    type: z.literal('underlying_instrument'),
  })
  .extend(_RelatedInstrumentDataUnderlyingInstrumentDataFieldsSchema.shape)
  .strict()

export const VenueFeeScheduleDataSchema = z
  .object({
    type: z.literal('venue_fee_schedule'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchange: z.string(),
    instrument_public_id: z.string().nullable(),
    fee_tier: z.string(),
    maker_bps: z.number(),
    taker_bps: z.number(),
    min_volume_30d: z.number().nullable(),
    currency: z.string(),
  })
  .strict()

export const UserRoleSchema = z.enum([
  'ai_researcher',
  'ai_reviewer',
  'ai_delegate',
  'viewer',
  'auditor',
  'operator',
  'admin',
])

export const JsonValueSchema = z.unknown()

export const EgressRouteStatusSnapshotSchema = z
  .object({
    id: z.string(),
    kind: z.enum(['direct', 'socks5']),
    proxy_url: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    exit_ip: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    priority: z.number().int(),
    allowed_exchanges: z.array(z.string()).optional(),
    enabled: z.boolean(),
    quarantined: z.boolean(),
    quarantine_seconds_remaining: z.number().nullable(),
    in_use_count: z.number().int(),
    active_reservations: z.array(EgressActiveReservationSnapshotSchema).optional(),
    connections: z.array(EgressConnectionSnapshotSchema).optional(),
    transfer: EgressTransferSnapshotSchema.nullable().optional(),
  })
  .strict()

export const PositionDataSchema = z
  .object({
    type: z.literal('position'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    instrument_public_id: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    mode: z.enum(['live', 'paper']),
    quantity: z.number(),
    average_price: z.number().nullable().optional(),
    unrealized_pnl: z.number().nullable().optional(),
    realized_pnl: z.number(),
    mark_price: z.number().nullable().optional(),
    marked_at: z.iso.datetime().nullable().optional(),
    mark_as_of: z.iso.datetime().nullable().optional(),
    mark_stale: z.boolean().optional(),
    source_venue_event_id: z.number().int().nullable().optional(),
    position_cycle_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string(),
  })
  .extend(PositionDisplayFieldsSchema.shape)
  .strict()

export const JsonObjectSchema = z.record(z.string(), z.any())

export const ExecutionPlanDecisionDataSchema = z
  .object({
    type: z.literal('execution_plan_decision'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    plan_public_id: z.string(),
    decision_type: z.string(),
    decided_at: z.iso.datetime(),
    trigger_type: z.string(),
    evidence: z.record(z.string(), z.any()),
    emitted_command_public_id: z.string().nullable().optional(),
    new_status: z.string().nullable().optional(),
    reason: z.string(),
    decision_importance: z.string(),
    source_surface: z.string(),
  })
  .strict()
