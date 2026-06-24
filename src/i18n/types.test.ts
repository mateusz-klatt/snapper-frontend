import { describe, it, expect } from 'vitest'
import { ROW_1, ROW_2, ROW_3, SUPPORTED_LOCALES, DEFAULT_LOCALE, isLocale } from './types'

describe('locale rows', () => {
  it('has 15 entries per row, 45 total, no duplicates', () => {
    expect(ROW_1).toHaveLength(15)
    expect(ROW_2).toHaveLength(15)
    expect(ROW_3).toHaveLength(15)
    expect(SUPPORTED_LOCALES).toHaveLength(45)
    expect(new Set(SUPPORTED_LOCALES).size).toBe(45)
  })

  it('row order mirrors www.klatt.ie verbatim', () => {
    expect(ROW_1[0]).toBe('ie')
    expect(ROW_1[14]).toBe('gr')
    expect(ROW_2[0]).toBe('cn')
    expect(ROW_2[14]).toBe('il')
    expect(ROW_3[0]).toBe('cz')
    expect(ROW_3[14]).toBe('am')
  })

  it('DEFAULT_LOCALE is ie (klatt.ie homepage convention)', () => {
    expect(DEFAULT_LOCALE).toBe('ie')
  })
})

describe('isLocale', () => {
  it('accepts supported codes', () => {
    expect(isLocale('ie')).toBe(true)
    expect(isLocale('pl')).toBe(true)
    expect(isLocale('us')).toBe(true)
    expect(isLocale('am')).toBe(true)
  })

  it('rejects non-string', () => {
    expect(isLocale(null)).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(42)).toBe(false)
    expect(isLocale({})).toBe(false)
  })

  it('rejects unsupported codes', () => {
    expect(isLocale('xx')).toBe(false)
    expect(isLocale('en')).toBe(false)
    expect(isLocale('gb')).toBe(false)
    expect(isLocale('')).toBe(false)
  })
})
