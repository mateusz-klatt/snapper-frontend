/**
 * Generated Zod schemas for WebSocket message validation.
 * DO NOT EDIT - regenerate with: make ui-gen-zod
 */

import { z } from 'zod/v4'

import * as sharedSchemas from './shared.generated.zod'

export const JsonPrimitiveSchema = sharedSchemas.JsonPrimitiveSchema

export const CandleDataSchema = sharedSchemas.CandleDataSchema

export const ContinuousCandleDataSchema = sharedSchemas.ContinuousCandleDataSchema

export const ContractDataSchema = sharedSchemas.ContractDataSchema

export const EgressActiveReservationSnapshotSchema =
  sharedSchemas.EgressActiveReservationSnapshotSchema

export const EgressConnectionSnapshotSchema = sharedSchemas.EgressConnectionSnapshotSchema

export const EgressTransferSnapshotSchema = sharedSchemas.EgressTransferSnapshotSchema

export const ExecutionDataSchema = sharedSchemas.ExecutionDataSchema

export const ExecutionPlanDataSchema = sharedSchemas.ExecutionPlanDataSchema

export const FrontMonthDataSchema = sharedSchemas.FrontMonthDataSchema

export const InstrumentCapabilityDataSchema = sharedSchemas.InstrumentCapabilityDataSchema

export const InstrumentDetailDataSchema = sharedSchemas.InstrumentDetailDataSchema

export const OrderDataSchema = sharedSchemas.OrderDataSchema

export const PositionDisplayFieldsSchema = sharedSchemas.PositionDisplayFieldsSchema

export const ProcessSummaryItemSchema = sharedSchemas.ProcessSummaryItemSchema

export const RelatedInstrumentDataSchema = sharedSchemas.RelatedInstrumentDataSchema

export const SignalDataSchema = sharedSchemas.SignalDataSchema

export const UnderlyingAssetDataSchema = sharedSchemas.UnderlyingAssetDataSchema

export const UnderlyingInstrumentDataSchema = sharedSchemas.UnderlyingInstrumentDataSchema

export const VenueFeeScheduleDataSchema = sharedSchemas.VenueFeeScheduleDataSchema

export const UserRoleSchema = sharedSchemas.UserRoleSchema

export const JsonValueSchema = sharedSchemas.JsonValueSchema

export const EgressRouteStatusSnapshotSchema = sharedSchemas.EgressRouteStatusSnapshotSchema

export const PositionDataSchema = sharedSchemas.PositionDataSchema

export const JsonObjectSchema = sharedSchemas.JsonObjectSchema

export const ExecutionPlanDecisionDataSchema = sharedSchemas.ExecutionPlanDecisionDataSchema

export const WsMessageBaseSchema = z
  .object({
    type: z.string(),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
  })
  .strict()

