import { getIntlLocale, resolveLanguageTag } from '../i18n/countryLanguages'
import { DEFAULT_LOCALE, isLocale } from '../i18n/types'

/** Accept picker countries first, then catalog languages or browser language tags. */
const intlLocale = (locale: string): string =>
  getIntlLocale(isLocale(locale) ? locale : (resolveLanguageTag(locale) ?? DEFAULT_LOCALE))

export const formatDate = (
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string =>
  new Intl.DateTimeFormat(intlLocale(locale), options ?? { dateStyle: 'medium' }).format(date)

export const formatTime = (
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string =>
  new Intl.DateTimeFormat(intlLocale(locale), options ?? { timeStyle: 'short' }).format(date)

export const formatDateTime = (
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string =>
  new Intl.DateTimeFormat(
    intlLocale(locale),
    options ?? { dateStyle: 'medium', timeStyle: 'short' }
  ).format(date)
