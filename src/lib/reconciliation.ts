import type { PortfolioAccountState, RealPortfolioReconciliationMethod } from '../types/api'

type PortfolioReconciliationView = PortfolioAccountState['reconciliation']

/** Semantic reconciliation state rendered by the account-row badge. */
export type ReconciliationDisplayStatus =
  | 'reconciled'
  | 'driftDetected'
  | 'openDrift'
  | 'unclassified'
  | 'notReconciled'
  | 'stale'
  | 'clockError'
  | 'reconciliationError'
  | 'unsupported'
  | 'unverified'

/** Localised method-name suffix used by the reconciliation tooltip. */
type ReconciliationMethod =
  | 'futuresPosition'
  | 'spotExecutionReplay'
  | 'marginLedgerReplay'
  | 'unclassified'
  | 'notAssigned'
  | 'unknown'

/** Visual tone families shared by reconciliation badge states. */
export type ReconciliationTone = 'success' | 'danger' | 'warning' | 'neutral'

/** Fail-closed presentation derived from the server reconciliation view. */
export interface ReconciliationPresentation {
  displayStatus: ReconciliationDisplayStatus
  method: ReconciliationMethod
  openDriftMismatchCount: number | null
}

export const reconciliationMethod = (
  method: PortfolioReconciliationView['method']
): ReconciliationMethod => {
  switch (method) {
    case 'futures_position':
      return 'futuresPosition'
    case 'spot_execution_replay':
      return 'spotExecutionReplay'
    case 'margin_ledger_replay':
      return 'marginLedgerReplay'
    case 'unclassified':
      return 'unclassified'
    case null:
      return 'notAssigned'
    default:
      return 'unknown'
  }
}

/**
 * Derive the compact reconciliation presentation for one account.
 *
 * Only server-authoritative matched/mismatched verdicts retain those meanings.
 * A verdict from a row that has since lost client authority is stale, while
 * any server-non-authoritative or unrecognised verdict fails closed to
 * ``unverified``.
 */
export const deriveReconciliation = (
  reconciliation: PortfolioReconciliationView,
  isClientAuthoritative: boolean
): ReconciliationPresentation => {
  const method = reconciliationMethod(reconciliation.method)

  switch (reconciliation.effective_status) {
    case 'matched':
      if (!reconciliation.is_authoritative) {
        return { displayStatus: 'unverified', method, openDriftMismatchCount: null }
      }

      return {
        displayStatus: isClientAuthoritative ? 'reconciled' : 'stale',
        method,
        openDriftMismatchCount: null,
      }
    case 'mismatched':
      if (!reconciliation.is_authoritative) {
        return { displayStatus: 'unverified', method, openDriftMismatchCount: null }
      }

      if (!isClientAuthoritative) {
        return { displayStatus: 'stale', method, openDriftMismatchCount: null }
      }

      if (reconciliation.open_drift_episode !== null) {
        return {
          displayStatus: 'openDrift',
          method,
          openDriftMismatchCount: reconciliation.open_drift_episode.latest_full_mismatch_count,
        }
      }

      return { displayStatus: 'driftDetected', method, openDriftMismatchCount: null }

    case 'incomplete':
      switch (reconciliation.method) {
        case 'unclassified':
          return { displayStatus: 'unclassified', method, openDriftMismatchCount: null }
        case 'futures_position':
        case 'spot_execution_replay':
        case 'margin_ledger_replay':
        case null:
          return { displayStatus: 'notReconciled', method, openDriftMismatchCount: null }
        default:
          return { displayStatus: 'unverified', method, openDriftMismatchCount: null }
      }

    case 'stale':
      return { displayStatus: 'stale', method, openDriftMismatchCount: null }
    case 'clock_error':
      return { displayStatus: 'clockError', method, openDriftMismatchCount: null }
    case 'corrupt':
    case 'error':
      return { displayStatus: 'reconciliationError', method, openDriftMismatchCount: null }
    case 'unsupported':
      return { displayStatus: 'unsupported', method, openDriftMismatchCount: null }
    default:
      return { displayStatus: 'unverified', method, openDriftMismatchCount: null }
  }
}

/**
 * Client-side mirror of the backend per-venue reconciliation-method policy
 * (src/snapper/infrastructure/exchanges/reconciliation_policy.py). The server
 * remains the enforcer (400 on a prohibited method); this map only decides
 * which classify choices the UI offers. Venues absent from the map (paper,
 * kraken_equities, polygon, unknown) cannot be classified from the UI.
 */
export const CLASSIFIABLE_VENUE_METHODS: Readonly<
  Record<string, readonly RealPortfolioReconciliationMethod[]>
> = {
  kraken: ['spot_execution_replay', 'margin_ledger_replay'],
  kraken_futures: ['futures_position'],
  walutomat: ['spot_execution_replay'],
}

/** Methods the classify UI may offer for one venue (empty = not classifiable). */
export const classifiableMethodsForExchange = (
  exchange: string
): readonly RealPortfolioReconciliationMethod[] => {
  const methods = Object.hasOwn(CLASSIFIABLE_VENUE_METHODS, exchange)
    ? CLASSIFIABLE_VENUE_METHODS[exchange]
    : undefined

  return methods ?? []
}

/** Map a derived reconciliation state to its badge colour family. */
export const reconciliationTone = (displayStatus: string): ReconciliationTone => {
  switch (displayStatus) {
    case 'reconciled':
      return 'success'
    case 'driftDetected':
    case 'openDrift':
    case 'reconciliationError':
      return 'danger'
    case 'unclassified':
    case 'clockError':
      return 'warning'
    case 'notReconciled':
    case 'stale':
    case 'unsupported':
    case 'unverified':
      return 'neutral'
    default:
      return 'neutral'
  }
}
