import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNow } from './useNow'

describe('useNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current epoch and advances on the interval', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T00:00:00Z'))
    const { result } = renderHook(() => useNow(1000))
    const first = result.current

    expect(first).toBe(Date.parse('2026-07-13T00:00:00Z'))

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(first + 1000)
  })

  it('clears the interval on unmount', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useNow(500))

    unmount()

    expect(clearSpy).toHaveBeenCalled()
  })
})
