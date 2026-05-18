import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from './auth'
import { AppState } from '../types/ui'
import i18n, { LOCALE_STORAGE_KEY, detectInitialLocale } from '../i18n/config'
import { getCatalogLanguage } from '../i18n/countryLanguages'
import { queryKeys } from '../hooks/queries/keys'
import type { AppLocale } from '../i18n/types'

const DARK_MODE_KEY = 'snapper-dark-mode'

const loadDarkModePreference = (): boolean => {
  const stored = localStorage.getItem(DARK_MODE_KEY)

  if (stored !== null) {
    return stored === 'true'
  }

  return false
}

const applyLocaleSideEffects = (locale: AppLocale): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    void 0
  }

  void i18n.changeLanguage(getCatalogLanguage(locale))
}

const persistDefaultLanguageToBackend = async (locale: AppLocale): Promise<boolean> => {
  const { isAuthenticated } = useAuthStore.getState()

  if (!isAuthenticated) {
    return false
  }

  try {
    await apiClient.postJSON('/api/auth/me/update', {
      default_language: getCatalogLanguage(locale),
    })

    return true
  } catch (error: unknown) {
    console.warn('Failed to persist default_language to backend', error)

    return false
  }
}

interface AppStore extends AppState {
  setConnected: (connected: boolean) => void
  setConnectionLag: (lag: number) => void
  setSubscribedTopics: (topics: string[]) => void
  updateLastUpdate: () => void
  toggleDarkMode: () => void
  setAsOf: (asOf: string) => void
  clearAsOf: () => void
  setCurrentOperatorPublicId: (id: string | null) => void
  setCurrentWalletPublicId: (id: string | null) => void
  selectWalletAndRefresh: (nextWalletId: string | null) => Promise<void>
  setLocale: (locale: AppLocale) => Promise<void>
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, _get) => ({
    isConnected: false,
    connectionLag: 0,
    subscribedTopics: [],
    lastUpdate: new Date().toISOString(),
    isDarkMode: loadDarkModePreference(),
    asOf: null,
    isTimeTraveling: false,
    currentOperatorPublicId: null,
    currentWalletPublicId: null,
    locale: detectInitialLocale(),
    setConnected: connected => set({ isConnected: connected }),
    setConnectionLag: lag => set({ connectionLag: lag }),
    setSubscribedTopics: topics => set({ subscribedTopics: topics }),
    updateLastUpdate: () => set({ lastUpdate: new Date().toISOString() }),
    toggleDarkMode: () =>
      set(state => {
        const next = !state.isDarkMode

        localStorage.setItem(DARK_MODE_KEY, String(next))

        return { isDarkMode: next }
      }),
    setAsOf: (asOf: string) => {
      apiClient.setTimeTravelAsOf(asOf)
      set({ asOf, isTimeTraveling: true })
    },
    clearAsOf: () => {
      apiClient.setTimeTravelAsOf(null)
      set({ asOf: null, isTimeTraveling: false })
      queryClient.invalidateQueries()
    },
    setCurrentOperatorPublicId: (id: string | null) => {
      apiClient.setOperatorScope(id)
      apiClient.setWalletScope(null)
      set({ currentOperatorPublicId: id, currentWalletPublicId: null })
      queryClient.invalidateQueries()
    },
    setCurrentWalletPublicId: (id: string | null) => {
      apiClient.setWalletScope(id)
      set({ currentWalletPublicId: id })
      queryClient.invalidateQueries()
    },
    /**
     * Wallet-picker sync. Mints a new JWT with the chosen wallet claim
     * BEFORE swapping the client scope, so the next REST/WS call
     * authorises against the new wallet. Uses `useAuthStore.getState()`
     * (not the `useAuth()` hook — Zustand actions run outside React's
     * hook context).
     *
     * On refresh failure the picker state is left unchanged so the user
     * stays on the previous wallet; the refresh failure handler in
     * `useAuthStore` logs + throws so the caller sees the error.
     */
    selectWalletAndRefresh: async (nextWalletId: string | null) => {
      const hint = nextWalletId === null ? { clear: true as const } : { walletId: nextWalletId }

      await useAuthStore.getState().refreshToken(hint)
      apiClient.setWalletScope(nextWalletId)
      set({ currentWalletPublicId: nextWalletId })
      queryClient.invalidateQueries()
    },
    setLocale: async (locale: AppLocale): Promise<void> => {
      set({ locale })
      applyLocaleSideEffects(locale)
      const persisted = await persistDefaultLanguageToBackend(locale)

      if (persisted) {
        queryClient.invalidateQueries({ queryKey: queryKeys.relatedInstrumentsAll })
      }
    },
  }))
)
