import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Health } from './Health'

vi.mock('../../hooks/queries/system', () => ({
  useSystemStatus: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useSystemMetrics: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useDbStats: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useNotificationMetrics: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useRetentionRun: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}))
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = createQueryClient()

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('renders health page', () => {
    renderWithProviders(<Health />)
    expect(screen.getByText(/System Health/i) || screen.getByText(/Health/i)).toBeInTheDocument()
  })
  it('displays loading state', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByTestId('health-skeleton')).toBeInTheDocument()
    })
  })
  it('displays system status when data is available', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          uptime: 3600,
          components: {
            database: { status: 'healthy', latency_ms: 10 },
            redis: { status: 'healthy', latency_ms: 5 },
          },
          backtests: {},
          strategies: {},
          trader: { status: 'running', pid: 123 },
          websocket: { connected_clients: 2 },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Trading Engine/)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('shows process status indicators', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running', pid: 123 },
          backtests: {},
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Trading Engine/)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays backtest section when backtests exist', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-12345678': { status: 'running', started_at: '2024-01-01T00:00:00Z' },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Active Backtests/i)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays completed backtest status', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-1': { status: 'completed', started_at: '2024-01-01T00:00:00Z' },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText(/Completed/i)).toBeInTheDocument()
    })
  })
  it('displays backtest with error status', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'error',
          trader: { status: 'running' },
          backtests: {
            'bt-error': {
              status: 'error',
              started_at: '2024-01-01T00:00:00Z',
              error: 'Backtest failed',
              exit_code: 2,
            },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText(/Backtest failed/i)).toBeInTheDocument()
      expect(screen.getByText(/Exit code: 2/i)).toBeInTheDocument()
    })
  })
  it('displays multiple backtests', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-1': { status: 'running', started_at: '2024-01-01T00:00:00Z' },
            'bt-2': { status: 'completed', started_at: '2024-01-01T01:00:00Z' },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Active Backtests/i)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays default process icon for unknown process type', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          strategies: {
            unknown_process: { status: 'running' },
          },
          backtests: {},
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Trading Engine/)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays metrics with different status colors', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {},
          metrics: [
            { name: 'CPU Usage', value: '45%', status: 'healthy' },
            { name: 'Memory', value: '2GB', status: 'warning' },
            { name: 'Disk', value: '90%', status: 'error' },
            { name: 'Network', value: '100Mbps', status: 'unknown' },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Trading Engine/)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays analyzer process with chart icon', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          strategies: {
            market_analyzer: { status: 'running' },
          },
          backtests: {},
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      const elements = screen.getAllByText(/Trading Engine/)

      expect(elements.length).toBeGreaterThan(0)
    })
  })
  it('displays metric card with warning status', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'warning',
          trader: { status: 'stopped', pid: null },
          backtests: {},
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })
  it('displays metric card with critical status', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'error',
          components: {
            database: { status: 'error', error: 'Connection failed' },
          },
          trader: { status: 'error', pid: null },
          backtests: {},
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })
  it('renders a stopped backtest with its status badge', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-stopped-1': { status: 'stopped' },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText(/Stopped/i)).toBeInTheDocument()
    })
  })
  it('formats backtest uptime in minutes for runs under an hour old', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-fresh-run': { status: 'running', started_at: fifteenMinutesAgo },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText(/15m/i)).toBeInTheDocument()
    })
  })
  it('formats backtest uptime in hours when the run is over an hour old', async () => {
    const { useSystemStatus } = await import('../../hooks/queries/system')

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    vi.mocked(useSystemStatus).mockReturnValue({
      data: {
        payload: {
          status: 'healthy',
          trader: { status: 'running' },
          backtests: {
            'bt-long-run': { status: 'running', started_at: twoHoursAgo },
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Health />)
    await waitFor(() => {
      expect(screen.getByText(/2h/i)).toBeInTheDocument()
    })
  })
})
