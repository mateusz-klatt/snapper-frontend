import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReconciliationBadge } from './ReconciliationBadge'
import type { PortfolioAccountState } from '../../types/api'

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

interface BadgeCase {
  overrides: Partial<Reconciliation>
  displayStatus: string
  label: string
  tooltip: string
  toneClass: string
}

const badgeCases: ReadonlyArray<BadgeCase> = [
  {
    overrides: { effective_status: 'matched', is_authoritative: true },
    displayStatus: 'reconciled',
    label: 'Reconciled',
    tooltip: 'Method: Spot execution replay. Authoritative reconciliation evidence matched.',
    toneClass: 'rising',
  },
  {
    overrides: { effective_status: 'mismatched', is_authoritative: true },
    displayStatus: 'driftDetected',
    label: 'Drift detected',
    tooltip:
      'Method: Spot execution replay. Authoritative reconciliation evidence found a mismatch.',
    toneClass: 'loss',
  },
  {
    overrides: {
      effective_status: 'mismatched',
      is_authoritative: true,
      open_drift_episode: makeDriftEpisode({ latest_full_mismatch_count: 4 }),
    },
    displayStatus: 'openDrift',
    label: 'Drift detected · open (4)',
    tooltip:
      'Method: Spot execution replay. An open drift episode remains after 4 consecutive full mismatches.',
    toneClass: 'loss',
  },
  {
    overrides: { effective_status: 'incomplete', method: 'unclassified' },
    displayStatus: 'unclassified',
    label: 'Unclassified — needs classification',
    tooltip:
      'Method: Unclassified. Operator classification is required before reconciliation can run.',
    toneClass: 'warning',
  },
  {
    overrides: { effective_status: 'incomplete', method: 'spot_execution_replay' },
    displayStatus: 'notReconciled',
    label: 'Not yet reconciled',
    tooltip: 'Method: Spot execution replay. Reconciliation evidence is not complete yet.',
    toneClass: 'muted',
  },
  {
    overrides: { effective_status: 'stale' },
    displayStatus: 'stale',
    label: 'Stale',
    tooltip: 'Method: Spot execution replay. The reconciliation verdict is too old to trust.',
    toneClass: 'muted',
  },
  {
    overrides: { effective_status: 'clock_error' },
    displayStatus: 'clockError',
    label: 'Clock error',
    tooltip:
      'Method: Spot execution replay. Reconciliation timestamps conflict with the server clock.',
    toneClass: 'warning',
  },
  {
    overrides: { effective_status: 'corrupt' },
    displayStatus: 'reconciliationError',
    label: 'Reconciliation error',
    tooltip:
      'Method: Spot execution replay. Reconciliation could not produce a trustworthy verdict.',
    toneClass: 'loss',
  },
  {
    overrides: { effective_status: 'unsupported' },
    displayStatus: 'unsupported',
    label: 'Not supported',
    tooltip: 'Method: Spot execution replay. Reconciliation is not supported for this account.',
    toneClass: 'muted',
  },
  {
    overrides: { effective_status: 'matched', is_authoritative: false },
    displayStatus: 'unverified',
    label: 'Unverified',
    tooltip:
      'Method: Spot execution replay. This verdict is not authoritative and is not trusted as reconciled.',
    toneClass: 'muted',
  },
]

describe('ReconciliationBadge', () => {
  it.each(badgeCases)(
    'renders $displayStatus with its translated label, tooltip, and tone',
    ({ overrides, displayStatus, label, tooltip, toneClass }) => {
      render(
        <ReconciliationBadge
          reconciliation={makeReconciliation(overrides)}
          isClientAuthoritative={true}
        />
      )
      const badge = screen.getByTestId(`reconciliation-badge-${displayStatus}`)

      expect(badge).toHaveTextContent(label)
      expect(badge).toHaveAttribute('title', tooltip)
      expect(badge).toHaveAttribute('aria-label', tooltip)
      expect(badge.className).toContain(toneClass)
    }
  )

  const forgedMethod = 'future_replay' as NonNullable<Reconciliation['method']>
  const methodCases: ReadonlyArray<readonly [Reconciliation['method'], string]> = [
    ['futures_position', 'Futures positions'],
    ['spot_execution_replay', 'Spot execution replay'],
    ['margin_ledger_replay', 'Margin ledger replay'],
    ['unclassified', 'Unclassified'],
    [null, 'Method not assigned'],
    [forgedMethod, 'Unknown method'],
  ]

  it.each(methodCases)('uses the translated tooltip method for %s', (method, methodLabel) => {
    render(
      <ReconciliationBadge
        reconciliation={makeReconciliation({ effective_status: 'stale', method })}
        isClientAuthoritative={true}
      />
    )
    const badge = screen.getByTestId('reconciliation-badge-stale')

    expect(badge.getAttribute('title')).toContain(`Method: ${methodLabel}.`)
    expect(badge.getAttribute('aria-label')).toBe(badge.getAttribute('title'))
  })

  it('never paints a non-authoritative match green or labels it reconciled', () => {
    render(
      <ReconciliationBadge
        reconciliation={makeReconciliation({
          effective_status: 'matched',
          is_authoritative: false,
        })}
        isClientAuthoritative={true}
      />
    )
    const badge = screen.getByTestId('reconciliation-badge-unverified')

    expect(badge).toHaveTextContent('Unverified')
    expect(badge).not.toHaveTextContent('Reconciled')
    expect(badge.className).toContain('muted')
    expect(badge.className).not.toContain('rising')
  })

  it('renders a cached server-authoritative match as stale when client authority has expired', () => {
    render(
      <ReconciliationBadge
        reconciliation={makeReconciliation({
          effective_status: 'matched',
          is_authoritative: true,
        })}
        isClientAuthoritative={false}
      />
    )
    const badge = screen.getByTestId('reconciliation-badge-stale')

    expect(badge).toHaveTextContent('Stale')
    expect(badge).not.toHaveTextContent('Reconciled')
    expect(badge.className).toContain('muted')
    expect(badge.className).not.toContain('rising')
  })
})
