import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Components } from '../types/api.generated'
import type { LoginBody } from '../types/api'
import { Permission, RESOURCE_PERMISSIONS } from '../types/permissions.generated'
import i18n from '../i18n/config'
import { apiClient } from '../lib/apiClient'
import { APIError, RefreshBodyReadError, isTransientRefreshError } from '../lib/api/error'
import { getCookie } from '../lib/utils'
import { queryClient } from '../lib/queryClient'
import { storeWsTicket } from '../lib/wsTicketCache'

type User = Components['schemas']['UserProfile']

/**
 * Adopt the CSRF token from an auth payload without discarding the server cookie.
 *
 * The server sets the readable ``csrf_token`` cookie on login and refresh, but
 * only the refresh payload echoes the value. An absent or empty payload token
 * therefore leaves the server cookie in place; clearing it is reserved for
 * logout and explicit invalidation.
 */
const adoptCsrfToken = (token: string | null | undefined): string | null => {
  if (typeof token === 'string' && token.length > 0) {
    apiClient.setCsrfToken(token)

    return token
  }

  const cookie = getCookie('csrf_token')

  return cookie === '' ? null : cookie
}

/**
 * Tagged-union arg for ``refreshToken``.
 *
 * - ``undefined`` — the three historical zero-body callers
 *   (``apiClient.refreshAndRetry``, WS ticket refresh, the original
 *   ``useAuth().refreshToken()`` call sites): POSTs no body,
 *   preserving the existing JWT claims byte-identically.
 * - ``{ walletId }`` — mint new tokens scoped to that wallet; server
 *   validates membership and returns 404 on foreign wallet.
 * - ``{ clear: true }`` — explicitly clear the JWT wallet claim to
 *   ``null`` ("All wallets" picker option).
 */
type RefreshWalletHint = { walletId: string } | { clear: true } | undefined
type RefreshRequestBody = { active_wallet_public_id?: string; clear_active_wallet?: true }
type RefreshPayload = {
  message?: string
  ws_token?: string
  ws_token_exp?: string
  csrf_token?: string
  user?: User
}
type RefreshEnvelope = { payload: RefreshPayload }
type WindowWithCallbacks = typeof globalThis & {
  authLogoutCallback?: () => void
  wsDisconnectCallback?: () => void
}
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  csrfToken: string | null
  login: (credentials: LoginBody) => Promise<void>
  logout: () => Promise<void>
  silentLogout: () => void
  refreshToken: (nextWallet?: RefreshWalletHint) => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: Permission) => boolean
  canAccess: (resource: string) => boolean
}

let authGeneration = 0

