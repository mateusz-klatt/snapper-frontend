import type { AppLocale, CatalogLanguage } from './types'
import { SUPPORTED_LOCALES } from './types'

export const COUNTRY_TO_LANGUAGE: Readonly<Record<AppLocale, CatalogLanguage>> = {
  ie: 'ga',
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
  hk: 'zh-Hant',
  jp: 'ja',
  kr: 'ko',
  th: 'th',
  vn: 'vi',
  ph: 'fil',
  my: 'ms',
  id: 'id',
  mm: 'my-MM',
  in: 'hi',
  bd: 'bn',
  ke: 'sw',
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

const INTL_LOCALE_OVERRIDES: Readonly<Partial<Record<AppLocale, string>>> = {
  rs: 'sr-Latn-RS',
  hk: 'zh-Hant-HK',
  mm: 'my-MM',
}

const buildIntlLocaleMap = (): Readonly<Record<AppLocale, string>> => {
  const entries = SUPPORTED_LOCALES.map(
    code =>
      [
        code,
        INTL_LOCALE_OVERRIDES[code] ?? `${COUNTRY_TO_LANGUAGE[code]}-${code.toUpperCase()}`,
      ] as const
  )

  return Object.fromEntries(entries) as Record<AppLocale, string>
}

export const COUNTRY_TO_INTL_LOCALE: Readonly<Record<AppLocale, string>> = buildIntlLocaleMap()

export const getCatalogLanguage = (code: AppLocale): CatalogLanguage => COUNTRY_TO_LANGUAGE[code]

export const getIntlLocale = (code: AppLocale): string => COUNTRY_TO_INTL_LOCALE[code]
