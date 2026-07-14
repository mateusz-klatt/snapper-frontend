import type { PortfolioAccountState } from '../types/api'

/**
 * How long the client will keep trusting an ``observed`` row after its last
 * SUCCESSFUL fetch before demoting it to stale on polling grounds.
 *
 * The account list polls every 5s; a row that has not been refreshed within
 * this ceiling means polling is failing (network down, server error, tab
 * throttled) and the last-known "live" snapshot can no longer be presented as
 * authoritative. Set to three missed polls so a single transient hiccup does
 * not flap the badge.
 */
export const CLIENT_AUTHORITY_STALENESS_MS = 15_000

/**
 * Hard cap on how long after its balance observation a row may stay
 * authoritative, independent of the server-sent ``authoritative_until``.
 *
 * The observer sets ``authoritative_until = balance_observed_at + ~5min``, so a
 * genuine row always expires well before this cap. A forged/tampered/migrated
 * row that carries an arbitrarily far-future ``authoritative_until`` (e.g.
 * year 2099) would otherwise read as live forever; bounding authority by the
 * observation age instead closes that off. Set generously (3× the server's ~5min
 * freshness ceiling) so it never demotes a legitimate row, only implausible ones.
 */
const CLIENT_OBSERVATION_MAX_WINDOW_MS = 900_000

/**
 * Tolerance for the fail-closed "future clock" guards when comparing the ticked
 * client clock against real-time (react-query ``dataUpdatedAt``) or server
 * (``*_observed_at``) timestamps.
 *
 * ``now`` is sourced from a ``useNow`` interval that only advances once per tick
 * (1s), so between ticks it LAGS real wall-clock by up to the tick interval.
 * ``dataUpdatedAt`` and a freshly written ``balance_observed_at`` are real
 * timestamps, so right after a successful fetch (or a new observation) they
 * legitimately sit a few hundred ms AHEAD of the lagging ``now`` — which a naive
 * ``x > now`` reads as a rolled-back/forged future clock and would flap the row
 * to ``stale`` for up to a tick on every 5s poll. Tolerating this much skew
 * removes the false demotion while still failing closed on a genuine clock
 * rollback or a forged far-future timestamp, both of which exceed it by orders
 * of magnitude (seconds→years, versus this sub-tick allowance).
 */
export const CLIENT_CLOCK_SKEW_TOLERANCE_MS = 2_000

/**
 * Client-side re-derivation of a venue-account row's truth, fail-closed.
 *
 * The server computes ``effective_status``/``is_authoritative`` at FETCH time.
 * By the time the operator is looking at the row, several things the server
 * could not know may have happened: the authority window (``authoritative_until``)
 * may have elapsed in wall-clock time; EITHER observation may be implausibly
 * old relative to a forged far-future window, or future-dated (a skewed clock
 * the server would reject as ``clock_error``) — and a component that claims
 * ``position_status === "observed"`` MUST carry a finite position clock (a
 * missing/malformed one on an observed component fails closed, never skipped as
 * if it were ``not_applicable``); polling may have stalled/failed (or the client
 * clock rolled back) so the snapshot is no longer being refreshed. Any of these
 * demotes a once-observed row to ``stale`` — the client must never keep
 * painting an expired, forged, future-clocked, or un-refreshed snapshot as live
 * authoritative truth (a fresh balance can never launder a weeks-old position
 * observation into "Live"). The client ALSO refuses to promote a response the
 * server itself did not mark authoritative (``is_authoritative !== true``),
 * guarding against version skew / inconsistent cached responses. A
 * non-``observed`` server status (simulated/stale/clock_error/corrupt/
 * unsupported/error/…) is carried through verbatim and is never authoritative.
 */
export interface AccountTruth {
  /** The effective status after client demotion (``stale`` when demoted). */
  clientEffectiveStatus: string
  /** True only for a still-fresh, still-polling ``observed`` row. */
  isAuthoritative: boolean
  /** The authority window closed in wall-clock time since fetch. */
  authorityExpired: boolean
  /** No successful refresh within {@link CLIENT_AUTHORITY_STALENESS_MS}. */
  pollingStalled: boolean
}

