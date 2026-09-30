import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime } from './dateFormat'
import { getCatalogLanguage, getIntlLocale } from '../i18n/countryLanguages'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../i18n/types'

const FIXED = new Date('2026-05-14T12:00:00Z')
const UTC: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }

describe('formatDate', () => {
  it('formats with the locale-derived Intl tag (ga-IE)', () => {
    const result = formatDate(FIXED, 'ie', { dateStyle: 'medium', ...UTC })

    expect(result).toMatch(/2026/)
  })

  it('formats with pl-PL', () => {
    const result = formatDate(FIXED, 'pl', { dateStyle: 'medium', ...UTC })

    expect(result).toMatch(/2026/)
  })

  it('uses the default dateStyle when options omitted', () => {
    const result = formatDate(FIXED, 'us')

    expect(result.length).toBeGreaterThan(0)
  })
})

describe('country and catalog language resolution', () => {
  const formats = [
    [formatDate, { dateStyle: 'medium', ...UTC }],
    [formatTime, { timeStyle: 'short', ...UTC }],
    [formatDateTime, { dateStyle: 'medium', timeStyle: 'short', ...UTC }],
  ] as const

  it.each(SUPPORTED_LOCALES)(
    'formats country %s and its catalog language consistently',
    country => {
      const language = getCatalogLanguage(country)

      for (const [format, options] of formats) {
        const expected = new Intl.DateTimeFormat(getIntlLocale(country), options).format(FIXED)

        expect(format(FIXED, country, options)).toBe(expected)
        expect(format(FIXED, language, options)).toBe(expected)
      }
    }
  )

  it('keeps the Malaysian country code distinct from the Burmese catalog code', () => {
    const options = { dateStyle: 'full', ...UTC } as const
    const malay = formatDate(FIXED, 'my', options)
    const burmese = formatDate(FIXED, 'my-MM', options)

    expect(malay).toBe(new Intl.DateTimeFormat('ms-MY', options).format(FIXED))
    expect(burmese).toBe(new Intl.DateTimeFormat('my-MM', options).format(FIXED))
    expect(malay).not.toBe(burmese)
  })

  it.each(['nn-NO', 'invalid_tag', ''])(
    'uses the configured default for unsupported %s',
    locale => {
      for (const [format, options] of formats) {
        const expected = new Intl.DateTimeFormat(getIntlLocale(DEFAULT_LOCALE), options).format(
          FIXED
        )

        expect(format(FIXED, locale, options)).toBe(expected)
      }
    }
  )
})

describe('formatTime', () => {
  it('formats time with pl-PL', () => {
    const result = formatTime(FIXED, 'pl', { timeStyle: 'short', ...UTC })

    expect(result).toMatch(/\d/)
  })

  it('uses the default timeStyle when options omitted', () => {
    const result = formatTime(FIXED, 'us')

    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDateTime', () => {
  it('returns a combined date + time string', () => {
    const result = formatDateTime(FIXED, 'ie')

    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d/)
  })

  it('honors custom options when provided', () => {
    const result = formatDateTime(FIXED, 'us', { year: 'numeric', ...UTC })

    expect(result).toMatch(/2026/)
  })
})
