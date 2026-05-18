import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FinancialColorPreferencePicker } from './FinancialColorPreferencePicker'
import { useAppStore } from '../../stores/app'

describe('FinancialColorPreferencePicker', () => {
  beforeEach(() => {
    useAppStore.setState({
      financialColorPreference: 'auto',
      locale: 'us',
    })
    localStorage.removeItem('snapper-financial-color-preference')
  })

  it('renders three radio options (auto / rising-green / rising-red)', () => {
    render(<FinancialColorPreferencePicker />)
    const radios = screen.getAllByRole('radio')

    expect(radios).toHaveLength(3)
    expect(radios.map(r => (r as HTMLInputElement).value)).toEqual([
      'auto',
      'rising-green',
      'rising-red',
    ])
  })

  it('marks the current preference as checked', () => {
    useAppStore.setState({ financialColorPreference: 'rising-red' })
    render(<FinancialColorPreferencePicker />)
    const risingRed = screen.getByRole('radio', { name: /East Asian/i })

    expect((risingRed as HTMLInputElement).checked).toBe(true)
  })

  it('persists the new preference to the store when a radio is clicked', () => {
    render(<FinancialColorPreferencePicker />)
    const risingRed = screen.getByRole('radio', { name: /East Asian/i })

    fireEvent.click(risingRed)
    expect(useAppStore.getState().financialColorPreference).toBe('rising-red')
  })

  it('persists the new preference to localStorage when a radio is clicked', () => {
    render(<FinancialColorPreferencePicker />)
    const risingGreen = screen.getByRole('radio', { name: /Western/i })

    fireEvent.click(risingGreen)
    expect(localStorage.getItem('snapper-financial-color-preference')).toBe('rising-green')
  })
})
