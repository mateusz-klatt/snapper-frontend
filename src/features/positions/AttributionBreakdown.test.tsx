import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import i18n from '../../i18n/config'
import type { PnlTimelinePointData } from '../../types/api'
import { AttributionBreakdown } from './AttributionBreakdown'

type Attribution = PnlTimelinePointData['attribution']
type AttributionContribution = Attribution[number]

const contribution = (
  overrides: Partial<AttributionContribution> = {}
): AttributionContribution => ({
  origin: 'manual',
  strategy_name: null,
  realized_pnl: 10,
  fee_pnl: -2,
  accrual_pnl: 0,
  unrealized_pnl: 5,
  ...overrides,
})

beforeEach(() => {
  void i18n.changeLanguage('en')
})

describe('AttributionBreakdown', () => {
  it('sorts every origin, renders strategies and signed components, and is accessible', () => {
    render(
      <AttributionBreakdown
        attribution={[
          contribution({
            origin: 'system',
            strategy_name: 'momentum',
            realized_pnl: -3,
          }),
          contribution({ origin: 'unattributed', realized_pnl: 1 }),
          contribution({ origin: 'plan', strategy_name: 'rebalance', realized_pnl: 2 }),
          contribution({ origin: 'manual' }),
        ]}
        valuationCcy='PLN'
      />
    )

    expect(
      screen.getByRole('region', {
        name: i18n.t('timeline.attribution.title', { ns: 'positions' }),
      })
    ).toBeInTheDocument()
    const table = screen.getByRole('table', {
      name: i18n.t('timeline.attribution.ariaLabel', { ns: 'positions' }),
    })

    expect(within(table).getAllByRole('columnheader')).toHaveLength(6)
    expect(
      within(table).getByRole('columnheader', {
        name: i18n.t('timeline.attribution.origin', { ns: 'positions' }),
      })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('columnheader', {
        name: i18n.t('timeline.markers.detail.strategyName', { ns: 'positions' }),
      })
    ).toBeInTheDocument()
    expect(screen.getByText('PLN')).toBeInTheDocument()
    expect(screen.getByTestId('attribution-value-semantics')).toHaveTextContent(
      i18n.t('timeline.attribution.valueSemantics', { ns: 'positions' })
    )

    const originLabels = within(table)
      .getAllByRole('row')
      .slice(1)
      .map(row => within(row).getAllByRole('rowheader')[0]?.textContent)

    expect(within(table).getAllByRole('rowheader')).toHaveLength(8)
    expect(originLabels).toEqual([
      i18n.t('timeline.attribution.origins.manual', { ns: 'positions' }),
      i18n.t('timeline.attribution.origins.plan', { ns: 'positions' }),
      i18n.t('timeline.attribution.origins.system', { ns: 'positions' }),
      i18n.t('timeline.attribution.origins.unattributed', { ns: 'positions' }),
    ])
    expect(screen.getByTestId('attribution-manual-0-strategy')).toHaveTextContent(
      i18n.t('timeline.attribution.noStrategy', { ns: 'positions' })
    )
    expect(screen.getByTestId('attribution-plan-1-strategy')).toHaveTextContent('rebalance')
    expect(screen.getByTestId('attribution-system-2-strategy')).toHaveTextContent('momentum')

    const positive = screen.getByTestId('attribution-manual-0-realized_pnl')
    const negative = screen.getByTestId('attribution-manual-0-fee_pnl')
    const zero = screen.getByTestId('attribution-manual-0-accrual_pnl')

    expect(positive).toHaveTextContent('+10.00')
    expect(positive.className).toContain('text-rising-600')
    expect(negative).toHaveTextContent('-2.00')
    expect(negative.className).toContain('text-falling-600')
    expect(zero).toHaveTextContent('0.00')
    expect(zero.className).toContain('text-muted-500')
  })

  it('renders a genuine zero and a withheld component distinctly', () => {
    render(
      <AttributionBreakdown
        attribution={[
          contribution({
            realized_pnl: 0,
            fee_pnl: null,
            accrual_pnl: 5,
            unrealized_pnl: -5,
          }),
        ]}
        valuationCcy='USD'
      />
    )

    const zero = screen.getByTestId('attribution-manual-0-realized_pnl')
    const withheld = screen.getByTestId('attribution-manual-0-fee_pnl')

    expect(zero.textContent).toBe('0.00')
    expect(withheld.textContent).toBe(i18n.t('timeline.attribution.withheld', { ns: 'positions' }))
    expect(withheld.textContent).not.toMatch(/[0\-–—]/)
    expect(withheld.className).toContain('text-muted-500')
    expect(screen.getByTestId('attribution-manual-0-accrual_pnl')).toHaveTextContent('+5.00')
    expect(screen.getByTestId('attribution-manual-0-unrealized_pnl')).toHaveTextContent('-5.00')
  })

  it('keeps a single all-null unattributed bucket visible as withheld', () => {
    render(
      <AttributionBreakdown
        attribution={[
          contribution({
            origin: 'unattributed',
            realized_pnl: null,
            fee_pnl: null,
            accrual_pnl: null,
            unrealized_pnl: null,
          }),
        ]}
        valuationCcy='EUR'
      />
    )

    expect(screen.getByTestId('attribution-unattributed-0-origin')).toHaveTextContent(
      i18n.t('timeline.attribution.origins.unattributed', { ns: 'positions' })
    )
    expect(screen.getByTestId('attribution-unattributed-0-strategy')).toHaveTextContent(
      i18n.t('timeline.attribution.noStrategy', { ns: 'positions' })
    )

    for (const field of ['realized_pnl', 'fee_pnl', 'accrual_pnl', 'unrealized_pnl']) {
      const cell = screen.getByTestId(`attribution-unattributed-0-${field}`)

      expect(cell.textContent).toBe(i18n.t('timeline.attribution.withheld', { ns: 'positions' }))
      expect(cell.textContent).not.toMatch(/[0\-–—]/)
    }

    expect(screen.queryByTestId('attribution-empty')).not.toBeInTheDocument()
  })

  it('renders an explicit empty state without fabricating a bucket', () => {
    render(<AttributionBreakdown attribution={[]} valuationCcy='USD' />)

    expect(screen.getByTestId('attribution-empty')).toHaveTextContent(
      i18n.t('timeline.attribution.empty', { ns: 'positions' })
    )
    expect(screen.queryByTestId('attribution-table')).not.toBeInTheDocument()
    expect(screen.queryByRole('row')).not.toBeInTheDocument()
  })
})
