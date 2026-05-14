import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime } from './dateFormat'

const FIXED = new Date('2026-05-14T12:00:00Z')
const UTC: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }

describe('formatDate', () => {
  it('formats with the locale-derived Intl tag (en-IE)', () => {
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
})
