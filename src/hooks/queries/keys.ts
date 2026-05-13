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
  systemMetrics: ['system', 'metrics'] as const,
  systemDbStats: ['system', 'db-stats'] as const,
  systemNotificationMetrics: ['system', 'notification-metrics'] as const,
  systemRetention: ['system', 'retention'] as const,
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
  relatedInstruments: (exchange: string, nativeSymbol: string, asOf: string | null) =>
    ['market', 'related', exchange, nativeSymbol, asOf] as const,
  cachedCandles: (exchange: string, nativeSymbol: string, timeframe: string, limit: number) =>
    ['market', 'cache', 'candles', exchange, nativeSymbol, timeframe, limit] as const,
  cachedPairStats: (exchangeA: string, symbolA: string, exchangeB: string, symbolB: string) =>
    ['market', 'cache', 'stats', exchangeA, symbolA, exchangeB, symbolB] as const,
  cacheHealth: () => ['market', 'cache', 'health'] as const,
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

  ordersAll: ['orders'] as const,
  positionsAll: ['positions'] as const,
  usersAll: ['users'] as const,
  settingsAll: ['settings'] as const,
  scopeGrantsAll: ['scope-grants'] as const,
  scopeGrantsForWallet: (walletPublicId: string) => ['scope-grants', walletPublicId] as const,
  credentialsForWallet: (walletPublicId: string) => ['credentials', walletPublicId] as const,
  trailingStopAll: ['trailingStopState'] as const,
  trailingStopForCycle: (cyclePublicId: string | undefined) =>
    ['trailingStopState', cyclePublicId] as const,
  backtestsAll: ['backtests'] as const,
  backtestsByStrategyStatus: (strategy?: string, status?: string) =>
    ['backtests', strategy, status] as const,
  backtestsByConfigHash: (configHash: string | null, limit: number) =>
    ['backtests', 'by-hash', configHash, limit] as const,
  backtest: (runId: string | undefined) => ['backtests', runId] as const,
  backtestTrades: (runId: string | undefined) => ['backtests', runId, 'trades'] as const,
  backtestSignals: (runId: string | undefined) => ['backtests', runId, 'signals'] as const,
  backtestCompare: (walletId: string | null, comparisonId: string | undefined) =>
    ['backtest-compare', walletId, comparisonId] as const,
  backtestCompareList: (walletId: string | null, limit: number, offset: number) =>
    ['backtest-compare', 'list', walletId, limit, offset] as const,
  backtestCompareListForWallet: (walletId: string | null) =>
    ['backtest-compare', 'list', walletId] as const,
  processStatusAll: ['process', 'status'] as const,
  processRuntimeForName: (name: string) => ['process', 'runtime', name] as const,
  configuredProcessesAll: ['processes', 'configured'] as const,
  processSummaryAll: ['processes', 'summary'] as const,
  strategiesAll: ['strategies'] as const,
  processRunsAll: ['processes', 'runs'] as const,
}
