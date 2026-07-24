import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquityCoverageSummary } from './EquityCoverageSummary'
import type { PnlEquityCoverageData, PnlTimelinePointData } from '../../types/api'

const coverage = (overrides: Partial<PnlEquityCoverageData> = {}): PnlEquityCoverageData => ({
  sampled: true,
  venue_scope: 'spot_only',
  external_flows_adjusted: false,
  complete_minutes: 5,
  first_minute: '2026-01-01T00:00:00Z',
  last_minute: '2026-01-01T00:05:00Z',
  sample_calc_version: 'v1',
  ...overrides,
})

const point = (overrides: Partial<PnlTimelinePointData> = {}): PnlTimelinePointData => ({
  point_time: '2026-01-01T00:00:00Z',
  realized_pnl: null,
  fee_pnl: null,
  accrual_pnl: null,
  unrealized_pnl: null,
  net_pnl: null,
  equity: null,
  cash: null,
  position_value: null,
  drawdown: null,
  valuation_status: 'complete',
  incompleteness_reasons: [],
  per_instrument: [],
  attribution: [],
  ...overrides,
})

describe('EquityCoverageSummary', () => {
  it('renders nothing when the window is not sampled', () => {
    const { container } = render(
      <EquityCoverageSummary coverage={coverage({ sampled: false })} points={[point()]} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders current and max drawdown as a percentage of peak with honesty labels', () => {
    const points = [
      point({ equity: 100, drawdown: 0.05 }),
      point({ equity: 120, drawdown: 0.18 }),
      point({ equity: 130, drawdown: 0.12 }),
    ]

    render(<EquityCoverageSummary coverage={coverage()} points={points} />)

    expect(screen.getByText('Equity overlay')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-drawdown-current')).toHaveTextContent('12.00%')
    expect(screen.getByTestId('pnl-drawdown-max')).toHaveTextContent('18.00%')
    expect(screen.getByTestId('pnl-drawdown-definition')).toHaveTextContent(
      'Share of the running equity peak.'
    )
    expect(screen.getByTestId('pnl-drawdown-flows-caveat')).toHaveTextContent(
      'Not a flow-adjusted trading drawdown.'
    )
    expect(screen.getByTestId('pnl-equity-honesty-spot')).toHaveTextContent(
      'Spot venue only — balances held on other venues are excluded.'
    )
    expect(screen.getByTestId('pnl-equity-honesty-flows')).toHaveTextContent(
      'External deposits and withdrawals are not adjusted out.'
    )
  })

  it('shows an em dash for drawdown when no sampled point exposes one', () => {
    render(<EquityCoverageSummary coverage={coverage()} points={[point({ equity: 100 })]} />)

    expect(screen.getByTestId('pnl-drawdown-current')).toHaveTextContent('—')
    expect(screen.getByTestId('pnl-drawdown-max')).toHaveTextContent('—')
  })

  it('makes no spot or flows claim and omits the caption when both fields are null', () => {
    render(
      <EquityCoverageSummary
        coverage={coverage({ venue_scope: null, external_flows_adjusted: null })}
        points={[point({ equity: 100, drawdown: 0.1 })]}
      />
    )

    expect(screen.getByText('Equity overlay')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-drawdown-current')).toHaveTextContent('10.00%')
    expect(screen.getByTestId('pnl-drawdown-definition')).toHaveTextContent(
      'Share of the running equity peak.'
    )
    expect(screen.queryByTestId('pnl-drawdown-flows-caveat')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pnl-equity-honesty')).not.toBeInTheDocument()
    expect(screen.queryByText(/spot venue/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/external deposits/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/flow-adjusted/i)).not.toBeInTheDocument()
  })

  it('drops the spot claim when the venue scope is not spot-only', () => {
    render(
      <EquityCoverageSummary
        coverage={coverage({ venue_scope: null, external_flows_adjusted: false })}
        points={[point({ equity: 100, drawdown: 0.1 })]}
      />
    )

    expect(screen.queryByTestId('pnl-equity-honesty-spot')).not.toBeInTheDocument()
    expect(screen.queryByText(/spot venue/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('pnl-equity-honesty-flows')).toBeInTheDocument()
  })

  it('drops the flows claim and the caption when external flows are adjusted', () => {
    render(
      <EquityCoverageSummary
        coverage={coverage({ venue_scope: 'spot_only', external_flows_adjusted: true })}
        points={[point({ equity: 100, drawdown: 0.1 })]}
      />
    )

    expect(screen.getByTestId('pnl-equity-honesty-spot')).toBeInTheDocument()
    expect(screen.queryByTestId('pnl-equity-honesty-flows')).not.toBeInTheDocument()
    expect(screen.getByTestId('pnl-drawdown-definition')).toHaveTextContent(
      'Share of the running equity peak.'
    )
    expect(screen.queryByTestId('pnl-drawdown-flows-caveat')).not.toBeInTheDocument()
    expect(screen.queryByText(/external deposits/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/flow-adjusted/i)).not.toBeInTheDocument()
  })
})
