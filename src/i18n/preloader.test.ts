import { describe, it, expect, beforeEach, vi } from 'vitest'
import i18n from './config'
import { preloadAllLocales, __resetPreloadCacheForTests } from './preloader'

describe('preloadAllLocales', () => {
  beforeEach(() => {
    __resetPreloadCacheForTests()
    vi.restoreAllMocks()
  })

  it('calls i18n.loadLanguages with all supported languages excluding cimode', () => {
    const spy = vi.spyOn(i18n, 'loadLanguages').mockResolvedValue(undefined)
    preloadAllLocales()
    expect(spy).toHaveBeenCalledTimes(1)
    const passed = spy.mock.calls[0]?.[0] as readonly string[] | undefined
    expect(Array.isArray(passed)).toBe(true)
    expect(passed).toContain('en')
    expect(passed).toContain('pl')
    expect(passed).toContain('fr')
    expect(passed).not.toContain('cimode')
  })

  it('is idempotent — second call is a no-op', () => {
    const spy = vi.spyOn(i18n, 'loadLanguages').mockResolvedValue(undefined)
    preloadAllLocales()
    preloadAllLocales()
    preloadAllLocales()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does nothing when supportedLngs is missing', () => {
    const spy = vi.spyOn(i18n, 'loadLanguages').mockResolvedValue(undefined)
    const original = i18n.options.supportedLngs
    i18n.options.supportedLngs = undefined as unknown as readonly string[]
    try {
      preloadAllLocales()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      i18n.options.supportedLngs = original
    }
  })

  it('does nothing when supportedLngs filters down to an empty list', () => {
    const spy = vi.spyOn(i18n, 'loadLanguages').mockResolvedValue(undefined)
    const original = i18n.options.supportedLngs
    i18n.options.supportedLngs = ['cimode'] as unknown as readonly string[]
    try {
      preloadAllLocales()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      i18n.options.supportedLngs = original
    }
  })
})