/**
 * Derive the client-effective truth of a single account row.
 *
 * @param state The stored account-state row as returned by the API.
 * @param now Current wall-clock epoch (ms).
 * @param lastSuccessfulFetch Epoch (ms) of the last successful list fetch, or
 *     ``null``/non-positive when no successful fetch has landed yet.
 * @returns The fail-closed client truth for the row.
 */
export const deriveAccountTruth = (
  state: PortfolioAccountState,
  now: number,
  lastSuccessfulFetch: number | null
): AccountTruth => {
  if (state.effective_status !== 'observed') {
    return {
      clientEffectiveStatus: state.effective_status,
      isAuthoritative: false,
      authorityExpired: false,
      pollingStalled: false,
    }
  }

  if (state.is_authoritative !== true) {
    return {
      clientEffectiveStatus: 'stale',
      isAuthoritative: false,
      authorityExpired: false,
      pollingStalled: false,
    }
  }

  const until = state.authoritative_until
  const untilMs = until != null && until !== '' ? Date.parse(until) : Number.NaN
  const balanceObs = state.balance_observed_at
  const balanceObservedMs =
    balanceObs != null && balanceObs !== '' ? Date.parse(balanceObs) : Number.NaN
  const positionObs = state.position_observed_at
  const positionObservedMs =
    positionObs != null && positionObs !== '' ? Date.parse(positionObs) : Number.NaN
  const balanceObservationBad =
    !Number.isFinite(balanceObservedMs) ||
    balanceObservedMs > now + CLIENT_CLOCK_SKEW_TOLERANCE_MS ||
    now >= balanceObservedMs + CLIENT_OBSERVATION_MAX_WINDOW_MS
  const positionObservationBad =
    state.position_status === 'observed' &&
    (!Number.isFinite(positionObservedMs) ||
      positionObservedMs > now + CLIENT_CLOCK_SKEW_TOLERANCE_MS ||
      now >= positionObservedMs + CLIENT_OBSERVATION_MAX_WINDOW_MS)
  const observationExpired = balanceObservationBad || positionObservationBad
  const authorityExpired =
    !Number.isFinite(now) || !Number.isFinite(untilMs) || now >= untilMs || observationExpired
  const pollingStalled =
    lastSuccessfulFetch === null ||
    !Number.isFinite(lastSuccessfulFetch) ||
    lastSuccessfulFetch <= 0 ||
    lastSuccessfulFetch > now + CLIENT_CLOCK_SKEW_TOLERANCE_MS ||
    now - lastSuccessfulFetch > CLIENT_AUTHORITY_STALENESS_MS

  if (authorityExpired || pollingStalled) {
    return {
      clientEffectiveStatus: 'stale',
      isAuthoritative: false,
      authorityExpired,
      pollingStalled,
    }
  }

  return {
    clientEffectiveStatus: 'observed',
    isAuthoritative: true,
    authorityExpired: false,
    pollingStalled: false,
  }
}

/**
 * Visual/semantic tone family for a client-effective status.
 *
 * Groups the many status strings into the handful of tones the badge and
 * banner render. Any unrecognised status collapses to ``unknown`` (rendered
 * as a cautious, non-authoritative tone) so a new/forged status can never
 * masquerade as authoritative.
 */
export type StatusTone =
  'authoritative' | 'simulated' | 'stale' | 'corrupt' | 'unsupported' | 'unknown'

/**
 * Map a client-effective status string to its rendering tone.
 *
 * @param clientEffectiveStatus The demoted, client-effective status.
 * @returns The tone family used for badge/banner styling and copy.
 */
export const statusTone = (clientEffectiveStatus: string): StatusTone => {
  switch (clientEffectiveStatus) {
    case 'observed':
      return 'authoritative'
    case 'simulated':
      return 'simulated'
    case 'stale':
    case 'clock_error':
      return 'stale'
    case 'corrupt':
    case 'error':
      return 'corrupt'
    case 'unsupported':
    case 'not_applicable':
      return 'unsupported'
    default:
      return 'unknown'
  }
}
