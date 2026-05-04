import type { Page, Route } from '@playwright/test'
import {
  TEST_USER,
  TEST_WALLET,
  TEST_OPERATOR,
  TEST_INSTRUMENT_DETAIL,
  envelope,
  listEnvelope,
} from './envelopes'

type RouteOverride = (route: Route) => Promise<void> | void

/**
 * Default REST mock layer.
 *
 * - Registers handlers for every endpoint the authenticated UI hits on
 *   common routes (auth bootstrap, market data, orders, settings,
 *   admin, ai-reviews).
 * - Each handler returns a sane minimum response so the UI doesn't
 *   crash; tests override per-call via `overrides` map keyed by glob
 *   URL patterns (Playwright glob, e.g. `**\/api/orders*`).
 * - Anything not mocked → 404 with `{ detail: 'unmocked: <url>' }` so a
 *   forgotten endpoint shows up as a visible failure rather than a
 *   silent network hang.
 *
 * Override keys are glob patterns only — for regex-based routing,
 * register directly via `page.route(/regex/, handler)` after `mockApi`.
 */
export interface ApiOverrides {
  [globPattern: string]: RouteOverride
}

const BASE_URL = 'http://localhost:4173'

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function refreshOk(route: Route) {
  // Type literal `refresh_response` matches RefreshResponseSchema in
  // src/lib/schemas/api.generated.zod.ts. The endpoint isn't currently
  // wrapped in validateResponse (auth-store calls postJSON directly)
  // but that may change — keep the mock contract aligned with the
  // generated schema so the E2E layer doesn't drift.
  return json(route, {
    type: 'refresh_response',
    sequence_id: 0,
    public_id: 'auth-pid',
    timestamp: '2026-01-01T00:00:00Z',
    session_id: 'e2e-sid',
    payload: {
      message: 'ok',
      csrf_token: 'e2e-csrf',
      ws_token: 'e2e-ws-token',
      ws_token_exp: '2099-01-01T00:00:00Z',
      user: TEST_USER,
    },
  })
}

/**
 * Type literals MUST match the strict Zod schemas in
 * `src/lib/schemas/api.generated.zod.ts`. The frontend's
 * `validateResponse` calls `safeParse` and throws on mismatch — a wrong
 * `type` literal silently leaves the consumer with empty data.
 *
 * Every `_response` / `_list` literal below was cross-checked against
 * the schema file when the fixture was authored.
 */
