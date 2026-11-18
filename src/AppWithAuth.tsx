import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import App from './App'
import { AuthenticatedApp } from './components/AuthenticatedApp'
import AuthErrorBoundary from './components/auth/AuthErrorBoundary'
import { useAuth, useAuthStore } from './stores/auth'
import { useAppStore } from './stores/app'
import { apiClient } from './lib/apiClient'
import { resolveFinancialColorConvention } from './theme/financialColorPreference'
import { OAUTH_CONSENT_PATH } from './features/oauth-consent/consentApi'
import { OAuthConsentPage } from './features/oauth-consent/OAuthConsentPage'
import { captureConsentRequest } from './features/oauth-consent/consentRequest'

function AppWithAuth() {
  const { isAuthenticated, refreshToken } = useAuth()
  const isDarkMode = useAppStore(s => s.isDarkMode)
  const locale = useAppStore(s => s.locale)
  const financialColorPreference = useAppStore(s => s.financialColorPreference)
  const initialized = useRef(false)

  useLayoutEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useLayoutEffect(() => {
    const effective = resolveFinancialColorConvention(financialColorPreference, locale)

    document.documentElement.dataset.colorConvention = effective
  }, [financialColorPreference, locale])

  useEffect(() => {
    if (initialized.current) {
      return
    }

    const initializeAuth = async () => {
      initialized.current = true

      if (isAuthenticated) {
        return
      }

      const hasAuthCookies = apiClient.hasAuthCookies()
      const hasPersistedUser = useAuthStore.getState().user !== null

      if (!hasAuthCookies && !hasPersistedUser) {
        return
      }

      try {
        await refreshToken()
      } catch {
        return
      }
    }

    void initializeAuth()
  }, [isAuthenticated, refreshToken])

  const [isConsentRoute] = useState(() => {
    const consentRoute = globalThis.location.pathname === OAUTH_CONSENT_PATH

    if (consentRoute) captureConsentRequest()

    return consentRoute
  })

  return (
    <AuthErrorBoundary key={`auth-${isAuthenticated}`}>
      <AuthenticatedApp>
        {isConsentRoute ? (
          <OAuthConsentPage navigate={url => globalThis.location.assign(url)} />
        ) : (
          <App />
        )}
      </AuthenticatedApp>
    </AuthErrorBoundary>
  )
}

export default AppWithAuth
