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
  'cn',
  'hk',
  'jp',
  'kr',
  'vn',
  'id',
  'cz',
  'sk',
  'ro',
  'ua',
  'ru',
  'hr',
  'rs',
  'ba',
  'hu',
  'al',
  'lt',
  'lv',
  'gr',
  'is',
  'am',
  'tr',
  'ae',
  'il',
  'ir',
  'in',
  'th',
  'my',
  'bd',
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
    expect(COUNTRY_TO_LANGUAGE.cn).toBe('zh')
    expect(COUNTRY_TO_LANGUAGE.hk).toBe('zh')
    expect(COUNTRY_TO_LANGUAGE.jp).toBe('ja')
    expect(COUNTRY_TO_LANGUAGE.kr).toBe('ko')
    expect(COUNTRY_TO_LANGUAGE.vn).toBe('vi')
    expect(COUNTRY_TO_LANGUAGE.id).toBe('id')
    expect(COUNTRY_TO_LANGUAGE.cz).toBe('cs')
    expect(COUNTRY_TO_LANGUAGE.sk).toBe('sk')
    expect(COUNTRY_TO_LANGUAGE.ro).toBe('ro')
    expect(COUNTRY_TO_LANGUAGE.ua).toBe('uk')
    expect(COUNTRY_TO_LANGUAGE.ru).toBe('ru')
    expect(COUNTRY_TO_LANGUAGE.hr).toBe('hr')
    expect(COUNTRY_TO_LANGUAGE.rs).toBe('sr')
    expect(COUNTRY_TO_LANGUAGE.ba).toBe('bs')
    expect(COUNTRY_TO_LANGUAGE.hu).toBe('hu')
    expect(COUNTRY_TO_LANGUAGE.al).toBe('sq')
    expect(COUNTRY_TO_LANGUAGE.lt).toBe('lt')
    expect(COUNTRY_TO_LANGUAGE.lv).toBe('lv')
    expect(COUNTRY_TO_LANGUAGE.gr).toBe('el')
    expect(COUNTRY_TO_LANGUAGE.is).toBe('is')
    expect(COUNTRY_TO_LANGUAGE.am).toBe('hy')
    expect(COUNTRY_TO_LANGUAGE.tr).toBe('tr')
    expect(COUNTRY_TO_LANGUAGE.ae).toBe('ar')
    expect(COUNTRY_TO_LANGUAGE.il).toBe('he')
    expect(COUNTRY_TO_LANGUAGE.ir).toBe('fa')
    expect(COUNTRY_TO_LANGUAGE.in).toBe('hi')
    expect(COUNTRY_TO_LANGUAGE.th).toBe('th')
    expect(COUNTRY_TO_LANGUAGE.my).toBe('ms')
    expect(COUNTRY_TO_LANGUAGE.bd).toBe('bn')
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
    expect(COUNTRY_TO_INTL_LOCALE.cn).toBe('zh-CN')
    expect(COUNTRY_TO_INTL_LOCALE.jp).toBe('ja-JP')
    expect(COUNTRY_TO_INTL_LOCALE.kr).toBe('ko-KR')
    expect(COUNTRY_TO_INTL_LOCALE.vn).toBe('vi-VN')
    expect(COUNTRY_TO_INTL_LOCALE.id).toBe('id-ID')
    expect(COUNTRY_TO_INTL_LOCALE.cz).toBe('cs-CZ')
    expect(COUNTRY_TO_INTL_LOCALE.sk).toBe('sk-SK')
    expect(COUNTRY_TO_INTL_LOCALE.ro).toBe('ro-RO')
    expect(COUNTRY_TO_INTL_LOCALE.ua).toBe('uk-UA')
    expect(COUNTRY_TO_INTL_LOCALE.ru).toBe('ru-RU')
    expect(COUNTRY_TO_INTL_LOCALE.hr).toBe('hr-HR')
    expect(COUNTRY_TO_INTL_LOCALE.rs).toBe('sr-RS')
    expect(COUNTRY_TO_INTL_LOCALE.ba).toBe('bs-BA')
    expect(COUNTRY_TO_INTL_LOCALE.hu).toBe('hu-HU')
    expect(COUNTRY_TO_INTL_LOCALE.al).toBe('sq-AL')
    expect(COUNTRY_TO_INTL_LOCALE.lt).toBe('lt-LT')
    expect(COUNTRY_TO_INTL_LOCALE.lv).toBe('lv-LV')
    expect(COUNTRY_TO_INTL_LOCALE.gr).toBe('el-GR')
    expect(COUNTRY_TO_INTL_LOCALE.is).toBe('is-IS')
    expect(COUNTRY_TO_INTL_LOCALE.am).toBe('hy-AM')
    expect(COUNTRY_TO_INTL_LOCALE.tr).toBe('tr-TR')
    expect(COUNTRY_TO_INTL_LOCALE.ae).toBe('ar-AE')
    expect(COUNTRY_TO_INTL_LOCALE.il).toBe('he-IL')
    expect(COUNTRY_TO_INTL_LOCALE.ir).toBe('fa-IR')
    expect(COUNTRY_TO_INTL_LOCALE.in).toBe('hi-IN')
    expect(COUNTRY_TO_INTL_LOCALE.th).toBe('th-TH')
    expect(COUNTRY_TO_INTL_LOCALE.my).toBe('ms-MY')
    expect(COUNTRY_TO_INTL_LOCALE.bd).toBe('bn-BD')
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
