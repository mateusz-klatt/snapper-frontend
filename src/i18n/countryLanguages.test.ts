import { describe, it, expect } from 'vitest'
import {
  COUNTRY_TO_LANGUAGE,
  COUNTRY_TO_INTL_LOCALE,
  getCatalogLanguage,
  getIntlLocale,
} from './countryLanguages'
import { SUPPORTED_LOCALES } from './types'

describe('COUNTRY_TO_LANGUAGE', () => {
  it('maps pl → pl, all other 44 codes → en', () => {
    expect(COUNTRY_TO_LANGUAGE.pl).toBe('pl')
    const otherCodes = SUPPORTED_LOCALES.filter(code => code !== 'pl')

    expect(otherCodes.length).toBe(44)

    for (const code of otherCodes) {
      expect(COUNTRY_TO_LANGUAGE[code]).toBe('en')
    }
  })

  it('covers all 45 codes', () => {
    expect(Object.keys(COUNTRY_TO_LANGUAGE).length).toBe(45)
  })
})

describe('COUNTRY_TO_INTL_LOCALE', () => {
  it('formats as <catalogLanguage>-<COUNTRY>', () => {
    expect(COUNTRY_TO_INTL_LOCALE.ie).toBe('en-IE')
    expect(COUNTRY_TO_INTL_LOCALE.us).toBe('en-US')
    expect(COUNTRY_TO_INTL_LOCALE.pl).toBe('pl-PL')
    expect(COUNTRY_TO_INTL_LOCALE.de).toBe('en-DE')
    expect(COUNTRY_TO_INTL_LOCALE.ae).toBe('en-AE')
    expect(COUNTRY_TO_INTL_LOCALE.cn).toBe('en-CN')
  })

  it('covers all 45 codes', () => {
    expect(Object.keys(COUNTRY_TO_INTL_LOCALE).length).toBe(45)
  })
})

describe('helpers', () => {
  it('getCatalogLanguage returns the mapped language', () => {
    expect(getCatalogLanguage('pl')).toBe('pl')
    expect(getCatalogLanguage('ie')).toBe('en')
    expect(getCatalogLanguage('de')).toBe('en')
  })

  it('getIntlLocale returns the BCP-47 tag', () => {
    expect(getIntlLocale('pl')).toBe('pl-PL')
    expect(getIntlLocale('ie')).toBe('en-IE')
  })
})
