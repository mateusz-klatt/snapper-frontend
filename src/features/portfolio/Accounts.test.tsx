import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Accounts } from './Accounts'
import { usePortfolioAccounts } from '../../hooks/queries/portfolio'
import { CLIENT_AUTHORITY_STALENESS_MS } from '../../lib/accountTruth'
import type { PortfolioAccountState } from '../../types/api'

const FIXED_NOW = Date.parse('2026-07-13T12:00:00Z')
const FUTURE = '2026-07-13T12:05:00Z'

const control = vi.hoisted(() => ({ asOf: null as string | null, now: 0 }))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: { asOf: string | null }) => unknown) =>
    selector({ asOf: control.asOf })
  ),
}))
vi.mock('../../hooks/useNow', () => ({
  useNow: vi.fn(() => control.now),
}))
vi.mock('../../hooks/queries/portfolio', () => ({
  usePortfolioAccounts: vi.fn(),
}))

type PortfolioReconciliationView = PortfolioAccountState['reconciliation']

const makeReconciliation = (
  overrides: Partial<PortfolioReconciliationView> = {}
): PortfolioReconciliationView => ({
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
  ...overrides,
})

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
  position_status: 'not_applicable',
  valuation_status: 'native_only',
  balances: null,
  open_positions: null,
  balance_observed_at: null,
  position_observed_at: null,
  authoritative_until: FUTURE,
  current_attempt_observation_id: 1,
  balance_payload_source_observation_id: null,
  position_payload_source_observation_id: null,
  error: null,
  reconciliation: makeReconciliation(),
  ...overrides,
})

