import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import AppWithAuth from './AppWithAuth'
import * as stores from './stores/auth'
import { useAppStore } from './stores/app'
import { apiClient } from './lib/apiClient'

vi.mock('./App', () => ({
  default: () => <div data-testid='app'>App</div>,
}))
vi.mock('./components/AuthenticatedApp', () => ({
  AuthenticatedApp: ({ children }: { children: ReactNode }) => (
    <div data-testid='authenticated-app'>{children}</div>
  ),
}))
vi.mock('./components/auth/AuthErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid='auth-error-boundary'>{children}</div>
  ),
}))
vi.mock('./stores/auth', () => ({
  useAuth: vi.fn(),
  useAuthStore: { getState: vi.fn(() => ({ user: null })) },
}))
vi.mock('./stores/app', () => ({
  useAppStore: vi.fn(),
}))
vi.mock('./lib/apiClient', () => ({
  apiClient: {
    hasAuthCookies: vi.fn(),
  },
}))
describe('AppWithAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
    vi.mocked(stores.useAuthStore.getState).mockReturnValue({ user: null } as never)
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = {
        isDarkMode: false,
        locale: 'us' as const,
        financialColorPreference: 'auto' as const,
      }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
  })
  it('remounts the auth error boundary when authentication state flips', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    const { rerender, getByTestId } = render(<AppWithAuth />)
    const boundaryBeforeFlip = getByTestId('auth-error-boundary')

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    rerender(<AppWithAuth />)
    expect(getByTestId('auth-error-boundary')).not.toBe(boundaryBeforeFlip)
  })
  it('renders wrapped app structure', () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    const { getByTestId } = render(<AppWithAuth />)

    expect(getByTestId('auth-error-boundary')).toBeInTheDocument()
    expect(getByTestId('authenticated-app')).toBeInTheDocument()
    expect(getByTestId('app')).toBeInTheDocument()
  })
  it('skips initialization when already authenticated', async () => {
    const refreshToken = vi.fn()

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      refreshToken,
      silentLogout: vi.fn(),
    } as never)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).not.toHaveBeenCalled()
    })
  })
  it('skips initialization when no auth cookies and no persisted user', async () => {
    const refreshToken = vi.fn()

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    vi.mocked(stores.useAuthStore.getState).mockReturnValue({ user: null } as never)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).not.toHaveBeenCalled()
    })
  })
  it('attempts token refresh when persisted user exists without cookies', async () => {
    const refreshToken = vi.fn().mockResolvedValue(undefined)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    vi.mocked(stores.useAuthStore.getState).mockReturnValue({
      user: { public_id: 'u-1' },
    } as never)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
  })
  it('attempts token refresh when auth cookies present', async () => {
    const refreshToken = vi.fn().mockResolvedValue(undefined)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(true)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
  })
  it('swallows a boot refresh failure without wiping the session itself', async () => {
    const refreshToken = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const silentLogout = vi.fn()

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout,
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(true)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
    expect(silentLogout).not.toHaveBeenCalled()
  })
  it('initializes only once with useRef guard', async () => {
    const refreshToken = vi.fn().mockResolvedValue(undefined)

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(true)
    const { rerender } = render(<AppWithAuth />)

    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
    rerender(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
  })
  it('skips initialization when guard is already set', async () => {
    const refreshToken = vi.fn()
    const silentLogout = vi.fn()

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken,
      silentLogout,
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    const { rerender } = render(<AppWithAuth />)

    await waitFor(() => {
      expect(vi.mocked(apiClient.hasAuthCookies)).toHaveBeenCalledTimes(1)
      expect(refreshToken).not.toHaveBeenCalled()
    })
    const nextRefreshToken = vi.fn()

    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: nextRefreshToken,
      silentLogout,
    } as never)
    rerender(<AppWithAuth />)
    await waitFor(() => {
      expect(vi.mocked(apiClient.hasAuthCookies)).toHaveBeenCalledTimes(1)
      expect(nextRefreshToken).not.toHaveBeenCalled()
    })
  })
  it('does not reinitialize on remount after initialization', async () => {
    const refreshToken = vi.fn().mockResolvedValue(undefined)
    const silentLogout = vi.fn()
    let callCount = 0

    vi.mocked(stores.useAuth).mockImplementation(() => {
      callCount++

      return {
        isAuthenticated: callCount > 1,
        refreshToken,
        silentLogout,
      } as never
    })
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(true)
    const { unmount } = render(<AppWithAuth />)

    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
    unmount()
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: true,
      refreshToken,
      silentLogout,
    } as never)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
  })
  it('adds dark class when isDarkMode is true', async () => {
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = { isDarkMode: true }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })
  it('removes dark class when isDarkMode is false', async () => {
    document.documentElement.classList.add('dark')
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  it('mounts data-color-convention="rising-green" for the Western default (us locale, auto preference)', async () => {
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.dataset.colorConvention).toBe('rising-green')
    })
  })

  it('mounts data-color-convention="rising-red" for a Chinese-locale auto user', async () => {
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = {
        isDarkMode: false,
        locale: 'cn' as const,
        financialColorPreference: 'auto' as const,
      }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.dataset.colorConvention).toBe('rising-red')
    })
  })

  it('honors explicit rising-red preference even when locale would default to Western', async () => {
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = {
        isDarkMode: false,
        locale: 'us' as const,
        financialColorPreference: 'rising-red' as const,
      }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.dataset.colorConvention).toBe('rising-red')
    })
  })

  it('honors explicit rising-green preference even when locale would default to Asian', async () => {
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = {
        isDarkMode: false,
        locale: 'cn' as const,
        financialColorPreference: 'rising-green' as const,
      }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    await waitFor(() => {
      expect(document.documentElement.dataset.colorConvention).toBe('rising-green')
    })
  })

  it('sets dark class + color-convention synchronously during render so child useEffects see both', () => {
    vi.mocked(useAppStore).mockImplementation((selector?: unknown) => {
      const state = {
        isDarkMode: true,
        locale: 'cn' as const,
        financialColorPreference: 'auto' as const,
      }

      if (typeof selector === 'function') return (selector as (s: typeof state) => unknown)(state)

      return state
    })
    vi.mocked(stores.useAuth).mockReturnValue({
      isAuthenticated: false,
      refreshToken: vi.fn(),
      silentLogout: vi.fn(),
    } as never)
    vi.mocked(apiClient.hasAuthCookies).mockReturnValue(false)
    render(<AppWithAuth />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.colorConvention).toBe('rising-red')
  })
})
