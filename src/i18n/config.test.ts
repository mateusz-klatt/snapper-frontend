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

  it('updates document.documentElement.lang only after changeLanguage resolves', async () => {
    await i18n.changeLanguage('pl')
    expect(document.documentElement.lang).toBe('pl')
    await i18n.changeLanguage('de')
    expect(document.documentElement.lang).toBe('de')
    await i18n.changeLanguage('en')
  })

  it('updates document.documentElement.dir based on the new language', async () => {
    await i18n.changeLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')
    await i18n.changeLanguage('en')
    expect(document.documentElement.dir).toBe('ltr')
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

  it('skips unsupported languages and tries the next', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nn-NO', 'pl-PL'])
    expect(detectInitialLocale()).toBe('pl')
  })

  it('falls back to DEFAULT_LOCALE when no match', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nn-NO'])
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE)
  })

  it.each([
    ['en', 'us'],
    ['en-GB', 'us'],
    ['en-IE', 'us'],
    ['en-PL', 'us'],
    ['ga', 'ie'],
    ['zh-Hant-HK', 'hk'],
    ['sr-Latn-RS', 'rs'],
    ['pt-PT', 'br'],
    ['my-MM', 'mm'],
  ])('resolves the preferred language %s to %s', (tag, expected) => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([tag])
    expect(detectInitialLocale()).toBe(expected)
  })

  it('keeps the stored choice ahead of browser language preferences', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'pl')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB'])
    expect(detectInitialLocale()).toBe('pl')
  })

  it('skips malformed tags before using a later valid preference', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['invalid_tag', 'ja-JP'])
    expect(detectInitialLocale()).toBe('jp')
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
