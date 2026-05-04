import React, { Suspense, lazy } from 'react'
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

interface AppRoutesProps {
  activeTab: string
}

function RouteFallback(): React.ReactElement {
  return (
    <div className='flex h-full items-center justify-center p-8' role='status' aria-live='polite'>
      <span className='text-sm text-muted-600'>Loading…</span>
    </div>
  )
}

/**
 * Switches between the list view and the detail view based on
 * the hash sub-path (`#backtests/{run_public_id}`).
 */
function BacktestsRouter(): React.ReactElement {
  const subpath = useHashSubpath('backtests')

  if (subpath[0] === 'compare') {
    if (subpath.length === 2) {
      return <ComparePage comparisonPublicId={subpath[1]} />
    }

    return <Backtests />
  }

  if (subpath.length === 1) {
    return <BacktestDetailPage runPublicId={subpath[0]} />
  }

  return <Backtests />
}

function renderRoute(activeTab: string): React.ReactElement {
  switch (activeTab) {
    case 'market':
      return (
        <ErrorBoundary componentName='Market Data'>
          <ProtectedRoute resource='market'>
            <MarketData />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'processes':
      return (
        <ErrorBoundary componentName='Processes'>
          <ProtectedRoute resource='processes'>
            <Processes />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'strategies':
      return (
        <ErrorBoundary componentName='Strategies'>
          <ProtectedRoute resource='strategies'>
            <Strategies />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'orders':
      return (
        <ErrorBoundary componentName='Orders'>
          <ProtectedRoute resource='orders'>
            <Orders />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'positions':
      return (
        <ErrorBoundary componentName='Positions'>
          <ProtectedRoute resource='positions'>
            <Positions />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'signals':
      return (
        <ErrorBoundary componentName='Signals'>
          <ProtectedRoute resource='signals'>
            <Signals />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'backtests':
      return (
        <ErrorBoundary componentName='Backtests'>
          <ProtectedRoute resource='backtests'>
            <BacktestsRouter />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'health':
      return (
        <ErrorBoundary componentName='Health'>
          <ProtectedRoute resource='health'>
            <Health />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'admin':
      return (
        <ErrorBoundary componentName='Administration'>
          <ProtectedRoute resource='admin'>
            <Admin />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'ai-integration':
      return (
        <ErrorBoundary componentName='AI Integration'>
          <ProtectedRoute resource='ai-integration'>
            <AIIntegration />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'ai-reviews':
      return (
        <ErrorBoundary componentName='AI Reviews'>
          <ProtectedRoute resource='ai-reviews'>
            <AiReviewInbox />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'settings':
      return (
        <ErrorBoundary componentName='Settings'>
          <ProtectedRoute resource='settings'>
            <Settings />
          </ProtectedRoute>
        </ErrorBoundary>
      )
    case 'overview':
    default:
      return (
        <ErrorBoundary componentName='Overview'>
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
