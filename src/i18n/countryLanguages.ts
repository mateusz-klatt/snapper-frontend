import type { AppLocale, CatalogLanguage } from './types'
import { SUPPORTED_LOCALES } from './types'

export const COUNTRY_TO_LANGUAGE: Readonly<Record<AppLocale, CatalogLanguage>> = {
  ie: 'en',
  us: 'en',
  pl: 'pl',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  br: 'pt',
  se: 'sv',
  no: 'no',
  dk: 'da',
  fi: 'fi',
  is: 'is',
  gr: 'el',
  cn: 'zh',
  hk: 'zh',
  jp: 'ja',
  kr: 'ko',
  th: 'en',
  vn: 'vi',
  ph: 'en',
  my: 'en',
  id: 'id',
  mm: 'en',
  in: 'hi',
  bd: 'en',
  ke: 'en',
  ae: 'ar',
  il: 'he',
  cz: 'cs',
  sk: 'sk',
  hu: 'hu',
  ro: 'ro',
  ua: 'uk',
  ru: 'ru',
  lt: 'lt',
  lv: 'lv',
  hr: 'hr',
  rs: 'sr',
  ba: 'bs',
  al: 'sq',
  tr: 'tr',
  ir: 'fa',
  am: 'hy',
}

const buildIntlLocaleMap = (): Readonly<Record<AppLocale, string>> => {
  const entries = SUPPORTED_LOCALES.map(
    code => [code, `${COUNTRY_TO_LANGUAGE[code]}-${code.toUpperCase()}`] as const
  )

  return Object.fromEntries(entries) as Record<AppLocale, string>
}

export const COUNTRY_TO_INTL_LOCALE: Readonly<Record<AppLocale, string>> = buildIntlLocaleMap()

export const getCatalogLanguage = (code: AppLocale): CatalogLanguage => COUNTRY_TO_LANGUAGE[code]

export const getIntlLocale = (code: AppLocale): string => COUNTRY_TO_INTL_LOCALE[code]
