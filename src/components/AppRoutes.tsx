import React, { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import ErrorBoundary from './ErrorBoundary'
import ProtectedRoute from './auth/ProtectedRoute'
import { useHashSubpath } from '../hooks/useHashRouting'

const Overview = lazy(() =>
  import('../features/overview/Overview').then(m => ({ default: m.Overview }))
)
const MarketData = lazy(() =>
  import('../features/market/MarketData').then(m => ({ default: m.MarketData }))
)
const Processes = lazy(() =>
  import('../features/processes/Processes').then(m => ({ default: m.Processes }))
)
const Strategies = lazy(() =>
  import('../features/strategies/Strategies').then(m => ({ default: m.Strategies }))
)
const Orders = lazy(() => import('../features/orders/Orders').then(m => ({ default: m.Orders })))
const Positions = lazy(() =>
  import('../features/positions/Positions').then(m => ({ default: m.Positions }))
)
const Signals = lazy(() =>
  import('../features/signals/Signals').then(m => ({ default: m.Signals }))
)
const Backtests = lazy(() =>
  import('../features/backtests/Backtests').then(m => ({ default: m.Backtests }))
)
const BacktestDetailPage = lazy(() =>
  import('../features/backtests/BacktestDetailPage').then(m => ({ default: m.BacktestDetailPage }))
)
const ComparePage = lazy(() =>
  import('../features/backtests/ComparePage').then(m => ({ default: m.ComparePage }))
)
const Health = lazy(() => import('../features/health/Health').then(m => ({ default: m.Health })))
const Admin = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.Admin })))
const AIIntegration = lazy(() =>
  import('../features/ai-integration/AIIntegration').then(m => ({ default: m.AIIntegration }))
)
const AiReviewInbox = lazy(() =>
  import('../features/ai-reviews/AiReviewInbox').then(m => ({ default: m.AiReviewInbox }))
)
const Settings = lazy(() =>
  import('../features/settings/Settings').then(m => ({ default: m.Settings }))
)
const Notifications = lazy(() =>
  import('../features/notifications/Notifications').then(m => ({ default: m.Notifications }))
)

interface AppRoutesProps {
  activeTab: string
}

function RouteFallback(): React.ReactElement {
  const { t } = useTranslation('common')

  return (
    <div
      className='flex h-full items-center justify-center p-8'
      role='status'
      aria-live='polite'
      data-testid='route-fallback'
    >
      <span className='text-sm text-muted-600'>{t('loading', { defaultValue: 'Loading…' })}</span>
    </div>
  )
}

/**
 * Switches between the list view and the detail view based on
 * the hash sub-path (`#backtests/{run_public_id}`).
 */
function BacktestsRouter(): React.ReactElement {
  const subpath = useHashSubpath('backtests')

  const [head, second] = subpath

  if (head === 'compare') {
    if (second !== undefined) {
      return <ComparePage comparisonPublicId={second} />
    }

    return <Backtests />
  }

  if (head !== undefined && second === undefined) {
    return <BacktestDetailPage runPublicId={head} />
  }

  return <Backtests />
}

function renderRoute(activeTab: string): React.ReactElement {
  switch (activeTab) {
    case 'market':
      return (
        <ErrorBoundary componentNameKey='nav.market'>
          <ProtectedRoute resource='market'>
            <MarketData />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'processes':
      return (
        <ErrorBoundary componentNameKey='nav.processes'>
          <ProtectedRoute resource='processes'>
            <Processes />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'strategies':
      return (
        <ErrorBoundary componentNameKey='nav.strategies'>
          <ProtectedRoute resource='strategies'>
            <Strategies />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'orders':
      return (
        <ErrorBoundary componentNameKey='nav.orders'>
          <ProtectedRoute resource='orders'>
            <Orders />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'positions':
      return (
        <ErrorBoundary componentNameKey='nav.positions'>
          <ProtectedRoute resource='positions'>
            <Positions />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'signals':
      return (
        <ErrorBoundary componentNameKey='nav.signals'>
          <ProtectedRoute resource='signals'>
            <Signals />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'backtests':
      return (
        <ErrorBoundary componentNameKey='nav.backtests'>
          <ProtectedRoute resource='backtests'>
            <BacktestsRouter />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'health':
      return (
        <ErrorBoundary componentNameKey='nav.health'>
          <ProtectedRoute resource='health'>
            <Health />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'admin':
      return (
        <ErrorBoundary componentNameKey='nav.admin'>
          <ProtectedRoute resource='admin'>
            <Admin />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'ai-integration':
      return (
        <ErrorBoundary componentNameKey='nav.aiIntegration'>
          <ProtectedRoute resource='ai-integration'>
            <AIIntegration />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'ai-reviews':
      return (
        <ErrorBoundary componentNameKey='nav.aiReviews'>
          <ProtectedRoute resource='ai-reviews'>
            <AiReviewInbox />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'notifications':
      return (
        <ErrorBoundary componentNameKey='nav.alerts'>
          <ProtectedRoute resource='notifications'>
            <Notifications />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'settings':
      return (
        <ErrorBoundary componentNameKey='nav.settings'>
          <ProtectedRoute resource='settings'>
            <Settings />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'overview':
    default:
      return (
        <ErrorBoundary componentNameKey='nav.overview'>
          <ProtectedRoute resource='overview'>
            <Overview />
          </ProtectedRoute>
        </ErrorBoundary>
      )
  }
}

export function AppRoutes({ activeTab }: Readonly<AppRoutesProps>): React.ReactElement {
  return <Suspense fallback={<RouteFallback />}>{renderRoute(activeTab)}</Suspense>
}
