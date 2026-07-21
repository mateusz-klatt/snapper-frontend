/**
 * Generated Zod schemas for REST API validation.
 * DO NOT EDIT - regenerate with: make ui-gen-api-zod
 *
 * Each `NameSchema` export is cast to
 * `z.ZodType<Components['schemas'][Name]>` so the inferred output type
 * matches openapi-typescript's exact-optional emission (key-level `?:`
 * for nullable / default-None fields). Without the cast Zod's `.optional()`
 * would infer `T | undefined` at the value level and clash with the
 * OpenAPI-derived contract used everywhere else in the SPA under
 * `tsconfig.json` `exactOptionalPropertyTypes: true`.
 *
 * Each `Name` type export is sourced from `api.generated.ts` so the
 * SPA-facing type is exactly the openapi-typescript emission.
 */

import { z } from 'zod'

import type { Components } from '../../types/api.generated'

const _AccountBalanceEntryRawSchema = z
  .object({
    currency: z.string(),
    total: z.number(),
    free: z.number().nullable().optional(),
    used: z.number().nullable().optional(),
    total_decimal: z.string().nullable().optional(),
    free_decimal: z.string().nullable().optional(),
    used_decimal: z.string().nullable().optional(),
    numeric_provenance: z.string().nullable().optional(),
  })
  .strict()

export const AccountBalanceEntrySchema = _AccountBalanceEntryRawSchema as unknown as z.ZodType<
  Components['schemas']['AccountBalanceEntry']
>

const _AccountPositionEntryRawSchema = z
  .object({
    symbol: z.string(),
    side: z.string(),
    size: z.number(),
    entry_price: z.number(),
    mark_price: z.number(),
    unrealized_pnl: z.number(),
    unrealized_funding: z.number(),
    timestamp: z.iso.datetime(),
  })
  .strict()

export const AccountPositionEntrySchema = _AccountPositionEntryRawSchema as unknown as z.ZodType<
  Components['schemas']['AccountPositionEntry']
>

const _AiReviewAftermathExecutionRawSchema = z
  .object({
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    sequence_id: z.number().int(),
    trade_id: z.string().nullable(),
    exec_id: z.string().nullable(),
    order_public_id: z.string(),
    instrument_public_id: z.string(),
    exchange_order_id: z.string().nullable(),
    client_order_id: z.string().nullable(),
    instrument: z.string(),
    exchange: z.string(),
    mode: z.string(),
    scope_sequence: z.number().int(),
    side: z.string(),
    size: z.number(),
    price: z.number(),
    fee: z.number(),
    fee_asset: z.string(),
    status: z.string(),
    executed_at: z.iso.datetime(),
    wallet_public_id: z.string().nullable(),
    operator_public_id: z.string().nullable(),
    liquidity_role: z.string(),
    price_decimal: z.string().nullable(),
    size_decimal: z.string().nullable(),
    fee_decimal: z.string().nullable(),
    counter_amount_decimal: z.string().nullable(),
    numeric_provenance: z.string().nullable(),
  })
  .strict()

export const AiReviewAftermathExecutionSchema =
  _AiReviewAftermathExecutionRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathExecution']
  >

