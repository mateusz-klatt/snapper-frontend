import { describe, expect, it } from 'vitest'
import {
  CLASSIFIABLE_VENUE_METHODS,
  classifiableMethodsForExchange,
  deriveReconciliation,
  reconciliationTone,
  type ReconciliationDisplayStatus,
  type ReconciliationTone,
} from './reconciliation'
import type { PortfolioAccountState, RealPortfolioReconciliationMethod } from '../types/api'

type Reconciliation = PortfolioAccountState['reconciliation']
type DriftEpisode = NonNullable<Reconciliation['open_drift_episode']>

const makeDriftEpisode = (overrides: Partial<DriftEpisode> = {}): DriftEpisode => ({
  public_id: 'drift-1',
  status: 'open',
  opened_at: '2026-07-15T10:00:00Z',
  trigger_observation_id: 10,
  last_observation_id: 12,
  details_source_observation_id: 12,
  latest_full_mismatch_count: 3,
  ...overrides,
})

const makeReconciliation = (overrides: Partial<Reconciliation> = {}): Reconciliation => ({
  method: 'spot_execution_replay',
  evaluation_status: 'incomplete',
  effective_status: 'incomplete',
  is_authoritative: false,
  evaluated_at: null,
  current_observation_id: null,
  last_full_observation_id: null,
  detail_source_observation_id: null,
  last_full_outcome: null,
  consecutive_full_mismatches: 0,
  anchor_public_id: null,
  venue_account_state_public_id: null,
  venue_account_observation_id: null,
  source_watermark_kind: null,
  source_watermark: null,
  expected: null,
  actual: null,
  difference: null,
  tolerance: null,
  reconciled_at: null,
  authoritative_until: null,
  error: null,
  open_drift_episode: null,
  ...overrides,
})

describe('deriveReconciliation', () => {
  it('derives an authoritative match as reconciled', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'matched', is_authoritative: true }),
        true
      )
    ).toEqual({
      displayStatus: 'reconciled',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('fails a non-authoritative match closed as unverified', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'matched', is_authoritative: false }),
        true
      )
    ).toEqual({
      displayStatus: 'unverified',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('demotes a server-authoritative match when client authority has expired', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'matched', is_authoritative: true }),
        false
      )
    ).toEqual({
      displayStatus: 'stale',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('derives an authoritative mismatch without an open episode as drift detected', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'mismatched', is_authoritative: true }),
        true
      )
    ).toEqual({
      displayStatus: 'driftDetected',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('derives an authoritative mismatch with an open episode from its latest mismatch count', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({
          effective_status: 'mismatched',
          is_authoritative: true,
          open_drift_episode: makeDriftEpisode({ latest_full_mismatch_count: 0 }),
        }),
        true
      )
    ).toEqual({
      displayStatus: 'openDrift',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: 0,
    })
  })

  it('demotes a server-authoritative mismatch and suppresses open drift when client authority has expired', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({
          effective_status: 'mismatched',
          is_authoritative: true,
          open_drift_episode: makeDriftEpisode({ latest_full_mismatch_count: 7 }),
        }),
        false
      )
    ).toEqual({
      displayStatus: 'stale',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('fails a non-authoritative mismatch without an open episode closed as unverified', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'mismatched', is_authoritative: false }),
        true
      )
    ).toEqual({
      displayStatus: 'unverified',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('does not surface an open episode from a non-authoritative mismatch', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({
          effective_status: 'mismatched',
          is_authoritative: false,
          open_drift_episode: makeDriftEpisode(),
        }),
        true
      )
    ).toEqual({
      displayStatus: 'unverified',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('derives an unclassified incomplete result as an operator action', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'incomplete', method: 'unclassified' }),
        true
      )
    ).toEqual({
      displayStatus: 'unclassified',
      method: 'unclassified',
      openDriftMismatchCount: null,
    })
  })

  it.each(['futures_position', 'spot_execution_replay', 'margin_ledger_replay'] as const)(
    'derives incomplete %s reconciliation as not yet reconciled',
    method => {
      const expectedMethod = {
        futures_position: 'futuresPosition',
        spot_execution_replay: 'spotExecutionReplay',
        margin_ledger_replay: 'marginLedgerReplay',
      } as const

      expect(
        deriveReconciliation(makeReconciliation({ effective_status: 'incomplete', method }), true)
      ).toEqual({
        displayStatus: 'notReconciled',
        method: expectedMethod[method],
        openDriftMismatchCount: null,
      })
    }
  )

  it('derives incomplete reconciliation without an assigned method as not yet reconciled', () => {
    expect(
      deriveReconciliation(
        makeReconciliation({ effective_status: 'incomplete', method: null }),
        true
      )
    ).toEqual({
      displayStatus: 'notReconciled',
      method: 'notAssigned',
      openDriftMismatchCount: null,
    })
  })

  it('fails incomplete reconciliation with a forged method closed as unverified', () => {
    const method = 'future_replay' as NonNullable<Reconciliation['method']>

    expect(
      deriveReconciliation(makeReconciliation({ effective_status: 'incomplete', method }), true)
    ).toEqual({
      displayStatus: 'unverified',
      method: 'unknown',
      openDriftMismatchCount: null,
    })
  })

  const effectiveStatusCases: ReadonlyArray<
    readonly [Reconciliation['effective_status'], ReconciliationDisplayStatus]
  > = [
    ['stale', 'stale'],
    ['clock_error', 'clockError'],
    ['corrupt', 'reconciliationError'],
    ['error', 'reconciliationError'],
    ['unsupported', 'unsupported'],
  ]

  it.each(effectiveStatusCases)('derives %s as %s', (effectiveStatus, displayStatus) => {
    expect(
      deriveReconciliation(makeReconciliation({ effective_status: effectiveStatus }), true)
    ).toEqual({
      displayStatus,
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })

  it('fails a forged effective status closed as unverified', () => {
    const effectiveStatus = 'future_status' as Reconciliation['effective_status']

    expect(
      deriveReconciliation(makeReconciliation({ effective_status: effectiveStatus }), true)
    ).toEqual({
      displayStatus: 'unverified',
      method: 'spotExecutionReplay',
      openDriftMismatchCount: null,
    })
  })
})

