import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FuturesIcon } from './FuturesIcon'
import type { FlagIconSpec, FuturesQuarter, IconSpec } from './types'

const FLAG_EUR: FlagIconSpec = { kind: 'flag', country: 'eu' }
const FLAG_USD: FlagIconSpec = { kind: 'flag', country: 'us' }
const LUCIDE_INDEX: IconSpec = { kind: 'lucide', name: 'trending-up' }

describe('FuturesIcon', () => {
  describe('pair futures (4-glyph side-by-side composite)', () => {
    it('renders the underlying PairIcon plus a quarter-glyph + month-digit cell', () => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-icon')).toBeInTheDocument()
      expect(screen.getByTestId('futures-quarter-glyph')).toBeInTheDocument()
      expect(screen.getByTestId('futures-month-glyph')).toBeInTheDocument()
    })

    it.each<readonly [FuturesQuarter, string]>([
      [1, '🌸'],
      [2, '☀️'],
      [3, '🍂'],
      [4, '❄️'],
    ])('maps quarter %s to season glyph %s', (quarter, glyph) => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={quarter} monthInQuarter={1} />)
      const quarterCell = screen.getByTestId('futures-quarter-glyph')

      expect(quarterCell.textContent).toContain(glyph)
    })

    it.each<readonly [1 | 2 | 3]>([[1], [2], [3]])('renders month-in-quarter digit %s', digit => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={digit} />)
      const monthCell = screen.getByTestId('futures-month-glyph')

      expect(monthCell.textContent).toBe(String(digit))
    })
  })

  describe('single-asset futures (3-glyph side-by-side composite)', () => {
    it('renders the underlying SingleAssetIcon when quote is undefined', () => {
      render(<FuturesIcon base={LUCIDE_INDEX} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-icon')).toBeInTheDocument()
      expect(screen.getByTestId('futures-quarter-glyph')).toBeInTheDocument()
      expect(screen.getByTestId('futures-month-glyph')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('marks the quarter + month glyph cells as aria-hidden', () => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-quarter-glyph')).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByTestId('futures-month-glyph')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('size scaling — each cell is a full-size circle, no scaling-down or overlap', () => {
    it('renders quarter + month cells at the requested icon size', () => {
      render(
        <FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} size={48} />
      )
      const quarterCell = screen.getByTestId('futures-quarter-glyph')
      const monthCell = screen.getByTestId('futures-month-glyph')

      expect((quarterCell as HTMLElement).style.width).toBe('48px')
      expect((quarterCell as HTMLElement).style.height).toBe('48px')
      expect((monthCell as HTMLElement).style.width).toBe('48px')
      expect((monthCell as HTMLElement).style.height).toBe('48px')
    })
  })
})
