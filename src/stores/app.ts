import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from './auth'
import { AppState } from '../types/ui'
import i18n, { LOCALE_STORAGE_KEY, detectInitialLocale } from '../i18n/config'
import { getCatalogLanguage } from '../i18n/countryLanguages'
import { queryKeys } from '../hooks/queries/keys'
import { Permission } from '../types/permissions.generated'
import type { AppLocale } from '../i18n/types'
import {
  loadStoredFinancialColorPreference,
  storeFinancialColorPreference,
  type FinancialColorPreference,
} from '../theme/financialColorPreference'

const DARK_MODE_KEY = 'snapper-dark-mode'
let scopeSelectionVersion = 0
let walletSelectionVersion = 0
let walletRefreshQueue: Promise<void> = Promise.resolve()
let pendingWalletRefreshes = 0

const isScopeAwareRead = (key: readonly unknown[]): boolean => {
  if (key[0] === 'portfolio' && key[1] === 'pnl') return true
  if (key[0] !== 'backtests' && key[0] !== 'backtest-compare') return false

  const scope = key.at(-1)

  return typeof scope === 'object' && scope !== null && 'asOf' in scope
}

const matchesConfirmedReadScope = (key: readonly unknown[], confirmed: ScopeSelection): boolean => {
  const scope = key.at(-1)

  if (typeof scope !== 'object' || scope === null) return false

  const fields = scope as Record<string, unknown>

  return (
    fields['asOf'] === confirmed.asOf &&
    fields['operatorPublicId'] === confirmed.operator &&
    fields['walletPublicId'] === confirmed.wallet
  )
}

const refetchConfirmedReads = (unchanged?: ScopeSelection): void => {
  void queryClient.refetchQueries({
    type: 'active',
    predicate: query =>
      !isScopeAwareRead(query.queryKey) ||
      (unchanged !== undefined && matchesConfirmedReadScope(query.queryKey, unchanged)),
  })
}

const refreshWalletSelection = (
  wallet: string | null,
  isCurrent: () => boolean
): Promise<boolean> => {
  pendingWalletRefreshes += 1
  const pending = walletRefreshQueue.then(async () => {
    if (!isCurrent()) return false

    const hint = wallet === null ? { clear: true as const } : { walletId: wallet }

    await useAuthStore.getState().refreshToken(hint)

    return isCurrent()
  })

  walletRefreshQueue = pending.then(
    () => {
      pendingWalletRefreshes -= 1
    },
    () => {
      pendingWalletRefreshes -= 1
    }
  )

  return pending
}

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
  const { isAuthenticated, hasPermission } = useAuthStore.getState()

  if (!isAuthenticated || !hasPermission(Permission.MANAGE_SELF_ACCOUNT)) {
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

interface ScopeSelection {
  wallet: string | null
  operator: string | null
  asOf: string | null
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
  reserveScopeSelection: () => number
  invalidateScopeSelection: () => number
  isScopeSelectionCurrent: (version: number) => boolean
  isWalletSelectionPending: () => boolean
  selectScopeAndRefresh: (
    next: ScopeSelection,
    forceRefresh?: boolean,
    isCurrent?: () => boolean,
    selectionVersion?: number
  ) => Promise<boolean>
  setLocale: (locale: AppLocale) => Promise<void>
  setFinancialColorPreference: (preference: FinancialColorPreference) => void
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
    financialColorPreference: loadStoredFinancialColorPreference(),
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
      scopeSelectionVersion += 1
      apiClient.setTimeTravelAsOf(asOf)
      set({ asOf, isTimeTraveling: true })
    },
    clearAsOf: () => {
      scopeSelectionVersion += 1
      apiClient.setTimeTravelAsOf(null)
      queryClient.invalidateQueries({ refetchType: 'none' })
      set({ asOf: null, isTimeTraveling: false })
      refetchConfirmedReads()
    },
    setCurrentOperatorPublicId: (id: string | null) => {
      scopeSelectionVersion += 1
      walletSelectionVersion += 1
      apiClient.setOperatorScope(id)
      apiClient.setWalletScope(null)
      queryClient.invalidateQueries({ refetchType: 'none' })
      set({ currentOperatorPublicId: id, currentWalletPublicId: null })
      refetchConfirmedReads()
    },
    setCurrentWalletPublicId: (id: string | null) => {
      scopeSelectionVersion += 1
      walletSelectionVersion += 1
      apiClient.setWalletScope(id)
      queryClient.invalidateQueries({ refetchType: 'none' })
      set({ currentWalletPublicId: id })
      refetchConfirmedReads()
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
      scopeSelectionVersion += 1
      const version = ++walletSelectionVersion
      const accepted = await refreshWalletSelection(
        nextWalletId,
        () => version === walletSelectionVersion
      )

      if (!accepted) return

      apiClient.setWalletScope(nextWalletId)
      queryClient.invalidateQueries({ refetchType: 'none' })
      set({ currentWalletPublicId: nextWalletId })
      refetchConfirmedReads()
    },
    reserveScopeSelection: () => {
      walletSelectionVersion += 1

      return ++scopeSelectionVersion
    },
    invalidateScopeSelection: () => ++scopeSelectionVersion,
    isScopeSelectionCurrent: version => version === scopeSelectionVersion,
    isWalletSelectionPending: () => pendingWalletRefreshes > 0,
    selectScopeAndRefresh: async (next, forceRefresh = false, isCurrent, selectionVersion) => {
      const before = _get()
      const version = selectionVersion ?? _get().reserveScopeSelection()
      const active = (): boolean => version === scopeSelectionVersion && (isCurrent?.() ?? true)

      if (
        forceRefresh ||
        pendingWalletRefreshes > 0 ||
        next.wallet !== before.currentWalletPublicId ||
        next.operator !== before.currentOperatorPublicId
      ) {
        const accepted = await refreshWalletSelection(next.wallet, active)

        if (!accepted) return false
      }

      if (!active()) return false

      apiClient.setOperatorScope(next.operator)
      apiClient.setWalletScope(next.wallet)
      apiClient.setTimeTravelAsOf(next.asOf)
      queryClient.invalidateQueries({ refetchType: 'none' })
      set({
        currentOperatorPublicId: next.operator,
        currentWalletPublicId: next.wallet,
        asOf: next.asOf,
        isTimeTraveling: next.asOf !== null,
      })
      const unchanged =
        next.wallet === before.currentWalletPublicId &&
        next.operator === before.currentOperatorPublicId &&
        next.asOf === before.asOf

      refetchConfirmedReads(unchanged ? next : undefined)

      return true
    },
    setLocale: async (locale: AppLocale): Promise<void> => {
      set({ locale })
      applyLocaleSideEffects(locale)
      const persisted = await persistDefaultLanguageToBackend(locale)

      if (persisted) {
        queryClient.invalidateQueries({ queryKey: queryKeys.relatedInstrumentsAll })
      }
    },
    setFinancialColorPreference: (preference: FinancialColorPreference) => {
      storeFinancialColorPreference(preference)
      set({ financialColorPreference: preference })
    },
  }))
)
