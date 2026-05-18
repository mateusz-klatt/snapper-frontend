import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { apiClient } from '../lib/apiClient'
import i18n from '../i18n/config'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      isConnected: false,
      connectionLag: 0,
      subscribedTopics: [],
      lastUpdate: new Date().toISOString(),
      isDarkMode: true,
      asOf: null,
      isTimeTraveling: false,
    })
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('initial state', () => {
    it('has isConnected as false', () => {
      expect(useAppStore.getState().isConnected).toBe(false)
    })
    it('has connectionLag as 0', () => {
      expect(useAppStore.getState().connectionLag).toBe(0)
    })
    it('has empty subscribedTopics', () => {
      expect(useAppStore.getState().subscribedTopics).toEqual([])
    })
    it('has isDarkMode as true', () => {
      expect(useAppStore.getState().isDarkMode).toBe(true)
    })
    it('has lastUpdate as ISO string', () => {
      const lastUpdate = useAppStore.getState().lastUpdate

      expect(typeof lastUpdate).toBe('string')
      expect(lastUpdate).not.toBeNull()

      if (lastUpdate !== null) {
        expect(() => new Date(lastUpdate)).not.toThrow()
      }
    })
  })
  describe('setConnected', () => {
    it('sets isConnected to true', () => {
      useAppStore.getState().setConnected(true)
      expect(useAppStore.getState().isConnected).toBe(true)
    })
    it('sets isConnected to false', () => {
      useAppStore.getState().setConnected(true)
      useAppStore.getState().setConnected(false)
      expect(useAppStore.getState().isConnected).toBe(false)
    })
  })
  describe('setConnectionLag', () => {
    it('sets connectionLag directly', () => {
      useAppStore.getState().setConnectionLag(150)
      expect(useAppStore.getState().connectionLag).toBe(150)
    })
    it('overwrites previous value without smoothing', () => {
      useAppStore.getState().setConnectionLag(100)
      useAppStore.getState().setConnectionLag(200)
      expect(useAppStore.getState().connectionLag).toBe(200)
    })
  })
  describe('setSubscribedTopics', () => {
    it('replaces all subscribed topics', () => {
      useAppStore.setState({ subscribedTopics: ['old-topic'] })
      useAppStore.getState().setSubscribedTopics(['new-topic-1', 'new-topic-2'])
      expect(useAppStore.getState().subscribedTopics).toEqual(['new-topic-1', 'new-topic-2'])
    })
    it('can set empty topics array', () => {
      useAppStore.setState({ subscribedTopics: ['topic1', 'topic2'] })
      useAppStore.getState().setSubscribedTopics([])
      expect(useAppStore.getState().subscribedTopics).toEqual([])
    })
  })
  describe('updateLastUpdate', () => {
    it('updates lastUpdate to current time', () => {
      const before = new Date().toISOString()

      useAppStore.getState().updateLastUpdate()
      const lastUpdate = useAppStore.getState().lastUpdate
      const after = new Date().toISOString()

      expect(lastUpdate).not.toBeNull()

      if (lastUpdate !== null) {
        expect(lastUpdate >= before).toBe(true)
        expect(lastUpdate <= after).toBe(true)
      }
    })
  })
  describe('toggleDarkMode', () => {
    it('toggles isDarkMode from true to false', () => {
      useAppStore.setState({ isDarkMode: true })
      useAppStore.getState().toggleDarkMode()
      expect(useAppStore.getState().isDarkMode).toBe(false)
    })
    it('toggles isDarkMode from false to true', () => {
      useAppStore.setState({ isDarkMode: false })
      useAppStore.getState().toggleDarkMode()
      expect(useAppStore.getState().isDarkMode).toBe(true)
    })
    it('toggles multiple times', () => {
      useAppStore.setState({ isDarkMode: true })
      useAppStore.getState().toggleDarkMode()
      useAppStore.getState().toggleDarkMode()
      useAppStore.getState().toggleDarkMode()
      expect(useAppStore.getState().isDarkMode).toBe(false)
    })
    it('persists dark mode preference to localStorage', () => {
      useAppStore.setState({ isDarkMode: false })
      useAppStore.getState().toggleDarkMode()
      expect(localStorage.getItem('snapper-dark-mode')).toBe('true')
      useAppStore.getState().toggleDarkMode()
      expect(localStorage.getItem('snapper-dark-mode')).toBe('false')
    })
  })
  describe('setAsOf', () => {
    it('sets asOf and activates time travel mode', () => {
      useAppStore.getState().setAsOf('2026-03-15T10:00:00Z')
      expect(useAppStore.getState().asOf).toBe('2026-03-15T10:00:00Z')
      expect(useAppStore.getState().isTimeTraveling).toBe(true)
    })
    it('overwrites previous asOf value', () => {
      useAppStore.getState().setAsOf('2026-03-15T10:00:00Z')
      useAppStore.getState().setAsOf('2026-01-01T00:00:00Z')
      expect(useAppStore.getState().asOf).toBe('2026-01-01T00:00:00Z')
      expect(useAppStore.getState().isTimeTraveling).toBe(true)
    })
  })
  describe('clearAsOf', () => {
    it('clears asOf and deactivates time travel mode', () => {
      useAppStore.getState().setAsOf('2026-03-15T10:00:00Z')
      useAppStore.getState().clearAsOf()
      expect(useAppStore.getState().asOf).toBeNull()
      expect(useAppStore.getState().isTimeTraveling).toBe(false)
    })
    it('is a no-op when already in live mode', () => {
      useAppStore.getState().clearAsOf()
      expect(useAppStore.getState().asOf).toBeNull()
      expect(useAppStore.getState().isTimeTraveling).toBe(false)
    })
  })
  describe('setCurrentOperatorPublicId', () => {
    it('sets operator ID and clears wallet ID', () => {
      useAppStore.getState().setCurrentWalletPublicId('w-1')
      useAppStore.getState().setCurrentOperatorPublicId('op-1')

      expect(useAppStore.getState().currentOperatorPublicId).toBe('op-1')
      expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    })
    it('clears operator ID when set to null', () => {
      useAppStore.getState().setCurrentOperatorPublicId('op-1')
      useAppStore.getState().setCurrentOperatorPublicId(null)

      expect(useAppStore.getState().currentOperatorPublicId).toBeNull()
    })
    it('clears apiClient wallet scope alongside zustand wallet state', async () => {
      const { apiClient } = await import('../lib/apiClient')

      apiClient.setWalletScope('w-stale')
      useAppStore.getState().setCurrentOperatorPublicId('op-1')

      expect(apiClient.getWalletScope()).toBeNull()
    })
  })
  describe('setCurrentWalletPublicId', () => {
    it('sets wallet ID without clearing operator ID', () => {
      useAppStore.getState().setCurrentOperatorPublicId('op-1')
      useAppStore.getState().setCurrentWalletPublicId('w-1')

      expect(useAppStore.getState().currentWalletPublicId).toBe('w-1')
      expect(useAppStore.getState().currentOperatorPublicId).toBe('op-1')
    })
    it('clears wallet ID when set to null', () => {
      useAppStore.getState().setCurrentWalletPublicId('w-1')
      useAppStore.getState().setCurrentWalletPublicId(null)

      expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    })
  })
  describe('loadDarkModePreference', () => {
    it('reads dark mode preference from localStorage on module load', async () => {
      localStorage.setItem('snapper-dark-mode', 'true')
      vi.resetModules()
      const { useAppStore: freshStore } = await import('./app')

      expect(freshStore.getState().isDarkMode).toBe(true)
      localStorage.removeItem('snapper-dark-mode')
    })
    it('defaults to false when localStorage has no value', async () => {
      localStorage.removeItem('snapper-dark-mode')
      vi.resetModules()
      const { useAppStore: freshStore } = await import('./app')

      expect(freshStore.getState().isDarkMode).toBe(false)
    })
  })
  describe('setLocale', () => {
    afterEach(() => {
      localStorage.removeItem('snapper-locale')
      document.documentElement.lang = ''
      document.documentElement.dir = ''
    })
    it('updates the store locale', () => {
      useAppStore.getState().setLocale('pl')
      expect(useAppStore.getState().locale).toBe('pl')
    })
    it('persists locale to localStorage', () => {
      useAppStore.getState().setLocale('pl')
      expect(localStorage.getItem('snapper-locale')).toBe('pl')
    })
    it('sets document.documentElement.lang to the catalog language after changeLanguage resolves', async () => {
      useAppStore.getState().setLocale('pl')
      await i18n.changeLanguage('pl')
      expect(document.documentElement.lang).toBe('pl')
      useAppStore.getState().setLocale('de')
      await i18n.changeLanguage('de')
      expect(document.documentElement.lang).toBe('de')
      useAppStore.getState().setLocale('us')
      await i18n.changeLanguage('en')
      expect(document.documentElement.lang).toBe('en')
    })
    it('sets document.documentElement.dir to ltr for ltr locales', async () => {
      useAppStore.getState().setLocale('pl')
      await i18n.changeLanguage('pl')
      expect(document.documentElement.dir).toBe('ltr')
    })
    it('sets document.documentElement.dir to rtl for rtl locales', async () => {
      useAppStore.getState().setLocale('ae')
      await i18n.changeLanguage('ar')
      expect(document.documentElement.dir).toBe('rtl')
    })
    it('falls back gracefully when localStorage.setItem throws', () => {
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })

      try {
        expect(() => useAppStore.getState().setLocale('pl')).not.toThrow()
        expect(useAppStore.getState().locale).toBe('pl')
      } finally {
        spy.mockRestore()
      }
    })
    it('does not call backend when caller is unauthenticated', () => {
      useAuthStore.setState({ isAuthenticated: false })
      const postSpy = vi.spyOn(apiClient, 'postJSON')

      useAppStore.getState().setLocale('pl')
      expect(postSpy).not.toHaveBeenCalled()
    })
    it('persists default_language to backend when caller is authenticated', () => {
      useAuthStore.setState({ isAuthenticated: true })
      const postSpy = vi.spyOn(apiClient, 'postJSON').mockResolvedValue({} as never)

      useAppStore.getState().setLocale('pl')
      expect(postSpy).toHaveBeenCalledWith('/api/auth/me/update', {
        default_language: 'pl',
      })
    })
    it('swallows backend persist errors so the picker still flips locally', async () => {
      useAuthStore.setState({ isAuthenticated: true })
      vi.spyOn(apiClient, 'postJSON').mockRejectedValue(new Error('500'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        expect(() => useAppStore.getState().setLocale('pl')).not.toThrow()
        expect(useAppStore.getState().locale).toBe('pl')
        await Promise.resolve()
        await Promise.resolve()
        expect(warnSpy).toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })
  })
  describe('setFinancialColorPreference', () => {
    afterEach(() => {
      localStorage.removeItem('snapper-financial-color-preference')
    })
    it('updates the store with the chosen preference', () => {
      useAppStore.getState().setFinancialColorPreference('rising-red')
      expect(useAppStore.getState().financialColorPreference).toBe('rising-red')
    })
    it('persists the preference to localStorage under the shared key', () => {
      useAppStore.getState().setFinancialColorPreference('rising-red')
      expect(localStorage.getItem('snapper-financial-color-preference')).toBe('rising-red')
    })
    it('round-trips the preference through localStorage on module reload', async () => {
      localStorage.setItem('snapper-financial-color-preference', 'rising-red')
      vi.resetModules()
      const { useAppStore: freshStore } = await import('./app')

      expect(freshStore.getState().financialColorPreference).toBe('rising-red')
    })
    it('defaults to auto when localStorage has no value', async () => {
      localStorage.removeItem('snapper-financial-color-preference')
      vi.resetModules()
      const { useAppStore: freshStore } = await import('./app')

      expect(freshStore.getState().financialColorPreference).toBe('auto')
    })
    it('falls back to auto when localStorage has an invalid value', async () => {
      localStorage.setItem('snapper-financial-color-preference', 'not-a-real-value')
      vi.resetModules()
      const { useAppStore: freshStore } = await import('./app')

      expect(freshStore.getState().financialColorPreference).toBe('auto')
    })
  })
})
