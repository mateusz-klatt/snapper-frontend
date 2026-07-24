import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CashPositionSplit } from './CashPositionSplit'
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

describe('CashPositionSplit', () => {
  it('renders nothing when the window is not sampled', () => {
    const { container } = render(
      <CashPositionSplit
        coverage={coverage({ sampled: false })}
        points={[point({ cash: 10, position_value: 20 })]}
        valuationCcy='USD'
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the latest sampled point cash and position split with a valuation badge', () => {
    const points = [
      point({ equity: 100, cash: 40, position_value: 60 }),
      point({ equity: 120, cash: 550.5, position_value: 700 }),
      point(),
    ]

    render(<CashPositionSplit coverage={coverage()} points={points} valuationCcy='PLN' />)

    expect(screen.getByText('Cash and position split')).toBeInTheDocument()
    expect(screen.getByText('PLN')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-position-value')).toHaveTextContent('700.00')
    expect(screen.getByTestId('pnl-cash-value')).toHaveTextContent('550.50')
  })

  it('shows an em dash when the latest sampled point omits cash or position value', () => {
    render(
      <CashPositionSplit
        coverage={coverage()}
        points={[point({ equity: 100 })]}
        valuationCcy='USD'
      />
    )

    expect(screen.getByTestId('pnl-position-value')).toHaveTextContent('—')
    expect(screen.getByTestId('pnl-cash-value')).toHaveTextContent('—')
  })

  it('shows an em dash when no point carries a persisted sample', () => {
    render(<CashPositionSplit coverage={coverage()} points={[point()]} valuationCcy='USD' />)

    expect(screen.getByTestId('pnl-position-value')).toHaveTextContent('—')
    expect(screen.getByTestId('pnl-cash-value')).toHaveTextContent('—')
  })
})
