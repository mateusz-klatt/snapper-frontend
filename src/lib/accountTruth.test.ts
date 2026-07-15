import { describe, it, expect } from 'vitest'
import {
  deriveAccountTruth,
  statusTone,
  CLIENT_AUTHORITY_STALENESS_MS,
  CLIENT_CLOCK_SKEW_TOLERANCE_MS,
} from './accountTruth'
import type { PortfolioAccountState } from '../types/api'

const NOW = Date.parse('2026-07-13T12:00:00Z')
const FUTURE = '2026-07-13T12:05:00Z'
const PAST = '2026-07-13T11:00:00Z'

const makeState = (overrides: Partial<PortfolioAccountState> = {}): PortfolioAccountState => ({
  type: 'portfolio_account_state',
  sequence_id: 1,
  public_id: 'acct-1',
  timestamp: '2026-07-13T12:00:00Z',
  session_id: 'sess-1',
  wallet_public_id: 'w-1',
  exchange: 'kraken',
  mode: 'live',
  sync_status: 'observed',
  effective_status: 'observed',
  is_authoritative: true,
  balance_status: 'observed',
  position_status: 'observed',
  valuation_status: 'native_only',
  balances: [],
  open_positions: [],
  balance_observed_at: '2026-07-13T11:59:00Z',
  position_observed_at: '2026-07-13T11:59:00Z',
  authoritative_until: FUTURE,
  current_attempt_observation_id: 1,
  balance_payload_source_observation_id: 1,
  position_payload_source_observation_id: 1,
  error: null,
  reconciliation: {
    method: null,
    evaluation_status: null,
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
  },
  ...overrides,
})

