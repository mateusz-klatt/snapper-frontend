import { describe, it, expect } from 'vitest'
import { formatDurationMs } from './duration'

describe('formatDurationMs', () => {
  it('keeps sub-second values in milliseconds', () => {
    expect(formatDurationMs(0)).toBe('0ms')
    expect(formatDurationMs(627)).toBe('627ms')
    expect(formatDurationMs(999)).toBe('999ms')
  })

  it('shows seconds with one decimal under a minute', () => {
    expect(formatDurationMs(1000)).toBe('1.0s')
    expect(formatDurationMs(1666)).toBe('1.7s')
    expect(formatDurationMs(59_900)).toBe('59.9s')
  })

  it('shows minutes and seconds under an hour', () => {
    expect(formatDurationMs(60_000)).toBe('1m 0s')
    expect(formatDurationMs(312_000)).toBe('5m 12s')
  })

  it('shows hours and minutes at or above an hour', () => {
    expect(formatDurationMs(3_600_000)).toBe('1h 0m')
    expect(formatDurationMs(5_375_763)).toBe('1h 29m')
  })
})