const _AiReviewAftermathOrderRawSchema = z
  .object({
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    sequence_id: z.number().int(),
    instrument: z.string(),
    exchange: z.string(),
    mode: z.string(),
    client_order_id: z.string(),
    exchange_order_id: z.string().nullable(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime().nullable(),
    side: z.string(),
    order_type: z.string(),
    price: z.number().nullable(),
    size: z.number(),
    filled_size: z.number(),
    average_price: z.number().nullable(),
    status: z.string(),
    time_in_force: z.string().nullable(),
    error: z.string().nullable(),
    leverage: z.number().int().nullable(),
    reduce_only: z.boolean(),
    wallet_public_id: z.string().nullable(),
    operator_public_id: z.string().nullable(),
    plan_public_id: z.string().nullable(),
  })
  .strict()

export const AiReviewAftermathOrderSchema =
  _AiReviewAftermathOrderRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathOrder']
  >

const _AiReviewAftermathPositionRawSchema = z
  .object({
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    sequence_id: z.number().int(),
    instrument: z.string(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    mode: z.string(),
    quantity: z.number(),
    average_price: z.number().nullable(),
    unrealized_pnl: z.number().nullable(),
    realized_pnl: z.number().nullable(),
    mark_price: z.number().nullable(),
    marked_at: z.iso.datetime().nullable(),
    source_venue_event_id: z.number().int().nullable(),
    position_cycle_public_id: z.string().nullable(),
    wallet_public_id: z.string(),
  })
  .strict()

export const AiReviewAftermathPositionSchema =
  _AiReviewAftermathPositionRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathPosition']
  >

const _AiReviewAftermathPositionCycleTransitionRawSchema = z
  .object({
    cycle_public_id: z.string(),
    transition: z.string(),
    occurred_at: z.iso.datetime(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    mode: z.string(),
    shard_key: z.string(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable(),
    direction: z.string(),
    max_qty: z.number(),
    status_at_as_of: z.string(),
    opening_command_public_id: z.string().nullable(),
    closing_command_public_id: z.string().nullable(),
  })
  .strict()

export const AiReviewAftermathPositionCycleTransitionSchema =
  _AiReviewAftermathPositionCycleTransitionRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathPositionCycleTransition']
  >

const _AsyncioMetricsRawSchema = z
  .object({
    active_tasks: z.number().int(),
    pending_tasks: z.number().int(),
  })
  .strict()

export const AsyncioMetricsSchema = _AsyncioMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['AsyncioMetrics']
>

const _BacktestComparisonDataRawSchema = z
  .object({
    type: z.literal('backtest_comparison'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    run_a_public_id: z.string(),
    run_b_public_id: z.string(),
    config_hash: z.string().nullable().optional(),
    pairing_mode: z.string(),
    anchor_run_public_id: z.string().nullable().optional(),
  })
  .strict()

export const BacktestComparisonDataSchema =
  _BacktestComparisonDataRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestComparisonData']
  >

const _BacktestEquityPointInlineRawSchema = z
  .object({
    point_time: z.iso.datetime(),
    equity: z.number(),
    cash: z.number(),
    position_value: z.number(),
    drawdown: z.number(),
  })
  .strict()

export const BacktestEquityPointInlineSchema =
  _BacktestEquityPointInlineRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestEquityPointInline']
  >

const _BacktestEventDataRawSchema = z
  .object({
    type: z.literal('backtest_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    run_public_id: z.string(),
    event_type: z.string(),
    detail: z.record(z.string(), z.unknown()),
  })
  .strict()

export const BacktestEventDataSchema = _BacktestEventDataRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestEventData']
>

const _BacktestSignalDataRawSchema = z
  .object({
    type: z.literal('backtest_signal'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    run_public_id: z.string(),
    signal_time: z.iso.datetime(),
    signal_type: z.string(),
    instrument: z.string(),
    price: z.number(),
    indicators: z.record(z.string(), z.unknown()),
  })
  .strict()

export const BacktestSignalDataSchema = _BacktestSignalDataRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestSignalData']
>

const _BacktestStrategyClassListResponseRawSchema = z
  .object({
    type: z.literal('backtest_strategy_class_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(z.string()),
    count: z.number().int(),
  })
  .strict()

export const BacktestStrategyClassListResponseSchema =
  _BacktestStrategyClassListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestStrategyClassListResponse']
  >

const _BacktestTradeDataRawSchema = z
  .object({
    type: z.literal('backtest_trade'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    run_public_id: z.string(),
    executed_at: z.iso.datetime(),
    instrument: z.string(),
    side: z.string(),
    quantity: z.number(),
    price: z.number(),
    fee: z.number(),
    pnl: z.number().nullable().optional(),
    position_after: z.number(),
    signal_public_id: z.string().nullable().optional(),
  })
  .strict()

export const BacktestTradeDataSchema = _BacktestTradeDataRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestTradeData']
>

const _CacheHealthPayloadRawSchema = z
  .object({
    instruments_cached: z.number().int(),
    pairs_cached: z.number().int(),
    persist_universe_size: z.number().int(),
  })
  .strict()

export const CacheHealthPayloadSchema = _CacheHealthPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['CacheHealthPayload']
>

const _CachedCandleRawSchema = z
  .object({
    open_at_ms: z.number().int(),
    timeframe: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })
  .strict()

export const CachedCandleSchema = _CachedCandleRawSchema as unknown as z.ZodType<
  Components['schemas']['CachedCandle']
>

const _CachedStatsPayloadRawSchema = z
  .object({
    left: z.string(),
    right: z.string(),
    pearson_r: z.number().nullable(),
    pearson_n: z.number().int(),
    coint_t: z.number().nullable(),
    coint_pvalue: z.number().nullable(),
    coint_critical_values: z.tuple([z.number(), z.number(), z.number()]).nullable(),
    computed_at: z.iso.datetime().nullable(),
    sample_count: z.number().int(),
    is_warm: z.boolean(),
  })
  .strict()

export const CachedStatsPayloadSchema = _CachedStatsPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['CachedStatsPayload']
>

const _CandleDataRawSchema = z
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

export const CandleDataSchema = _CandleDataRawSchema as unknown as z.ZodType<
  Components['schemas']['CandleData']
>

const _ConnectionStatsRawSchema = z
  .object({
    active_connections: z.number().int(),
    zmq_subscribers: z.number().int(),
    subscriber_tasks: z.number().int(),
    active_topics: z.number().int(),
    active_clients: z.number().int(),
  })
  .strict()

export const ConnectionStatsSchema = _ConnectionStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['ConnectionStats']
>

const _ContinuousCandleDataRawSchema = z
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

export const ContinuousCandleDataSchema = _ContinuousCandleDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ContinuousCandleData']
>

const _ContractDataRawSchema = z
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

export const ContractDataSchema = _ContractDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ContractData']
>

const _CpuMetricsRawSchema = z
  .object({
    process_percent: z.number(),
    user_time_seconds: z.number(),
    system_time_seconds: z.number(),
    cgroup_quota_microseconds: z.number().int().nullable(),
    cgroup_throttled_count: z.number().int().nullable(),
  })
  .strict()

export const CpuMetricsSchema = _CpuMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['CpuMetrics']
>

const _CredentialSummaryRawSchema = z
  .object({
    type: z.literal('credential_summary'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    exchange: z.string(),
    credential_type: z.string(),
    label: z.string().nullable().optional(),
  })
  .strict()

export const CredentialSummarySchema = _CredentialSummaryRawSchema as unknown as z.ZodType<
  Components['schemas']['CredentialSummary']
>

const _DbInternalMetricsRawSchema = z
  .object({
    aiosqlite_live_connections: z.number().int(),
    pool_size: z.number().int().nullable(),
    pool_checked_out: z.number().int().nullable(),
  })
  .strict()

export const DbInternalMetricsSchema = _DbInternalMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['DbInternalMetrics']
>

const _DeviceAlertPrefInfoRawSchema = z
  .object({
    type: z.literal('device_alert_pref_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    device_public_id: z.string(),
    alert_type: z.string(),
    operator_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string().nullable().optional(),
    enabled: z.boolean(),
    min_priority: z.string(),
    quiet_hours_start_min: z.number().int().nullable().optional(),
    quiet_hours_end_min: z.number().int().nullable().optional(),
    mute_until: z.iso.datetime().nullable().optional(),
    timezone: z.string(),
  })
  .strict()

export const DeviceAlertPrefInfoSchema = _DeviceAlertPrefInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['DeviceAlertPrefInfo']
>

const _DiskMetricsRawSchema = z
  .object({
    mount_path: z.string(),
    total_bytes: z.number().int().nullable(),
    used_bytes: z.number().int().nullable(),
    free_bytes: z.number().int().nullable(),
    percent_used: z.number().nullable(),
    disk_low: z.boolean(),
    disk_critical: z.boolean(),
    status: z.enum(['healthy', 'warning', 'error']),
  })
  .strict()

export const DiskMetricsSchema = _DiskMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['DiskMetrics']
>

const _EgressActiveReservationSnapshotRawSchema = z
  .object({
    exchange: z.string(),
    traffic_class: z.enum(['public', 'private']),
    container: z.string(),
  })
  .strict()

export const EgressActiveReservationSnapshotSchema =
  _EgressActiveReservationSnapshotRawSchema as unknown as z.ZodType<
    Components['schemas']['EgressActiveReservationSnapshot']
  >

const _EgressConnectionSnapshotRawSchema = z
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

export const EgressConnectionSnapshotSchema =
  _EgressConnectionSnapshotRawSchema as unknown as z.ZodType<
    Components['schemas']['EgressConnectionSnapshot']
  >

const _EgressContainerSummaryRawSchema = z
  .object({
    container: z.string(),
    last_seen_age_seconds: z.number(),
    stale: z.boolean(),
    route_count: z.number().int(),
  })
  .strict()

export const EgressContainerSummarySchema =
  _EgressContainerSummaryRawSchema as unknown as z.ZodType<
    Components['schemas']['EgressContainerSummary']
  >

const _EgressTransferSnapshotRawSchema = z
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

export const EgressTransferSnapshotSchema =
  _EgressTransferSnapshotRawSchema as unknown as z.ZodType<
    Components['schemas']['EgressTransferSnapshot']
  >

const _EquityOverlayPointRawSchema = z
  .object({
    point_time: z.iso.datetime(),
    equity_a: z.number().nullable().optional(),
    equity_b: z.number().nullable().optional(),
  })
  .strict()

export const EquityOverlayPointSchema = _EquityOverlayPointRawSchema as unknown as z.ZodType<
  Components['schemas']['EquityOverlayPoint']
>

const _ExchangeListResponseRawSchema = z
  .object({
    type: z.literal('exchange_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(z.string()),
    count: z.number().int(),
  })
  .strict()

export const ExchangeListResponseSchema = _ExchangeListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ExchangeListResponse']
>

const _ExecutionDataRawSchema = z
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

export const ExecutionDataSchema = _ExecutionDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ExecutionData']
>

const _ExecutionPlanDataRawSchema = z
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

export const ExecutionPlanDataSchema = _ExecutionPlanDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ExecutionPlanData']
>

const _FeatureFlagsPayloadRawSchema = z
  .object({
    ai_integration_enabled: z.boolean(),
  })
  .strict()

export const FeatureFlagsPayloadSchema = _FeatureFlagsPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['FeatureFlagsPayload']
>

const _FrontMonthDataRawSchema = z
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

export const FrontMonthDataSchema = _FrontMonthDataRawSchema as unknown as z.ZodType<
  Components['schemas']['FrontMonthData']
>

const _GapStatsRawSchema = z
  .object({
    gaps_detected: z.number().int(),
    session_resets: z.number().int(),
    duplicates: z.number().int(),
    mid_stream_joins: z.number().int(),
    rejected_unstamped: z.number().int(),
  })
  .strict()

export const GapStatsSchema = _GapStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['GapStats']
>

const _GcMetricsRawSchema = z
  .object({
    collections_gen0: z.number().int(),
    collections_gen1: z.number().int(),
    collections_gen2: z.number().int(),
    uncollectable: z.number().int(),
    current_objects: z.number().int(),
  })
  .strict()

export const GcMetricsSchema = _GcMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['GcMetrics']
>

const _HealthTopicsRawSchema = z
  .object({
    active: z.number().int(),
  })
  .strict()

export const HealthTopicsSchema = _HealthTopicsRawSchema as unknown as z.ZodType<
  Components['schemas']['HealthTopics']
>

const _InstrumentCapabilityDataRawSchema = z
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

export const InstrumentCapabilityDataSchema =
  _InstrumentCapabilityDataRawSchema as unknown as z.ZodType<
    Components['schemas']['InstrumentCapabilityData']
  >

const _InstrumentDetailDataRawSchema = z
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

export const InstrumentDetailDataSchema = _InstrumentDetailDataRawSchema as unknown as z.ZodType<
  Components['schemas']['InstrumentDetailData']
>

const _InstrumentFeedHealthRowSchemaRawSchema = z
  .object({
    coordinator: z.string(),
    exchange: z.string(),
    channel: z.string(),
    symbol: z.string(),
    status: z.string(),
    requested_at: z.iso.datetime(),
    confirmed_at: z.iso.datetime().nullable(),
    last_seen_data_at: z.iso.datetime().nullable(),
    last_error: z.string().nullable(),
    retry_count: z.number().int(),
    snapshot_at: z.iso.datetime(),
  })
  .strict()

export const InstrumentFeedHealthRowSchemaSchema =
  _InstrumentFeedHealthRowSchemaRawSchema as unknown as z.ZodType<
    Components['schemas']['InstrumentFeedHealthRowSchema']
  >

const _InstrumentListResponseRawSchema = z
  .object({
    type: z.literal('instrument_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(z.string()),
    count: z.number().int(),
  })
  .strict()

export const InstrumentListResponseSchema =
  _InstrumentListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['InstrumentListResponse']
  >

const _JsonPrimitiveRawSchema = z.unknown()

export const JsonPrimitiveSchema = _JsonPrimitiveRawSchema as unknown as z.ZodType<
  Components['schemas']['JsonPrimitive']
>

const _LimitsMetricsRawSchema = z
  .object({
    rlimit_nproc: z.number().int(),
    rlimit_nofile: z.number().int(),
    rlimit_as_bytes: z.number().int(),
  })
  .strict()

export const LimitsMetricsSchema = _LimitsMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['LimitsMetrics']
>

const _MarketDataCoverageExchangeRawSchema = z
  .object({
    exchange: z.string(),
    instruments: z.number().int(),
    fresh_ticks: z.number().int(),
    fresh_candles: z.number().int(),
    gated_off: z.number().int(),
    dark: z.number().int(),
  })
  .strict()

export const MarketDataCoverageExchangeSchema =
  _MarketDataCoverageExchangeRawSchema as unknown as z.ZodType<
    Components['schemas']['MarketDataCoverageExchange']
  >

const _MemoryMetricsRawSchema = z
  .object({
    rss_bytes: z.number().int(),
    rss_peak_bytes: z.number().int(),
    vms_bytes: z.number().int(),
    python_traced_bytes: z.number().int().nullable(),
    native_bytes: z.number().int().nullable(),
    cgroup_limit_bytes: z.number().int().nullable(),
    cgroup_current_bytes: z.number().int().nullable(),
    saturation_pct: z.number().nullable(),
  })
  .strict()

export const MemoryMetricsSchema = _MemoryMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['MemoryMetrics']
>

const _MessageResponseRawSchema = z
  .object({
    type: z.literal('message'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.string(),
  })
  .strict()

export const MessageResponseSchema = _MessageResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['MessageResponse']
>

const _MetricDiffRowRawSchema = z
  .object({
    name: z.string(),
    run_a: z.number().nullable().optional(),
    run_b: z.number().nullable().optional(),
    delta: z.number().nullable().optional(),
    pct: z.number().nullable().optional(),
  })
  .strict()

export const MetricDiffRowSchema = _MetricDiffRowRawSchema as unknown as z.ZodType<
  Components['schemas']['MetricDiffRow']
>

const _NotificationDeviceInfoRawSchema = z
  .object({
    type: z.literal('notification_device_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    device_token: z.string(),
    device_id: z.string(),
    platform: z.string(),
    env: z.string(),
    app_version: z.string().nullable().optional(),
    previews_mode: z.string(),
    registered_at: z.iso.datetime(),
    last_seen_at: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const NotificationDeviceInfoSchema =
  _NotificationDeviceInfoRawSchema as unknown as z.ZodType<
    Components['schemas']['NotificationDeviceInfo']
  >

const _NotificationMetricsDataRawSchema = z
  .object({
    type: z.literal('notification_metrics'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    delivery_success_total: z.number().int(),
    delivery_failed_total: z.number().int(),
    delivery_410_unregistered_total: z.number().int(),
    delivery_cancelled_scope_total: z.number().int(),
    outbox_queued_depth: z.number().int(),
  })
  .strict()

export const NotificationMetricsDataSchema =
  _NotificationMetricsDataRawSchema as unknown as z.ZodType<
    Components['schemas']['NotificationMetricsData']
  >

const _OperatorInfoRawSchema = z
  .object({
    type: z.literal('operator_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    label: z.string(),
    description: z.string().nullable().optional(),
  })
  .strict()

export const OperatorInfoSchema = _OperatorInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['OperatorInfo']
>

const _OrderDataRawSchema = z
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

export const OrderDataSchema = _OrderDataRawSchema as unknown as z.ZodType<
  Components['schemas']['OrderData']
>

const _OrphanSweepResultDataRawSchema = z
  .object({
    type: z.literal('orphan_sweep_result'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    closed_count: z.number().int(),
    closed_cycle_ids: z.array(z.string()),
  })
  .strict()

export const OrphanSweepResultDataSchema = _OrphanSweepResultDataRawSchema as unknown as z.ZodType<
  Components['schemas']['OrphanSweepResultData']
>

const _PairedHaltInfoRawSchema = z
  .object({
    type: z.literal('paired_halt_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    halt_public_id: z.string(),
    reason: z.string(),
    group_public_id: z.string(),
    created_at: z.iso.datetime(),
  })
  .strict()

export const PairedHaltInfoSchema = _PairedHaltInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['PairedHaltInfo']
>

const _PairedLegExposureRawSchema = z
  .object({
    type: z.literal('paired_leg_exposure'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    leg_public_id: z.string(),
    leg_index: z.number().int(),
    exchange: z.string(),
    instrument: z.string(),
    mode: z.string(),
    shard_key: z.string(),
    side: z.string(),
    status: z.string(),
    filled_signed_qty: z.number(),
    compensated_signed_qty: z.number(),
    open_qty: z.number(),
    compensation_seq: z.number().int(),
  })
  .strict()

export const PairedLegExposureSchema = _PairedLegExposureRawSchema as unknown as z.ZodType<
  Components['schemas']['PairedLegExposure']
>

const _PnlAttributionOriginRawSchema = z.enum(['manual', 'plan', 'system', 'unattributed'])

export const PnlAttributionOriginSchema = _PnlAttributionOriginRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlAttributionOrigin']
>

const _PnlFillMarkerDataRawSchema = z
  .object({
    kind: z.literal('fill'),
    marker_time: z.iso.datetime(),
    instrument_public_id: z.string(),
    side: z.string(),
    size: z.number(),
    price: z.number().nullable(),
    execution_public_id: z.string(),
    order_public_id: z.string(),
    outcome: z.literal('executed'),
    status: z.string(),
  })
  .strict()

export const PnlFillMarkerDataSchema = _PnlFillMarkerDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlFillMarkerData']
>

const _PnlFxRateSourceDataRawSchema = z
  .object({
    source_currency: z.string(),
    valuation_currency: z.string(),
    base_currency: z.string(),
    quote_currency: z.string(),
    exchange: z.string(),
  })
  .strict()

export const PnlFxRateSourceDataSchema = _PnlFxRateSourceDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlFxRateSourceData']
>

const _PnlInstrumentContributionDataRawSchema = z
  .object({
    instrument_public_id: z.string(),
    realized_pnl: z.number().nullable(),
    fee_pnl: z.number().nullable(),
    accrual_pnl: z.number().nullable(),
    unrealized_pnl: z.number().nullable(),
  })
  .strict()

export const PnlInstrumentContributionDataSchema =
  _PnlInstrumentContributionDataRawSchema as unknown as z.ZodType<
    Components['schemas']['PnlInstrumentContributionData']
  >

const _PnlMarkerOutcomeRawSchema = z.enum(['executed', 'rejected', 'no_fill'])

export const PnlMarkerOutcomeSchema = _PnlMarkerOutcomeRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlMarkerOutcome']
>

const _PnlSignalMarkerDataRawSchema = z
  .object({
    kind: z.literal('signal'),
    marker_time: z.iso.datetime(),
    instrument_public_id: z.string(),
    side: z.string(),
    strategy_name: z.string().nullable(),
    strength: z.number(),
    reason: z.string(),
    price: z.number().nullable(),
    signal_public_id: z.string(),
    outcome: z.enum(['executed', 'no_fill']),
    status: z.enum(['executed', 'no_fill']),
  })
  .strict()

export const PnlSignalMarkerDataSchema = _PnlSignalMarkerDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlSignalMarkerData']
>

const _PnlValuationStatusRawSchema = z.enum(['complete', 'incomplete'])

export const PnlValuationStatusSchema = _PnlValuationStatusRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlValuationStatus']
>

const _PortfolioReconciliationDriftEpisodeRawSchema = z
  .object({
    public_id: z.string(),
    status: z.literal('open'),
    opened_at: z.iso.datetime(),
    trigger_observation_id: z.number().int(),
    last_observation_id: z.number().int(),
    details_source_observation_id: z.number().int(),
    latest_full_mismatch_count: z.number().int(),
  })
  .strict()

export const PortfolioReconciliationDriftEpisodeSchema =
  _PortfolioReconciliationDriftEpisodeRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioReconciliationDriftEpisode']
  >

const _PortfolioReconciliationEffectiveStatusRawSchema = z.enum([
  'matched',
  'mismatched',
  'incomplete',
  'unsupported',
  'error',
  'stale',
  'clock_error',
  'corrupt',
])

export const PortfolioReconciliationEffectiveStatusSchema =
  _PortfolioReconciliationEffectiveStatusRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioReconciliationEffectiveStatus']
  >

const _PortfolioReconciliationEvaluationStatusRawSchema = z.enum([
  'matched',
  'mismatched',
  'incomplete',
  'unsupported',
  'error',
])

export const PortfolioReconciliationEvaluationStatusSchema =
  _PortfolioReconciliationEvaluationStatusRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioReconciliationEvaluationStatus']
  >

const _PortfolioReconciliationMethodRawSchema = z.enum([
  'futures_position',
  'spot_execution_replay',
  'margin_ledger_replay',
  'unclassified',
])

export const PortfolioReconciliationMethodSchema =
  _PortfolioReconciliationMethodRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioReconciliationMethod']
  >

const _PositionCycleDataRawSchema = z
  .object({
    type: z.literal('position_cycle'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    cycle_public_id: z.string(),
    shard_key: z.string(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    mode: z.string(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable(),
    direction: z.string(),
    max_qty: z.number(),
    opened_at: z.string(),
    age_hours: z.number(),
  })
  .strict()

export const PositionCycleDataSchema = _PositionCycleDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PositionCycleData']
>

const _PositionDataRawSchema = z
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
    source_venue_event_id: z.number().int().nullable().optional(),
    position_cycle_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string(),
  })
  .strict()

export const PositionDataSchema = _PositionDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PositionData']
>

const _ProcessCategoryCountRawSchema = z
  .object({
    running: z.number().int(),
    total: z.number().int(),
  })
  .strict()

export const ProcessCategoryCountSchema = _ProcessCategoryCountRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCategoryCount']
>

const _ProcessCreatedInfoRawSchema = z
  .object({
    name: z.string(),
    template: z.string(),
  })
  .strict()

export const ProcessCreatedInfoSchema = _ProcessCreatedInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCreatedInfo']
>

const _ProcessDesiredStateDataRawSchema = z
  .object({
    type: z.literal('process_desired_state'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.literal('success'),
    name: z.string(),
    action: z.enum(['enable', 'disable', 'restart']),
    coordinator: z.string().nullable().optional(),
    managed_remotely: z.boolean(),
    message: z.string().nullable().optional(),
  })
  .strict()

export const ProcessDesiredStateDataSchema =
  _ProcessDesiredStateDataRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessDesiredStateData']
  >

const _ProcessMetricsRawSchema = z
  .object({
    pid: z.number().int(),
    uptime_seconds: z.number(),
    status: z.string(),
    num_threads: z.number().int(),
    num_fds: z.number().int(),
    num_connections: z.number().int(),
  })
  .strict()

export const ProcessMetricsSchema = _ProcessMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessMetrics']
>

const _ProcessStartDataRawSchema = z
  .object({
    type: z.literal('process_start'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.enum(['success', 'already_running', 'error']),
    name: z.string(),
    process_public_id: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
  })
  .strict()

export const ProcessStartDataSchema = _ProcessStartDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStartData']
>

const _ProcessStatusRawSchema = z
  .object({
    status: z.enum(['not_running', 'running', 'stopped', 'completed', 'error']),
    pid: z.number().int().nullable().optional(),
    started_at: z.string().nullable().optional(),
    command: z.string().nullable().optional(),
    exit_code: z.number().int().nullable().optional(),
    error: z.string().nullable().optional(),
  })
  .strict()

export const ProcessStatusSchema = _ProcessStatusRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStatus']
>

const _ProcessStopDataRawSchema = z
  .object({
    type: z.literal('process_stop'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.enum(['success', 'not_running', 'error']),
    name: z.string(),
    message: z.string().nullable().optional(),
  })
  .strict()

export const ProcessStopDataSchema = _ProcessStopDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStopData']
>

const _ProcessSummaryItemRawSchema = z
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

export const ProcessSummaryItemSchema = _ProcessSummaryItemRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessSummaryItem']
>

const _PushBetaConfigReadRawSchema = z
  .object({
    type: z.literal('push_beta_config_read'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    enabled: z.boolean(),
    user_public_ids: z.array(z.string()),
  })
  .strict()

export const PushBetaConfigReadSchema = _PushBetaConfigReadRawSchema as unknown as z.ZodType<
  Components['schemas']['PushBetaConfigRead']
>

const _RealPortfolioReconciliationMethodRawSchema = z.enum([
  'futures_position',
  'spot_execution_replay',
  'margin_ledger_replay',
])

export const RealPortfolioReconciliationMethodSchema =
  _RealPortfolioReconciliationMethodRawSchema as unknown as z.ZodType<
    Components['schemas']['RealPortfolioReconciliationMethod']
  >

const _RelatedInstrumentDataRawSchema = z
  .object({
    type: z.literal('related_instrument'),
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
    is_selected: z.boolean(),
  })
  .strict()

export const RelatedInstrumentDataSchema = _RelatedInstrumentDataRawSchema as unknown as z.ZodType<
  Components['schemas']['RelatedInstrumentData']
>

const _RelatedInstrumentsSelectedRawSchema = z
  .object({
    exchange: z.string(),
    native_symbol: z.string(),
  })
  .strict()

export const RelatedInstrumentsSelectedSchema =
  _RelatedInstrumentsSelectedRawSchema as unknown as z.ZodType<
    Components['schemas']['RelatedInstrumentsSelected']
  >

const _RelatedInstrumentsUnderlyingRawSchema = z
  .object({
    public_id: z.string(),
    ticker: z.string(),
    name: z.string(),
    asset_class: z.string(),
    sector: z.string().nullable(),
    description: z.string().nullable(),
  })
  .strict()

export const RelatedInstrumentsUnderlyingSchema =
  _RelatedInstrumentsUnderlyingRawSchema as unknown as z.ZodType<
    Components['schemas']['RelatedInstrumentsUnderlying']
  >

const _RelationshipTypeEnumRawSchema = z.enum(['exact', 'derivative', 'proxy'])

export const RelationshipTypeEnumSchema = _RelationshipTypeEnumRawSchema as unknown as z.ZodType<
  Components['schemas']['RelationshipTypeEnum']
>

const _ResearcherReadRawSchema = z
  .object({
    public_id: z.string(),
    username: z.string(),
    label: z.string(),
    created_by_user_public_id: z.string(),
    created_at: z.iso.datetime(),
    is_active: z.boolean(),
  })
  .strict()

export const ResearcherReadSchema = _ResearcherReadRawSchema as unknown as z.ZodType<
  Components['schemas']['ResearcherRead']
>

const _RestRateExchangeStatsRawSchema = z
  .object({
    rps_1s: z.number(),
    rps_10s: z.number(),
    rps_60s: z.number(),
    limit_rps: z.number().nullable().optional(),
    utilization: z.number().nullable().optional(),
  })
  .strict()

export const RestRateExchangeStatsSchema = _RestRateExchangeStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['RestRateExchangeStats']
>

const _RetentionPolicyResultRawSchema = z
  .object({
    table: z.string(),
    retain_days: z.number().int(),
    backlog_lookback_days: z.number().int(),
    day_start: z.string().nullable(),
    day_end: z.string().nullable(),
    archived_rows: z.number().int(),
    purged_rows: z.number().int(),
    files_written: z.number().int(),
    error: z.string().nullable(),
  })
  .strict()

export const RetentionPolicyResultSchema = _RetentionPolicyResultRawSchema as unknown as z.ZodType<
  Components['schemas']['RetentionPolicyResult']
>

const _RollPointDetailRawSchema = z
  .object({
    from_contract: z.string(),
    to_contract: z.string(),
    roll_at: z.string(),
  })
  .strict()

export const RollPointDetailSchema = _RollPointDetailRawSchema as unknown as z.ZodType<
  Components['schemas']['RollPointDetail']
>

const _SaturationMetricsRawSchema = z
  .object({
    threads_pct: z.number().nullable(),
    fds_pct: z.number().nullable(),
  })
  .strict()

export const SaturationMetricsSchema = _SaturationMetricsRawSchema as unknown as z.ZodType<
  Components['schemas']['SaturationMetrics']
>

const _ScopeGrantInfoRawSchema = z
  .object({
    type: z.literal('scope_grant_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    operator_public_id: z.string(),
    wallet_public_id: z.string(),
    granted_by_user_public_id: z.string(),
    scope_kind: z.string(),
    underlying_public_id: z.string().nullable().optional(),
    instrument_public_id: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    known_to: z.iso.datetime(),
  })
  .strict()

export const ScopeGrantInfoSchema = _ScopeGrantInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['ScopeGrantInfo']
>

const _SettingCategoriesResponseRawSchema = z
  .object({
    type: z.literal('setting_categories'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(z.string()),
    count: z.number().int(),
  })
  .strict()

export const SettingCategoriesResponseSchema =
  _SettingCategoriesResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['SettingCategoriesResponse']
  >

const _SettingReadRawSchema = z
  .object({
    type: z.literal('setting_read'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    key: z.string(),
    value: z.string(),
    category: z.string(),
    description: z.string().nullable().optional(),
    updated_at: z.iso.datetime(),
    updated_by: z.string().nullable().optional(),
  })
  .strict()

export const SettingReadSchema = _SettingReadRawSchema as unknown as z.ZodType<
  Components['schemas']['SettingRead']
>

const _SignalDataRawSchema = z
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

export const SignalDataSchema = _SignalDataRawSchema as unknown as z.ZodType<
  Components['schemas']['SignalData']
>

const _SignalDiffEntryRawSchema = z
  .object({
    instrument: z.string(),
    signal_time: z.iso.datetime(),
    signal_type: z.string(),
    leg: z.enum(['a', 'b', 'common']),
  })
  .strict()

export const SignalDiffEntrySchema = _SignalDiffEntryRawSchema as unknown as z.ZodType<
  Components['schemas']['SignalDiffEntry']
>

const _StrategyProcessRawSchema = z
  .object({
    type: z.literal('strategy_process'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    name: z.string(),
    running: z.boolean(),
    enabled: z.boolean(),
    mode: z.enum(['thread', 'process']),
    strategy_class: z.string().nullable().optional(),
    coordinator: z.string().nullable().optional(),
    coordinator_label: z.string().nullable().optional(),
    managed_remotely: z.boolean(),
  })
  .strict()

export const StrategyProcessSchema = _StrategyProcessRawSchema as unknown as z.ZodType<
  Components['schemas']['StrategyProcess']
>

const _SubscriptionsStatsRawSchema = z
  .object({
    per_topic: z.record(z.string(), z.number().int()),
    per_client: z.record(z.string(), z.array(z.string())),
  })
  .strict()

export const SubscriptionsStatsSchema = _SubscriptionsStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['SubscriptionsStats']
>

const _TableStatsItemRawSchema = z
  .object({
    table: z.string(),
    table_kind: z.enum(['event', 'state']),
    total: z.number().int().nullable(),
    current: z.number().int().nullable(),
    closed: z.number().int().nullable(),
    archivable: z.number().int().nullable(),
    is_stale: z.boolean(),
    last_sampled_at: z.iso.datetime(),
  })
  .strict()

export const TableStatsItemSchema = _TableStatsItemRawSchema as unknown as z.ZodType<
  Components['schemas']['TableStatsItem']
>

const _TopicMetricSnapshotRawSchema = z
  .object({
    active_subscribers: z.number().int(),
    received: z.number().int(),
    forwarded: z.number().int(),
    throttled: z.number().int(),
    dropped: z.number().int(),
    timeout: z.number().int(),
    errors: z.number().int(),
    invalid_messages: z.number().int(),
    last_message_ts: z.number(),
    throttle_ms: z.number().int().nullable().optional(),
    pattern: z.string().nullable().optional(),
  })
  .strict()

export const TopicMetricSnapshotSchema = _TopicMetricSnapshotRawSchema as unknown as z.ZodType<
  Components['schemas']['TopicMetricSnapshot']
>

const _TracemallocStateRawSchema = z
  .object({
    active: z.boolean(),
    requested_duration_seconds: z.number().nullable(),
  })
  .strict()

export const TracemallocStateSchema = _TracemallocStateRawSchema as unknown as z.ZodType<
  Components['schemas']['TracemallocState']
>

const _TradeDiffEntryRawSchema = z
  .object({
    instrument: z.string(),
    executed_at: z.iso.datetime(),
    side: z.string(),
    quantity: z.number(),
    price: z.number(),
    leg: z.enum(['a', 'b', 'common']),
    pnl_a: z.number().nullable().optional(),
    pnl_b: z.number().nullable().optional(),
    pnl_delta: z.number().nullable().optional(),
  })
  .strict()

export const TradeDiffEntrySchema = _TradeDiffEntryRawSchema as unknown as z.ZodType<
  Components['schemas']['TradeDiffEntry']
>

const _TrailingStopStateDataRawSchema = z
  .object({
    type: z.literal('trailing_stop_state'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    plan_public_id: z.string(),
    status: z.string(),
    trailing_pct: z.number(),
    min_lock_pct: z.number(),
    entry_price: z.number(),
    peak_price: z.number(),
    current_stop: z.number(),
    side: z.string(),
  })
  .strict()

export const TrailingStopStateDataSchema = _TrailingStopStateDataRawSchema as unknown as z.ZodType<
  Components['schemas']['TrailingStopStateData']
>

const _UnderlyingAssetDataRawSchema = z
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

export const UnderlyingAssetDataSchema = _UnderlyingAssetDataRawSchema as unknown as z.ZodType<
  Components['schemas']['UnderlyingAssetData']
>

const _UnderlyingInstrumentDataRawSchema = z
  .object({
    type: z.literal('underlying_instrument'),
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
  .strict()

export const UnderlyingInstrumentDataSchema =
  _UnderlyingInstrumentDataRawSchema as unknown as z.ZodType<
    Components['schemas']['UnderlyingInstrumentData']
  >

const _UserAlertDefaultInfoRawSchema = z
  .object({
    type: z.literal('user_alert_default_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    alert_type: z.string(),
    enabled: z.boolean(),
    min_priority: z.string(),
  })
  .strict()

export const UserAlertDefaultInfoSchema = _UserAlertDefaultInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['UserAlertDefaultInfo']
>

const _UserRoleRawSchema = z.enum(['ai_researcher', 'ai_delegate', 'viewer', 'operator', 'admin'])

export const UserRoleSchema = _UserRoleRawSchema as unknown as z.ZodType<
  Components['schemas']['UserRole']
>

const _ValidationErrorRawSchema = z
  .object({
    loc: z.array(z.union([z.string(), z.number().int()])),
    msg: z.string(),
    type: z.string(),
    input: z.unknown().optional(),
    ctx: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const ValidationErrorSchema = _ValidationErrorRawSchema as unknown as z.ZodType<
  Components['schemas']['ValidationError']
>

const _VenueFeeScheduleDataRawSchema = z
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

export const VenueFeeScheduleDataSchema = _VenueFeeScheduleDataRawSchema as unknown as z.ZodType<
  Components['schemas']['VenueFeeScheduleData']
>

const _WalletInfoRawSchema = z
  .object({
    type: z.literal('wallet_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    label: z.string(),
    description: z.string().nullable().optional(),
    is_paper: z.boolean(),
  })
  .strict()

export const WalletInfoSchema = _WalletInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['WalletInfo']
>

const _WebSocketStatsRawSchema = z
  .object({
    active_connections: z.number().int(),
    topic_subscribers: z.record(z.string(), z.number().int()),
    client_count: z.number().int(),
  })
  .strict()

export const WebSocketStatsSchema = _WebSocketStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['WebSocketStats']
>

const _WsStatsConfigRawSchema = z
  .object({
    broker_xpub: z.string(),
    heartbeat_interval_ms: z.number().int(),
  })
  .strict()

export const WsStatsConfigSchema = _WsStatsConfigRawSchema as unknown as z.ZodType<
  Components['schemas']['WsStatsConfig']
>

const _WsTokenDataRawSchema = z
  .object({
    type: z.literal('ws_token'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    message: z.string(),
    ws_token: z.string(),
    ws_token_exp: z.iso.datetime(),
    expires_in: z.number().int(),
  })
  .strict()

export const WsTokenDataSchema = _WsTokenDataRawSchema as unknown as z.ZodType<
  Components['schemas']['WsTokenData']
>

const _ZmqBridgeStatsRawSchema = z
  .object({
    active_topics: z.number().int(),
    subscriber_tasks: z.number().int(),
    available_topics: z.array(z.string()),
  })
  .strict()

export const ZmqBridgeStatsSchema = _ZmqBridgeStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['ZmqBridgeStats']
>

const _ZmqComponentsRawSchema = z
  .object({
    zmq_context: z.enum(['ok', 'error']),
    websocket_manager: z.enum(['ok', 'error']),
    active_connections: z.number().int(),
  })
  .strict()

export const ZmqComponentsSchema = _ZmqComponentsRawSchema as unknown as z.ZodType<
  Components['schemas']['ZmqComponents']
>

const _ZmqConfigRawSchema = z
  .object({
    available_topics: z.array(z.string()),
  })
  .strict()

export const ZmqConfigSchema = _ZmqConfigRawSchema as unknown as z.ZodType<
  Components['schemas']['ZmqConfig']
>

const _PermissionRawSchema = z.enum([
  'read:market_data',
  'read:market_views',
  'submit:market_view',
  'read:orders',
  'create:orders',
  'cancel:orders',
  'read:positions',
  'manage:positions',
  'read:account_state',
  'read:strategies',
  'read:signals',
  'start:strategies',
  'stop:strategies',
  'configure:strategies',
  'read:system_status',
  'manage:processes',
  'configure:system',
  'manage:users',
  'read:wallet_credentials',
  'manage:wallet_credentials',
  'manage:scope_grants',
  'impersonate:operator',
  'read:backtests',
  'manage:backtests',
  'read:notifications',
  'manage:notification_devices',
  'manage:paired_execution',
])

export const PermissionSchema = _PermissionRawSchema as unknown as z.ZodType<
  Components['schemas']['Permission']
>

const _RefreshTokenPayloadRawSchema = z
  .object({
    active_wallet_public_id: z.string().nullable().optional(),
    clear_active_wallet: z.boolean().optional(),
  })
  .strict()

export const RefreshTokenPayloadSchema = _RefreshTokenPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['RefreshTokenPayload']
>

const _UpdateAuthMeBodyRawSchema = z
  .object({
    default_language: z.string().max(20).nullable().optional(),
  })
  .strict()

export const UpdateAuthMeBodySchema = _UpdateAuthMeBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['UpdateAuthMeBody']
>

const _DeactivateUserBodyRawSchema = z
  .object({
    reason: z.string().nullable().optional(),
  })
  .strict()

export const DeactivateUserBodySchema = _DeactivateUserBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['DeactivateUserBody']
>

const _ChangePasswordBodyRawSchema = z
  .object({
    current_password: z.string(),
    new_password: z.string().min(8),
  })
  .strict()

export const ChangePasswordBodySchema = _ChangePasswordBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['ChangePasswordBody']
>

const _AdminResetPasswordBodyRawSchema = z
  .object({
    new_password: z.string().min(8),
  })
  .strict()

export const AdminResetPasswordBodySchema =
  _AdminResetPasswordBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['AdminResetPasswordBody']
  >

const _SettingUpdateBodyRawSchema = z
  .object({
    value: z.string(),
    category: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .strict()

export const SettingUpdateBodySchema = _SettingUpdateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['SettingUpdateBody']
>

const _PushBetaUsersBodyRawSchema = z
  .object({
    enabled: z.boolean(),
    user_public_ids: z.array(z.string()).optional(),
  })
  .strict()

export const PushBetaUsersBodySchema = _PushBetaUsersBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['PushBetaUsersBody']
>

const _RemoveSettingBodyRawSchema = z.object({}).strict()

export const RemoveSettingBodySchema = _RemoveSettingBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['RemoveSettingBody']
>

const _DelegateDeactivateBodyRawSchema = z
  .object({
    reason: z.string().max(120).nullable().optional(),
  })
  .strict()

export const DelegateDeactivateBodySchema =
  _DelegateDeactivateBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateDeactivateBody']
  >

const _AiReviewDecisionRequestRawSchema = z
  .object({
    decision: z.string(),
    rationale: z.string().nullable().optional(),
  })
  .strict()

export const AiReviewDecisionRequestSchema =
  _AiReviewDecisionRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewDecisionRequest']
  >

const _UserAlertDefaultBodyRawSchema = z
  .object({
    alert_type: z.enum([
      'order_fill_full',
      'order_rejected',
      'order_unknown',
      'position_stop_loss_fired',
      'margin_warning',
      'critical_system_error',
      'drift',
    ]),
    enabled: z.boolean().optional(),
    min_priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict()

export const UserAlertDefaultBodySchema = _UserAlertDefaultBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['UserAlertDefaultBody']
>

const _BacktestCompareBodyRawSchema = z
  .object({
    mode: z.enum(['manual', 'auto']),
    run_a_public_id: z.string().nullable().optional(),
    run_b_public_id: z.string().nullable().optional(),
    config_hash: z.string().nullable().optional(),
    anchor_run_public_id: z.string().nullable().optional(),
  })
  .strict()

export const BacktestCompareBodySchema = _BacktestCompareBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestCompareBody']
>

const _BacktestCancelBodyRawSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict()

export const BacktestCancelBodySchema = _BacktestCancelBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestCancelBody']
>

const _RotateCredentialBodyRawSchema = z
  .object({
    credential_payload: z.record(z.string(), z.string()),
    label: z.string().max(128).nullable().optional(),
  })
  .strict()

export const RotateCredentialBodySchema = _RotateCredentialBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['RotateCredentialBody']
>

const _RegisterDeviceBodyRawSchema = z
  .object({
    device_token: z.string().min(64).max(64),
    device_id: z.string().min(1).max(64),
    env: z.enum(['sandbox', 'prod']),
    app_version: z.string().max(32).nullable().optional(),
    previews_mode: z.enum(['private', 'public']).optional(),
  })
  .strict()

export const RegisterDeviceBodySchema = _RegisterDeviceBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['RegisterDeviceBody']
>

const _DeviceAlertPrefBodyRawSchema = z
  .object({
    alert_type: z.enum([
      'order_fill_full',
      'order_rejected',
      'order_unknown',
      'position_stop_loss_fired',
      'margin_warning',
      'critical_system_error',
      'drift',
    ]),
    operator_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
    min_priority: z.enum(['low', 'medium', 'high']).optional(),
    quiet_hours_start_min: z.number().int().nullable().optional(),
    quiet_hours_end_min: z.number().int().nullable().optional(),
    mute_until: z.iso.datetime().nullable().optional(),
    timezone: z.string().max(64).optional(),
  })
  .strict()

export const DeviceAlertPrefBodySchema = _DeviceAlertPrefBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['DeviceAlertPrefBody']
>

const _RevokeDevicePrefBodyRawSchema = z
  .object({
    reason: z.string().max(512).nullable().optional(),
  })
  .strict()

export const RevokeDevicePrefBodySchema = _RevokeDevicePrefBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['RevokeDevicePrefBody']
>

const _BracketCreateBodyRawSchema = z
  .object({
    position_cycle_public_id: z.string(),
    sl_price: z.number().nullable().optional(),
    tp_price: z.number().nullable().optional(),
    idempotency_key: z.string().nullable().optional(),
  })
  .strict()

export const BracketCreateBodySchema = _BracketCreateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['BracketCreateBody']
>

const _BracketCancelBodyRawSchema = z
  .object({
    reason: z.string().nullable().optional(),
  })
  .strict()

export const BracketCancelBodySchema = _BracketCancelBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['BracketCancelBody']
>

const _CreateOperatorBodyRawSchema = z
  .object({
    label: z.string().min(1).max(128),
    description: z.string().max(512).nullable().optional(),
  })
  .strict()

export const CreateOperatorBodySchema = _CreateOperatorBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateOperatorBody']
>

const _CreateOrderBodyRawSchema = z
  .object({
    instrument: z.string(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    mode: z.enum(['live', 'paper']).optional(),
    side: z.enum(['buy', 'sell']),
    order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
    quantity: z.number(),
    price: z.number().nullable().optional(),
    stop_price: z.number().nullable().optional(),
    time_in_force: z.string().optional(),
    post_only: z.boolean().optional(),
    leverage: z.number().int().nullable().optional(),
    reduce_only: z.boolean().optional(),
    wallet_public_id: z.string().nullable().optional(),
    operator_public_id: z.string().nullable().optional(),
    idempotency_key: z.string().nullable().optional(),
    ai_review_public_id: z.string().nullable().optional(),
  })
  .strict()

export const CreateOrderBodySchema = _CreateOrderBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateOrderBody']
>

const _CancelOrderBodyRawSchema = z
  .object({
    reason: z.string().nullable().optional(),
  })
  .strict()

export const CancelOrderBodySchema = _CancelOrderBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CancelOrderBody']
>

const _ProcessDesiredStateBodyRawSchema = z
  .object({
    action: z.enum(['enable', 'disable', 'restart']),
    restart_nonce: z.string().min(8).max(64).nullable().optional(),
  })
  .strict()

export const ProcessDesiredStateBodySchema =
  _ProcessDesiredStateBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessDesiredStateBody']
  >

const _ProcessConfigScopeBodyRawSchema = z
  .object({
    operator_public_id: z.string().max(256).nullable().optional(),
    wallet_public_id: z.string().max(256).nullable().optional(),
    reference_identity_params: z.record(z.string(), z.string()).nullable().optional(),
  })
  .strict()

export const ProcessConfigScopeBodySchema =
  _ProcessConfigScopeBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessConfigScopeBody']
  >

const _CreateScopeGrantBodyRawSchema = z
  .object({
    operator_public_id: z.string().min(1).max(64),
    wallet_public_id: z.string().min(1).max(64),
    scope_kind: z.enum(['underlying', 'instrument']),
    underlying_public_id: z.string().max(64).nullable().optional(),
    instrument_public_id: z.string().max(64).nullable().optional(),
    note: z.string().max(512).nullable().optional(),
  })
  .strict()

export const CreateScopeGrantBodySchema = _CreateScopeGrantBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateScopeGrantBody']
>

const _HandoverScopeGrantBodyRawSchema = z
  .object({
    from_grant_public_id: z.string().min(1).max(64),
    to_operator_public_id: z.string().min(1).max(64),
    reason: z.string().max(512).nullable().optional(),
  })
  .strict()

export const HandoverScopeGrantBodySchema =
  _HandoverScopeGrantBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['HandoverScopeGrantBody']
  >

const _RevokeScopeGrantBodyRawSchema = z
  .object({
    reason: z.string().max(512).nullable().optional(),
  })
  .strict()

export const RevokeScopeGrantBodySchema = _RevokeScopeGrantBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['RevokeScopeGrantBody']
>

const _TrailingStopCreateBodyRawSchema = z
  .object({
    position_cycle_public_id: z.string(),
    trailing_pct: z.number(),
    min_lock_pct: z.number().optional(),
    idempotency_key: z.string().nullable().optional(),
  })
  .strict()

export const TrailingStopCreateBodySchema =
  _TrailingStopCreateBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['TrailingStopCreateBody']
  >

const _TrailingStopCancelBodyRawSchema = z
  .object({
    reason: z.string().nullable().optional(),
  })
  .strict()

export const TrailingStopCancelBodySchema =
  _TrailingStopCancelBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['TrailingStopCancelBody']
  >

const _CreateWalletBodyRawSchema = z
  .object({
    label: z.string().min(1).max(128),
    description: z.string().max(512).nullable().optional(),
    is_paper: z.boolean().optional(),
  })
  .strict()

export const CreateWalletBodySchema = _CreateWalletBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateWalletBody']
>

const _BacktestComparisonListResponseRawSchema = z
  .object({
    type: z.literal('backtest_comparison_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestComparisonDataSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestComparisonListResponseSchema =
  _BacktestComparisonListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestComparisonListResponse']
  >

const _BacktestComparisonResponseRawSchema = z
  .object({
    type: z.literal('backtest_comparison_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestComparisonDataSchema,
  })
  .strict()

export const BacktestComparisonResponseSchema =
  _BacktestComparisonResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestComparisonResponse']
  >

const _BacktestEquityPointListResponseRawSchema = z
  .object({
    type: z.literal('backtest_equity_point_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestEquityPointInlineSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestEquityPointListResponseSchema =
  _BacktestEquityPointListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestEquityPointListResponse']
  >

const _BacktestEventListResponseRawSchema = z
  .object({
    type: z.literal('backtest_event_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestEventDataSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestEventListResponseSchema =
  _BacktestEventListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestEventListResponse']
  >

const _BacktestSignalListResponseRawSchema = z
  .object({
    type: z.literal('backtest_signal_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestSignalDataSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestSignalListResponseSchema =
  _BacktestSignalListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestSignalListResponse']
  >

const _BacktestTradeListResponseRawSchema = z
  .object({
    type: z.literal('backtest_trade_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestTradeDataSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestTradeListResponseSchema =
  _BacktestTradeListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestTradeListResponse']
  >

const _CacheHealthResponseRawSchema = z
  .object({
    type: z.literal('cache_health'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CacheHealthPayloadSchema,
  })
  .strict()

export const CacheHealthResponseSchema = _CacheHealthResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['CacheHealthResponse']
>

const _CachedCandlesPayloadRawSchema = z
  .object({
    candles: z.array(CachedCandleSchema),
    sample_count: z.number().int(),
    is_warm: z.boolean(),
    source: z.enum(['cache', 'derived', 'db']),
  })
  .strict()

export const CachedCandlesPayloadSchema = _CachedCandlesPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['CachedCandlesPayload']
>

const _CachedStatsResponseRawSchema = z
  .object({
    type: z.literal('cached_stats'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CachedStatsPayloadSchema,
  })
  .strict()

export const CachedStatsResponseSchema = _CachedStatsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['CachedStatsResponse']
>

const _ListedCachedStatsPayloadRawSchema = z
  .object({
    count: z.number().int(),
    pairs: z.array(CachedStatsPayloadSchema),
  })
  .strict()

export const ListedCachedStatsPayloadSchema =
  _ListedCachedStatsPayloadRawSchema as unknown as z.ZodType<
    Components['schemas']['ListedCachedStatsPayload']
  >

const _CandleListResponseRawSchema = z
  .object({
    type: z.literal('candle_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(CandleDataSchema),
    count: z.number().int(),
  })
  .strict()

export const CandleListResponseSchema = _CandleListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['CandleListResponse']
>

const _ContinuousCandleListResponseRawSchema = z
  .object({
    type: z.literal('continuous_candle_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ContinuousCandleDataSchema),
    count: z.number().int(),
  })
  .strict()

export const ContinuousCandleListResponseSchema =
  _ContinuousCandleListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ContinuousCandleListResponse']
  >

const _ContractListResponseRawSchema = z
  .object({
    type: z.literal('contract_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ContractDataSchema),
    count: z.number().int(),
  })
  .strict()

export const ContractListResponseSchema = _ContractListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ContractListResponse']
>

const _CredentialListResponseRawSchema = z
  .object({
    type: z.literal('credential_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(CredentialSummarySchema),
    count: z.number().int(),
  })
  .strict()

export const CredentialListResponseSchema =
  _CredentialListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['CredentialListResponse']
  >

const _CredentialResponseRawSchema = z
  .object({
    type: z.literal('credential_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CredentialSummarySchema,
  })
  .strict()

export const CredentialResponseSchema = _CredentialResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['CredentialResponse']
>

const _DeviceAlertPrefListResponseRawSchema = z
  .object({
    type: z.literal('device_alert_pref_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(DeviceAlertPrefInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const DeviceAlertPrefListResponseSchema =
  _DeviceAlertPrefListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['DeviceAlertPrefListResponse']
  >

const _DeviceAlertPrefResponseRawSchema = z
  .object({
    type: z.literal('device_alert_pref_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DeviceAlertPrefInfoSchema,
  })
  .strict()

export const DeviceAlertPrefResponseSchema =
  _DeviceAlertPrefResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['DeviceAlertPrefResponse']
  >

const _RevokeDevicePrefResponseRawSchema = z
  .object({
    type: z.literal('revoke_device_pref_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DeviceAlertPrefInfoSchema,
  })
  .strict()

export const RevokeDevicePrefResponseSchema =
  _RevokeDevicePrefResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['RevokeDevicePrefResponse']
  >

const _EgressRouteStatusSnapshotRawSchema = z
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

export const EgressRouteStatusSnapshotSchema =
  _EgressRouteStatusSnapshotRawSchema as unknown as z.ZodType<
    Components['schemas']['EgressRouteStatusSnapshot']
  >

const _ExecutionListResponseRawSchema = z
  .object({
    type: z.literal('execution_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ExecutionDataSchema),
    count: z.number().int(),
  })
  .strict()

export const ExecutionListResponseSchema = _ExecutionListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ExecutionListResponse']
>

const _ExecutionPlanResponseRawSchema = z
  .object({
    type: z.literal('execution_plan_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ExecutionPlanDataSchema,
  })
  .strict()

export const ExecutionPlanResponseSchema = _ExecutionPlanResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ExecutionPlanResponse']
>

const _FeatureFlagsResponseRawSchema = z
  .object({
    type: z.literal('feature_flags_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: FeatureFlagsPayloadSchema,
  })
  .strict()

export const FeatureFlagsResponseSchema = _FeatureFlagsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['FeatureFlagsResponse']
>

const _FrontMonthResponseRawSchema = z
  .object({
    type: z.literal('front_month'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: FrontMonthDataSchema,
  })
  .strict()

export const FrontMonthResponseSchema = _FrontMonthResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['FrontMonthResponse']
>

const _GapDetectionStatsRawSchema = z
  .object({
    bridge: GapStatsSchema,
    rest_clients: z.record(z.string(), GapStatsSchema),
  })
  .strict()

export const GapDetectionStatsSchema = _GapDetectionStatsRawSchema as unknown as z.ZodType<
  Components['schemas']['GapDetectionStats']
>

const _InstrumentCapabilityListResponseRawSchema = z
  .object({
    type: z.literal('instrument_capability_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(InstrumentCapabilityDataSchema),
    count: z.number().int(),
  })
  .strict()

export const InstrumentCapabilityListResponseSchema =
  _InstrumentCapabilityListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['InstrumentCapabilityListResponse']
  >

const _InstrumentDetailListResponseRawSchema = z
  .object({
    type: z.literal('instrument_detail_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(InstrumentDetailDataSchema),
    count: z.number().int(),
  })
  .strict()

export const InstrumentDetailListResponseSchema =
  _InstrumentDetailListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['InstrumentDetailListResponse']
  >

const _MarketFeedHealthPayloadRawSchema = z
  .object({
    rows: z.array(InstrumentFeedHealthRowSchemaSchema),
    exchange: z.string().nullable(),
    fresh_within_seconds: z.number().int().nullable(),
  })
  .strict()

export const MarketFeedHealthPayloadSchema =
  _MarketFeedHealthPayloadRawSchema as unknown as z.ZodType<
    Components['schemas']['MarketFeedHealthPayload']
  >

const _JsonValueRawSchema = z.unknown()

export const JsonValueSchema = _JsonValueRawSchema as unknown as z.ZodType<
  Components['schemas']['JsonValue']
>

const _MarketDataCoveragePayloadRawSchema = z
  .object({
    exchanges: z.array(MarketDataCoverageExchangeSchema),
    tick_window_seconds: z.number().int(),
    candle_window_seconds: z.number().int(),
  })
  .strict()

export const MarketDataCoveragePayloadSchema =
  _MarketDataCoveragePayloadRawSchema as unknown as z.ZodType<
    Components['schemas']['MarketDataCoveragePayload']
  >

const _NotificationDeviceListResponseRawSchema = z
  .object({
    type: z.literal('notification_device_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(NotificationDeviceInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const NotificationDeviceListResponseSchema =
  _NotificationDeviceListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['NotificationDeviceListResponse']
  >

const _NotificationDeviceResponseRawSchema = z
  .object({
    type: z.literal('notification_device_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: NotificationDeviceInfoSchema,
  })
  .strict()

export const NotificationDeviceResponseSchema =
  _NotificationDeviceResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['NotificationDeviceResponse']
  >

const _NotificationMetricsResponseRawSchema = z
  .object({
    type: z.literal('notification_metrics_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: NotificationMetricsDataSchema,
  })
  .strict()

export const NotificationMetricsResponseSchema =
  _NotificationMetricsResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['NotificationMetricsResponse']
  >

const _OperatorListResponseRawSchema = z
  .object({
    type: z.literal('operator_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(OperatorInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const OperatorListResponseSchema = _OperatorListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['OperatorListResponse']
>

const _OperatorResponseRawSchema = z
  .object({
    type: z.literal('operator_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: OperatorInfoSchema,
  })
  .strict()

export const OperatorResponseSchema = _OperatorResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['OperatorResponse']
>

const _OrderListResponseRawSchema = z
  .object({
    type: z.literal('order_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(OrderDataSchema),
    count: z.number().int(),
  })
  .strict()

export const OrderListResponseSchema = _OrderListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['OrderListResponse']
>

const _OrphanSweepResponseRawSchema = z
  .object({
    type: z.literal('orphan_sweep_result'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: OrphanSweepResultDataSchema,
  })
  .strict()

export const OrphanSweepResponseSchema = _OrphanSweepResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['OrphanSweepResponse']
>

const _PairedGroupIncidentRawSchema = z
  .object({
    type: z.literal('paired_group_incident'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    group_public_id: z.string(),
    status: z.string(),
    policy: z.string(),
    failure_reason: z.string().nullable(),
    halted_at: z.iso.datetime().nullable(),
    created_at: z.iso.datetime(),
    legs: z.array(PairedLegExposureSchema),
  })
  .strict()

export const PairedGroupIncidentSchema = _PairedGroupIncidentRawSchema as unknown as z.ZodType<
  Components['schemas']['PairedGroupIncident']
>

const _PnlAttributionContributionDataRawSchema = z
  .object({
    origin: PnlAttributionOriginSchema,
    strategy_name: z.string().nullable(),
    realized_pnl: z.number().nullable(),
    fee_pnl: z.number().nullable(),
    accrual_pnl: z.number().nullable(),
    unrealized_pnl: z.number().nullable(),
  })
  .strict()

export const PnlAttributionContributionDataSchema =
  _PnlAttributionContributionDataRawSchema as unknown as z.ZodType<
    Components['schemas']['PnlAttributionContributionData']
  >

const _PnlAiDecisionMarkerDataRawSchema = z
  .object({
    kind: z.literal('ai_decision'),
    marker_time: z.iso.datetime(),
    instrument_public_id: z.string(),
    strategy_public_id: z.string(),
    review_public_id: z.string(),
    event_public_id: z.string(),
    decision: z.string().nullable(),
    rationale: z.string().nullable(),
    outcome: PnlMarkerOutcomeSchema,
    status: z.string(),
  })
  .strict()

export const PnlAiDecisionMarkerDataSchema =
  _PnlAiDecisionMarkerDataRawSchema as unknown as z.ZodType<
    Components['schemas']['PnlAiDecisionMarkerData']
  >

const _CreateCredentialBodyRawSchema = z
  .object({
    exchange: z.string().min(1).max(20),
    credential_type: z.enum(['api_key_secret', 'rsa_pem', 'oauth', 'paper']),
    reconciliation_method: PortfolioReconciliationMethodSchema,
    credential_payload: z.record(z.string(), z.string()),
    label: z.string().max(128).nullable().optional(),
  })
  .strict()

export const CreateCredentialBodySchema = _CreateCredentialBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateCredentialBody']
>

const _PositionCycleListResponseRawSchema = z
  .object({
    type: z.literal('position_cycles'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(PositionCycleDataSchema),
    count: z.number().int(),
  })
  .strict()

export const PositionCycleListResponseSchema =
  _PositionCycleListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PositionCycleListResponse']
  >

const _PositionListResponseRawSchema = z
  .object({
    type: z.literal('position_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(PositionDataSchema),
    count: z.number().int(),
  })
  .strict()

export const PositionListResponseSchema = _PositionListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['PositionListResponse']
>

const _ProcessCreateDataRawSchema = z
  .object({
    type: z.literal('process_create'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.literal('created'),
    process: ProcessCreatedInfoSchema,
  })
  .strict()

export const ProcessCreateDataSchema = _ProcessCreateDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCreateData']
>

const _ProcessDesiredStateResponseRawSchema = z
  .object({
    type: z.literal('process_desired_state_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessDesiredStateDataSchema,
  })
  .strict()

export const ProcessDesiredStateResponseSchema =
  _ProcessDesiredStateResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessDesiredStateResponse']
  >

const _ProcessStartResponseRawSchema = z
  .object({
    type: z.literal('process_start_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessStartDataSchema,
  })
  .strict()

export const ProcessStartResponseSchema = _ProcessStartResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStartResponse']
>

const _ProcessStopResponseRawSchema = z
  .object({
    type: z.literal('process_stop_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessStopDataSchema,
  })
  .strict()

export const ProcessStopResponseSchema = _ProcessStopResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStopResponse']
>

const _ProcessSummaryDataRawSchema = z
  .object({
    type: z.literal('process_summary'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    coordinator: z.string(),
    coordinator_label: z.string().nullable().optional(),
    feeds: ProcessCategoryCountSchema,
    strategies: ProcessCategoryCountSchema,
    executors: ProcessCategoryCountSchema,
    brokers: ProcessCategoryCountSchema,
    processes: z.array(ProcessSummaryItemSchema).optional(),
  })
  .strict()

export const ProcessSummaryDataSchema = _ProcessSummaryDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessSummaryData']
>

const _PushBetaConfigResponseRawSchema = z
  .object({
    type: z.literal('push_beta_config_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: PushBetaConfigReadSchema,
  })
  .strict()

export const PushBetaConfigResponseSchema =
  _PushBetaConfigResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PushBetaConfigResponse']
  >

const _CredentialReconciliationMethodInfoRawSchema = z
  .object({
    type: z.literal('credential_reconciliation_method_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    exchange: z.string(),
    mode: z.literal('live'),
    method: RealPortfolioReconciliationMethodSchema,
  })
  .strict()

export const CredentialReconciliationMethodInfoSchema =
  _CredentialReconciliationMethodInfoRawSchema as unknown as z.ZodType<
    Components['schemas']['CredentialReconciliationMethodInfo']
  >

const _SetCredentialReconciliationMethodBodyRawSchema = z
  .object({
    reconciliation_method: RealPortfolioReconciliationMethodSchema,
  })
  .strict()

export const SetCredentialReconciliationMethodBodySchema =
  _SetCredentialReconciliationMethodBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['SetCredentialReconciliationMethodBody']
  >

const _RelatedInstrumentsGroupRawSchema = z
  .object({
    relationship_type: z.string(),
    label: z.string(),
    items: z.array(RelatedInstrumentDataSchema),
  })
  .strict()

export const RelatedInstrumentsGroupSchema =
  _RelatedInstrumentsGroupRawSchema as unknown as z.ZodType<
    Components['schemas']['RelatedInstrumentsGroup']
  >

const _ResearcherCreatedPayloadRawSchema = z
  .object({
    researcher: ResearcherReadSchema,
    access_token: z.string(),
    expires_in: z.number().int(),
  })
  .strict()

export const ResearcherCreatedPayloadSchema =
  _ResearcherCreatedPayloadRawSchema as unknown as z.ZodType<
    Components['schemas']['ResearcherCreatedPayload']
  >

const _RestRateDataRawSchema = z
  .object({
    type: z.literal('rest_rate'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchanges: z.record(z.string(), RestRateExchangeStatsSchema),
  })
  .strict()

export const RestRateDataSchema = _RestRateDataRawSchema as unknown as z.ZodType<
  Components['schemas']['RestRateData']
>

const _RetentionRunDataRawSchema = z
  .object({
    type: z.literal('retention_run'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    run_started_at: z.iso.datetime(),
    run_completed_at: z.iso.datetime(),
    dry_run: z.boolean(),
    results: z.array(RetentionPolicyResultSchema),
  })
  .strict()

export const RetentionRunDataSchema = _RetentionRunDataRawSchema as unknown as z.ZodType<
  Components['schemas']['RetentionRunData']
>

const _ContinuousSeriesPartialResponseRawSchema = z
  .object({
    type: z.literal('continuous_partial'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ContinuousCandleDataSchema),
    count: z.number().int(),
    failed_roll: RollPointDetailSchema,
    message: z.string(),
  })
  .strict()

export const ContinuousSeriesPartialResponseSchema =
  _ContinuousSeriesPartialResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ContinuousSeriesPartialResponse']
  >

const _SystemMetricsDataRawSchema = z
  .object({
    type: z.literal('system_metrics'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    bus_time: z.iso.datetime(),
    process: ProcessMetricsSchema,
    cpu: CpuMetricsSchema,
    memory: MemoryMetricsSchema,
    asyncio: AsyncioMetricsSchema,
    gc: GcMetricsSchema,
    limits: LimitsMetricsSchema,
    saturation: SaturationMetricsSchema,
    db_internal: DbInternalMetricsSchema,
    disk: DiskMetricsSchema,
    tracemalloc_active: z.boolean(),
    cgroup_version: z.enum(['v1', 'v2']).nullable(),
  })
  .strict()

export const SystemMetricsDataSchema = _SystemMetricsDataRawSchema as unknown as z.ZodType<
  Components['schemas']['SystemMetricsData']
>

const _SystemMetricsHistoryItemRawSchema = z
  .object({
    type: z.literal('system_metrics_history_item'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    bus_time: z.iso.datetime(),
    process: ProcessMetricsSchema,
    cpu: CpuMetricsSchema,
    memory: MemoryMetricsSchema,
    asyncio: AsyncioMetricsSchema,
    gc: GcMetricsSchema,
    limits: LimitsMetricsSchema,
    saturation: SaturationMetricsSchema,
    db_internal: DbInternalMetricsSchema,
    disk: DiskMetricsSchema,
    tracemalloc_active: z.boolean(),
    cgroup_version: z.enum(['v1', 'v2']).nullable(),
  })
  .strict()

export const SystemMetricsHistoryItemSchema =
  _SystemMetricsHistoryItemRawSchema as unknown as z.ZodType<
    Components['schemas']['SystemMetricsHistoryItem']
  >

const _HandoverScopeGrantResultRawSchema = z
  .object({
    closed_grant: ScopeGrantInfoSchema,
    new_grant: ScopeGrantInfoSchema,
  })
  .strict()

export const HandoverScopeGrantResultSchema =
  _HandoverScopeGrantResultRawSchema as unknown as z.ZodType<
    Components['schemas']['HandoverScopeGrantResult']
  >

const _RevokeScopeGrantResponseRawSchema = z
  .object({
    type: z.literal('revoke_scope_grant_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ScopeGrantInfoSchema,
  })
  .strict()

export const RevokeScopeGrantResponseSchema =
  _RevokeScopeGrantResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['RevokeScopeGrantResponse']
  >

const _ScopeGrantListResponseRawSchema = z
  .object({
    type: z.literal('scope_grant_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ScopeGrantInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const ScopeGrantListResponseSchema =
  _ScopeGrantListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ScopeGrantListResponse']
  >

const _ScopeGrantResponseRawSchema = z
  .object({
    type: z.literal('scope_grant_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ScopeGrantInfoSchema,
  })
  .strict()

export const ScopeGrantResponseSchema = _ScopeGrantResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ScopeGrantResponse']
>

const _SettingListResponseRawSchema = z
  .object({
    type: z.literal('setting_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(SettingReadSchema),
    count: z.number().int(),
  })
  .strict()

export const SettingListResponseSchema = _SettingListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['SettingListResponse']
>

const _SettingResponseRawSchema = z
  .object({
    type: z.literal('setting_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: SettingReadSchema,
  })
  .strict()

export const SettingResponseSchema = _SettingResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['SettingResponse']
>

const _SignalListResponseRawSchema = z
  .object({
    type: z.literal('signal_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(SignalDataSchema),
    count: z.number().int(),
  })
  .strict()

export const SignalListResponseSchema = _SignalListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['SignalListResponse']
>

const _StrategyListResponseRawSchema = z
  .object({
    type: z.literal('strategy_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(StrategyProcessSchema),
    count: z.number().int(),
  })
  .strict()

export const StrategyListResponseSchema = _StrategyListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['StrategyListResponse']
>

const _DbStatsDataRawSchema = z
  .object({
    type: z.literal('db_stats'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    snapshot_started_at: z.iso.datetime(),
    snapshot_completed_at: z.iso.datetime(),
    interval_seconds: z.number().int(),
    tables: z.array(TableStatsItemSchema),
  })
  .strict()

export const DbStatsDataSchema = _DbStatsDataRawSchema as unknown as z.ZodType<
  Components['schemas']['DbStatsData']
>

const _TracemallocStateResponseRawSchema = z
  .object({
    type: z.literal('tracemalloc_state_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: TracemallocStateSchema,
  })
  .strict()

export const TracemallocStateResponseSchema =
  _TracemallocStateResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['TracemallocStateResponse']
  >

const _TrailingStopStateResponseRawSchema = z
  .object({
    type: z.literal('trailing_stop_state'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: TrailingStopStateDataSchema,
  })
  .strict()

export const TrailingStopStateResponseSchema =
  _TrailingStopStateResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['TrailingStopStateResponse']
  >

const _UnderlyingAssetListResponseRawSchema = z
  .object({
    type: z.literal('underlying_asset_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(UnderlyingAssetDataSchema),
    count: z.number().int(),
  })
  .strict()

export const UnderlyingAssetListResponseSchema =
  _UnderlyingAssetListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['UnderlyingAssetListResponse']
  >

const _UnderlyingInstrumentListResponseRawSchema = z
  .object({
    type: z.literal('underlying_instrument_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(UnderlyingInstrumentDataSchema),
    count: z.number().int(),
  })
  .strict()

export const UnderlyingInstrumentListResponseSchema =
  _UnderlyingInstrumentListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['UnderlyingInstrumentListResponse']
  >

const _UserAlertDefaultListResponseRawSchema = z
  .object({
    type: z.literal('user_alert_default_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(UserAlertDefaultInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const UserAlertDefaultListResponseSchema =
  _UserAlertDefaultListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['UserAlertDefaultListResponse']
  >

const _UserAlertDefaultResponseRawSchema = z
  .object({
    type: z.literal('user_alert_default_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: UserAlertDefaultInfoSchema,
  })
  .strict()

export const UserAlertDefaultResponseSchema =
  _UserAlertDefaultResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['UserAlertDefaultResponse']
  >

const _UserProfileRawSchema = z
  .object({
    type: z.literal('user_profile'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    username: z.string(),
    email: z.string().nullable().optional(),
    role: UserRoleSchema,
    is_active: z.boolean(),
    created_at: z.iso.datetime(),
    operator_public_ids: z.array(z.string()),
    primary_operator_public_id: z.string().nullable().optional(),
    active_wallet_public_id: z.string().nullable().optional(),
    default_language: z.string().nullable().optional(),
  })
  .strict()

export const UserProfileSchema = _UserProfileRawSchema as unknown as z.ZodType<
  Components['schemas']['UserProfile']
>

const _CreateUserBodyRawSchema = z
  .object({
    username: z.string().min(3).max(64),
    email: z.string().max(255).nullable().optional(),
    password: z.string().min(8),
    role: UserRoleSchema,
    is_active: z.boolean().optional(),
  })
  .strict()

export const CreateUserBodySchema = _CreateUserBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateUserBody']
>

const _UpdateUserBodyRawSchema = z
  .object({
    email: z.string().max(255).nullable().optional(),
    role: UserRoleSchema.nullable().optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict()

export const UpdateUserBodySchema = _UpdateUserBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['UpdateUserBody']
>

const _HTTPValidationErrorRawSchema = z
  .object({
    detail: z.array(ValidationErrorSchema).optional(),
  })
  .strict()

export const HTTPValidationErrorSchema = _HTTPValidationErrorRawSchema as unknown as z.ZodType<
  Components['schemas']['HTTPValidationError']
>

const _VenueFeeScheduleListResponseRawSchema = z
  .object({
    type: z.literal('venue_fee_schedule_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(VenueFeeScheduleDataSchema),
    count: z.number().int(),
  })
  .strict()

export const VenueFeeScheduleListResponseSchema =
  _VenueFeeScheduleListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['VenueFeeScheduleListResponse']
  >

const _WalletListResponseRawSchema = z
  .object({
    type: z.literal('wallet_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(WalletInfoSchema),
    count: z.number().int(),
  })
  .strict()

export const WalletListResponseSchema = _WalletListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['WalletListResponse']
>

const _WalletResponseRawSchema = z
  .object({
    type: z.literal('wallet_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: WalletInfoSchema,
  })
  .strict()

export const WalletResponseSchema = _WalletResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['WalletResponse']
>

const _WsTokenResponseRawSchema = z
  .object({
    type: z.literal('ws_token_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: WsTokenDataSchema,
  })
  .strict()

export const WsTokenResponseSchema = _WsTokenResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['WsTokenResponse']
>

const _WsStatsDataRawSchema = z
  .object({
    type: z.literal('ws_stats'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    websocket: WebSocketStatsSchema,
    zmq_bridge: ZmqBridgeStatsSchema,
    connections: ConnectionStatsSchema,
    topics: z.record(z.string(), TopicMetricSnapshotSchema),
    subscriptions: SubscriptionsStatsSchema,
    config: WsStatsConfigSchema,
  })
  .strict()

export const WsStatsDataSchema = _WsStatsDataRawSchema as unknown as z.ZodType<
  Components['schemas']['WsStatsData']
>

const _ZmqHealthDataRawSchema = z
  .object({
    type: z.literal('zmq_health'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.enum(['healthy', 'warning', 'error']),
    components: ZmqComponentsSchema,
    config: ZmqConfigSchema,
    connections: ConnectionStatsSchema,
    message_stats: z.record(z.string(), TopicMetricSnapshotSchema),
    errors: z.array(z.string()),
  })
  .strict()

export const ZmqHealthDataSchema = _ZmqHealthDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ZmqHealthData']
>

const _LoginBodyRawSchema = z
  .object({
    username: z.string(),
    password: z.string(),
    remember_me: z.boolean().optional(),
    permissions: z.array(PermissionSchema).nullable().optional(),
  })
  .strict()

export const LoginBodySchema = _LoginBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['LoginBody']
>

const _ResearcherCreateBodyRawSchema = z
  .object({
    label: z.string().min(1).max(44),
    permissions: z.array(PermissionSchema).nullable().optional(),
  })
  .strict()

export const ResearcherCreateBodySchema = _ResearcherCreateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['ResearcherCreateBody']
>

const _RefreshTokenRequestRawSchema = z
  .object({
    type: z.literal('refresh_token_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RefreshTokenPayloadSchema,
  })
  .strict()

export const RefreshTokenRequestSchema = _RefreshTokenRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['RefreshTokenRequest']
>

const _UpdateAuthMeRequestRawSchema = z
  .object({
    type: z.literal('update_auth_me_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: UpdateAuthMeBodySchema,
  })
  .strict()

export const UpdateAuthMeRequestSchema = _UpdateAuthMeRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['UpdateAuthMeRequest']
>

const _DeactivateUserRequestRawSchema = z
  .object({
    type: z.literal('deactivate_user_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DeactivateUserBodySchema,
  })
  .strict()

export const DeactivateUserRequestSchema = _DeactivateUserRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['DeactivateUserRequest']
>

const _ChangePasswordRequestRawSchema = z
  .object({
    type: z.literal('change_password_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ChangePasswordBodySchema,
  })
  .strict()

export const ChangePasswordRequestSchema = _ChangePasswordRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['ChangePasswordRequest']
>

const _AdminResetPasswordRequestRawSchema = z
  .object({
    type: z.literal('admin_reset_password_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: AdminResetPasswordBodySchema,
  })
  .strict()

export const AdminResetPasswordRequestSchema =
  _AdminResetPasswordRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['AdminResetPasswordRequest']
  >

const _SettingUpdateRawSchema = z
  .object({
    type: z.literal('setting_update').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: SettingUpdateBodySchema,
  })
  .strict()

export const SettingUpdateSchema = _SettingUpdateRawSchema as unknown as z.ZodType<
  Components['schemas']['SettingUpdate']
>

const _UpdatePushBetaUsersCommandRawSchema = z
  .object({
    type: z.literal('update_push_beta_users_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: PushBetaUsersBodySchema,
  })
  .strict()

export const UpdatePushBetaUsersCommandSchema =
  _UpdatePushBetaUsersCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['UpdatePushBetaUsersCommand']
  >

const _RemoveSettingRequestRawSchema = z
  .object({
    type: z.literal('remove_setting_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RemoveSettingBodySchema,
  })
  .strict()

export const RemoveSettingRequestSchema = _RemoveSettingRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['RemoveSettingRequest']
>

const _DelegateDeactivateRequestRawSchema = z
  .object({
    type: z.literal('delegate_deactivate_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DelegateDeactivateBodySchema,
  })
  .strict()

export const DelegateDeactivateRequestSchema =
  _DelegateDeactivateRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateDeactivateRequest']
  >

const _AiReviewDecisionCommandRawSchema = z
  .object({
    type: z.literal('ai_review_decision_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: AiReviewDecisionRequestSchema,
  })
  .strict()

export const AiReviewDecisionCommandSchema =
  _AiReviewDecisionCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewDecisionCommand']
  >

const _UpdateUserAlertDefaultCommandRawSchema = z
  .object({
    type: z.literal('update_user_alert_default_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: UserAlertDefaultBodySchema,
  })
  .strict()

export const UpdateUserAlertDefaultCommandSchema =
  _UpdateUserAlertDefaultCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['UpdateUserAlertDefaultCommand']
  >

const _BacktestCompareRequestRawSchema = z
  .object({
    type: z.literal('backtest_compare_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestCompareBodySchema,
  })
  .strict()

export const BacktestCompareRequestSchema =
  _BacktestCompareRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestCompareRequest']
  >

const _BacktestCancelCommandRawSchema = z
  .object({
    type: z.literal('backtest_cancel_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestCancelBodySchema,
  })
  .strict()

export const BacktestCancelCommandSchema = _BacktestCancelCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestCancelCommand']
>

const _RotateCredentialCommandRawSchema = z
  .object({
    type: z.literal('rotate_credential_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RotateCredentialBodySchema,
  })
  .strict()

export const RotateCredentialCommandSchema =
  _RotateCredentialCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['RotateCredentialCommand']
  >

const _RegisterDeviceCommandRawSchema = z
  .object({
    type: z.literal('register_device_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RegisterDeviceBodySchema,
  })
  .strict()

export const RegisterDeviceCommandSchema = _RegisterDeviceCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['RegisterDeviceCommand']
>

const _UpdateDevicePrefCommandRawSchema = z
  .object({
    type: z.literal('update_device_pref_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DeviceAlertPrefBodySchema,
  })
  .strict()

export const UpdateDevicePrefCommandSchema =
  _UpdateDevicePrefCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['UpdateDevicePrefCommand']
  >

const _RevokeDevicePrefCommandRawSchema = z
  .object({
    type: z.literal('revoke_device_pref_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RevokeDevicePrefBodySchema,
  })
  .strict()

export const RevokeDevicePrefCommandSchema =
  _RevokeDevicePrefCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['RevokeDevicePrefCommand']
  >

const _BracketCreateCommandRawSchema = z
  .object({
    type: z.literal('create_bracket_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BracketCreateBodySchema,
  })
  .strict()

export const BracketCreateCommandSchema = _BracketCreateCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['BracketCreateCommand']
>

const _BracketCancelCommandRawSchema = z
  .object({
    type: z.literal('cancel_bracket_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BracketCancelBodySchema,
  })
  .strict()

export const BracketCancelCommandSchema = _BracketCancelCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['BracketCancelCommand']
>

const _CreateOperatorCommandRawSchema = z
  .object({
    type: z.literal('create_operator_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateOperatorBodySchema,
  })
  .strict()

export const CreateOperatorCommandSchema = _CreateOperatorCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateOperatorCommand']
>

const _CreateOrderCommandRawSchema = z
  .object({
    type: z.literal('create_order_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateOrderBodySchema,
  })
  .strict()

export const CreateOrderCommandSchema = _CreateOrderCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateOrderCommand']
>

const _CancelOrderCommandRawSchema = z
  .object({
    type: z.literal('cancel_order_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CancelOrderBodySchema,
  })
  .strict()

export const CancelOrderCommandSchema = _CancelOrderCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['CancelOrderCommand']
>

const _ProcessDesiredStateRequestRawSchema = z
  .object({
    type: z.literal('process_desired_state_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessDesiredStateBodySchema,
  })
  .strict()

export const ProcessDesiredStateRequestSchema =
  _ProcessDesiredStateRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessDesiredStateRequest']
  >

const _ProcessConfigScopeRequestRawSchema = z
  .object({
    type: z.literal('process_config_scope_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessConfigScopeBodySchema,
  })
  .strict()

export const ProcessConfigScopeRequestSchema =
  _ProcessConfigScopeRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessConfigScopeRequest']
  >

const _CreateScopeGrantCommandRawSchema = z
  .object({
    type: z.literal('create_scope_grant_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateScopeGrantBodySchema,
  })
  .strict()

export const CreateScopeGrantCommandSchema =
  _CreateScopeGrantCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['CreateScopeGrantCommand']
  >

const _HandoverScopeGrantCommandRawSchema = z
  .object({
    type: z.literal('handover_scope_grant_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: HandoverScopeGrantBodySchema,
  })
  .strict()

export const HandoverScopeGrantCommandSchema =
  _HandoverScopeGrantCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['HandoverScopeGrantCommand']
  >

const _RevokeScopeGrantCommandRawSchema = z
  .object({
    type: z.literal('revoke_scope_grant_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RevokeScopeGrantBodySchema,
  })
  .strict()

export const RevokeScopeGrantCommandSchema =
  _RevokeScopeGrantCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['RevokeScopeGrantCommand']
  >

const _TrailingStopCreateCommandRawSchema = z
  .object({
    type: z.literal('create_trailing_stop_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: TrailingStopCreateBodySchema,
  })
  .strict()

export const TrailingStopCreateCommandSchema =
  _TrailingStopCreateCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['TrailingStopCreateCommand']
  >

const _TrailingStopCancelCommandRawSchema = z
  .object({
    type: z.literal('cancel_trailing_stop_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: TrailingStopCancelBodySchema,
  })
  .strict()

export const TrailingStopCancelCommandSchema =
  _TrailingStopCancelCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['TrailingStopCancelCommand']
  >

const _CreateWalletCommandRawSchema = z
  .object({
    type: z.literal('create_wallet_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateWalletBodySchema,
  })
  .strict()

export const CreateWalletCommandSchema = _CreateWalletCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateWalletCommand']
>

const _CachedCandlesResponseRawSchema = z
  .object({
    type: z.literal('cached_candles'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CachedCandlesPayloadSchema,
  })
  .strict()

export const CachedCandlesResponseSchema = _CachedCandlesResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['CachedCandlesResponse']
>

const _ListedCachedStatsResponseRawSchema = z
  .object({
    type: z.literal('listed_cached_stats'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ListedCachedStatsPayloadSchema,
  })
  .strict()

export const ListedCachedStatsResponseSchema =
  _ListedCachedStatsResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ListedCachedStatsResponse']
  >

const _EgressHealthDataRawSchema = z
  .object({
    type: z.literal('egress_health'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    enabled: z.boolean(),
    on_all_quarantined: z.enum(['wait', 'raise']).nullable().optional(),
    private_fallback_route_id: z.string().nullable().optional(),
    private_on_fallback: z.boolean(),
    containers: z.array(EgressContainerSummarySchema).optional(),
    routes: z.array(EgressRouteStatusSnapshotSchema).optional(),
  })
  .strict()

export const EgressHealthDataSchema = _EgressHealthDataRawSchema as unknown as z.ZodType<
  Components['schemas']['EgressHealthData']
>

const _HealthCheckDataRawSchema = z
  .object({
    type: z.literal('health_check'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.enum(['healthy', 'warning', 'error']),
    version: z.string(),
    connections: ConnectionStatsSchema,
    topics: HealthTopicsSchema,
    gap_detection: GapDetectionStatsSchema,
  })
  .strict()

export const HealthCheckDataSchema = _HealthCheckDataRawSchema as unknown as z.ZodType<
  Components['schemas']['HealthCheckData']
>

const _MarketFeedHealthResponseRawSchema = z
  .object({
    type: z.literal('market_feed_health'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: MarketFeedHealthPayloadSchema,
  })
  .strict()

export const MarketFeedHealthResponseSchema =
  _MarketFeedHealthResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['MarketFeedHealthResponse']
  >

const _JsonObjectRawSchema = z.record(z.string(), z.any())

export const JsonObjectSchema = _JsonObjectRawSchema as unknown as z.ZodType<
  Components['schemas']['JsonObject']
>

const _MarketDataCoverageResponseRawSchema = z
  .object({
    type: z.literal('market_data_coverage'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: MarketDataCoveragePayloadSchema,
  })
  .strict()

export const MarketDataCoverageResponseSchema =
  _MarketDataCoverageResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['MarketDataCoverageResponse']
  >

const _PairedExecutionIncidentRawSchema = z
  .object({
    type: z.literal('paired_execution_incident'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    strategy_id: z.string(),
    group_key: z.string(),
    halt: PairedHaltInfoSchema.nullable(),
    halt_missing: z.boolean(),
    groups: z.array(PairedGroupIncidentSchema),
  })
  .strict()

export const PairedExecutionIncidentSchema =
  _PairedExecutionIncidentRawSchema as unknown as z.ZodType<
    Components['schemas']['PairedExecutionIncident']
  >

const _PairedGroupTerminalizeResponseRawSchema = z
  .object({
    type: z.literal('paired_group_terminalize_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: PairedGroupIncidentSchema,
  })
  .strict()

export const PairedGroupTerminalizeResponseSchema =
  _PairedGroupTerminalizeResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PairedGroupTerminalizeResponse']
  >

const _PnlTimelinePointDataRawSchema = z
  .object({
    point_time: z.iso.datetime(),
    realized_pnl: z.number().nullable(),
    fee_pnl: z.number().nullable(),
    accrual_pnl: z.number().nullable(),
    unrealized_pnl: z.number().nullable(),
    net_pnl: z.number().nullable(),
    valuation_status: PnlValuationStatusSchema,
    per_instrument: z.array(PnlInstrumentContributionDataSchema),
    attribution: z.array(PnlAttributionContributionDataSchema),
  })
  .strict()

export const PnlTimelinePointDataSchema = _PnlTimelinePointDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlTimelinePointData']
>

const _PnlTimelineMarkerDataRawSchema = z.union([
  PnlFillMarkerDataSchema,
  PnlSignalMarkerDataSchema,
  PnlAiDecisionMarkerDataSchema,
])

export const PnlTimelineMarkerDataSchema = _PnlTimelineMarkerDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlTimelineMarkerData']
>

const _CreateCredentialCommandRawSchema = z
  .object({
    type: z.literal('create_credential_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateCredentialBodySchema,
  })
  .strict()

export const CreateCredentialCommandSchema =
  _CreateCredentialCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['CreateCredentialCommand']
  >

const _ProcessCreateResponseRawSchema = z
  .object({
    type: z.literal('process_create_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessCreateDataSchema,
  })
  .strict()

export const ProcessCreateResponseSchema = _ProcessCreateResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCreateResponse']
>

const _ProcessSummaryResponseRawSchema = z
  .object({
    type: z.literal('process_summary_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessSummaryDataSchema,
  })
  .strict()

export const ProcessSummaryResponseSchema =
  _ProcessSummaryResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessSummaryResponse']
  >

const _CredentialReconciliationMethodResponseRawSchema = z
  .object({
    type: z.literal('credential_reconciliation_method_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CredentialReconciliationMethodInfoSchema,
  })
  .strict()

export const CredentialReconciliationMethodResponseSchema =
  _CredentialReconciliationMethodResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['CredentialReconciliationMethodResponse']
  >

const _SetCredentialReconciliationMethodCommandRawSchema = z
  .object({
    type: z.literal('set_credential_reconciliation_method_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: SetCredentialReconciliationMethodBodySchema,
  })
  .strict()

export const SetCredentialReconciliationMethodCommandSchema =
  _SetCredentialReconciliationMethodCommandRawSchema as unknown as z.ZodType<
    Components['schemas']['SetCredentialReconciliationMethodCommand']
  >

const _RelatedInstrumentsPayloadDataRawSchema = z
  .object({
    selected: RelatedInstrumentsSelectedSchema,
    underlying: RelatedInstrumentsUnderlyingSchema.nullable(),
    groups: z.array(RelatedInstrumentsGroupSchema),
  })
  .strict()

export const RelatedInstrumentsPayloadDataSchema =
  _RelatedInstrumentsPayloadDataRawSchema as unknown as z.ZodType<
    Components['schemas']['RelatedInstrumentsPayloadData']
  >

const _ResearcherCreatedResponseRawSchema = z
  .object({
    type: z.literal('researcher_created_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ResearcherCreatedPayloadSchema,
  })
  .strict()

export const ResearcherCreatedResponseSchema =
  _ResearcherCreatedResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ResearcherCreatedResponse']
  >

const _RestRateResponseRawSchema = z
  .object({
    type: z.literal('rest_rate_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RestRateDataSchema,
  })
  .strict()

export const RestRateResponseSchema = _RestRateResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['RestRateResponse']
>

const _RetentionRunResponseRawSchema = z
  .object({
    type: z.literal('retention_run_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RetentionRunDataSchema,
  })
  .strict()

export const RetentionRunResponseSchema = _RetentionRunResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['RetentionRunResponse']
>

const _SystemMetricsResponseRawSchema = z
  .object({
    type: z.literal('system_metrics_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: SystemMetricsDataSchema,
  })
  .strict()

export const SystemMetricsResponseSchema = _SystemMetricsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['SystemMetricsResponse']
>

const _SystemMetricsHistoryResponseRawSchema = z
  .object({
    type: z.literal('system_metrics_history_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(SystemMetricsHistoryItemSchema),
    count: z.number().int(),
  })
  .strict()

export const SystemMetricsHistoryResponseSchema =
  _SystemMetricsHistoryResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['SystemMetricsHistoryResponse']
  >

const _HandoverScopeGrantResponseRawSchema = z
  .object({
    type: z.literal('handover_scope_grant_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: HandoverScopeGrantResultSchema,
  })
  .strict()

export const HandoverScopeGrantResponseSchema =
  _HandoverScopeGrantResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['HandoverScopeGrantResponse']
  >

const _DbStatsResponseRawSchema = z
  .object({
    type: z.literal('db_stats_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DbStatsDataSchema,
  })
  .strict()

export const DbStatsResponseSchema = _DbStatsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['DbStatsResponse']
>

const _LoginDataRawSchema = z
  .object({
    type: z.literal('login'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    message: z.string(),
    expires_in: z.number().int(),
    user: UserProfileSchema,
    access_token: z.string().nullable().optional(),
    refresh_token: z.string().nullable().optional(),
  })
  .strict()

export const LoginDataSchema = _LoginDataRawSchema as unknown as z.ZodType<
  Components['schemas']['LoginData']
>

const _RefreshDataRawSchema = z
  .object({
    type: z.literal('refresh'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    message: z.string(),
    ws_token: z.string(),
    ws_token_exp: z.iso.datetime(),
    csrf_token: z.string(),
    user: UserProfileSchema,
    access_token: z.string().nullable().optional(),
    refresh_token: z.string().nullable().optional(),
  })
  .strict()

export const RefreshDataSchema = _RefreshDataRawSchema as unknown as z.ZodType<
  Components['schemas']['RefreshData']
>

const _UserListResponseRawSchema = z
  .object({
    type: z.literal('user_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(UserProfileSchema),
    count: z.number().int(),
  })
  .strict()

export const UserListResponseSchema = _UserListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['UserListResponse']
>

const _UserResponseRawSchema = z
  .object({
    type: z.literal('user_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: UserProfileSchema,
  })
  .strict()

export const UserResponseSchema = _UserResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['UserResponse']
>

const _CreateUserRequestRawSchema = z
  .object({
    type: z.literal('create_user_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: CreateUserBodySchema,
  })
  .strict()

export const CreateUserRequestSchema = _CreateUserRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['CreateUserRequest']
>

const _UpdateUserRequestRawSchema = z
  .object({
    type: z.literal('update_user_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: UpdateUserBodySchema,
  })
  .strict()

export const UpdateUserRequestSchema = _UpdateUserRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['UpdateUserRequest']
>

const _WsStatsResponseRawSchema = z
  .object({
    type: z.literal('ws_stats_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: WsStatsDataSchema,
  })
  .strict()

export const WsStatsResponseSchema = _WsStatsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['WsStatsResponse']
>

const _ZmqHealthResponseRawSchema = z
  .object({
    type: z.literal('zmq_health_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ZmqHealthDataSchema,
  })
  .strict()

export const ZmqHealthResponseSchema = _ZmqHealthResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ZmqHealthResponse']
>

const _LoginRequestRawSchema = z
  .object({
    type: z.literal('login_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: LoginBodySchema,
  })
  .strict()

export const LoginRequestSchema = _LoginRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['LoginRequest']
>

const _ResearcherCreateRequestRawSchema = z
  .object({
    type: z.literal('researcher_create_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ResearcherCreateBodySchema,
  })
  .strict()

export const ResearcherCreateRequestSchema =
  _ResearcherCreateRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['ResearcherCreateRequest']
  >

const _EgressHealthResponseRawSchema = z
  .object({
    type: z.literal('egress_health_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: EgressHealthDataSchema,
  })
  .strict()

export const EgressHealthResponseSchema = _EgressHealthResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['EgressHealthResponse']
>

const _HealthCheckResponseRawSchema = z
  .object({
    type: z.literal('health_check_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: HealthCheckDataSchema,
  })
  .strict()

export const HealthCheckResponseSchema = _HealthCheckResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['HealthCheckResponse']
>

const _AdminAiReviewItemRawSchema = z
  .object({
    review_public_id: z.string(),
    strategy_public_id: z.string(),
    user_public_id: z.string(),
    operator_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    selected_delegate_public_id: z.string(),
    responding_delegate_public_id: z.string().nullable(),
    status: z.string(),
    decision: z.string().nullable(),
    rationale: z.string().nullable(),
    resolution_mode: z.string().nullable(),
    dispatch_version: z.number().int(),
    created_at: z.iso.datetime(),
    resolved_at: z.iso.datetime().nullable(),
    deadline: z.iso.datetime(),
    signal_envelope: z.record(z.string(), z.any()).nullable().optional(),
  })
  .strict()

export const AdminAiReviewItemSchema = _AdminAiReviewItemRawSchema as unknown as z.ZodType<
  Components['schemas']['AdminAiReviewItem']
>

const _AiReviewAftermathReviewRawSchema = z
  .object({
    public_id: z.string(),
    session_id: z.string(),
    sequence_id: z.number().int(),
    user_public_id: z.string(),
    operator_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    strategy_public_id: z.string(),
    selected_delegate_public_id: z.string(),
    responding_delegate_public_id: z.string().nullable(),
    resolution_mode: z.string().nullable(),
    status: z.string(),
    signal_envelope: z.record(z.string(), z.any()),
    signal_snapshot_hash: z.string(),
    instrument_metadata: z.record(z.string(), z.any()),
    deadline: z.iso.datetime(),
    fanout_after: z.iso.datetime(),
    decision: z.string().nullable(),
    rationale: z.string().nullable(),
    dispatch_version: z.number().int(),
    counter_decremented_at: z.iso.datetime().nullable(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
    resolved_at: z.iso.datetime().nullable(),
  })
  .strict()

export const AiReviewAftermathReviewSchema =
  _AiReviewAftermathReviewRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathReview']
  >

const _AiReviewDecisionResponseRawSchema = z
  .object({
    success: z.boolean(),
    error_code: z.string().nullable(),
    message: z.string(),
    details: z.record(z.string(), z.any()),
  })
  .strict()

export const AiReviewDecisionResponseSchema =
  _AiReviewDecisionResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewDecisionResponse']
  >

const _AlertEventInfoRawSchema = z
  .object({
    type: z.literal('alert_event_info'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string().nullable().optional(),
    alert_type: z.string(),
    priority: z.string(),
    is_safety_critical: z.boolean(),
    title: z.string(),
    body: z.string(),
    payload: z.record(z.string(), z.any()).nullable().optional(),
    title_loc_key: z.string().nullable().optional(),
    title_loc_args: z.array(z.string()).optional(),
    body_loc_key: z.string().nullable().optional(),
    body_loc_args: z.array(z.string()).optional(),
    dedup_key: z.string().nullable().optional(),
    thread_key: z.string().nullable().optional(),
    source_topic: z.string().nullable().optional(),
  })
  .strict()

export const AlertEventInfoSchema = _AlertEventInfoRawSchema as unknown as z.ZodType<
  Components['schemas']['AlertEventInfo']
>

const _AvailableProcessRawSchema = z
  .object({
    type: z.literal('available_process'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    name: z.string(),
    class_path: z.string(),
    method: z.string(),
    description: z.string(),
    lifecycle: z.enum(['long_running', 'one_shot']),
    role: z.enum(['core', 'task', 'strategy', 'backtest']),
    tags: z.array(z.string()),
    parameters_schema: z.record(z.string(), z.any()).nullable().optional(),
  })
  .strict()

export const AvailableProcessSchema = _AvailableProcessRawSchema as unknown as z.ZodType<
  Components['schemas']['AvailableProcess']
>

const _BacktestResultInlineRawSchema = z
  .object({
    total_trades: z.number().int(),
    winning_trades: z.number().int(),
    losing_trades: z.number().int(),
    total_pnl: z.number(),
    max_drawdown: z.number(),
    sharpe_ratio: z.number().nullable().optional(),
    win_rate: z.number().nullable().optional(),
    profit_factor: z.number().nullable().optional(),
    final_equity: z.number(),
    max_equity: z.number(),
    sortino_ratio: z.number().nullable().optional(),
    cagr: z.number().nullable().optional(),
    calmar_ratio: z.number().nullable().optional(),
    expectancy: z.number().nullable().optional(),
    avg_trade_pnl: z.number().nullable().optional(),
    max_drawdown_duration_seconds: z.number().nullable().optional(),
    exposure_ratio: z.number().nullable().optional(),
    turnover_ratio: z.number().nullable().optional(),
    extra_metrics: z.record(z.string(), z.any()),
  })
  .strict()

export const BacktestResultInlineSchema = _BacktestResultInlineRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestResultInline']
>

const _BacktestRunDataRawSchema = z
  .object({
    type: z.literal('backtest_run'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    strategy_name: z.string(),
    strategy_params: z.record(z.string(), z.any()),
    instrument_public_id: z.string(),
    instrument: z.string().nullable().optional(),
    exchange: z.string(),
    timeframe: z.string(),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime(),
    initial_cash: z.number(),
    status: z.string(),
    execution_mode: z.string(),
    fill_model: z.string(),
    slippage_bps: z.number(),
    commission_bps: z.number(),
    config_hash: z.string().nullable().optional(),
    target_execution_exchange: z.string().nullable().optional(),
    started_at: z.iso.datetime().nullable().optional(),
    completed_at: z.iso.datetime().nullable().optional(),
    error: z.string().nullable().optional(),
  })
  .strict()

export const BacktestRunDataSchema = _BacktestRunDataRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestRunData']
>

const _ConfiguredProcessRawSchema = z
  .object({
    type: z.literal('configured_process'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    name: z.string(),
    enabled: z.boolean(),
    running: z.boolean(),
    mode: z.enum(['thread', 'process']),
    class_path: z.string(),
    method: z.string(),
    parameters: z.record(z.string(), z.any()),
    note: z.string().nullable().optional(),
    lifecycle: z.enum(['long_running', 'one_shot']),
    role: z.enum(['core', 'task', 'strategy', 'backtest']),
    tags: z.array(z.string()),
    parameters_schema: z.record(z.string(), z.any()).nullable().optional(),
    is_one_shot: z.boolean(),
    active_public_id: z.string().nullable().optional(),
    kind: z.enum(['template', 'instance']),
    wallet_public_id: z.string().nullable().optional(),
    parent_template: z.string().nullable().optional(),
    template: z.string().nullable().optional(),
    coordinator: z.string().nullable().optional(),
    coordinator_label: z.string().nullable().optional(),
    managed_remotely: z.boolean(),
  })
  .strict()

export const ConfiguredProcessSchema = _ConfiguredProcessRawSchema as unknown as z.ZodType<
  Components['schemas']['ConfiguredProcess']
>

const _DelegateCapsBodyRawSchema = z
  .object({
    max_order_quantity_per_instrument: z.record(z.string(), z.any()).nullable().optional(),
    max_open_orders: z.number().int().nullable().optional(),
    max_daily_notional_usd: z.number().nullable().optional(),
    max_cancels_per_minute: z.number().int().nullable().optional(),
  })
  .strict()

export const DelegateCapsBodySchema = _DelegateCapsBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateCapsBody']
>

const _ExecutionPlanDecisionDataRawSchema = z
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

export const ExecutionPlanDecisionDataSchema =
  _ExecutionPlanDecisionDataRawSchema as unknown as z.ZodType<
    Components['schemas']['ExecutionPlanDecisionData']
  >

const _PendingReviewSummaryItemRawSchema = z
  .object({
    review_public_id: z.string(),
    selected_delegate_public_id: z.string(),
    wallet_public_id: z.string(),
    dispatch_version: z.number().int(),
    status: z.string(),
    deadline: z.iso.datetime(),
    fanout_after: z.iso.datetime(),
    instrument: z.string().nullable().optional(),
    signal_envelope: z.record(z.string(), z.any()).nullable().optional(),
  })
  .strict()

export const PendingReviewSummaryItemSchema =
  _PendingReviewSummaryItemRawSchema as unknown as z.ZodType<
    Components['schemas']['PendingReviewSummaryItem']
  >

const _PortfolioReconciliationViewRawSchema = z
  .object({
    method: PortfolioReconciliationMethodSchema.nullable(),
    evaluation_status: PortfolioReconciliationEvaluationStatusSchema.nullable(),
    effective_status: PortfolioReconciliationEffectiveStatusSchema,
    is_authoritative: z.boolean(),
    evaluated_at: z.iso.datetime().nullable(),
    current_observation_id: z.number().int().nullable(),
    last_full_observation_id: z.number().int().nullable(),
    detail_source_observation_id: z.number().int().nullable(),
    last_full_outcome: z.enum(['matched', 'mismatched']).nullable(),
    consecutive_full_mismatches: z.number().int(),
    anchor_public_id: z.string().nullable(),
    venue_account_state_public_id: z.string().nullable(),
    venue_account_observation_id: z.number().int().nullable(),
    source_watermark_kind: z.string().nullable(),
    source_watermark: z.number().int().nullable(),
    expected: z.record(z.string(), z.any()).nullable(),
    actual: z.record(z.string(), z.any()).nullable(),
    difference: z.record(z.string(), z.any()).nullable(),
    tolerance: z.record(z.string(), z.any()).nullable(),
    reconciled_at: z.iso.datetime().nullable(),
    authoritative_until: z.iso.datetime().nullable(),
    error: z.string().nullable(),
    open_drift_episode: PortfolioReconciliationDriftEpisodeSchema.nullable(),
  })
  .strict()

export const PortfolioReconciliationViewSchema =
  _PortfolioReconciliationViewRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioReconciliationView']
  >

const _ProcessConfigScopeDataRawSchema = z
  .object({
    type: z.literal('process_config_scope'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    status: z.literal('success'),
    name: z.string(),
    parameters: z.record(z.string(), z.any()),
    restart_required: z.boolean(),
  })
  .strict()

export const ProcessConfigScopeDataSchema =
  _ProcessConfigScopeDataRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessConfigScopeData']
  >

const _ProcessRunRawSchema = z
  .object({
    type: z.literal('process_run'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    process_name: z.string(),
    status: z.enum(['running', 'succeeded', 'failed', 'cancelled']),
    role: z.enum(['core', 'task', 'strategy', 'backtest']),
    lifecycle: z.enum(['long_running', 'one_shot']),
    parameters: z.record(z.string(), z.any()).nullable().optional(),
    result: z.record(z.string(), z.any()).nullable().optional(),
    error: z.string().nullable().optional(),
    tags: z.array(z.string()),
    started_at: z.string(),
    completed_at: z.string().nullable().optional(),
  })
  .strict()

export const ProcessRunSchema = _ProcessRunRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessRun']
>

const _ProcessSchemaDataRawSchema = z
  .object({
    type: z.literal('process_schema'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    name: z.string(),
    description: z.string(),
    class_path: z.string(),
    method: z.string(),
    default_enabled: z.boolean(),
    default_mode: z.enum(['thread', 'process']),
    default_parameters: z.record(z.string(), z.any()),
    reference_identity_params: z.record(z.string(), z.string()),
    seeded_identity_params: z.array(z.string()),
    lifecycle: z.enum(['long_running', 'one_shot']),
  })
  .strict()

export const ProcessSchemaDataSchema = _ProcessSchemaDataRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessSchemaData']
>

const _StrategyStatusPayloadRawSchema = z
  .object({
    strategy_name: z.string(),
    status: z.string(),
    details: z.record(z.string(), z.any()),
    signals_generated: z.number().int().nullable().optional(),
    trades_executed: z.number().int().nullable().optional(),
    last_signal: z.string().nullable().optional(),
    last_signal_time: z.string().nullable().optional(),
    pnl: z.number().nullable().optional(),
    pid: z.number().int().nullable().optional(),
    uptime: z.string().nullable().optional(),
  })
  .strict()

export const StrategyStatusPayloadSchema = _StrategyStatusPayloadRawSchema as unknown as z.ZodType<
  Components['schemas']['StrategyStatusPayload']
>

const _BacktestCreateBodyRawSchema = z
  .object({
    strategy_class: z.string(),
    instrument_public_id: z.string(),
    exchange: z.string(),
    timeframe: z.string().optional(),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime(),
    initial_cash: z.number().optional(),
    strategy_params: z.record(z.string(), z.any()).optional(),
    execution_mode: z.string().optional(),
    fill_model: z.string().optional(),
    slippage_bps: z.number().optional(),
    commission_bps: z.number().optional(),
    target_execution_exchange: z
      .enum(['paper', 'kraken', 'kraken_futures', 'walutomat'])
      .nullable()
      .optional(),
  })
  .strict()

export const BacktestCreateBodySchema = _BacktestCreateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestCreateBody']
>

const _ProcessCreateBodyRawSchema = z
  .object({
    name: z.string().min(3).max(64),
    template: z.string(),
    enabled: z.boolean().nullable().optional(),
    mode: z.enum(['thread', 'process']).nullable().optional(),
    parameters: z.record(z.string(), z.any()).nullable().optional(),
    note: z.string().max(512).nullable().optional(),
  })
  .strict()

export const ProcessCreateBodySchema = _ProcessCreateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCreateBody']
>

const _ProcessStartBodyRawSchema = z
  .object({
    mode: z.enum(['thread', 'process']).nullable().optional(),
    parameters: z.record(z.string(), z.any()).nullable().optional(),
  })
  .strict()

export const ProcessStartBodySchema = _ProcessStartBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStartBody']
>

const _PairedExecutionIncidentListResponseRawSchema = z
  .object({
    type: z.literal('paired_execution_incident_list_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(PairedExecutionIncidentSchema),
    count: z.number().int(),
  })
  .strict()

export const PairedExecutionIncidentListResponseSchema =
  _PairedExecutionIncidentListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PairedExecutionIncidentListResponse']
  >

const _PnlSeriesDataRawSchema = z
  .object({
    type: z.literal('pnl_series'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    mode: z.string(),
    granularity: z.string(),
    valuation_ccy: z.string(),
    from_time: z.iso.datetime(),
    to_time: z.iso.datetime(),
    as_of: z.iso.datetime(),
    mark_source: z.string(),
    rate_sources: z.array(PnlFxRateSourceDataSchema),
    calc_version: z.string(),
    points: z.array(PnlTimelinePointDataSchema),
  })
  .strict()

export const PnlSeriesDataSchema = _PnlSeriesDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlSeriesData']
>

const _PnlTimelineDataRawSchema = z
  .object({
    type: z.literal('pnl_timeline'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    mode: z.string(),
    granularity: z.string(),
    valuation_ccy: z.string(),
    from_time: z.iso.datetime(),
    to_time: z.iso.datetime(),
    as_of: z.iso.datetime(),
    mark_source: z.string(),
    rate_sources: z.array(PnlFxRateSourceDataSchema),
    calc_version: z.string(),
    points: z.array(PnlTimelinePointDataSchema),
    marker_limit: z.number().int(),
    markers_truncated: z.boolean(),
    markers: z.array(PnlTimelineMarkerDataSchema),
  })
  .strict()

export const PnlTimelineDataSchema = _PnlTimelineDataRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlTimelineData']
>

const _RelatedInstrumentsResponseRawSchema = z
  .object({
    type: z.literal('related_instruments'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RelatedInstrumentsPayloadDataSchema,
  })
  .strict()

export const RelatedInstrumentsResponseSchema =
  _RelatedInstrumentsResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['RelatedInstrumentsResponse']
  >

const _LoginResponseRawSchema = z
  .object({
    type: z.literal('login_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: LoginDataSchema,
  })
  .strict()

export const LoginResponseSchema = _LoginResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['LoginResponse']
>

const _RefreshResponseRawSchema = z
  .object({
    type: z.literal('refresh_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: RefreshDataSchema,
  })
  .strict()

export const RefreshResponseSchema = _RefreshResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['RefreshResponse']
>

const _AdminAiReviewListResponseRawSchema = z
  .object({
    items: z.array(AdminAiReviewItemSchema),
    count: z.number().int(),
  })
  .strict()

export const AdminAiReviewListResponseSchema =
  _AdminAiReviewListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['AdminAiReviewListResponse']
  >

const _AiReviewAftermathResponseRawSchema = z
  .object({
    review: AiReviewAftermathReviewSchema,
    window_started_at: z.iso.datetime(),
    as_of: z.iso.datetime(),
    orders: z.array(AiReviewAftermathOrderSchema),
    executions: z.array(AiReviewAftermathExecutionSchema),
    position_cycle_transitions: z.array(AiReviewAftermathPositionCycleTransitionSchema),
    current_positions: z.array(AiReviewAftermathPositionSchema),
  })
  .strict()

export const AiReviewAftermathResponseSchema =
  _AiReviewAftermathResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['AiReviewAftermathResponse']
  >

const _AlertEventResponseRawSchema = z
  .object({
    type: z.literal('alert_event_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: AlertEventInfoSchema,
  })
  .strict()

export const AlertEventResponseSchema = _AlertEventResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['AlertEventResponse']
>

const _AlertHistoryResponseRawSchema = z
  .object({
    type: z.literal('alert_history_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(AlertEventInfoSchema),
    count: z.number().int(),
    next_cursor: z.string().nullable().optional(),
  })
  .strict()

export const AlertHistoryResponseSchema = _AlertHistoryResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['AlertHistoryResponse']
>

const _AvailableProcessesResponseRawSchema = z
  .object({
    type: z.literal('available_processes'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(AvailableProcessSchema),
    count: z.number().int(),
  })
  .strict()

export const AvailableProcessesResponseSchema =
  _AvailableProcessesResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['AvailableProcessesResponse']
  >

const _BacktestRunDetailDataRawSchema = z
  .object({
    type: z.literal('backtest_run'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    strategy_name: z.string(),
    strategy_params: z.record(z.string(), z.any()),
    instrument_public_id: z.string(),
    instrument: z.string().nullable().optional(),
    exchange: z.string(),
    timeframe: z.string(),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime(),
    initial_cash: z.number(),
    status: z.string(),
    execution_mode: z.string(),
    fill_model: z.string(),
    slippage_bps: z.number(),
    commission_bps: z.number(),
    config_hash: z.string().nullable().optional(),
    target_execution_exchange: z.string().nullable().optional(),
    started_at: z.iso.datetime().nullable().optional(),
    completed_at: z.iso.datetime().nullable().optional(),
    error: z.string().nullable().optional(),
    result: BacktestResultInlineSchema.nullable().optional(),
  })
  .strict()

export const BacktestRunDetailDataSchema = _BacktestRunDetailDataRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestRunDetailData']
>

const _BacktestComparisonDetailResponseDataRawSchema = z
  .object({
    type: z.literal('backtest_comparison_detail'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    comparison: BacktestComparisonDataSchema,
    run_a: BacktestRunDataSchema,
    run_b: BacktestRunDataSchema,
    metrics_diff: z.array(MetricDiffRowSchema),
    equity_overlay: z.array(EquityOverlayPointSchema),
    trades_diff: z.array(TradeDiffEntrySchema),
    signals_diff: z.array(SignalDiffEntrySchema),
  })
  .strict()

export const BacktestComparisonDetailResponseDataSchema =
  _BacktestComparisonDetailResponseDataRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestComparisonDetailResponseData']
  >

const _BacktestRunListResponseRawSchema = z
  .object({
    type: z.literal('backtest_run_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(BacktestRunDataSchema),
    count: z.number().int(),
  })
  .strict()

export const BacktestRunListResponseSchema =
  _BacktestRunListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestRunListResponse']
  >

const _BacktestRunResponseRawSchema = z
  .object({
    type: z.literal('backtest_run_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestRunDataSchema,
  })
  .strict()

export const BacktestRunResponseSchema = _BacktestRunResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestRunResponse']
>

const _ConfiguredProcessesResponseRawSchema = z
  .object({
    type: z.literal('configured_processes'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ConfiguredProcessSchema),
    count: z.number().int(),
  })
  .strict()

export const ConfiguredProcessesResponseSchema =
  _ConfiguredProcessesResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ConfiguredProcessesResponse']
  >

const _DelegateReadRawSchema = z
  .object({
    public_id: z.string(),
    username: z.string(),
    label: z.string(),
    created_by_user_public_id: z.string(),
    created_at: z.iso.datetime(),
    is_active: z.boolean(),
    caps: DelegateCapsBodySchema,
  })
  .strict()

export const DelegateReadSchema = _DelegateReadRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateRead']
>

const _DelegateCreateBodyRawSchema = z
  .object({
    label: z.string().min(1).max(48),
    caps: DelegateCapsBodySchema.optional(),
    operator_public_id: z.string().nullable().optional(),
    permissions: z.array(PermissionSchema).nullable().optional(),
  })
  .strict()

export const DelegateCreateBodySchema = _DelegateCreateBodyRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateCreateBody']
>

const _DelegateCapsUpdateBodyRawSchema = z
  .object({
    caps: DelegateCapsBodySchema,
  })
  .strict()

export const DelegateCapsUpdateBodySchema =
  _DelegateCapsUpdateBodyRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateCapsUpdateBody']
  >

const _ExecutionPlanDecisionListResponseRawSchema = z
  .object({
    type: z.literal('execution_plan_decision_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ExecutionPlanDecisionDataSchema),
    count: z.number().int(),
  })
  .strict()

export const ExecutionPlanDecisionListResponseSchema =
  _ExecutionPlanDecisionListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ExecutionPlanDecisionListResponse']
  >

const _PendingReviewListResponseRawSchema = z
  .object({
    items: z.array(PendingReviewSummaryItemSchema),
    count: z.number().int(),
  })
  .strict()

export const PendingReviewListResponseSchema =
  _PendingReviewListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PendingReviewListResponse']
  >

const _PortfolioAccountStateRawSchema = z
  .object({
    type: z.literal('portfolio_account_state'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    mode: z.enum(['live', 'paper']),
    sync_status: z.string(),
    effective_status: z.string(),
    is_authoritative: z.boolean(),
    balance_status: z.string(),
    position_status: z.string(),
    valuation_status: z.string(),
    balances: z.array(AccountBalanceEntrySchema).nullable().optional(),
    open_positions: z.array(AccountPositionEntrySchema).nullable().optional(),
    balance_observed_at: z.iso.datetime().nullable().optional(),
    position_observed_at: z.iso.datetime().nullable().optional(),
    authoritative_until: z.iso.datetime().nullable().optional(),
    current_attempt_observation_id: z.number().int().nullable().optional(),
    balance_payload_source_observation_id: z.number().int().nullable().optional(),
    position_payload_source_observation_id: z.number().int().nullable().optional(),
    error: z.string().nullable().optional(),
    reconciliation: PortfolioReconciliationViewSchema,
  })
  .strict()

export const PortfolioAccountStateSchema = _PortfolioAccountStateRawSchema as unknown as z.ZodType<
  Components['schemas']['PortfolioAccountState']
>

const _ProcessConfigScopeResponseRawSchema = z
  .object({
    type: z.literal('process_config_scope_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessConfigScopeDataSchema,
  })
  .strict()

export const ProcessConfigScopeResponseSchema =
  _ProcessConfigScopeResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['ProcessConfigScopeResponse']
  >

const _ProcessRunsResponseRawSchema = z
  .object({
    type: z.literal('process_runs'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(ProcessRunSchema),
    count: z.number().int(),
  })
  .strict()

export const ProcessRunsResponseSchema = _ProcessRunsResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessRunsResponse']
>

const _ProcessSchemaResponseRawSchema = z
  .object({
    type: z.literal('process_schema_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessSchemaDataSchema,
  })
  .strict()

export const ProcessSchemaResponseSchema = _ProcessSchemaResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessSchemaResponse']
>

const _SystemStatusDataRawSchema = z
  .object({
    type: z.literal('system_status'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    trader: ProcessStatusSchema,
    backtests: z.record(z.string(), ProcessStatusSchema),
    strategies: z.array(StrategyStatusPayloadSchema),
  })
  .strict()

export const SystemStatusDataSchema = _SystemStatusDataRawSchema as unknown as z.ZodType<
  Components['schemas']['SystemStatusData']
>

const _BacktestCreateCommandRawSchema = z
  .object({
    type: z.literal('backtest_create_command').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestCreateBodySchema,
  })
  .strict()

export const BacktestCreateCommandSchema = _BacktestCreateCommandRawSchema as unknown as z.ZodType<
  Components['schemas']['BacktestCreateCommand']
>

const _ProcessCreateRequestRawSchema = z
  .object({
    type: z.literal('process_create_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessCreateBodySchema,
  })
  .strict()

export const ProcessCreateRequestSchema = _ProcessCreateRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessCreateRequest']
>

const _ProcessStartRequestRawSchema = z
  .object({
    type: z.literal('process_start_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: ProcessStartBodySchema,
  })
  .strict()

export const ProcessStartRequestSchema = _ProcessStartRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['ProcessStartRequest']
>

const _PnlSeriesResponseRawSchema = z
  .object({
    type: z.literal('pnl_series'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: PnlSeriesDataSchema,
  })
  .strict()

export const PnlSeriesResponseSchema = _PnlSeriesResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlSeriesResponse']
>

const _PnlTimelineResponseRawSchema = z
  .object({
    type: z.literal('pnl_timeline'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: PnlTimelineDataSchema,
  })
  .strict()

export const PnlTimelineResponseSchema = _PnlTimelineResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['PnlTimelineResponse']
>

const _BacktestRunDetailResponseRawSchema = z
  .object({
    type: z.literal('backtest_run_detail_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestRunDetailDataSchema,
  })
  .strict()

export const BacktestRunDetailResponseSchema =
  _BacktestRunDetailResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestRunDetailResponse']
  >

const _BacktestComparisonDetailResponseRawSchema = z
  .object({
    type: z.literal('backtest_comparison_detail_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: BacktestComparisonDetailResponseDataSchema,
  })
  .strict()

export const BacktestComparisonDetailResponseSchema =
  _BacktestComparisonDetailResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['BacktestComparisonDetailResponse']
  >

const _DelegateCreatedPayloadRawSchema = z
  .object({
    delegate: DelegateReadSchema,
    access_token: z.string(),
    expires_in: z.number().int(),
  })
  .strict()

export const DelegateCreatedPayloadSchema =
  _DelegateCreatedPayloadRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateCreatedPayload']
  >

const _DelegateListResponseRawSchema = z
  .object({
    type: z.literal('delegate_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(DelegateReadSchema),
    count: z.number().int(),
  })
  .strict()

export const DelegateListResponseSchema = _DelegateListResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateListResponse']
>

const _DelegateResponseRawSchema = z
  .object({
    type: z.literal('delegate_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DelegateReadSchema,
  })
  .strict()

export const DelegateResponseSchema = _DelegateResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateResponse']
>

const _DelegateCreateRequestRawSchema = z
  .object({
    type: z.literal('delegate_create_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DelegateCreateBodySchema,
  })
  .strict()

export const DelegateCreateRequestSchema = _DelegateCreateRequestRawSchema as unknown as z.ZodType<
  Components['schemas']['DelegateCreateRequest']
>

const _DelegateCapsUpdateRequestRawSchema = z
  .object({
    type: z.literal('delegate_caps_update_request').optional(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DelegateCapsUpdateBodySchema,
  })
  .strict()

export const DelegateCapsUpdateRequestSchema =
  _DelegateCapsUpdateRequestRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateCapsUpdateRequest']
  >

const _PortfolioAccountStateListResponseRawSchema = z
  .object({
    type: z.literal('portfolio_account_state_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(PortfolioAccountStateSchema),
    count: z.number().int(),
  })
  .strict()

export const PortfolioAccountStateListResponseSchema =
  _PortfolioAccountStateListResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['PortfolioAccountStateListResponse']
  >

const _SystemStatusResponseRawSchema = z
  .object({
    type: z.literal('system_status_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: SystemStatusDataSchema,
  })
  .strict()

export const SystemStatusResponseSchema = _SystemStatusResponseRawSchema as unknown as z.ZodType<
  Components['schemas']['SystemStatusResponse']
>

const _DelegateCreatedResponseRawSchema = z
  .object({
    type: z.literal('delegate_created_response'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: DelegateCreatedPayloadSchema,
  })
  .strict()

export const DelegateCreatedResponseSchema =
  _DelegateCreatedResponseRawSchema as unknown as z.ZodType<
    Components['schemas']['DelegateCreatedResponse']
  >

// Type exports
export type AccountBalanceEntry = Components['schemas']['AccountBalanceEntry']
export type AccountPositionEntry = Components['schemas']['AccountPositionEntry']
export type AiReviewAftermathExecution = Components['schemas']['AiReviewAftermathExecution']
export type AiReviewAftermathOrder = Components['schemas']['AiReviewAftermathOrder']
export type AiReviewAftermathPosition = Components['schemas']['AiReviewAftermathPosition']
export type AiReviewAftermathPositionCycleTransition =
  Components['schemas']['AiReviewAftermathPositionCycleTransition']
export type AsyncioMetrics = Components['schemas']['AsyncioMetrics']
export type BacktestComparisonData = Components['schemas']['BacktestComparisonData']
export type BacktestEquityPointInline = Components['schemas']['BacktestEquityPointInline']
export type BacktestEventData = Components['schemas']['BacktestEventData']
export type BacktestSignalData = Components['schemas']['BacktestSignalData']
export type BacktestStrategyClassListResponse =
  Components['schemas']['BacktestStrategyClassListResponse']
export type BacktestTradeData = Components['schemas']['BacktestTradeData']
export type CacheHealthPayload = Components['schemas']['CacheHealthPayload']
export type CachedCandle = Components['schemas']['CachedCandle']
export type CachedStatsPayload = Components['schemas']['CachedStatsPayload']
export type CandleData = Components['schemas']['CandleData']
export type ConnectionStats = Components['schemas']['ConnectionStats']
export type ContinuousCandleData = Components['schemas']['ContinuousCandleData']
export type ContractData = Components['schemas']['ContractData']
export type CpuMetrics = Components['schemas']['CpuMetrics']
export type CredentialSummary = Components['schemas']['CredentialSummary']
export type DbInternalMetrics = Components['schemas']['DbInternalMetrics']
export type DeviceAlertPrefInfo = Components['schemas']['DeviceAlertPrefInfo']
export type DiskMetrics = Components['schemas']['DiskMetrics']
export type EgressActiveReservationSnapshot =
  Components['schemas']['EgressActiveReservationSnapshot']
export type EgressConnectionSnapshot = Components['schemas']['EgressConnectionSnapshot']
export type EgressContainerSummary = Components['schemas']['EgressContainerSummary']
export type EgressTransferSnapshot = Components['schemas']['EgressTransferSnapshot']
export type EquityOverlayPoint = Components['schemas']['EquityOverlayPoint']
export type ExchangeListResponse = Components['schemas']['ExchangeListResponse']
export type ExecutionData = Components['schemas']['ExecutionData']
export type ExecutionPlanData = Components['schemas']['ExecutionPlanData']
export type FeatureFlagsPayload = Components['schemas']['FeatureFlagsPayload']
export type FrontMonthData = Components['schemas']['FrontMonthData']
export type GapStats = Components['schemas']['GapStats']
export type GcMetrics = Components['schemas']['GcMetrics']
export type HealthTopics = Components['schemas']['HealthTopics']
export type InstrumentCapabilityData = Components['schemas']['InstrumentCapabilityData']
export type InstrumentDetailData = Components['schemas']['InstrumentDetailData']
export type InstrumentFeedHealthRowSchema = Components['schemas']['InstrumentFeedHealthRowSchema']
export type InstrumentListResponse = Components['schemas']['InstrumentListResponse']
export type JsonPrimitive = Components['schemas']['JsonPrimitive']
export type LimitsMetrics = Components['schemas']['LimitsMetrics']
export type MarketDataCoverageExchange = Components['schemas']['MarketDataCoverageExchange']
export type MemoryMetrics = Components['schemas']['MemoryMetrics']
export type MessageResponse = Components['schemas']['MessageResponse']
export type MetricDiffRow = Components['schemas']['MetricDiffRow']
export type NotificationDeviceInfo = Components['schemas']['NotificationDeviceInfo']
export type NotificationMetricsData = Components['schemas']['NotificationMetricsData']
export type OperatorInfo = Components['schemas']['OperatorInfo']
export type OrderData = Components['schemas']['OrderData']
export type OrphanSweepResultData = Components['schemas']['OrphanSweepResultData']
export type PairedHaltInfo = Components['schemas']['PairedHaltInfo']
export type PairedLegExposure = Components['schemas']['PairedLegExposure']
export type PnlAttributionOrigin = Components['schemas']['PnlAttributionOrigin']
export type PnlFillMarkerData = Components['schemas']['PnlFillMarkerData']
export type PnlFxRateSourceData = Components['schemas']['PnlFxRateSourceData']
export type PnlInstrumentContributionData = Components['schemas']['PnlInstrumentContributionData']
export type PnlMarkerOutcome = Components['schemas']['PnlMarkerOutcome']
export type PnlSignalMarkerData = Components['schemas']['PnlSignalMarkerData']
export type PnlValuationStatus = Components['schemas']['PnlValuationStatus']
export type PortfolioReconciliationDriftEpisode =
  Components['schemas']['PortfolioReconciliationDriftEpisode']
export type PortfolioReconciliationEffectiveStatus =
  Components['schemas']['PortfolioReconciliationEffectiveStatus']
export type PortfolioReconciliationEvaluationStatus =
  Components['schemas']['PortfolioReconciliationEvaluationStatus']
export type PortfolioReconciliationMethod = Components['schemas']['PortfolioReconciliationMethod']
export type PositionCycleData = Components['schemas']['PositionCycleData']
export type PositionData = Components['schemas']['PositionData']
export type ProcessCategoryCount = Components['schemas']['ProcessCategoryCount']
export type ProcessCreatedInfo = Components['schemas']['ProcessCreatedInfo']
export type ProcessDesiredStateData = Components['schemas']['ProcessDesiredStateData']
export type ProcessMetrics = Components['schemas']['ProcessMetrics']
export type ProcessStartData = Components['schemas']['ProcessStartData']
export type ProcessStatus = Components['schemas']['ProcessStatus']
export type ProcessStopData = Components['schemas']['ProcessStopData']
export type ProcessSummaryItem = Components['schemas']['ProcessSummaryItem']
export type PushBetaConfigRead = Components['schemas']['PushBetaConfigRead']
export type RealPortfolioReconciliationMethod =
  Components['schemas']['RealPortfolioReconciliationMethod']
export type RelatedInstrumentData = Components['schemas']['RelatedInstrumentData']
export type RelatedInstrumentsSelected = Components['schemas']['RelatedInstrumentsSelected']
export type RelatedInstrumentsUnderlying = Components['schemas']['RelatedInstrumentsUnderlying']
export type RelationshipTypeEnum = Components['schemas']['RelationshipTypeEnum']
export type ResearcherRead = Components['schemas']['ResearcherRead']
export type RestRateExchangeStats = Components['schemas']['RestRateExchangeStats']
export type RetentionPolicyResult = Components['schemas']['RetentionPolicyResult']
export type RollPointDetail = Components['schemas']['RollPointDetail']
export type SaturationMetrics = Components['schemas']['SaturationMetrics']
export type ScopeGrantInfo = Components['schemas']['ScopeGrantInfo']
export type SettingCategoriesResponse = Components['schemas']['SettingCategoriesResponse']
export type SettingRead = Components['schemas']['SettingRead']
export type SignalData = Components['schemas']['SignalData']
export type SignalDiffEntry = Components['schemas']['SignalDiffEntry']
export type StrategyProcess = Components['schemas']['StrategyProcess']
export type SubscriptionsStats = Components['schemas']['SubscriptionsStats']
export type TableStatsItem = Components['schemas']['TableStatsItem']
export type TopicMetricSnapshot = Components['schemas']['TopicMetricSnapshot']
export type TracemallocState = Components['schemas']['TracemallocState']
export type TradeDiffEntry = Components['schemas']['TradeDiffEntry']
export type TrailingStopStateData = Components['schemas']['TrailingStopStateData']
export type UnderlyingAssetData = Components['schemas']['UnderlyingAssetData']
export type UnderlyingInstrumentData = Components['schemas']['UnderlyingInstrumentData']
export type UserAlertDefaultInfo = Components['schemas']['UserAlertDefaultInfo']
export type UserRole = Components['schemas']['UserRole']
export type ValidationError = Components['schemas']['ValidationError']
export type VenueFeeScheduleData = Components['schemas']['VenueFeeScheduleData']
export type WalletInfo = Components['schemas']['WalletInfo']
export type WebSocketStats = Components['schemas']['WebSocketStats']
export type WsStatsConfig = Components['schemas']['WsStatsConfig']
export type WsTokenData = Components['schemas']['WsTokenData']
export type ZmqBridgeStats = Components['schemas']['ZmqBridgeStats']
export type ZmqComponents = Components['schemas']['ZmqComponents']
export type ZmqConfig = Components['schemas']['ZmqConfig']
export type Permission = Components['schemas']['Permission']
export type RefreshTokenPayload = Components['schemas']['RefreshTokenPayload']
export type UpdateAuthMeBody = Components['schemas']['UpdateAuthMeBody']
export type DeactivateUserBody = Components['schemas']['DeactivateUserBody']
export type ChangePasswordBody = Components['schemas']['ChangePasswordBody']
export type AdminResetPasswordBody = Components['schemas']['AdminResetPasswordBody']
export type SettingUpdateBody = Components['schemas']['SettingUpdateBody']
export type PushBetaUsersBody = Components['schemas']['PushBetaUsersBody']
export type RemoveSettingBody = Components['schemas']['RemoveSettingBody']
export type DelegateDeactivateBody = Components['schemas']['DelegateDeactivateBody']
export type AiReviewDecisionRequest = Components['schemas']['AiReviewDecisionRequest']
export type UserAlertDefaultBody = Components['schemas']['UserAlertDefaultBody']
export type BacktestCompareBody = Components['schemas']['BacktestCompareBody']
export type BacktestCancelBody = Components['schemas']['BacktestCancelBody']
export type RotateCredentialBody = Components['schemas']['RotateCredentialBody']
export type RegisterDeviceBody = Components['schemas']['RegisterDeviceBody']
export type DeviceAlertPrefBody = Components['schemas']['DeviceAlertPrefBody']
export type RevokeDevicePrefBody = Components['schemas']['RevokeDevicePrefBody']
export type BracketCreateBody = Components['schemas']['BracketCreateBody']
export type BracketCancelBody = Components['schemas']['BracketCancelBody']
export type CreateOperatorBody = Components['schemas']['CreateOperatorBody']
export type CreateOrderBody = Components['schemas']['CreateOrderBody']
export type CancelOrderBody = Components['schemas']['CancelOrderBody']
export type ProcessDesiredStateBody = Components['schemas']['ProcessDesiredStateBody']
export type ProcessConfigScopeBody = Components['schemas']['ProcessConfigScopeBody']
export type CreateScopeGrantBody = Components['schemas']['CreateScopeGrantBody']
export type HandoverScopeGrantBody = Components['schemas']['HandoverScopeGrantBody']
export type RevokeScopeGrantBody = Components['schemas']['RevokeScopeGrantBody']
export type TrailingStopCreateBody = Components['schemas']['TrailingStopCreateBody']
export type TrailingStopCancelBody = Components['schemas']['TrailingStopCancelBody']
export type CreateWalletBody = Components['schemas']['CreateWalletBody']
export type BacktestComparisonListResponse = Components['schemas']['BacktestComparisonListResponse']
export type BacktestComparisonResponse = Components['schemas']['BacktestComparisonResponse']
export type BacktestEquityPointListResponse =
  Components['schemas']['BacktestEquityPointListResponse']
export type BacktestEventListResponse = Components['schemas']['BacktestEventListResponse']
export type BacktestSignalListResponse = Components['schemas']['BacktestSignalListResponse']
export type BacktestTradeListResponse = Components['schemas']['BacktestTradeListResponse']
export type CacheHealthResponse = Components['schemas']['CacheHealthResponse']
export type CachedCandlesPayload = Components['schemas']['CachedCandlesPayload']
export type CachedStatsResponse = Components['schemas']['CachedStatsResponse']
export type ListedCachedStatsPayload = Components['schemas']['ListedCachedStatsPayload']
export type CandleListResponse = Components['schemas']['CandleListResponse']
export type ContinuousCandleListResponse = Components['schemas']['ContinuousCandleListResponse']
export type ContractListResponse = Components['schemas']['ContractListResponse']
export type CredentialListResponse = Components['schemas']['CredentialListResponse']
export type CredentialResponse = Components['schemas']['CredentialResponse']
export type DeviceAlertPrefListResponse = Components['schemas']['DeviceAlertPrefListResponse']
export type DeviceAlertPrefResponse = Components['schemas']['DeviceAlertPrefResponse']
export type RevokeDevicePrefResponse = Components['schemas']['RevokeDevicePrefResponse']
export type EgressRouteStatusSnapshot = Components['schemas']['EgressRouteStatusSnapshot']
export type ExecutionListResponse = Components['schemas']['ExecutionListResponse']
export type ExecutionPlanResponse = Components['schemas']['ExecutionPlanResponse']
export type FeatureFlagsResponse = Components['schemas']['FeatureFlagsResponse']
export type FrontMonthResponse = Components['schemas']['FrontMonthResponse']
export type GapDetectionStats = Components['schemas']['GapDetectionStats']
export type InstrumentCapabilityListResponse =
  Components['schemas']['InstrumentCapabilityListResponse']
export type InstrumentDetailListResponse = Components['schemas']['InstrumentDetailListResponse']
export type MarketFeedHealthPayload = Components['schemas']['MarketFeedHealthPayload']
export type JsonValue = Components['schemas']['JsonValue']
export type MarketDataCoveragePayload = Components['schemas']['MarketDataCoveragePayload']
export type NotificationDeviceListResponse = Components['schemas']['NotificationDeviceListResponse']
export type NotificationDeviceResponse = Components['schemas']['NotificationDeviceResponse']
export type NotificationMetricsResponse = Components['schemas']['NotificationMetricsResponse']
export type OperatorListResponse = Components['schemas']['OperatorListResponse']
export type OperatorResponse = Components['schemas']['OperatorResponse']
export type OrderListResponse = Components['schemas']['OrderListResponse']
export type OrphanSweepResponse = Components['schemas']['OrphanSweepResponse']
export type PairedGroupIncident = Components['schemas']['PairedGroupIncident']
export type PnlAttributionContributionData = Components['schemas']['PnlAttributionContributionData']
export type PnlAiDecisionMarkerData = Components['schemas']['PnlAiDecisionMarkerData']
export type CreateCredentialBody = Components['schemas']['CreateCredentialBody']
export type PositionCycleListResponse = Components['schemas']['PositionCycleListResponse']
export type PositionListResponse = Components['schemas']['PositionListResponse']
export type ProcessCreateData = Components['schemas']['ProcessCreateData']
export type ProcessDesiredStateResponse = Components['schemas']['ProcessDesiredStateResponse']
export type ProcessStartResponse = Components['schemas']['ProcessStartResponse']
export type ProcessStopResponse = Components['schemas']['ProcessStopResponse']
export type ProcessSummaryData = Components['schemas']['ProcessSummaryData']
export type PushBetaConfigResponse = Components['schemas']['PushBetaConfigResponse']
export type CredentialReconciliationMethodInfo =
  Components['schemas']['CredentialReconciliationMethodInfo']
export type SetCredentialReconciliationMethodBody =
  Components['schemas']['SetCredentialReconciliationMethodBody']
export type RelatedInstrumentsGroup = Components['schemas']['RelatedInstrumentsGroup']
export type ResearcherCreatedPayload = Components['schemas']['ResearcherCreatedPayload']
export type RestRateData = Components['schemas']['RestRateData']
export type RetentionRunData = Components['schemas']['RetentionRunData']
export type ContinuousSeriesPartialResponse =
  Components['schemas']['ContinuousSeriesPartialResponse']
export type SystemMetricsData = Components['schemas']['SystemMetricsData']
export type SystemMetricsHistoryItem = Components['schemas']['SystemMetricsHistoryItem']
export type HandoverScopeGrantResult = Components['schemas']['HandoverScopeGrantResult']
export type RevokeScopeGrantResponse = Components['schemas']['RevokeScopeGrantResponse']
export type ScopeGrantListResponse = Components['schemas']['ScopeGrantListResponse']
export type ScopeGrantResponse = Components['schemas']['ScopeGrantResponse']
export type SettingListResponse = Components['schemas']['SettingListResponse']
export type SettingResponse = Components['schemas']['SettingResponse']
export type SignalListResponse = Components['schemas']['SignalListResponse']
export type StrategyListResponse = Components['schemas']['StrategyListResponse']
export type DbStatsData = Components['schemas']['DbStatsData']
export type TracemallocStateResponse = Components['schemas']['TracemallocStateResponse']
export type TrailingStopStateResponse = Components['schemas']['TrailingStopStateResponse']
export type UnderlyingAssetListResponse = Components['schemas']['UnderlyingAssetListResponse']
export type UnderlyingInstrumentListResponse =
  Components['schemas']['UnderlyingInstrumentListResponse']
export type UserAlertDefaultListResponse = Components['schemas']['UserAlertDefaultListResponse']
export type UserAlertDefaultResponse = Components['schemas']['UserAlertDefaultResponse']
export type UserProfile = Components['schemas']['UserProfile']
export type CreateUserBody = Components['schemas']['CreateUserBody']
export type UpdateUserBody = Components['schemas']['UpdateUserBody']
export type HTTPValidationError = Components['schemas']['HTTPValidationError']
export type VenueFeeScheduleListResponse = Components['schemas']['VenueFeeScheduleListResponse']
export type WalletListResponse = Components['schemas']['WalletListResponse']
export type WalletResponse = Components['schemas']['WalletResponse']
export type WsTokenResponse = Components['schemas']['WsTokenResponse']
export type WsStatsData = Components['schemas']['WsStatsData']
export type ZmqHealthData = Components['schemas']['ZmqHealthData']
export type LoginBody = Components['schemas']['LoginBody']
export type ResearcherCreateBody = Components['schemas']['ResearcherCreateBody']
export type RefreshTokenRequest = Components['schemas']['RefreshTokenRequest']
export type UpdateAuthMeRequest = Components['schemas']['UpdateAuthMeRequest']
export type DeactivateUserRequest = Components['schemas']['DeactivateUserRequest']
export type ChangePasswordRequest = Components['schemas']['ChangePasswordRequest']
export type AdminResetPasswordRequest = Components['schemas']['AdminResetPasswordRequest']
export type SettingUpdate = Components['schemas']['SettingUpdate']
export type UpdatePushBetaUsersCommand = Components['schemas']['UpdatePushBetaUsersCommand']
export type RemoveSettingRequest = Components['schemas']['RemoveSettingRequest']
export type DelegateDeactivateRequest = Components['schemas']['DelegateDeactivateRequest']
export type AiReviewDecisionCommand = Components['schemas']['AiReviewDecisionCommand']
export type UpdateUserAlertDefaultCommand = Components['schemas']['UpdateUserAlertDefaultCommand']
export type BacktestCompareRequest = Components['schemas']['BacktestCompareRequest']
export type BacktestCancelCommand = Components['schemas']['BacktestCancelCommand']
export type RotateCredentialCommand = Components['schemas']['RotateCredentialCommand']
export type RegisterDeviceCommand = Components['schemas']['RegisterDeviceCommand']
export type UpdateDevicePrefCommand = Components['schemas']['UpdateDevicePrefCommand']
export type RevokeDevicePrefCommand = Components['schemas']['RevokeDevicePrefCommand']
export type BracketCreateCommand = Components['schemas']['BracketCreateCommand']
export type BracketCancelCommand = Components['schemas']['BracketCancelCommand']
export type CreateOperatorCommand = Components['schemas']['CreateOperatorCommand']
export type CreateOrderCommand = Components['schemas']['CreateOrderCommand']
export type CancelOrderCommand = Components['schemas']['CancelOrderCommand']
export type ProcessDesiredStateRequest = Components['schemas']['ProcessDesiredStateRequest']
export type ProcessConfigScopeRequest = Components['schemas']['ProcessConfigScopeRequest']
export type CreateScopeGrantCommand = Components['schemas']['CreateScopeGrantCommand']
export type HandoverScopeGrantCommand = Components['schemas']['HandoverScopeGrantCommand']
export type RevokeScopeGrantCommand = Components['schemas']['RevokeScopeGrantCommand']
export type TrailingStopCreateCommand = Components['schemas']['TrailingStopCreateCommand']
export type TrailingStopCancelCommand = Components['schemas']['TrailingStopCancelCommand']
export type CreateWalletCommand = Components['schemas']['CreateWalletCommand']
export type CachedCandlesResponse = Components['schemas']['CachedCandlesResponse']
export type ListedCachedStatsResponse = Components['schemas']['ListedCachedStatsResponse']
export type EgressHealthData = Components['schemas']['EgressHealthData']
export type HealthCheckData = Components['schemas']['HealthCheckData']
export type MarketFeedHealthResponse = Components['schemas']['MarketFeedHealthResponse']
export type JsonObject = Components['schemas']['JsonObject']
export type MarketDataCoverageResponse = Components['schemas']['MarketDataCoverageResponse']
export type PairedExecutionIncident = Components['schemas']['PairedExecutionIncident']
export type PairedGroupTerminalizeResponse = Components['schemas']['PairedGroupTerminalizeResponse']
export type PnlTimelinePointData = Components['schemas']['PnlTimelinePointData']
export type PnlTimelineMarkerData = Components['schemas']['PnlTimelineMarkerData']
export type CreateCredentialCommand = Components['schemas']['CreateCredentialCommand']
export type ProcessCreateResponse = Components['schemas']['ProcessCreateResponse']
export type ProcessSummaryResponse = Components['schemas']['ProcessSummaryResponse']
export type CredentialReconciliationMethodResponse =
  Components['schemas']['CredentialReconciliationMethodResponse']
export type SetCredentialReconciliationMethodCommand =
  Components['schemas']['SetCredentialReconciliationMethodCommand']
export type RelatedInstrumentsPayloadData = Components['schemas']['RelatedInstrumentsPayloadData']
export type ResearcherCreatedResponse = Components['schemas']['ResearcherCreatedResponse']
export type RestRateResponse = Components['schemas']['RestRateResponse']
export type RetentionRunResponse = Components['schemas']['RetentionRunResponse']
export type SystemMetricsResponse = Components['schemas']['SystemMetricsResponse']
export type SystemMetricsHistoryResponse = Components['schemas']['SystemMetricsHistoryResponse']
export type HandoverScopeGrantResponse = Components['schemas']['HandoverScopeGrantResponse']
export type DbStatsResponse = Components['schemas']['DbStatsResponse']
export type LoginData = Components['schemas']['LoginData']
export type RefreshData = Components['schemas']['RefreshData']
export type UserListResponse = Components['schemas']['UserListResponse']
export type UserResponse = Components['schemas']['UserResponse']
export type CreateUserRequest = Components['schemas']['CreateUserRequest']
export type UpdateUserRequest = Components['schemas']['UpdateUserRequest']
export type WsStatsResponse = Components['schemas']['WsStatsResponse']
export type ZmqHealthResponse = Components['schemas']['ZmqHealthResponse']
export type LoginRequest = Components['schemas']['LoginRequest']
export type ResearcherCreateRequest = Components['schemas']['ResearcherCreateRequest']
export type EgressHealthResponse = Components['schemas']['EgressHealthResponse']
export type HealthCheckResponse = Components['schemas']['HealthCheckResponse']
export type AdminAiReviewItem = Components['schemas']['AdminAiReviewItem']
export type AiReviewAftermathReview = Components['schemas']['AiReviewAftermathReview']
export type AiReviewDecisionResponse = Components['schemas']['AiReviewDecisionResponse']
export type AlertEventInfo = Components['schemas']['AlertEventInfo']
export type AvailableProcess = Components['schemas']['AvailableProcess']
export type BacktestResultInline = Components['schemas']['BacktestResultInline']
export type BacktestRunData = Components['schemas']['BacktestRunData']
export type ConfiguredProcess = Components['schemas']['ConfiguredProcess']
export type DelegateCapsBody = Components['schemas']['DelegateCapsBody']
export type ExecutionPlanDecisionData = Components['schemas']['ExecutionPlanDecisionData']
export type PendingReviewSummaryItem = Components['schemas']['PendingReviewSummaryItem']
export type PortfolioReconciliationView = Components['schemas']['PortfolioReconciliationView']
export type ProcessConfigScopeData = Components['schemas']['ProcessConfigScopeData']
export type ProcessRun = Components['schemas']['ProcessRun']
export type ProcessSchemaData = Components['schemas']['ProcessSchemaData']
export type StrategyStatusPayload = Components['schemas']['StrategyStatusPayload']
export type BacktestCreateBody = Components['schemas']['BacktestCreateBody']
export type ProcessCreateBody = Components['schemas']['ProcessCreateBody']
export type ProcessStartBody = Components['schemas']['ProcessStartBody']
export type PairedExecutionIncidentListResponse =
  Components['schemas']['PairedExecutionIncidentListResponse']
export type PnlSeriesData = Components['schemas']['PnlSeriesData']
export type PnlTimelineData = Components['schemas']['PnlTimelineData']
export type RelatedInstrumentsResponse = Components['schemas']['RelatedInstrumentsResponse']
export type LoginResponse = Components['schemas']['LoginResponse']
export type RefreshResponse = Components['schemas']['RefreshResponse']
export type AdminAiReviewListResponse = Components['schemas']['AdminAiReviewListResponse']
export type AiReviewAftermathResponse = Components['schemas']['AiReviewAftermathResponse']
export type AlertEventResponse = Components['schemas']['AlertEventResponse']
export type AlertHistoryResponse = Components['schemas']['AlertHistoryResponse']
export type AvailableProcessesResponse = Components['schemas']['AvailableProcessesResponse']
export type BacktestRunDetailData = Components['schemas']['BacktestRunDetailData']
export type BacktestComparisonDetailResponseData =
  Components['schemas']['BacktestComparisonDetailResponseData']
export type BacktestRunListResponse = Components['schemas']['BacktestRunListResponse']
export type BacktestRunResponse = Components['schemas']['BacktestRunResponse']
export type ConfiguredProcessesResponse = Components['schemas']['ConfiguredProcessesResponse']
export type DelegateRead = Components['schemas']['DelegateRead']
export type DelegateCreateBody = Components['schemas']['DelegateCreateBody']
export type DelegateCapsUpdateBody = Components['schemas']['DelegateCapsUpdateBody']
export type ExecutionPlanDecisionListResponse =
  Components['schemas']['ExecutionPlanDecisionListResponse']
export type PendingReviewListResponse = Components['schemas']['PendingReviewListResponse']
export type PortfolioAccountState = Components['schemas']['PortfolioAccountState']
export type ProcessConfigScopeResponse = Components['schemas']['ProcessConfigScopeResponse']
export type ProcessRunsResponse = Components['schemas']['ProcessRunsResponse']
export type ProcessSchemaResponse = Components['schemas']['ProcessSchemaResponse']
export type SystemStatusData = Components['schemas']['SystemStatusData']
export type BacktestCreateCommand = Components['schemas']['BacktestCreateCommand']
export type ProcessCreateRequest = Components['schemas']['ProcessCreateRequest']
export type ProcessStartRequest = Components['schemas']['ProcessStartRequest']
export type PnlSeriesResponse = Components['schemas']['PnlSeriesResponse']
export type PnlTimelineResponse = Components['schemas']['PnlTimelineResponse']
export type BacktestRunDetailResponse = Components['schemas']['BacktestRunDetailResponse']
export type BacktestComparisonDetailResponse =
  Components['schemas']['BacktestComparisonDetailResponse']
export type DelegateCreatedPayload = Components['schemas']['DelegateCreatedPayload']
export type DelegateListResponse = Components['schemas']['DelegateListResponse']
export type DelegateResponse = Components['schemas']['DelegateResponse']
export type DelegateCreateRequest = Components['schemas']['DelegateCreateRequest']
export type DelegateCapsUpdateRequest = Components['schemas']['DelegateCapsUpdateRequest']
export type PortfolioAccountStateListResponse =
  Components['schemas']['PortfolioAccountStateListResponse']
export type SystemStatusResponse = Components['schemas']['SystemStatusResponse']
export type DelegateCreatedResponse = Components['schemas']['DelegateCreatedResponse']