describe('deriveAccountTruth', () => {
  it('keeps a non-observed status verbatim and never authoritative', () => {
    const truth = deriveAccountTruth(makeState({ effective_status: 'simulated' }), NOW, NOW)

    expect(truth.clientEffectiveStatus).toBe('simulated')
    expect(truth.isAuthoritative).toBe(false)
    expect(truth.authorityExpired).toBe(false)
    expect(truth.pollingStalled).toBe(false)
  })

  it('is authoritative for a fresh observed row inside its window', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, NOW)

    expect(truth.clientEffectiveStatus).toBe('observed')
    expect(truth.isAuthoritative).toBe(true)
  })

  it('demotes to stale once the authority window has elapsed', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: PAST }), NOW, NOW)

    expect(truth.clientEffectiveStatus).toBe('stale')
    expect(truth.isAuthoritative).toBe(false)
    expect(truth.authorityExpired).toBe(true)
  })

  it('demotes to stale when authoritative_until is null', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: null }), NOW, NOW)

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when authoritative_until is an empty string', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: '' }), NOW, NOW)

    expect(truth.authorityExpired).toBe(true)
  })

  it('demotes to stale when authoritative_until is unparseable', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: 'not-a-date' }), NOW, NOW)

    expect(truth.authorityExpired).toBe(true)
  })

  it('demotes to stale when now is not finite', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), Number.NaN, NOW)

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when no successful fetch has landed', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, null)

    expect(truth.pollingStalled).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when the last fetch epoch is non-positive', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, 0)

    expect(truth.pollingStalled).toBe(true)
  })

  it('demotes to stale when polling has stalled past the ceiling', () => {
    const stale = NOW - CLIENT_AUTHORITY_STALENESS_MS - 1
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, stale)

    expect(truth.pollingStalled).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when the server did not mark the row authoritative', () => {
    const truth = deriveAccountTruth(
      makeState({
        effective_status: 'observed',
        is_authoritative: false,
        authoritative_until: FUTURE,
      }),
      NOW,
      NOW
    )

    expect(truth.clientEffectiveStatus).toBe('stale')
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes a forged far-future window once the observation is too old', () => {
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: '2099-01-01T00:00:00Z',
        balance_observed_at: '2026-07-13T10:00:00Z',
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when the observation timestamp is missing', () => {
    const truth = deriveAccountTruth(
      makeState({ authoritative_until: FUTURE, balance_observed_at: null }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes to stale when the last-fetch epoch is in the future (clock rollback)', () => {
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, NOW + 10_000)

    expect(truth.pollingStalled).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes when the position observation is too old, even with a fresh balance', () => {
    const truth = deriveAccountTruth(
      makeState({ authoritative_until: FUTURE, position_observed_at: '2026-07-13T10:00:00Z' }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes when the balance observation clock is in the future', () => {
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: '2099-01-01T00:00:00Z',
        balance_observed_at: '2099-01-01T00:00:00Z',
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('demotes when the position observation clock is in the future', () => {
    const truth = deriveAccountTruth(
      makeState({ authoritative_until: FUTURE, position_observed_at: '2099-01-01T00:00:00Z' }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('stays authoritative when positions are not_applicable (null position clock)', () => {
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: FUTURE,
        position_status: 'not_applicable',
        position_observed_at: null,
      }),
      NOW,
      NOW
    )

    expect(truth.clientEffectiveStatus).toBe('observed')
    expect(truth.isAuthoritative).toBe(true)
  })

  it('demotes an observed-position component that is missing its position clock', () => {
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: FUTURE,
        position_status: 'observed',
        position_observed_at: null,
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('stays authoritative when the last fetch epoch is barely ahead of the ticked clock (within skew tolerance)', () => {
    const fetchedAt = NOW + CLIENT_CLOCK_SKEW_TOLERANCE_MS - 1
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, fetchedAt)

    expect(truth.pollingStalled).toBe(false)
    expect(truth.clientEffectiveStatus).toBe('observed')
    expect(truth.isAuthoritative).toBe(true)
  })

  it('demotes to stale when the last fetch epoch exceeds the skew tolerance (real clock rollback)', () => {
    const fetchedAt = NOW + CLIENT_CLOCK_SKEW_TOLERANCE_MS + 1
    const truth = deriveAccountTruth(makeState({ authoritative_until: FUTURE }), NOW, fetchedAt)

    expect(truth.pollingStalled).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })

  it('stays authoritative when a fresh balance observation is barely ahead of the ticked clock', () => {
    const observedAt = new Date(NOW + CLIENT_CLOCK_SKEW_TOLERANCE_MS - 1).toISOString()
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: FUTURE,
        balance_observed_at: observedAt,
        position_status: 'not_applicable',
        position_observed_at: null,
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(false)
    expect(truth.isAuthoritative).toBe(true)
  })

  it('stays authoritative when a fresh position observation is barely ahead of the ticked clock', () => {
    const observedAt = new Date(NOW + CLIENT_CLOCK_SKEW_TOLERANCE_MS - 1).toISOString()
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: FUTURE,
        position_status: 'observed',
        position_observed_at: observedAt,
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(false)
    expect(truth.isAuthoritative).toBe(true)
  })

  it('demotes when a balance observation is further ahead than the skew tolerance allows', () => {
    const observedAt = new Date(NOW + CLIENT_CLOCK_SKEW_TOLERANCE_MS + 60_000).toISOString()
    const truth = deriveAccountTruth(
      makeState({
        authoritative_until: FUTURE,
        balance_observed_at: observedAt,
        position_status: 'not_applicable',
        position_observed_at: null,
      }),
      NOW,
      NOW
    )

    expect(truth.authorityExpired).toBe(true)
    expect(truth.isAuthoritative).toBe(false)
  })
})

describe('statusTone', () => {
  it.each([
    ['observed', 'authoritative'],
    ['simulated', 'simulated'],
    ['stale', 'stale'],
    ['clock_error', 'stale'],
    ['corrupt', 'corrupt'],
    ['error', 'corrupt'],
    ['unsupported', 'unsupported'],
    ['not_applicable', 'unsupported'],
    ['something-new', 'unknown'],
  ])('maps %s to the %s tone', (status, tone) => {
    expect(statusTone(status)).toBe(tone)
  })
})
