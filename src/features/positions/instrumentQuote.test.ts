import { afterEach, describe, expect, it } from 'vitest'
import { formatQuoted, quoteCurrency } from './instrumentQuote'
import i18n from '../../i18n/config'

describe('formatQuoted', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('appends the quote-currency code without rounding away quote precision', () => {
    expect(formatQuoted(4.3836, 'PLN')).toBe('4.3836 PLN')
  })

  it('renders the bare number when the quote is unresolved', () => {
    expect(formatQuoted(4.3836, '')).toBe('4.3836')
  })

  it('keeps a small nonzero quote price visible', () => {
    expect(formatQuoted(0.000000012345, 'BTC')).toBe('0.000000012345 BTC')
  })

  it('localizes the decimal separator while keeping the instrument currency', async () => {
    await i18n.changeLanguage('pl')
    expect(formatQuoted(4.3836, 'PLN')).toBe('4,3836 PLN')
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
