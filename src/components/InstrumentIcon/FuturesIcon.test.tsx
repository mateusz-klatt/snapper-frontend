import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FuturesIcon } from './FuturesIcon'
import type { FlagIconSpec, FuturesQuarter, IconSpec } from './types'

const FLAG_EUR: FlagIconSpec = { kind: 'flag', country: 'eu' }
const FLAG_USD: FlagIconSpec = { kind: 'flag', country: 'us' }
const LUCIDE_INDEX: IconSpec = { kind: 'lucide', name: 'trending-up' }

describe('FuturesIcon', () => {
  describe('pair futures (4-glyph composite)', () => {
    it('renders the underlying PairIcon plus the expiry overlay', () => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-icon')).toBeInTheDocument()
      expect(screen.getByTestId('futures-expiry-overlay')).toBeInTheDocument()
    })

    it.each<readonly [FuturesQuarter, string]>([
      [1, '🌸'],
      [2, '☀️'],
      [3, '🍂'],
      [4, '❄️'],
    ])('maps quarter %s to season glyph %s', (quarter, glyph) => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={quarter} monthInQuarter={1} />)
      const overlay = screen.getByTestId('futures-expiry-overlay')

      expect(overlay.textContent).toContain(glyph)
    })

    it.each<readonly [1 | 2 | 3]>([[1], [2], [3]])('renders month-in-quarter digit %s', digit => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={digit} />)
      const overlay = screen.getByTestId('futures-expiry-overlay')

      expect(overlay.textContent).toContain(String(digit))
    })
  })

  describe('single-asset futures (3-glyph composite)', () => {
    it('renders the underlying SingleAssetIcon when quote is undefined', () => {
      render(<FuturesIcon base={LUCIDE_INDEX} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-icon')).toBeInTheDocument()
      expect(screen.getByTestId('futures-expiry-overlay')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('marks the expiry overlay as aria-hidden', () => {
      render(<FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} />)

      expect(screen.getByTestId('futures-expiry-overlay')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('size scaling', () => {
    it('scales the overlay font with the icon size', () => {
      render(
        <FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} size={48} />
      )
      const overlay = screen.getByTestId('futures-expiry-overlay')

      expect((overlay as HTMLElement).style.fontSize).toBe('20px')
    })

    it('clamps overlay font to a minimum readable size at very small icon sizes', () => {
      render(
        <FuturesIcon base={FLAG_EUR} quote={FLAG_USD} quarter={2} monthInQuarter={3} size={14} />
      )
      const overlay = screen.getByTestId('futures-expiry-overlay')

      expect((overlay as HTMLElement).style.fontSize).toBe('8px')
    })
  })
})
