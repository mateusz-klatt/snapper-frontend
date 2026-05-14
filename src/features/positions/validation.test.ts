import { describe, expect, it } from 'vitest'

import { validateBracketPrices, validateTrailingStopParams } from './validation'

describe('validateBracketPrices', () => {
  it('requires at least one bracket price', () => {
    expect(validateBracketPrices(null, null, 'LONG', 100)).toEqual({
      key: 'bracketRequired',
    })
  })

  it('validates long-side bracket relations', () => {
    expect(validateBracketPrices(110, null, 'LONG', 100)).toEqual({
      key: 'slLongBelowEntry',
      params: { price: '$100.00' },
    })
    expect(validateBracketPrices(null, 90, 'LONG', 100)).toEqual({
      key: 'tpLongAboveEntry',
      params: { price: '$100.00' },
    })
  })

  it('validates short-side bracket relations', () => {
    expect(validateBracketPrices(90, null, 'SHORT', 100)).toEqual({
      key: 'slShortAboveEntry',
      params: { price: '$100.00' },
    })
    expect(validateBracketPrices(null, 110, 'SHORT', 100)).toEqual({
      key: 'tpShortBelowEntry',
      params: { price: '$100.00' },
    })
  })

  it('returns null for valid bracket prices', () => {
    expect(validateBracketPrices(95, 110, 'LONG', 100)).toBeNull()
    expect(validateBracketPrices(105, 90, 'SHORT', 100)).toBeNull()
  })
})

describe('validateTrailingStopParams', () => {
  it('validates trailing stop percentage bounds', () => {
    expect(validateTrailingStopParams(null, null)).toEqual({ key: 'trailingRequired' })
    expect(validateTrailingStopParams(0, null)).toEqual({ key: 'trailingRange' })
  })

  it('validates min lock percentage bounds', () => {
    expect(validateTrailingStopParams(5, 100)).toEqual({ key: 'minLockRange' })
    expect(validateTrailingStopParams(5, 2)).toBeNull()
  })
})