const mockAccounts = (
  data: PortfolioAccountState[] | undefined,
  isLoading: boolean,
  dataUpdatedAt: number,
  isError = false
): void => {
  vi.mocked(usePortfolioAccounts).mockReturnValue({
    data,
    isLoading,
    isError,
    dataUpdatedAt,
  } as never)
}

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    control.asOf = null
    control.now = FIXED_NOW
  })

  it('shows loading skeletons while the first fetch is in flight', () => {
    mockAccounts(undefined, true, 0)
    render(<Accounts />)

    expect(screen.getAllByTestId('order-card-skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('portfolio-truth-banner')).not.toBeInTheDocument()
  })

  it('renders the honest empty state when there are no accounts', () => {
    mockAccounts([], false, FIXED_NOW)
    render(<Accounts />)

    expect(screen.getByText('No venue accounts')).toBeInTheDocument()
  })

  it('renders authoritative rows with balances and positions, no truth banner', () => {
    mockAccounts(
      [
        makeState({
          position_status: 'observed',
          balances: [
            { currency: 'USD', total: 1000, free: 800, used: 200 },
            { currency: 'BTC', total: 0.5, free: null, used: null },
          ],
          open_positions: [
            {
              symbol: 'BTC/USD',
              side: 'buy',
              size: 1,
              entry_price: 50000,
              mark_price: 51000,
              unrealized_pnl: 1000,
              unrealized_funding: -5,
              timestamp: '2026-07-13T11:59:00Z',
            },
            {
              symbol: 'ETH/USD',
              side: 'sell',
              size: 2,
              entry_price: 3000,
              mark_price: 2900,
              unrealized_pnl: -200,
              unrealized_funding: 0,
              timestamp: '2026-07-13T11:59:00Z',
            },
          ],
          balance_observed_at: '2026-07-13T11:59:00Z',
          position_observed_at: '2026-07-13T11:59:00Z',
          reconciliation: makeReconciliation({
            method: 'futures_position',
            evaluation_status: 'matched',
            effective_status: 'matched',
            is_authoritative: true,
            last_full_outcome: 'matched',
            reconciled_at: '2026-07-13T11:59:00Z',
            authoritative_until: FUTURE,
          }),
        }),
        makeState({
          wallet_public_id: 'w-2',
          balances: [],
          open_positions: [],
          balance_observed_at: '2026-07-13T11:59:00Z',
        }),
      ],
      false,
      FIXED_NOW
    )
    render(<Accounts />)

    expect(screen.getAllByTestId('account-truth-badge-observed').length).toBe(2)
    expect(screen.getByTestId('reconciliation-badge-reconciled')).toHaveTextContent('Reconciled')
    expect(screen.getByTestId('reconciliation-badge-notReconciled')).toHaveTextContent(
      'Not yet reconciled'
    )
    expect(screen.queryByTestId('portfolio-truth-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('account-balance-w-1-kraken-live-USD')).toBeInTheDocument()
    expect(screen.getByTestId('account-position-w-1-kraken-live-BTC/USD')).toHaveTextContent('Buy')
    expect(screen.getByTestId('account-position-w-1-kraken-live-ETH/USD')).toHaveTextContent('Sell')
    expect(screen.getByTestId('account-balances-observed-w-1-kraken-live')).toBeInTheDocument()
    expect(screen.getByTestId('account-authoritative-until-w-1-kraken-live')).toBeInTheDocument()
    expect(screen.getByTestId('account-balances-empty-w-2-kraken-live')).toBeInTheDocument()
    expect(screen.getByTestId('account-positions-empty-w-2-kraken-live')).toBeInTheDocument()
  })

  it('demotes authoritative account and reconciliation truth when polling stalls', () => {
    mockAccounts(
      [
        makeState({
          balance_observed_at: '2026-07-13T11:59:00Z',
          reconciliation: makeReconciliation({
            method: 'futures_position',
            evaluation_status: 'matched',
            effective_status: 'matched',
            is_authoritative: true,
            last_full_outcome: 'matched',
            reconciled_at: '2026-07-13T11:59:00Z',
            authoritative_until: FUTURE,
          }),
        }),
      ],
      false,
      FIXED_NOW - CLIENT_AUTHORITY_STALENESS_MS - 1
    )
    render(<Accounts />)

    expect(screen.getByTestId('account-truth-badge-stale')).toBeInTheDocument()
    expect(screen.getByTestId('reconciliation-badge-stale')).toHaveTextContent('Stale')
    expect(screen.queryByTestId('reconciliation-badge-reconciled')).not.toBeInTheDocument()
  })

  it('demotes a malformed-timestamp row to stale, shows the banner, and prints the raw value', () => {
    mockAccounts([makeState({ balance_observed_at: 'not-a-date' })], false, FIXED_NOW)
    render(<Accounts />)

    expect(screen.getByTestId('account-truth-badge-stale')).toBeInTheDocument()
    expect(screen.getByTestId('portfolio-truth-banner')).toBeInTheDocument()
    expect(screen.getByTestId('account-balances-observed-w-1-kraken-live')).toHaveTextContent(
      'not-a-date'
    )
  })

  it('shows the truth banner and error for a non-authoritative simulated row', () => {
    mockAccounts(
      [
        makeState({
          exchange: 'paper',
          mode: 'paper',
          sync_status: 'simulated',
          effective_status: 'simulated',
          is_authoritative: false,
          authoritative_until: null,
          error: 'connection refused',
        }),
      ],
      false,
      FIXED_NOW
    )
    render(<Accounts />)

    expect(screen.getByTestId('portfolio-truth-banner')).toBeInTheDocument()
    expect(screen.getByTestId('account-truth-badge-simulated')).toBeInTheDocument()
    expect(screen.getByTestId('account-balances-empty-w-1-paper-paper')).toBeInTheDocument()
    expect(screen.getByTestId('account-positions-empty-w-1-paper-paper')).toBeInTheDocument()
    expect(screen.getByTestId('account-error-w-1-paper-paper')).toHaveTextContent(
      'connection refused'
    )
    expect(
      screen.queryByTestId('account-authoritative-until-w-1-paper-paper')
    ).not.toBeInTheDocument()
  })

  it('renders a live-only notice and no account rows while time traveling', () => {
    control.asOf = '2026-07-13T12:00:00Z'
    mockAccounts([makeState({ authoritative_until: FUTURE })], false, 0)
    render(<Accounts />)

    expect(screen.getByTestId('accounts-live-only')).toBeInTheDocument()
    expect(screen.queryByTestId('account-truth-badge-observed')).not.toBeInTheDocument()
    expect(screen.queryByTestId('portfolio-truth-banner')).not.toBeInTheDocument()
  })

  it('shows a truth-unavailable notice when the first fetch fails', () => {
    mockAccounts([], false, 0, true)
    render(<Accounts />)

    expect(screen.getByTestId('accounts-unavailable')).toBeInTheDocument()
    expect(screen.queryByText('No venue accounts')).not.toBeInTheDocument()
  })
})
