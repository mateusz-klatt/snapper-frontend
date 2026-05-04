/**
 * Schema-compliant response envelopes for E2E.
 *
 * The frontend uses strict (`.strict()`) Zod schemas — extra fields or
 * missing required fields cause `validateResponse` to throw and the
 * UI silently shows the empty state. Every shape below mirrors its
 * backing schema in `src/lib/schemas/api.generated.zod.ts` exactly.
 *
 * Slim copy of `src/test/factories.ts` because `e2e/` lives outside
 * the vite/vitest include — importing across roots would mean a
 * second resolver. The DRY violation is small (these shapes change
 * rarely) and isolated (no production code reads from here).
 */

const BASE_PROVENANCE = {
  sequence_id: 0,
  public_id: 'e2e-pid',
  timestamp: '2026-01-01T00:00:00Z',
  session_id: 'e2e-sid',
}

export function envelope<T>(type: string, body: T): { type: string } & typeof BASE_PROVENANCE & T {
  return { type, ...BASE_PROVENANCE, ...body }
}

/**
 * Wrap a list response. The `_` parameter passes the type literal
 * verbatim (e.g. `order_list`, `operator_list_response`) — different
 * schemas use different conventions and the caller has the schema in
 * hand.
 */
export function listEnvelope<T>(type: string, payload: readonly T[]) {
  return envelope(type, { payload, count: payload.length })
}

export const TEST_USER = {
  type: 'user_profile',
  ...BASE_PROVENANCE,
  public_id: 'usr-e2e',
  username: 'e2e-user',
  role: 'admin' as const,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const TEST_OPERATOR = {
  type: 'operator_info',
  ...BASE_PROVENANCE,
  public_id: 'op-e2e',
  label: 'E2E Operator',
}

export const TEST_WALLET = {
  type: 'wallet_info',
  ...BASE_PROVENANCE,
  public_id: 'wal-e2e',
  label: 'E2E Wallet',
  is_paper: true,
}

export const TEST_INSTRUMENT_DETAIL = {
  type: 'instrument_detail',
  ...BASE_PROVENANCE,
  public_id: 'inst-e2e',
  instrument_public_id: 'inst-e2e',
  symbol_public_id: 'sym-e2e',
  symbol: 'BTC-USD',
  exchange: 'kraken',
  can_trade: true,
  can_market_data: true,
  instrument_resolved: true,
  instrument_kind: 'spot',
  expiry_at: null,
}

export function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    type: 'order',
    ...BASE_PROVENANCE,
    public_id: 'ord-e2e-1',
    client_order_id: 'cli-e2e-1',
    instrument: 'BTC-USD',
    exchange: 'kraken' as const,
    mode: 'paper' as const,
    side: 'buy' as const,
    status: 'new',
    order_type: 'market' as const,
    size: 0.5,
    filled_size: 0,
    created_at: '2026-01-01T00:00:00Z',
    reduce_only: false,
    wallet_public_id: 'wal-e2e',
    ...overrides,
  }
}

export function makeCandle(overrides: Record<string, unknown> = {}) {
  return {
    type: 'candle',
    ...BASE_PROVENANCE,
    instrument: 'BTC-USD',
    exchange: 'kraken' as const,
    timeframe: '1m',
    open_at: '2026-01-01T00:00:00Z',
    open: 50_000,
    high: 50_500,
    low: 49_500,
    close: 50_250,
    volume: 1.5,
    ...overrides,
  }
}

export function makeExecutionPlanResponse(overrides: Record<string, unknown> = {}) {
  return {
    type: 'execution_plan_response',
    ...BASE_PROVENANCE,
    payload: {
      type: 'execution_plan',
      ...BASE_PROVENANCE,
      public_id: 'plan-e2e',
      plan_type: 'order',
      status: 'armed',
      instrument_public_id: 'inst-e2e',
      exchange: 'kraken' as const,
      mode: 'paper' as const,
      side: 'buy' as const,
      total_quantity: 0.5,
      filled_quantity: 0,
      created_at: '2026-01-01T00:00:00Z',
      created_via: 'api',
      wallet_public_id: 'wal-e2e',
      operator_public_id: null,
      params: {},
      position_cycle_public_id: null,
      parent_plan_public_id: null,
      last_error: null,
      idempotency_key: null,
      ...overrides,
    },
  }
}
