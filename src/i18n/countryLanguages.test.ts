import { describe, it, expect } from 'vitest'
import {
  COUNTRY_TO_LANGUAGE,
  COUNTRY_TO_INTL_LOCALE,
  getCatalogLanguage,
  getIntlLocale,
} from './countryLanguages'
import { SUPPORTED_LOCALES } from './types'

const NATIVE_LANGUAGE_COUNTRIES = [
  'pl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'br',
  'se',
  'dk',
  'no',
  'fi',
] as const

describe('COUNTRY_TO_LANGUAGE', () => {
  it('maps native-language countries to their own catalog', () => {
    expect(COUNTRY_TO_LANGUAGE.pl).toBe('pl')
    expect(COUNTRY_TO_LANGUAGE.de).toBe('de')
    expect(COUNTRY_TO_LANGUAGE.fr).toBe('fr')
    expect(COUNTRY_TO_LANGUAGE.es).toBe('es')
    expect(COUNTRY_TO_LANGUAGE.it).toBe('it')
    expect(COUNTRY_TO_LANGUAGE.nl).toBe('nl')
    expect(COUNTRY_TO_LANGUAGE.br).toBe('pt')
    expect(COUNTRY_TO_LANGUAGE.se).toBe('sv')
    expect(COUNTRY_TO_LANGUAGE.dk).toBe('da')
    expect(COUNTRY_TO_LANGUAGE.no).toBe('no')
    expect(COUNTRY_TO_LANGUAGE.fi).toBe('fi')
  })

  it('maps countries without a native catalog to en', () => {
    const fallbackCodes = SUPPORTED_LOCALES.filter(
      code => !(NATIVE_LANGUAGE_COUNTRIES as readonly string[]).includes(code)
    )

    expect(fallbackCodes.length).toBe(SUPPORTED_LOCALES.length - NATIVE_LANGUAGE_COUNTRIES.length)

    for (const code of fallbackCodes) {
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
    expect(COUNTRY_TO_INTL_LOCALE.de).toBe('de-DE')
    expect(COUNTRY_TO_INTL_LOCALE.fr).toBe('fr-FR')
    expect(COUNTRY_TO_INTL_LOCALE.es).toBe('es-ES')
    expect(COUNTRY_TO_INTL_LOCALE.it).toBe('it-IT')
    expect(COUNTRY_TO_INTL_LOCALE.nl).toBe('nl-NL')
    expect(COUNTRY_TO_INTL_LOCALE.br).toBe('pt-BR')
    expect(COUNTRY_TO_INTL_LOCALE.se).toBe('sv-SE')
    expect(COUNTRY_TO_INTL_LOCALE.dk).toBe('da-DK')
    expect(COUNTRY_TO_INTL_LOCALE.no).toBe('no-NO')
    expect(COUNTRY_TO_INTL_LOCALE.fi).toBe('fi-FI')
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
    expect(getCatalogLanguage('de')).toBe('de')
    expect(getCatalogLanguage('fr')).toBe('fr')
    expect(getCatalogLanguage('us')).toBe('en')
  })

  it('getIntlLocale returns the BCP-47 tag', () => {
    expect(getIntlLocale('pl')).toBe('pl-PL')
    expect(getIntlLocale('ie')).toBe('en-IE')
    expect(getIntlLocale('de')).toBe('de-DE')
  })
})
