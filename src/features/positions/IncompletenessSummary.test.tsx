import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IncompletenessSummary } from './IncompletenessSummary'
import type { PnlInstrumentContributionData } from '../../types/api'
import type { PnlTimelinePointData } from '../../types/api'

type IncompletenessReasonData = PnlTimelinePointData['incompleteness_reasons'][number]

const point = (
  pointTime: string,
  valuationStatus: 'complete' | 'incomplete',
  incompletenessReasons: IncompletenessReasonData[],
  perInstrument: PnlInstrumentContributionData[] = []
): PnlTimelinePointData => ({
  point_time: pointTime,
  realized_pnl: valuationStatus === 'complete' ? 0 : null,
  fee_pnl: valuationStatus === 'complete' ? 0 : null,
  accrual_pnl: valuationStatus === 'complete' ? 0 : null,
  unrealized_pnl: valuationStatus === 'complete' ? 0 : null,
  net_pnl: valuationStatus === 'complete' ? 0 : null,
  valuation_status: valuationStatus,
  incompleteness_reasons: incompletenessReasons,
  per_instrument: perInstrument,
  attribution: [],
})

const markUnavailable: IncompletenessReasonData = {
  reason: 'mark_unavailable',
  withholding_tier: 'mark_incomplete',
  withholding_scope: 'instrument',
  trigger_instrument_public_id: 'instrument-A',
}

describe('IncompletenessSummary', () => {
  it('renders nothing for a complete loaded window', () => {
    render(<IncompletenessSummary points={[point('2026-01-01T00:00:00Z', 'complete', [])]} />)

    expect(screen.queryByTestId('pnl-incompleteness-summary')).not.toBeInTheDocument()
  })

  it('groups full reason identities across every point without hiding overlaps', () => {
    const executionPriceMark: IncompletenessReasonData = {
      reason: 'execution_price_invalid',
      withholding_tier: 'mark_incomplete',
      withholding_scope: 'instrument',
      trigger_instrument_public_id: 'instrument-B',
    }
    const executionPriceUntrusted: IncompletenessReasonData = {
      ...executionPriceMark,
      withholding_tier: 'untrusted',
    }
    const fillEvidenceGap: IncompletenessReasonData = {
      reason: 'fill_evidence_gap',
      withholding_tier: 'untrusted',
      withholding_scope: 'global',
      trigger_instrument_public_id: null,
    }
    const scopeOrderRegression: IncompletenessReasonData = {
      reason: 'scope_order_regression',
      withholding_tier: 'untrusted',
      withholding_scope: 'global',
      trigger_instrument_public_id: 'instrument-A',
    }
    const points = [
      point(
        '2026-01-01T00:00:00Z',
        'incomplete',
        [
          markUnavailable,
          markUnavailable,
          executionPriceMark,
          executionPriceUntrusted,
          fillEvidenceGap,
          scopeOrderRegression,
        ],
        [
          {
            instrument_public_id: 'instrument-A',
            native_symbol: 'BTC-USD',
            exchange: 'kraken',
            realized_pnl: 0,
            fee_pnl: 0,
            accrual_pnl: 0,
            unrealized_pnl: null,
          },
        ]
      ),
      point('2026-01-01T00:01:00Z', 'complete', []),
      point('2026-01-01T00:02:00Z', 'incomplete', [markUnavailable]),
    ]

    render(<IncompletenessSummary points={points} />)

    expect(screen.getByTestId('pnl-incomplete-badge')).toHaveTextContent('Incomplete points: 2')
    expect(screen.getByText(/Counts can overlap/)).toBeInTheDocument()
    expect(screen.getAllByText('Execution price invalid')).toHaveLength(2)
    expect(screen.getAllByText('MARK-incomplete')).toHaveLength(2)
    expect(screen.getAllByText('UNTRUSTED')).toHaveLength(3)
    expect(screen.getAllByText('Global')).toHaveLength(2)
    expect(screen.getAllByText('Instrument')).toHaveLength(3)
    expect(screen.getAllByText('Trigger instrument: BTC-USD · kraken')).toHaveLength(2)
    expect(screen.getAllByText('Trigger instrument: instrument-B')).toHaveLength(2)

    const groups = screen.getAllByTestId('pnl-incompleteness-group')

    expect(groups).toHaveLength(5)
    expect(
      within(groups[0] as HTMLElement).getByText('Durable fill evidence gap')
    ).toBeInTheDocument()
    expect(within(groups[1] as HTMLElement).getByText('Scope order regression')).toBeInTheDocument()

    const markGroup = screen.getByText('Mark unavailable').closest('li')

    if (markGroup === null) throw new Error('Missing mark-unavailable reason group')
    expect(within(markGroup).getByText('Affected points: 2')).toBeInTheDocument()
  })

  it('does not borrow a trigger identity from a point where the reason did not occur', () => {
    const points = [
      point('2026-01-01T00:00:00Z', 'incomplete', [markUnavailable]),
      point(
        '2026-01-01T00:01:00Z',
        'complete',
        [],
        [
          {
            instrument_public_id: 'instrument-A',
            native_symbol: 'BTC-USD',
            exchange: 'kraken',
            realized_pnl: 0,
            fee_pnl: 0,
            accrual_pnl: 0,
            unrealized_pnl: 0,
          },
        ]
      ),
    ]

    render(<IncompletenessSummary points={points} />)

    expect(screen.getByText('Trigger instrument: instrument-A')).toBeInTheDocument()
    expect(screen.queryByText('Trigger instrument: BTC-USD · kraken')).not.toBeInTheDocument()
  })

  it('uses a matching identity from a later occurrence of the grouped reason', () => {
    const contribution: PnlInstrumentContributionData = {
      instrument_public_id: 'instrument-A',
      native_symbol: 'BTC-USD',
      exchange: 'kraken',
      realized_pnl: 0,
      fee_pnl: 0,
      accrual_pnl: 0,
      unrealized_pnl: null,
    }
    const points = [
      point('2026-01-01T00:00:00Z', 'incomplete', [markUnavailable]),
      point('2026-01-01T00:01:00Z', 'incomplete', [markUnavailable], [contribution]),
    ]

    render(<IncompletenessSummary points={points} />)

    expect(screen.getByText('Trigger instrument: BTC-USD · kraken')).toBeInTheDocument()
    expect(screen.getByText('Affected points: 2')).toBeInTheDocument()
  })
})