export const AccountStateChangedEventDataSchema = z
  .object({
    type: z.literal('account_state_changed_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    mode: z.enum(['live', 'paper']),
    kind: z.enum(['snapshot', 'reconciliation']),
  })
  .strict()

export const AiResearchRequestFrameDataSchema = z
  .object({
    type: z.literal('ai_research.request'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    round_public_id: z.string(),
    trigger: z.string(),
  })
  .strict()

export const AiReviewCapsViolationFrameDataSchema = z
  .object({
    type: z.literal('ai_review.caps_violation'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    review_public_id: z.string(),
    user_public_id: z.string(),
    strategy_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    cap_type: z.string(),
    attempted: z.number(),
    limit: z.number(),
    dispatch_version: z.number().int(),
  })
  .strict()

export const AiReviewDecisionAckFrameDataSchema = z
  .object({
    type: z.literal('ai_review.decision_ack'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    review_public_id: z.string(),
    user_public_id: z.string(),
    strategy_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    responding_delegate_public_id: z.string(),
    decision: z.string(),
    new_status: z.string(),
    resolution_mode: z.string(),
    rationale: z.string().nullable(),
    dispatch_version: z.number().int(),
  })
  .strict()

export const AiReviewDecisionDataSchema = z
  .object({
    type: z.literal('ai_review_decision'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    review_public_id: z.string(),
    responding_delegate_public_id: z.string(),
    decision: z.string(),
    new_status: z.string(),
    resolution_mode: z.string(),
    dispatch_version: z.number().int(),
  })
  .strict()

export const BacktestProgressDataSchema = z
  .object({
    type: z.literal('backtest_progress'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    run_public_id: z.string(),
    wallet_public_id: z.string(),
    event: z.enum(['started', 'progress', 'milestone', 'completed', 'failed', 'cancelled']),
    milestone: z.enum(['25pct', '50pct', '75pct']).nullable().optional(),
    candles_done: z.number().int(),
    total_candles: z.number().int().nullable(),
    signals_count: z.number().int(),
    trades_count: z.number().int(),
    equity: z.number(),
    progress_pct: z.number(),
  })
  .strict()

export const CapsViolationAfterAiApproveDataSchema = z
  .object({
    type: z.literal('caps_violation_after_ai_approve'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    review_public_id: z.string(),
    user_public_id: z.string(),
    strategy_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    cap_type: z.string(),
    attempted: z.number(),
    limit: z.number(),
    dispatch_version: z.number().int(),
  })
  .strict()

export const DelegateOfflineDataSchema = z
  .object({
    type: z.literal('delegate_offline'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    delegate_public_id: z.string(),
    last_seen_at: z.iso.datetime(),
  })
  .strict()

export const EgressTransferInterfaceSnapshotSchema =
  sharedSchemas.EgressTransferSnapshotSchema.omit({
    sample_age_seconds: true,
    stale: true,
  }).strict()

export const ExecutionPlanDecisionEventDataSchema = z
  .object({
    type: z.literal('execution_plan_decision_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    decision_public_id: z.string(),
    plan_public_id: z.string(),
    decision_type: z.string(),
    trigger_type: z.string(),
    reason: z.string(),
    triggered_at: z.iso.datetime(),
  })
  .strict()

export const FundingAccrualDataSchema = z
  .object({
    type: z.literal('funding_accrual'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    mode: z.enum(['live', 'paper']),
    accrual_type: z.enum(['funding', 'rollover', 'borrow']),
    accrued_at: z.iso.datetime(),
    amount: z.number(),
    amount_asset: z.string(),
    rate: z.number(),
    notional: z.number(),
    position_quantity: z.number(),
  })
  .strict()

export const OrderCancelDataSchema = z
  .object({
    type: z.literal('order_cancel'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    instrument: z.string(),
    exchange_order_id: z.string(),
    client_order_id: z.string(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
  })
  .strict()

export const OrderEventDataSchema = z
  .object({
    type: z.literal('order_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchange_order_id: z.string(),
    client_order_id: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    instrument: z.string(),
    event: z.enum([
      'submitted',
      'accepted',
      'rejected',
      'cancelled',
      'expired',
      'replaced',
      'unknown',
    ]),
    reason: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
    paired_group_id: z.string().nullable().optional(),
    paired_group_size: z.number().int().nullable().optional(),
    paired_group_index: z.number().int().nullable().optional(),
    paired_group_policy: z.enum(['simultaneous', 'sequential_handoff']).nullable().optional(),
  })
  .strict()

export const OrderReplaceDataSchema = z
  .object({
    type: z.literal('order_replace'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    instrument: z.string(),
    exchange_order_id: z.string(),
    client_order_id: z.string(),
    new_quantity: z.number().nullable().optional(),
    new_price: z.number().nullable().optional(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
  })
  .strict()

export const OrderRequestDataSchema = z
  .object({
    type: z.literal('order_request'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    strategy_id: z.string(),
    exchange: z.enum(['paper', 'kraken', 'kraken_futures', 'walutomat']),
    instrument: z.string(),
    mode: z.enum(['live', 'paper']),
    side: z.enum(['buy', 'sell']),
    order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
    quantity: z.number(),
    price: z.number().nullable().optional(),
    stop_price: z.number().nullable().optional(),
    client_order_id: z.string(),
    signaled_at: z.iso.datetime().nullable().optional(),
    strategy_tag: z.string().nullable().optional(),
    leverage: z.number().int().nullable().optional(),
    reduce_only: z.boolean(),
    post_only: z.boolean(),
    wallet_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    user_public_id: z.string().nullable().optional(),
    paired_group_id: z.string().nullable().optional(),
    paired_group_size: z.number().int().nullable().optional(),
    paired_group_index: z.number().int().nullable().optional(),
    paired_group_policy: z.enum(['simultaneous', 'sequential_handoff']).nullable().optional(),
    origin: z.enum(['live', 'replay']),
    replay_window_start: z.iso.datetime().nullable().optional(),
    replay_window_end: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const PortfolioDriftEpisodeEventDataSchema = z
  .object({
    type: z.literal('portfolio_drift_episode_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    wallet_public_id: z.string(),
    exchange: z.string(),
    mode: z.literal('live'),
    episode_public_id: z.string(),
    lifecycle: z.enum(['opened', 'resolved']),
    opened_at: z.iso.datetime(),
    closed_at: z.iso.datetime().nullable().optional(),
    mismatch_count: z.number().int(),
    resolution_reason: z.literal('matched').nullable().optional(),
  })
  .strict()

export const ProcessCommandAckDataSchema = z
  .object({
    type: z.literal('process_command_ack'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    command_id: z.string(),
    coordinator: z.string(),
    process_name: z.string(),
    status: z.string(),
    detail: z.string().nullable().optional(),
    signature: z.string(),
  })
  .strict()

export const ProcessCommandDataSchema = z
  .object({
    type: z.literal('process_command'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    command_id: z.string(),
    coordinator: z.string(),
    process_name: z.string(),
    action: z.string(),
    issued_by: z.string(),
    issued_at: z.iso.datetime(),
    signature: z.string(),
  })
  .strict()

export const ProcessConfiguredEventDataSchema = z
  .object({
    type: z.literal('process_configured_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    process_names: z.array(z.string()),
    snapshot_at: z.iso.datetime(),
  })
  .strict()

export const ProcessRunEventDataSchema = z
  .object({
    type: z.literal('process_run_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    process_name: z.string(),
    run_id: z.string(),
    status: z.string(),
    started_at: z.iso.datetime(),
    completed_at: z.iso.datetime().nullable().optional(),
    exit_code: z.number().int().nullable().optional(),
  })
  .strict()

export const ReplayEndDataSchema = z
  .object({
    type: z.literal('replay_end'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
  })
  .strict()

export const ReplayStartDataSchema = z
  .object({
    type: z.literal('replay_start'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    started_at: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const ScopeGrantedDataSchema = z
  .object({
    type: z.literal('scope_granted'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    grant_public_id: z.string(),
    operator_public_id: z.string(),
    wallet_public_id: z.string(),
    scope_kind: z.enum(['underlying', 'instrument']),
    underlying_public_id: z.string().nullable().optional(),
    instrument_public_id: z.string().nullable().optional(),
    granted_at: z.iso.datetime(),
    granted_by_user_public_id: z.string(),
    reason: z.string().nullable().optional(),
  })
  .strict()

export const ScopeHandedOverDataSchema = z
  .object({
    type: z.literal('scope_handed_over'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    grant_public_id: z.string(),
    from_operator_public_id: z.string(),
    to_operator_public_id: z.string(),
    wallet_public_id: z.string(),
    scope_kind: z.enum(['underlying', 'instrument']),
    underlying_public_id: z.string().nullable().optional(),
    instrument_public_id: z.string().nullable().optional(),
    handover_at: z.iso.datetime(),
    handover_by_user_public_id: z.string(),
    reason: z.string().nullable().optional(),
  })
  .strict()

export const ScopeRevokedDataSchema = z
  .object({
    type: z.literal('scope_revoked'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    grant_public_id: z.string(),
    operator_public_id: z.string(),
    wallet_public_id: z.string(),
    scope_kind: z.enum(['underlying', 'instrument']),
    underlying_public_id: z.string().nullable().optional(),
    instrument_public_id: z.string().nullable().optional(),
    revoked_at: z.iso.datetime(),
    revoked_by_user_public_id: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
  })
  .strict()

export const SettingChangedDataSchema = z
  .object({
    type: z.literal('setting_changed'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    key: z.string(),
    value: z.string(),
    category: z.string(),
    updated_by: z.string().nullable().optional(),
  })
  .strict()

export const StrategyListEventDataSchema = z
  .object({
    type: z.literal('strategy_list_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    strategy_classes: z.array(z.string()),
    snapshot_at: z.iso.datetime(),
  })
  .strict()

export const SymbolAliasUpdateDataSchema = z
  .object({
    type: z.literal('symbol_alias_update'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    event: z.literal('symbol_aliases_updated'),
    action: z.literal('clear_cache'),
  })
  .strict()

export const TickDataSchema = z
  .object({
    type: z.literal('tick'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    exchange: z.enum(['kraken', 'kraken_futures', 'kraken_equities', 'walutomat', 'polygon']),
    volume: z.number(),
    bid: z.number().nullable().optional(),
    ask: z.number().nullable().optional(),
    last: z.number().nullable().optional(),
    is_delayed: z.boolean(),
    is_extended_hours: z.boolean().nullable().optional(),
    origin: z.enum(['live', 'replay']),
    replay_window_start: z.iso.datetime().nullable().optional(),
    replay_window_end: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const TradeDataSchema = z
  .object({
    type: z.literal('trade'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    instrument: z.string(),
    exchange: z.enum(['kraken', 'kraken_futures', 'kraken_equities', 'walutomat', 'polygon']),
    executed_at: z.iso.datetime().nullable().optional(),
    price: z.number(),
    volume: z.number(),
    side: z.string().nullable().optional(),
    trade_id: z.string().nullable().optional(),
    origin: z.enum(['live', 'replay']),
    replay_window_start: z.iso.datetime().nullable().optional(),
    replay_window_end: z.iso.datetime().nullable().optional(),
  })
  .strict()

export const UserDeactivatedDataSchema = z
  .object({
    type: z.literal('user_deactivated'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    deactivated_at: z.iso.datetime(),
    reason: z.string().nullable().optional(),
  })
  .strict()

export const WSAuthExpiredResponseSchema = z
  .object({
    type: z.literal('auth_expired'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
  })
  .strict()

export const WSAuthFailedResponseSchema = z
  .object({
    type: z.literal('auth_failed'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
  })
  .strict()

export const WSAuthOkResponseSchema = z
  .object({
    type: z.literal('auth_ok'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exp: z.iso.datetime(),
  })
  .strict()

export const WSAuthRequiredResponseSchema = z
  .object({
    type: z.literal('auth_required'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    timeout: z.number().int(),
  })
  .strict()

export const WSAuthenticateRequestSchema = z
  .object({
    type: z.literal('authenticate'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    ws_token: z.string(),
  })
  .strict()

export const WSErrorResponseSchema = z
  .object({
    type: z.literal('error'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    message: z.string(),
  })
  .strict()

export const WSGetSubscriptionsRequestSchema = z
  .object({
    type: z.literal('get_subscriptions'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
  })
  .strict()

export const WSPingRequestSchema = z
  .object({
    type: z.literal('ping'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
  })
  .strict()

export const WSPongResponseSchema = z
  .object({
    type: z.literal('pong'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    active_connections: z.number().int(),
  })
  .strict()

export const WSReauthOkResponseSchema = z
  .object({
    type: z.literal('reauth_ok'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    exp: z.iso.datetime(),
  })
  .strict()

export const WSReauthRequestSchema = z
  .object({
    type: z.literal('reauth'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    ws_token: z.string(),
  })
  .strict()

export const WSReauthRequiredResponseSchema = z
  .object({
    type: z.literal('reauth_required'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    deadline: z.iso.datetime(),
  })
  .strict()

export const WSSubscribeRequestSchema = z
  .object({
    type: z.literal('subscribe'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    topics: z.array(z.string()),
  })
  .strict()

export const WSSubscriptionSuccessResponseSchema = z
  .object({
    type: z.literal('subscription_success'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    action: z.enum(['subscribe', 'unsubscribe']),
    status: z.enum(['subscribed', 'unsubscribed', 'partial', 'denied', 'no_topics']),
    topics: z.array(z.string()),
    denied_topics: z.array(z.string()),
    active_subscriptions: z.array(z.string()),
    message: z.string().nullable().optional(),
  })
  .strict()

export const WSSubscriptionsListResponseSchema = z
  .object({
    type: z.literal('subscriptions_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    subscriptions: z.array(z.string()),
    available_topics: z.array(z.string()),
    total_available: z.number().int(),
  })
  .strict()

export const WSUnsubscribeRequestSchema = z
  .object({
    type: z.literal('unsubscribe'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    topics: z.array(z.string()),
  })
  .strict()

export const EgressTransferEventDataSchema = z
  .object({
    type: z.literal('egress_transfer_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    interfaces: z.array(EgressTransferInterfaceSnapshotSchema).optional(),
  })
  .strict()

export const ProcessSummaryEventDataSchema = z
  .object({
    type: z.literal('process_summary_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    coordinator: z.string(),
    coordinator_label: z.string().nullable().optional(),
    processes: z.array(ProcessSummaryItemSchema),
    snapshot_at: z.iso.datetime(),
  })
  .strict()

export const WSAuthCompleteResponseSchema = z
  .object({
    type: z.literal('auth_complete'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    available_topics: z.array(z.string()),
    user_role: UserRoleSchema,
    session_expires_at: z.iso.datetime().nullable().optional(),
    ws_token_exp: z.iso.datetime(),
  })
  .strict()

export const EgressPoolStatusSnapshotSchema = z
  .object({
    enabled: z.boolean(),
    on_all_quarantined: z.enum(['wait', 'raise']).nullable().optional(),
    private_fallback_route_id: z.string().nullable().optional(),
    private_on_fallback: z.boolean(),
    routes: z.array(EgressRouteStatusSnapshotSchema).optional(),
  })
  .strict()

export const AiReviewRequestFrameDataSchema = z
  .object({
    type: z.literal('ai_review.request'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    review_public_id: z.string(),
    user_public_id: z.string(),
    strategy_public_id: z.string(),
    wallet_public_id: z.string(),
    instrument_public_id: z.string(),
    selected_delegate_public_id: z.string(),
    deadline: z.iso.datetime(),
    signal_envelope: z.record(z.string(), z.any()),
    instrument_metadata: z.record(z.string(), z.any()),
    dispatch_version: z.number().int(),
  })
  .strict()

export const AlertEventDataSchema = z
  .object({
    type: z.literal('alert_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    user_public_id: z.string(),
    operator_public_id: z.string().nullable().optional(),
    wallet_public_id: z.string().nullable().optional(),
    alert_type: z.enum([
      'order_fill_full',
      'order_rejected',
      'order_unknown',
      'position_stop_loss_fired',
      'margin_warning',
      'critical_system_error',
      'drift',
    ]),
    priority: z.enum(['low', 'medium', 'high']),
    is_safety_critical: z.boolean(),
    title: z.string().min(1).max(160),
    body: z.string().min(1).max(512),
    payload: z.record(z.string(), z.any()).nullable().optional(),
    dedup_key: z.string().max(128).nullable().optional(),
    thread_key: z.string().max(64).nullable().optional(),
    source_topic: z.string().nullable().optional(),
  })
  .strict()

export const HeartbeatDataSchema = z
  .object({
    type: z.literal('heartbeat'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    component: z.string(),
    sequence: z.number().int(),
    status: z.enum(['healthy', 'warning', 'error']),
    lag_ms: z.number().int(),
    market_closed: z.boolean(),
    next_open: z.iso.datetime().nullable().optional(),
    meta: z.record(z.string(), z.any()),
  })
  .strict()

export const EgressPoolSnapshotEventDataSchema = z
  .object({
    type: z.literal('egress_pool_snapshot_event'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    container: z.string(),
    snapshot: EgressPoolStatusSnapshotSchema,
  })
  .strict()
