import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabRouting, useHashSubpath, type ValidTab } from './useHashRouting'

describe('useHashRouting', () => {
  let originalHash: string

  beforeEach(() => {
    originalHash = globalThis.location.hash
    globalThis.location.hash = ''
  })
  afterEach(() => {
    globalThis.location.hash = originalHash
  })
  it.each([
    {
      name: 'returns default route and sets initial hash when no hash present',
      initialHash: '',
      expectedRoute: 'overview',
      expectedHash: '#overview',
    },
    {
      name: 'returns current hash when valid',
      initialHash: '#market',
      expectedRoute: 'market',
      expectedHash: '#market',
    },
    {
      name: 'matches route even when hash includes query string',
      initialHash: '#backtests?wallet=019ded78&operator=o-1',
      expectedRoute: 'backtests',
      expectedHash: '#backtests?wallet=019ded78&operator=o-1',
    },
    {
      name: 'falls back to default for invalid hash',
      initialHash: '#invalid-route',
      expectedRoute: 'overview',
      expectedHash: undefined,
    },
  ] satisfies {
    name: string
    initialHash: string
    expectedRoute: ValidTab
    expectedHash: string | undefined
  }[])('$name', ({ initialHash, expectedRoute, expectedHash }) => {
    globalThis.location.hash = initialHash
    const { result } = renderHook(() => useTabRouting())

    expect(result.current[0]).toBe(expectedRoute)

    if (expectedHash !== undefined) {
      expect(globalThis.location.hash).toBe(expectedHash)
    }
  })
  it.each([
    {
      name: 'navigates to new route',
      initialHash: '',
      nextRoute: 'processes',
      expectedRoute: 'processes',
      expectedHash: '#processes',
    },
    {
      name: 'preserves query string when navigating between routes',
      initialHash: '#market?wallet=w-1&operator=o-1',
      nextRoute: 'positions',
      expectedRoute: 'positions',
      expectedHash: '#positions?wallet=w-1&operator=o-1',
    },
  ] satisfies {
    name: string
    initialHash: string
    nextRoute: ValidTab
    expectedRoute: ValidTab
    expectedHash: string
  }[])('$name', ({ initialHash, nextRoute, expectedRoute, expectedHash }) => {
    globalThis.location.hash = initialHash
    const { result } = renderHook(() => useTabRouting())

    act(() => {
      result.current[1](nextRoute)
    })
    expect(result.current[0]).toBe(expectedRoute)
    expect(globalThis.location.hash).toBe(expectedHash)
  })
  it('handles all valid tabs', () => {
    const validTabs: ValidTab[] = [
      'overview',
      'market',
      'processes',
      'strategies',
      'orders',
      'positions',
      'signals',
      'backtests',
      'health',
      'notifications',
      'admin',
      'ai-integration',
      'ai-reviews',
      'settings',
    ]
    const { result } = renderHook(() => useTabRouting())

    validTabs.forEach(tab => {
      act(() => {
        result.current[1](tab)
      })
      expect(result.current[0]).toBe(tab)
      expect(globalThis.location.hash).toBe(`#${tab}`)
    })
  })
  it('responds to hashchange events', () => {
    const { result } = renderHook(() => useTabRouting())

    act(() => {
      globalThis.location.hash = '#strategies'
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('strategies')
  })
  it('responds to external hashchange', () => {
    const { result } = renderHook(() => useTabRouting())

    expect(result.current[0]).toBe('overview')
    act(() => {
      globalThis.location.hash = '#health'
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('health')
  })
  it('ignores invalid hashchange events', () => {
    const { result } = renderHook(() => useTabRouting())

    act(() => {
      result.current[1]('orders')
    })
    expect(result.current[0]).toBe('orders')
    act(() => {
      globalThis.location.hash = '#not-valid-route'
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('overview')
  })
  it('does not set hash when default already present', () => {
    globalThis.location.hash = '#overview'
    const { result } = renderHook(() => useTabRouting())

    expect(result.current[0]).toBe('overview')
  })
  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener')
    const { unmount } = renderHook(() => useTabRouting())

    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
  it('maintains route state across re-renders', () => {
    const { result, rerender } = renderHook(() => useTabRouting())

    act(() => {
      result.current[1]('admin')
    })
    rerender()
    expect(result.current[0]).toBe('admin')
  })
})

describe('useHashSubpath', () => {
  let originalHash: string

  beforeEach(() => {
    originalHash = globalThis.location.hash
    globalThis.location.hash = ''
  })
  afterEach(() => {
    globalThis.location.hash = originalHash
  })
  it.each([
    {
      name: 'returns [] when the hash does not match the requested tab',
      hash: '#orders',
      expectedSubpath: [],
    },
    {
      name: 'returns [] when the hash is just the tab with no sub-path',
      hash: '#backtests',
      expectedSubpath: [],
    },
    {
      name: 'returns the sub-path segments for a matching hash',
      hash: '#backtests/run-1/equity',
      expectedSubpath: ['run-1', 'equity'],
    },
    {
      name: 'strips ?query before segmenting (deep route + scope persistence)',
      hash: '#backtests/01948f94-abcd?wallet=w-1',
      expectedSubpath: ['01948f94-abcd'],
    },
    {
      name: 'strips ?query when only the tab is present with scope params',
      hash: '#backtests?wallet=w-1&operator=o-1',
      expectedSubpath: [],
    },
    {
      name: 'strips ?query across multiple deep segments',
      hash: '#backtests/run-1/equity?wallet=w-1',
      expectedSubpath: ['run-1', 'equity'],
    },
  ])('$name', ({ hash, expectedSubpath }) => {
    globalThis.location.hash = hash
    const { result } = renderHook(() => useHashSubpath('backtests'))

    expect(result.current).toEqual(expectedSubpath)
  })
  it('updates when the hash changes', () => {
    globalThis.location.hash = '#backtests'
    const { result } = renderHook(() => useHashSubpath('backtests'))

    expect(result.current).toEqual([])
    act(() => {
      globalThis.location.hash = '#backtests/run-2'
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current).toEqual(['run-2'])
  })
})
