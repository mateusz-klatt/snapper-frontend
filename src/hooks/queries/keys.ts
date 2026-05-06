/**
 * Single-source-of-truth React Query key registry.
 *
 * Domain modules under `src/hooks/queries/<domain>.ts` import from
 * here for both query and invalidation keys to avoid drift like the
 * `['pending-ai-reviews']` invalidation that historically did not
 * match the `['ai-reviews', 'pending', ...]` query key.
 */

export const queryKeys = {
  systemStatus: ['system', 'status'] as const,
  processStatus: ['process', 'status'] as const,
  availableProcesses: ['processes', 'available'] as const,
  configuredProcesses: (asOf: string | null) => ['processes', 'configured', asOf] as const,
  processSummary: (asOf: string | null) => ['processes', 'summary', asOf] as const,
  strategies: (asOf: string | null) => ['strategies', asOf] as const,
  processSchema: (name: string) => ['processes', 'schema', name] as const,
  processRuns: (name?: string, limit?: number, asOf?: string | null) =>
    ['processes', 'runs', name ?? 'all', limit ?? 50, asOf] as const,
  candles: (
    instrument: string,
    exchange: string,
    timeframe: string,
    limit: number,
    asOf: string | null
  ) => ['candles', instrument, exchange, timeframe, limit, asOf] as const,
  exchanges: (asOf: string | null) => ['exchanges', asOf] as const,
  exchangeInstruments: (exchange: string, asOf: string | null) =>
    ['exchanges', exchange, 'instruments', asOf] as const,
  exchangeInstrumentsDetail: (exchange: string, asOf: string | null) =>
    ['exchanges', exchange, 'instruments', 'detail', asOf] as const,
  orders: (
    filters?: { symbol?: string; limit?: number; offset?: number },
    asOf?: string | null,
    opId?: string | null,
    walletId?: string | null
  ) => ['orders', filters, asOf, opId, walletId] as const,
  executions: (
    filters?: { limit?: number },
    asOf?: string | null,
    opId?: string | null,
    walletId?: string | null
  ) => ['executions', filters, asOf, opId, walletId] as const,
  positions: (asOf: string | null, opId?: string | null, walletId?: string | null) =>
    ['positions', asOf, opId, walletId] as const,
  signals: (
    strategyId?: string,
    limit?: number,
    instrument?: string,
    hours?: number,
    asOf?: string | null,
    opId?: string | null,
    walletId?: string | null
  ) => ['signals', strategyId, limit, instrument, hours, asOf, opId, walletId] as const,
  operators: (asOf: string | null) => ['operators', asOf] as const,
  wallets: (asOf: string | null, opId?: string | null) => ['wallets', asOf, opId] as const,
  scopeGrants: (walletPublicId: string, asOf: string | null) =>
    ['scope-grants', walletPublicId, asOf] as const,
  credentials: (walletPublicId: string, asOf: string | null) =>
    ['credentials', walletPublicId, asOf] as const,
  settings: (category?: string, asOf?: string | null) => ['settings', category, asOf] as const,
  settingCategories: (asOf: string | null) => ['settings', 'categories', asOf] as const,
  users: (includeInactive: boolean, asOf: string | null) =>
    ['users', includeInactive, asOf] as const,
  featureFlags: () => ['feature-flags'] as const,
  aiDelegates: () => ['ai-delegates'] as const,
  aiDelegate: (publicId: string) => ['ai-delegates', publicId] as const,
  pendingAiReviews: (
    userPublicId: string | null,
    walletPublicId: string | null,
    limit: number | null
  ) => ['ai-reviews', 'pending', userPublicId, walletPublicId, limit] as const,
  /**
   * Prefix-only key used by mutations to invalidate every variant of
   * the pendingAiReviews query (any user/wallet/limit combination).
   *
   * The previous invalidation literal `['pending-ai-reviews']` never
   * matched because the actual query key starts with `['ai-reviews',
   * 'pending', ...]`. Fixing the prefix means `useSubmitAiReviewDecision`
   * now actually drops the resolved row from the inbox before the
   * 5-second refetch.
   */
  pendingAiReviewsAll: ['ai-reviews', 'pending'] as const,
}