function buildRefreshBody(nextWallet?: RefreshWalletHint): RefreshRequestBody | undefined {
  if (nextWallet === undefined) return undefined
  if ('clear' in nextWallet) return { clear_active_wallet: true }

  return { active_wallet_public_id: nextWallet.walletId }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const win = globalThis as WindowWithCallbacks

      win.authLogoutCallback = () => {
        get().silentLogout()
      }

      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        csrfToken: null,
        login: async (credentials: LoginBody) => {
          try {
            set({ isLoading: true, error: null })
            const response = await apiClient.post('/api/auth/login', credentials, {
              skipCSRF: true,
            })

            if (!response.ok) {
              const errorData = await response.json()

              throw new Error(errorData.detail || 'Login failed')
            }

            const envelope: { payload: { user: User; csrf_token?: string } } = await response.json()
            const data = envelope.payload

            const csrfToken = adoptCsrfToken(data.csrf_token)

            if (
              data.user.effective_permissions?.includes(Permission.MANAGE_SELF_ACCOUNT) &&
              data.user.default_language &&
              data.user.default_language !== i18n.language
            ) {
              void i18n.changeLanguage(data.user.default_language)
            }

            authGeneration += 1
            set({
              user: data.user,
              isAuthenticated: true,
              csrfToken,
              isLoading: false,
              error: null,
            })
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Login failed',
              isAuthenticated: false,
              user: null,
              csrfToken: null,
            })
            throw error
          }
        },
        logout: async () => {
          authGeneration += 1

          try {
            set({ isLoading: true })
            set({ isAuthenticated: false })
            const win = globalThis as WindowWithCallbacks

            if (win.wsDisconnectCallback) {
              win.wsDisconnectCallback()
            }

            await apiClient.post('/api/auth/logout', undefined, {
              skipRetry: true,
              skipCSRF: true,
            })
          } catch (error) {
            console.error('Logout request failed:', error)
          } finally {
            apiClient.clearCSRFToken()
            storeWsTicket(null)
            queryClient.clear()
            set({
              user: null,
              isAuthenticated: false,
              csrfToken: null,
              isLoading: false,
              error: null,
            })
          }
        },
        silentLogout: () => {
          authGeneration += 1
          set({ isAuthenticated: false })
          const win = globalThis as WindowWithCallbacks

          if (win.wsDisconnectCallback) {
            win.wsDisconnectCallback()
          }

          apiClient.clearCSRFToken()
          storeWsTicket(null)
          queryClient.clear()
          set({
            user: null,
            isAuthenticated: false,
            csrfToken: null,
            isLoading: false,
            error: null,
          })
        },
        refreshToken: async (nextWallet?: RefreshWalletHint) => {
          const generation = authGeneration

          try {
            const body = buildRefreshBody(nextWallet)
            const response = await apiClient.refreshSession(body)

            if (generation !== authGeneration) {
              return
            }

            if (!response.ok) {
              throw new APIError(
                `Refresh failed with status ${response.status}`,
                response.status,
                response.statusText ?? ''
              )
            }

            let envelope: RefreshEnvelope

            try {
              envelope = (await response.json()) as RefreshEnvelope
            } catch (bodyError) {
              throw new RefreshBodyReadError('Failed to read refresh response body', {
                cause: bodyError,
              })
            }

            if (generation !== authGeneration) {
              return
            }

            const data = envelope.payload

            if (apiClient.claimWsTicketCache(response)) {
              if (typeof data.ws_token === 'string' && typeof data.ws_token_exp === 'string') {
                const expSeconds = Math.floor(new Date(data.ws_token_exp).getTime() / 1000)

                storeWsTicket({ token: data.ws_token, exp: expSeconds })
              } else {
                storeWsTicket(null)
              }
            }

            const csrfToken = adoptCsrfToken(data.csrf_token)
            let userData = data.user ?? get().user

            if (!userData) {
              const userResponse = await apiClient.get('/api/auth/me')

              if (!userResponse.ok) {
                throw new Error('Failed to get user info')
              }

              const meEnvelope: { payload: User } = await userResponse.json()

              userData = meEnvelope.payload
            }

            if (generation !== authGeneration) {
              return
            }

            if (
              nextWallet !== undefined &&
              (data.user === undefined ||
                (data.user.active_wallet_public_id ?? null) !==
                  ('clear' in nextWallet ? null : nextWallet.walletId))
            ) {
              throw new Error('Session wallet context was not confirmed')
            }

            set({
              user: userData,
              isAuthenticated: true,
              csrfToken,
            })
          } catch (error) {
            if (generation !== authGeneration || isTransientRefreshError(error)) {
              throw error
            }

            console.error('Token refresh failed:', error)
            get().silentLogout()
            throw error
          }
        },
        clearError: () => set({ error: null }),
        setLoading: (loading: boolean) => set({ isLoading: loading }),
        hasPermission: (permission: Permission) => {
          const { user } = get()

          if (!user) return false
          const userPermissions = user.effective_permissions ?? []

          return userPermissions.includes(permission)
        },
        canAccess: (resource: string) => {
          const { user } = get()

          if (!user) return false

          if (resource === 'admin' && get().hasPermission(Permission.MANAGE_DESK_MEMBERSHIPS)) {
            return true
          }

          const requirements = Object.hasOwn(RESOURCE_PERMISSIONS, resource)
            ? RESOURCE_PERMISSIONS[resource]
            : undefined

          if (requirements === undefined) return false
          if (requirements.length === 0) return true

          return requirements.some(permission => get().hasPermission(permission))
        },
      }
    },
    {
      name: 'snapper-auth',
      partialize: (state: AuthState) => ({
        user: state.user,
      }),
    }
  )
)

export const useAuth = () => {
  const authStore = useAuthStore()

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: authStore.login,
    logout: authStore.logout,
    silentLogout: authStore.silentLogout,
    refreshToken: authStore.refreshToken,
    clearError: authStore.clearError,
    hasPermission: authStore.hasPermission,
    canAccess: authStore.canAccess,
  }
}
