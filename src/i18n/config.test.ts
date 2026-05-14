import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import i18n, { detectInitialLocale, LOCALE_STORAGE_KEY, loadCatalog } from './config'
import { DEFAULT_LOCALE } from './types'

describe('i18n config', () => {
  it('is initialized synchronously after import', () => {
    expect(i18n.isInitialized).toBe(true)
  })

  it('uses common as defaultNS', () => {
    expect(i18n.options.defaultNS).toBe('common')
  })

  it('falls back to en', () => {
    expect(i18n.options.fallbackLng).toContain('en')
  })

  it('resolves a boot key for common namespace', () => {
    expect(i18n.t('loading')).toBeTruthy()
  })

  it('resolves an auth namespace key', () => {
    expect(i18n.t('login.title', { ns: 'auth' })).toBe('Snapper Trading Login')
  })

  it('resolves the same key in Polish after changeLanguage', async () => {
    await i18n.changeLanguage('pl')
    expect(i18n.t('login.title', { ns: 'auth' })).toBe('Logowanie Snapper Trading')
    await i18n.changeLanguage('en')
  })
})

describe('detectInitialLocale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the stored locale when valid', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'pl')
    expect(detectInitialLocale()).toBe('pl')
  })

  it('ignores an invalid stored locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'xx')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
  })

  it('parses the region from navigator.languages', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pl-PL', 'en-US'])
    expect(detectInitialLocale()).toBe('pl')
  })

  it('skips unsupported regions and tries the next', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB', 'pl-PL'])
    expect(detectInitialLocale()).toBe('pl')
  })

  it('falls back to DEFAULT_LOCALE when no match', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en'])
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
  })

  it('falls back to DEFAULT_LOCALE on empty navigator.languages', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
  })

  it('falls back to DEFAULT_LOCALE when navigator.languages is not an array', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(
      undefined as unknown as readonly string[]
    )
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
  })

  it('returns DEFAULT_LOCALE when localStorage.getItem throws', () => {
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])

    try {
      expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
    } finally {
      getItemSpy.mockRestore()
    }
  })
})

describe('loadCatalog', () => {
  it('dynamically imports an EN catalog by name', async () => {
    const result = await loadCatalog('en', 'common')

    expect(result).toBeDefined()
    expect((result as { loading: string }).loading).toBe('Loading...')
  })

  it('dynamically imports a PL catalog by name', async () => {
    const result = await loadCatalog('pl', 'auth')

    expect(result).toBeDefined()
  })
})