const DEFAULTS: Array<[string | RegExp, RouteOverride]> = [
  ['**/api/auth/refresh', refreshOk],
  ['**/api/auth/me', route => json(route, envelope('user_response', { payload: TEST_USER }))],
  [
    '**/api/auth/logout',
    // OpenAPI spec returns MessageResponse — `{type: "message", payload: string}`.
    route => json(route, envelope('message', { payload: 'logged out' })),
  ],
  [
    '**/api/health',
    route => json(route, envelope('health_check_response', { payload: { status: 'ok' } })),
  ],
  [
    '**/api/status',
    route =>
      json(
        route,
        envelope('system_status_response', {
          payload: { type: 'system_status', status: 'ok', uptime_seconds: 0, version: 'e2e' },
        })
      ),
  ],
  [
    '**/api/metrics/system',
    route =>
      json(
        route,
        envelope('system_metrics_response', { payload: { cpu_percent: 0, memory_mb: 0 } })
      ),
  ],
  [
    '**/api/metrics/db/tables',
    route => json(route, envelope('db_stats_response', { payload: { tables: [] } })),
  ],
  [
    '**/api/metrics/notifications',
    route => json(route, envelope('notification_metrics_response', { payload: { sent: 0 } })),
  ],
  [
    '**/api/metrics/retention',
    route => json(route, envelope('retention_run_response', { payload: { last_run: null } })),
  ],
  [
    '**/api/feature-flags',
    route =>
      json(
        route,
        envelope('feature_flags_response', {
          payload: { ai_integration_enabled: false },
        })
      ),
  ],
  [
    '**/api/operators*',
    route => json(route, listEnvelope('operator_list_response', [TEST_OPERATOR])),
  ],
  ['**/api/wallets*', route => json(route, listEnvelope('wallet_list_response', [TEST_WALLET]))],
  [
    '**/api/exchanges',
    route =>
      json(
        route,
        envelope('exchange_list', {
          payload: ['kraken', 'kraken_futures', 'walutomat'] satisfies string[],
          count: 3,
        })
      ),
  ],
  [
    /\/api\/exchanges\/[^/]+\/instruments\/detail/,
    route => json(route, listEnvelope('instrument_detail_list', [TEST_INSTRUMENT_DETAIL])),
  ],
  [
    /\/api\/exchanges\/[^/]+\/instruments(?!\/detail)/,
    route =>
      json(
        route,
        envelope('instrument_list', { payload: [TEST_INSTRUMENT_DETAIL.symbol], count: 1 })
      ),
  ],
  ['**/api/orders*', route => json(route, listEnvelope('order_list', []))],
  ['**/api/executions*', route => json(route, listEnvelope('execution_list', []))],
  ['**/api/positions*', route => json(route, listEnvelope('position_list', []))],
  ['**/api/signals*', route => json(route, listEnvelope('signal_list', []))],
  ['**/api/strategies*', route => json(route, listEnvelope('strategy_list', []))],
  [
    '**/api/candles*',
    route =>
      json(route, {
        type: 'candle_list',
        sequence_id: 0,
        public_id: 'e2e-pid',
        timestamp: '2026-01-01T00:00:00Z',
        session_id: 'e2e-sid',
        payload: [],
        count: 0,
      }),
  ],
  ['**/api/processes/configured*', route => json(route, listEnvelope('configured_processes', []))],
  [
    '**/api/processes/summary*',
    route =>
      json(
        route,
        envelope('process_summary_response', {
          payload: envelope('process_summary', {
            feeds: { running: 0, total: 0 },
            strategies: { running: 0, total: 0 },
            executors: { running: 0, total: 0 },
            brokers: { running: 0, total: 0 },
          }),
        })
      ),
  ],
  ['**/api/processes/available*', route => json(route, listEnvelope('available_processes', []))],
  ['**/api/processes/runs*', route => json(route, listEnvelope('process_runs', []))],
  [
    '**/api/settings/categories*',
    route => json(route, listEnvelope('setting_categories', [] as string[])),
  ],
  ['**/api/settings*', route => json(route, listEnvelope('setting_list', []))],
  ['**/api/auth/users*', route => json(route, listEnvelope('user_list', [TEST_USER]))],
  ['**/api/scope-grants*', route => json(route, listEnvelope('scope_grant_list_response', []))],
  ['**/api/credentials*', route => json(route, listEnvelope('credential_list_response', []))],
  [
    /\/api\/wallets\/[^/]+\/credentials/,
    route => json(route, listEnvelope('credential_list_response', [])),
  ],
  ['**/api/ai-delegates*', route => json(route, listEnvelope('delegate_list', []))],
  [
    '**/api/ai-reviews/pending*',
    route => json(route, listEnvelope('pending_review_list_response', [])),
  ],
  ['**/api/backtests*', route => json(route, listEnvelope('backtest_run_list', []))],
  ['**/api/backtest-compare*', route => json(route, listEnvelope('backtest_comparison_list', []))],
]

/**
 * Register the default mock handlers + apply overrides. Override keys
 * are URL patterns ('**\/api/orders' or regex). Use `mockApi(page,
 * { '**\/api/orders': ... })` to inject test-specific responses.
 *
 * Playwright matches routes in reverse-registration order (most recent
 * first), so the registration order below is INTENTIONAL:
 *   1. Catch-all 404 — registered first, matched last.
 *   2. DEFAULTS — registered second, matched after overrides.
 *   3. Overrides — registered last, matched first (most specific).
 *
 * Reordering will silently break the mock layer.
 */
export async function mockApi(page: Page, overrides: ApiOverrides = {}): Promise<void> {
  await page.route('**/api/**', route => {
    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: `unmocked: ${route.request().method()} ${route.request().url()}`,
      }),
    })
  })

  for (const [pattern, handler] of DEFAULTS) {
    await page.route(pattern, handler)
  }

  for (const [pattern, handler] of Object.entries(overrides)) {
    await page.route(pattern, handler)
  }
}

export { BASE_URL }
