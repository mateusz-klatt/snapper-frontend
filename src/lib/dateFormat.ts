import { COUNTRY_TO_INTL_LOCALE } from '../i18n/countryLanguages'
import type { AppLocale } from '../i18n/types'

const intlLocale = (locale: AppLocale): string => COUNTRY_TO_INTL_LOCALE[locale]

export const formatDate = (
  date: Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions
): string =>
  new Intl.DateTimeFormat(intlLocale(locale), options ?? { dateStyle: 'medium' }).format(date)

export const formatTime = (
  date: Date,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions
): string =>
  new Intl.DateTimeFormat(intlLocale(locale), options ?? { timeStyle: 'short' }).format(date)

export const formatDateTime = (date: Date, locale: AppLocale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