describe('reconciliationTone', () => {
  const toneCases: ReadonlyArray<readonly [ReconciliationDisplayStatus, ReconciliationTone]> = [
    ['reconciled', 'success'],
    ['driftDetected', 'danger'],
    ['openDrift', 'danger'],
    ['unclassified', 'warning'],
    ['notReconciled', 'neutral'],
    ['stale', 'neutral'],
    ['clockError', 'warning'],
    ['reconciliationError', 'danger'],
    ['unsupported', 'neutral'],
    ['unverified', 'neutral'],
  ]

  it.each(toneCases)('maps %s to the %s tone', (status, tone) => {
    expect(reconciliationTone(status)).toBe(tone)
  })

  it('maps an unknown display status to the neutral tone', () => {
    expect(reconciliationTone('something-new')).toBe('neutral')
  })
})

describe('classifiableMethodsForExchange', () => {
  const venueCases: ReadonlyArray<readonly [string, readonly RealPortfolioReconciliationMethod[]]> =
    [
      ['kraken', ['spot_execution_replay', 'margin_ledger_replay']],
      ['kraken_futures', ['futures_position']],
      ['walutomat', ['spot_execution_replay']],
      ['paper', []],
      ['kraken_equities', []],
      ['polygon', []],
      ['venue-from-the-future', []],
      ['constructor', []],
      ['toString', []],
      ['__proto__', []],
    ]

  it.each(venueCases)('offers %s the methods %j', (exchange, methods) => {
    expect(classifiableMethodsForExchange(exchange)).toEqual(methods)
  })

  it('mirrors the backend policy for exactly the three classifiable venues', () => {
    expect(Object.keys(CLASSIFIABLE_VENUE_METHODS).sort()).toEqual([
      'kraken',
      'kraken_futures',
      'walutomat',
    ])
  })
})
