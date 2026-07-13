import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AppRoutes } from './AppRoutes'

vi.mock('./auth/ProtectedRoute', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../features/overview/Overview', () => ({
  Overview: () => <div data-testid='overview'>Overview Component</div>,
}))
vi.mock('../features/market/MarketData', () => ({
  MarketData: () => <div data-testid='market-data'>Market Data Component</div>,
}))
vi.mock('../features/processes/Processes', () => ({
  Processes: () => <div data-testid='processes'>Processes Component</div>,
}))
vi.mock('../features/strategies/Strategies', () => ({
  Strategies: () => <div data-testid='strategies'>Strategies Component</div>,
}))
vi.mock('../features/orders/Orders', () => ({
  Orders: () => <div data-testid='orders'>Orders Component</div>,
}))
vi.mock('../features/positions/Positions', () => ({
  Positions: () => <div data-testid='positions'>Positions Component</div>,
}))
vi.mock('../features/portfolio/Accounts', () => ({
  Accounts: () => <div data-testid='accounts'>Accounts Component</div>,
}))
vi.mock('../features/signals/Signals', () => ({
  Signals: () => <div data-testid='signals'>Signals Component</div>,
}))
vi.mock('../features/backtests/Backtests', () => ({
  Backtests: () => <div data-testid='backtests'>Backtests Component</div>,
}))
vi.mock('../features/backtests/BacktestDetailPage', () => ({
  BacktestDetailPage: ({ runPublicId }: { runPublicId: string }) => (
    <div data-testid='backtest-detail'>{runPublicId}</div>
  ),
}))
vi.mock('../features/backtests/ComparePage', () => ({
  ComparePage: ({ comparisonPublicId }: { comparisonPublicId: string }) => (
    <div data-testid='compare-page'>{comparisonPublicId}</div>
  ),
}))
vi.mock('../features/health/Health', () => ({
  Health: () => <div data-testid='health'>Health Component</div>,
}))
vi.mock('../features/admin/Admin', () => ({
  Admin: () => <div data-testid='admin'>Admin Component</div>,
}))
vi.mock('../features/ai-integration/AIIntegration', () => ({
  AIIntegration: () => <div data-testid='ai-integration'>AI Integration Component</div>,
}))
vi.mock('../features/ai-reviews/AiReviewInbox', () => ({
  AiReviewInbox: () => <div data-testid='ai-reviews'>AI Reviews Component</div>,
}))
vi.mock('../features/settings/Settings', () => ({
  Settings: () => <div data-testid='settings'>Settings Component</div>,
}))
vi.mock('../features/notifications/Notifications', () => ({
  Notifications: () => <div data-testid='notifications'>Notifications Component</div>,
}))
const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithProviders = (ui: ReactNode): ReturnType<typeof render> => {
  const queryClient = createQueryClient()

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it.each([
    { activeTab: 'overview', testId: 'overview', label: 'Overview' },
    { activeTab: 'market', testId: 'market-data', label: 'Market Data' },
    { activeTab: 'processes', testId: 'processes', label: 'Processes' },
    { activeTab: 'strategies', testId: 'strategies', label: 'Strategies' },
    { activeTab: 'orders', testId: 'orders', label: 'Orders' },
    { activeTab: 'positions', testId: 'positions', label: 'Positions' },
    { activeTab: 'accounts', testId: 'accounts', label: 'Accounts' },
    { activeTab: 'signals', testId: 'signals', label: 'Signals' },
    { activeTab: 'backtests', testId: 'backtests', label: 'Backtests', hash: '#backtests' },
    { activeTab: 'health', testId: 'health', label: 'Health' },
    { activeTab: 'admin', testId: 'admin', label: 'Admin' },
    { activeTab: 'ai-integration', testId: 'ai-integration', label: 'AIIntegration' },
    { activeTab: 'ai-reviews', testId: 'ai-reviews', label: 'AiReviewInbox' },
    { activeTab: 'settings', testId: 'settings', label: 'Settings' },
    { activeTab: 'notifications', testId: 'notifications', label: 'Notifications' },
  ])('renders $label component for $activeTab tab', async ({ activeTab, testId, hash }) => {
    if (hash !== undefined) {
      globalThis.location.hash = hash
    }

    renderWithProviders(<AppRoutes activeTab={activeTab} />)
    await waitFor(() => {
      expect(screen.getByTestId(testId)).toBeTruthy()
    })
  })
  it('renders BacktestDetailPage when hash has a sub-path', async () => {
    globalThis.location.hash = '#backtests/run-xyz'
    renderWithProviders(<AppRoutes activeTab='backtests' />)
    await waitFor(() => {
      expect(screen.getByTestId('backtest-detail')).toBeTruthy()
    })
    expect(screen.getByTestId('backtest-detail').textContent).toBe('run-xyz')
  })
  it('renders ComparePage when hash matches #backtests/compare/{id}', async () => {
    globalThis.location.hash = '#backtests/compare/cmp-1'
    renderWithProviders(<AppRoutes activeTab='backtests' />)
    await waitFor(() => {
      expect(screen.getByTestId('compare-page')).toBeTruthy()
    })
    expect(screen.getByTestId('compare-page').textContent).toBe('cmp-1')
  })
  it('falls back to Backtests list for malformed #backtests/compare (no id)', async () => {
    globalThis.location.hash = '#backtests/compare'
    renderWithProviders(<AppRoutes activeTab='backtests' />)
    await waitFor(() => {
      expect(screen.getByTestId('backtests')).toBeTruthy()
    })
    expect(screen.queryByTestId('backtest-detail')).toBeNull()
    expect(screen.queryByTestId('compare-page')).toBeNull()
  })
  it('renders Overview as default for unknown tab', async () => {
    renderWithProviders(<AppRoutes activeTab='unknown-tab' />)
    await waitFor(() => {
      expect(screen.getByTestId('overview')).toBeTruthy()
    })
  })
  it('renders Overview as default for empty tab', async () => {
    renderWithProviders(<AppRoutes activeTab='' />)
    await waitFor(() => {
      expect(screen.getByTestId('overview')).toBeTruthy()
    })
  })
})
