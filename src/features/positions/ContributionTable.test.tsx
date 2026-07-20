import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContributionTable } from './ContributionTable'
import type { PnlInstrumentContributionData } from '../../types/api'

const contribution = (
  overrides: Partial<PnlInstrumentContributionData> = {}
): PnlInstrumentContributionData => ({
  instrument_public_id: 'instrument-1',
  realized_pnl: 10,
  fee_pnl: -2,
  accrual_pnl: 0,
  unrealized_pnl: 5,
  ...overrides,
})

describe('ContributionTable', () => {
  it('renders signed component values, their net contribution, and valuation currency', () => {
    render(<ContributionTable contributions={[contribution()]} valuationCcy='USD' />)

    expect(screen.getByText('Latest per-instrument contributions')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByTestId('contribution-instrument-1-realized')).toHaveTextContent('+10.00')
    expect(screen.getByTestId('contribution-instrument-1-realized').className).toContain(
      'text-rising-600'
    )
    expect(screen.getByTestId('contribution-instrument-1-fees')).toHaveTextContent('-2.00')
    expect(screen.getByTestId('contribution-instrument-1-fees').className).toContain(
      'text-falling-600'
    )
    expect(screen.getByTestId('contribution-instrument-1-accrual')).toHaveTextContent('0.00')
    expect(screen.getByTestId('contribution-instrument-1-accrual').className).toContain(
      'text-muted-500'
    )
    expect(screen.getByTestId('contribution-instrument-1-net')).toHaveTextContent('+13.00')
  })

  it('renders every withheld component and its untrustworthy net as an em dash', () => {
    render(
      <ContributionTable
        contributions={[
          contribution({
            instrument_public_id: 'withheld',
            realized_pnl: null,
            fee_pnl: null,
            accrual_pnl: null,
            unrealized_pnl: null,
          }),
        ]}
        valuationCcy='USD'
      />
    )

    const withheldCells = ['realized', 'fees', 'accrual', 'unrealized', 'net'].map(name =>
      screen.getByTestId(`contribution-withheld-${name}`)
    )

    for (const cell of withheldCells) {
      expect(cell).toHaveTextContent('—')
      expect(cell).not.toHaveTextContent('0')
      expect(cell.className).toContain('text-muted-500')
    }
  })

  it('renders the translated empty contribution state', () => {
    render(<ContributionTable contributions={[]} valuationCcy='USD' />)

    expect(screen.getByTestId('contributions-empty')).toHaveTextContent(
      'No instrument contributions are available.'
    )
    expect(screen.queryByTestId('contributions-table')).not.toBeInTheDocument()
  })
})
