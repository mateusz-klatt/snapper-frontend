/**
 * Compat shim — preserves the existing `from '../hooks/queries'`
 * import surface while routing every hook through the per-domain
 * modules under `src/hooks/queries/<domain>.ts`.
 *
 * TODO(v1.5.x): migrate the 37 callsite imports to the per-domain
 * modules and drop this barrel.
 */

export * from './queries/system'
export * from './queries/market'
export * from './queries/orders'
export * from './queries/positions'
export * from './queries/signals'
export * from './queries/wallets'
export * from './queries/scope-grants'
export * from './queries/credentials'
export * from './queries/settings'
export * from './queries/processes'
export * from './queries/strategies'
export * from './queries/users'
export * from './queries/backtests'
export * from './queries/feature-flags'
export * from './queries/ai-delegates'
export * from './queries/ai-reviews'
