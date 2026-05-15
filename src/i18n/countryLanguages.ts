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
  br: 'en',
  se: 'en',
  no: 'en',
  dk: 'en',
  fi: 'en',
  is: 'en',
  gr: 'en',
  cn: 'en',
  hk: 'en',
  jp: 'en',
  kr: 'en',
  th: 'en',
  vn: 'en',
  ph: 'en',
  my: 'en',
  id: 'en',
  mm: 'en',
  in: 'en',
  bd: 'en',
  ke: 'en',
  ae: 'en',
  il: 'en',
  cz: 'en',
  sk: 'en',
  hu: 'en',
  ro: 'en',
  ua: 'en',
  ru: 'en',
  lt: 'en',
  lv: 'en',
  hr: 'en',
  rs: 'en',
  ba: 'en',
  al: 'en',
  tr: 'en',
  ir: 'en',
  am: 'en',
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
