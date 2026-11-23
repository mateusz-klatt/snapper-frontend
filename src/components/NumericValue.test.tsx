import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatMoney } from '../lib/numberFormat'
import { NumericValue } from './NumericValue'

describe('NumericValue', () => {
  it('renders aligned digits and exposes the exact value when rounding hides it', () => {
    const formatted = formatMoney(0.0645, { locale: 'en-US', currency: 'USD' })

    render(<NumericValue formatted={formatted} className='text-rising-400' />)
    const value = screen.getByText('0.06')

    expect(value).toHaveClass('tabular-nums', 'text-rising-400')
    expect(value).toHaveAttribute('title', formatted.exactText)
  })

  it('omits the tooltip when the displayed value is exact', () => {
    const formatted = formatMoney(1000, { locale: 'en-US', currency: 'USD' })

    render(<NumericValue formatted={formatted} />)
    expect(screen.getByText('1,000.00')).not.toHaveAttribute('title')
  })
})
