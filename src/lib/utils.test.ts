import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { formatBytes, formatNumber, getCookie } from './utils'
import i18n from '../i18n/config'

describe('getCookie', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach(c => {
      const name = (c.split('=')[0] as string).trim()

      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    })
  })
  it('returns empty string for non-existent cookie', () => {
    expect(getCookie('non_existent')).toBe('')
  })
  it('returns cookie value when cookie exists', () => {
    document.cookie = 'csrf_token=abc123; path=/'
    expect(getCookie('csrf_token')).toBe('abc123')
  })
  it('returns correct value when multiple cookies exist', () => {
    document.cookie = 'first=value1; path=/'
    document.cookie = 'csrf_token=abc123; path=/'
    document.cookie = 'last=value3; path=/'
    expect(getCookie('csrf_token')).toBe('abc123')
  })
  it('handles cookies with special characters', () => {
    const encodedValue = encodeURIComponent('special=value;')

    document.cookie = `csrf_token=${encodedValue}; path=/`
    expect(getCookie('csrf_token')).toBe(encodedValue)
  })
  it('returns correct value when cookie name is a prefix of another', () => {
    document.cookie = 'test=value1; path=/'
    document.cookie = 'test_long=value2; path=/'
    expect(getCookie('test')).toBe('value1')
  })
})

describe('formatNumber', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('uses US grouping for the English catalog', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
  it('forwards Intl.NumberFormatOptions for currency-style formatting', () => {
    expect(formatNumber(1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(
      '1,234.50'
    )
  })

  it('uses the active German language for decimal and grouping separators', async () => {
    await i18n.changeLanguage('de')
    expect(formatNumber(1234.5)).toBe('1.234,5')
  })

  it('maps a Portuguese catalog to the Brazilian formatting locale', async () => {
    await i18n.changeLanguage('pt')
    expect(formatNumber(1234.5)).toBe('1.234,5')
  })

  it('uses the configured default when the active language cannot be resolved', () => {
    const previousLanguage = i18n.language

    i18n.language = 'invalid_tag'

    try {
      expect(formatNumber(1234.5)).toBe('1,234.5')
    } finally {
      i18n.language = previousLanguage
    }
  })
})

describe('formatBytes', () => {
  it('renders values below one kibibyte as bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('renders sub-mebibyte values in kibibytes with one decimal', () => {
    expect(formatBytes(128 * 1024)).toBe('128.0 KiB')
  })

  it('renders sub-gibibyte values in mebibytes with one decimal', () => {
    expect(formatBytes(256 * 1024 * 1024)).toBe('256.0 MiB')
  })

  it('switches to gibibytes at the 1024 MiB boundary', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GiB')
  })
  it('renders multi-gibibyte values with two decimals', () => {
    expect(formatBytes(2560 * 1024 * 1024)).toBe('2.50 GiB')
  })
})
