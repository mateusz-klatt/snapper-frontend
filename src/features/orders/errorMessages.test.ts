import { describe, it, expect } from 'vitest'
import {
  ORDER_ERROR_CODE_KEYS,
  extractErrorCode,
  lookupOrderErrorMessageKey,
} from './errorMessages'

describe('extractErrorCode', () => {
  it('returns null for null', () => {
    expect(extractErrorCode(null)).toBeNull()
  })

  it('returns null for primitives', () => {
    expect(extractErrorCode('string')).toBeNull()
    expect(extractErrorCode(42)).toBeNull()
    expect(extractErrorCode(undefined)).toBeNull()
  })

  it('returns null for an object missing error_code', () => {
    expect(extractErrorCode({ message: 'x' })).toBeNull()
  })

  it('returns null when error_code is not a string', () => {
    expect(extractErrorCode({ error_code: 42 })).toBeNull()
  })

  it('returns the error_code string for a well-formed detail', () => {
    expect(extractErrorCode({ error_code: 'instrument_market_data_only' })).toBe(
      'instrument_market_data_only'
    )
  })
})

describe('lookupOrderErrorMessageKey', () => {
  it('maps the TradFi code to the i18n key suffix', () => {
    expect(lookupOrderErrorMessageKey({ error_code: 'instrument_market_data_only' })).toBe(
      ORDER_ERROR_CODE_KEYS.instrument_market_data_only
    )
  })

  it('maps the unknown_instrument code', () => {
    expect(lookupOrderErrorMessageKey({ error_code: 'unknown_instrument' })).toBe(
      ORDER_ERROR_CODE_KEYS.unknown_instrument
    )
  })

  it('returns null for unknown codes', () => {
    expect(lookupOrderErrorMessageKey({ error_code: 'no_such_code' })).toBeNull()
  })

  it('returns null for missing details', () => {
    expect(lookupOrderErrorMessageKey(null)).toBeNull()
    expect(lookupOrderErrorMessageKey(undefined)).toBeNull()
  })

  it('exposes a caps_violation fallback for cap-rejection paths', () => {
    expect(lookupOrderErrorMessageKey({ error_code: 'caps_violation' })).toBe(
      ORDER_ERROR_CODE_KEYS.caps_violation
    )
  })
})
