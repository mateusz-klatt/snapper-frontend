import { describe, it, expect } from 'vitest'
import { LOCALES } from './locales'
import { SUPPORTED_LOCALES } from './types'

describe('LOCALES metadata', () => {
  it('covers all 45 codes', () => {
    expect(Object.keys(LOCALES)).toHaveLength(45)

    for (const code of SUPPORTED_LOCALES) {
      expect(LOCALES[code]).toBeDefined()
      expect(LOCALES[code].code).toBe(code)
    }
  })

  it('RTL set is exactly {ae, il, ir}', () => {
    const rtl = SUPPORTED_LOCALES.filter(code => LOCALES[code].dir === 'rtl')

    expect(new Set(rtl)).toEqual(new Set(['ae', 'il', 'ir']))
  })

  it('every code has a non-empty flag emoji', () => {
    for (const code of SUPPORTED_LOCALES) {
      expect(LOCALES[code].flag.length).toBeGreaterThan(0)
    }
  })

  it('flag for ie is 🇮🇪 (sanity check)', () => {
    expect(LOCALES.ie.flag).toBe('🇮🇪')
    expect(LOCALES.pl.flag).toBe('🇵🇱')
    expect(LOCALES.us.flag).toBe('🇺🇸')
  })
})
