import { describe, expect, it } from 'vitest'
import { formatQuoted, quoteCurrency } from './instrumentQuote'

describe('formatQuoted', () => {
  it('appends the quote-currency code to a fixed-decimal price', () => {
    expect(formatQuoted(4.3836, 'PLN')).toBe('4.38 PLN')
  })

  it('renders the bare number when the quote is unresolved', () => {
    expect(formatQuoted(4.3836, '')).toBe('4.38')
  })
})

describe('quoteCurrency', () => {
  it('returns the quote segment of a canonical fiat pair', () => {
    expect(quoteCurrency('EUR-PLN')).toBe('PLN')
  })

  it('returns the quote segment of a canonical dollar pair', () => {
    expect(quoteCurrency('BTC-USD')).toBe('USD')
  })

  it('uses the final hyphen so a multiplier-prefixed base still yields the quote', () => {
    expect(quoteCurrency('1000-SHIB-USD')).toBe('USD')
  })

  it('resolves to empty when the symbol has no separator', () => {
    expect(quoteCurrency('EURPLN')).toBe('')
  })

  it('resolves to empty when the base segment is missing', () => {
    expect(quoteCurrency('-PLN')).toBe('')
  })

  it('resolves to empty when the quote segment is missing', () => {
    expect(quoteCurrency('EUR-')).toBe('')
  })
})
