export const ROW_1 = [
  'ie',
  'us',
  'pl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'br',
  'se',
  'no',
  'dk',
  'fi',
  'is',
  'gr',
] as const

export const ROW_2 = [
  'cn',
  'hk',
  'jp',
  'kr',
  'th',
  'vn',
  'ph',
  'my',
  'id',
  'mm',
  'in',
  'bd',
  'ke',
  'ae',
  'il',
] as const

export const ROW_3 = [
  'cz',
  'sk',
  'hu',
  'ro',
  'ua',
  'ru',
  'lt',
  'lv',
  'hr',
  'rs',
  'ba',
  'al',
  'tr',
  'ir',
  'am',
] as const

export const SUPPORTED_LOCALES = [...ROW_1, ...ROW_2, ...ROW_3] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export type CatalogLanguage =
  | 'en'
  | 'pl'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'nl'
  | 'pt'
  | 'sv'
  | 'da'
  | 'no'
  | 'fi'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'vi'
  | 'id'
  | 'ru'
  | 'uk'
  | 'cs'
  | 'sk'
  | 'ro'
  | 'hr'
  | 'sr'
  | 'bs'
  | 'hu'
  | 'sq'
  | 'lt'
  | 'lv'
  | 'el'
  | 'is'
  | 'hy'

export interface LocaleMeta {
  readonly code: AppLocale
  readonly flag: string
  readonly dir: 'ltr' | 'rtl'
}

export const DEFAULT_LOCALE: AppLocale = 'ie'

export const isLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
