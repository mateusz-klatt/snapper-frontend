import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Strategies } from './Strategies'
import type { HeartbeatData } from '../../types/ws'
import {
  makeStrategyProcess,
  makeConfiguredProcess,
  makeListEnvelope,
  stamp,
} from '../../test/factories'

function createHeartbeat(
  component: string,
  status: 'healthy' | 'warning' | 'error',
  lagMs: number = 0,
  sequence: number = 1,
  meta?: Record<string, unknown>
): HeartbeatData {
  return stamp('heartbeat', {
    component,
    status,
    lag_ms: lagMs,
    sequence,
    meta,
  }) as HeartbeatData
}

const mockStartProcess = vi.fn()
const mockStopProcess = vi.fn()
const mockPatchDesiredState = vi.fn()
const mockPatchDesiredStateAsync = vi.fn()
const mockCreateProcessConfig = vi.fn()
let storedHeartbeatCallback: ((msg: unknown) => void) | null = null
let storedConnectionCallback: ((connected: boolean) => void) | null = null
const mockWsClient = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  onConnection: vi.fn((callback: (connected: boolean) => void) => {
    storedConnectionCallback = callback

    return vi.fn()
  }),
  onMessage: vi.fn((topic: string, callback: (msg: unknown) => void) => {
    if (topic === 'heartbeat') {
      storedHeartbeatCallback = callback
    }

    return vi.fn()
  }),
}

vi.mock('../../hooks/queries/processes', () => ({
  useAvailableProcesses: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useProcessSchema: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useStartProcessByName: vi.fn(() => mockStartProcess),
  useStopProcessByName: vi.fn(() => mockStopProcess),
  usePatchProcessDesiredState: vi.fn(() => ({
    mutate: mockPatchDesiredState,
    mutateAsync: mockPatchDesiredStateAsync,
    isPending: false,
    variables: undefined,
  })),
  useCreateProcessConfig: vi.fn(() => ({
    mutateAsync: mockCreateProcessConfig,
    isPending: false,
  })),
  useConfiguredProcesses: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useUpdateProcessConfig: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}))
vi.mock('../../hooks/queries/strategies', () => ({
  useStrategies: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}))
vi.mock('../../stores/websocket', () => ({
  useWebSocketStore: vi.fn(() => ({
    wsClient: mockWsClient,
  })),
}))
vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ asOf: null, isTimeTraveling: false })
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    hasPermission: () => true,
  })),
}))
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('../backtests/BacktestCreateForm', () => ({
  BacktestCreateForm: ({
    open,
    preSelectedStrategy,
    onClose,
    onSuccess,
  }: {
    open: boolean
    preSelectedStrategy?: string
    onClose: () => void
    onSuccess?: (id: string) => void
  }) =>
    open ? (
      <div data-testid='backtest-create-form'>
        <span data-testid='bt-preselect'>{preSelectedStrategy}</span>
        <button type='button' data-testid='bt-success' onClick={() => onSuccess?.('run-z')}>
          ok
        </button>
        <button type='button' data-testid='bt-close' onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
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

describe('Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPatchDesiredState.mockReset()
    mockPatchDesiredStateAsync.mockReset()
    mockPatchDesiredStateAsync.mockReturnValue(new Promise(() => {}))
    storedHeartbeatCallback = null
    storedConnectionCallback = null
  })
  it('renders strategies page', () => {
    renderWithProviders(<Strategies />)
    expect(screen.getByText('Strategy Management')).toBeTruthy()
    expect(screen.getAllByText('Register Strategy').length).toBeGreaterThanOrEqual(1)
  })
  it('shows saving state when create process config is pending', async () => {
    const { useCreateProcessConfig } = await import('../../hooks/queries/processes')

    vi.mocked(useCreateProcessConfig).mockReturnValueOnce({
      mutateAsync: mockCreateProcessConfig,
      isPending: true,
    } as never)
    renderWithProviders(<Strategies />)
    expect(screen.getByText(/Saving/i)).toBeTruthy()
  })
  it('displays empty state when no strategies configured', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', []),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('No strategies configured')).toBeTruthy()
    })
  })
  it('displays configured strategies', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_macd_btc' })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('MACD BTC')).toBeTruthy()
    })
  })
  it('shows Edit scope for a scoped strategy and opens the scope-edit modal', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [makeStrategyProcess({ name: 'strategy_macd_btc' })]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: {
        payload: [
          makeConfiguredProcess({
            name: 'strategy_macd_btc',
            role: 'strategy',
            template: 'strategy_macd',
            parameters: { operator_public_id: 'label:default' },
          }),
        ],
      },
      isLoading: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    const editButton = await screen.findByText('Edit scope')

    expect(screen.queryByText('Edit strategy scope')).toBeNull()
    await user.click(editButton)
    expect(screen.getByText('Edit strategy scope')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Edit strategy scope')).toBeNull())
  })
  it('hides Edit scope for a strategy whose config carries no operator/wallet scope', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [makeStrategyProcess({ name: 'strategy_macd_btc' })]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: {
        payload: [
          makeConfiguredProcess({
            name: 'strategy_macd_btc',
            role: 'strategy',
            template: 'strategy_macd',
            parameters: {},
          }),
        ],
      },
      isLoading: false,
    } as never)
    renderWithProviders(<Strategies />)
    await screen.findByText('MACD BTC')
    expect(screen.queryByText('Edit scope')).toBeNull()
  })
  it('opens the scope editor for a scoped strategy config that has no parent template', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [makeStrategyProcess({ name: 'strategy_macd_btc' })]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: {
        payload: [
          makeConfiguredProcess({
            name: 'strategy_macd_btc',
            role: 'strategy',
            parameters: { wallet_public_id: 'label:paper' },
          }),
        ],
      },
      isLoading: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await user.click(await screen.findByText('Edit scope'))
    expect(screen.getByText('Edit strategy scope')).toBeTruthy()
  })
  it('opens the backtest form pre-filled with the strategy class, then handles success and close', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_macd_btc', strategy_class: 'MACDCrossover' }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    globalThis.location.hash = ''
    renderWithProviders(<Strategies />)
    const backtestButton = await screen.findByText('Backtest')

    expect(screen.queryByTestId('backtest-create-form')).toBeNull()
    await user.click(backtestButton)
    expect(screen.getByTestId('bt-preselect').textContent).toBe('MACDCrossover')

    await user.click(screen.getByTestId('bt-success'))
    expect(globalThis.location.hash).toBe('#backtests/run-z')

    await user.click(screen.getByTestId('bt-close'))
    expect(screen.queryByTestId('backtest-create-form')).toBeNull()
    globalThis.location.hash = ''
  })
  it('hides the Backtest button when the user lacks manage:backtests', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_macd_btc', strategy_class: 'MACDCrossover' }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useAuth } = await import('../../stores/auth')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (p: string) => p !== 'manage:backtests',
    } as unknown as ReturnType<typeof useAuth>)

    try {
      renderWithProviders(<Strategies />)
      await waitFor(() => expect(screen.getByText('MACD BTC')).toBeTruthy())
      expect(screen.queryByText('Backtest')).toBeNull()
    } finally {
      vi.mocked(useAuth).mockReturnValue({
        hasPermission: () => true,
      } as unknown as ReturnType<typeof useAuth>)
    }
  })
  it('hides the Backtest button in read-only (time-travel) mode', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_macd_btc', strategy_class: 'MACDCrossover' }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useAppStore } = await import('../../stores/app')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAppStore).mockImplementation(selector =>
      selector({ asOf: null, isTimeTraveling: true } as never)
    )

    try {
      renderWithProviders(<Strategies />)
      await waitFor(() => expect(screen.getByText('MACD BTC')).toBeTruthy())
      expect(screen.queryByText('Backtest')).toBeNull()
    } finally {
      vi.mocked(useAppStore).mockImplementation(selector =>
        selector({ asOf: null, isTimeTraveling: false } as never)
      )
    }
  })
  it('renders live controls for a remote strategy and routes Stop to the desired-state PATCH', async () => {
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: true,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]

    mockPatchDesiredStateAsync.mockResolvedValue(undefined)
    const toast = (await import('react-hot-toast')).default
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByTestId('managed-remotely-notice')).toHaveTextContent('coord-2')
    })
    expect(screen.getByRole('button', { name: /restart remote strategy/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /stop remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateAsync).toHaveBeenCalledWith({
      name: 'strategy_remote',
      body: { action: 'disable' },
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
  })
  it('routes Start of a stopped remote strategy to the enable PATCH (success toast)', async () => {
    mockPatchDesiredStateAsync.mockResolvedValue(undefined)
    const toast = (await import('react-hot-toast')).default
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: false,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^start remote strategy/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^start remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateAsync).toHaveBeenCalledWith({
      name: 'strategy_remote',
      body: { action: 'enable' },
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
  })
  it('routes Restart of a running remote strategy to the restart PATCH (success toast)', async () => {
    mockPatchDesiredStateAsync.mockResolvedValue(undefined)
    const toast = (await import('react-hot-toast')).default
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: true,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restart remote strategy/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /restart remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateAsync).toHaveBeenCalledWith({
      name: 'strategy_remote',
      body: { action: 'restart', restart_nonce: expect.any(String) },
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })
  })
  it('surfaces desired-state PATCH errors as a toast for each remote action', async () => {
    mockPatchDesiredStateAsync.mockRejectedValue(new Error('boom'))
    const toast = (await import('react-hot-toast')).default
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: true,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restart remote strategy/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /stop remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restart remote strategy/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /restart remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(2)
    })
    expect(mockPatchDesiredStateAsync).toHaveBeenCalledTimes(2)
  })
  it('reflects the enable PATCH pending state on a remote strategy Start button', async () => {
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: false,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^start remote strategy/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^start remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(screen.getByText('Starting...')).toBeTruthy()
    })
  })
  it('surfaces an enable PATCH error as a toast for a stopped remote strategy', async () => {
    mockPatchDesiredStateAsync.mockRejectedValue('non-error rejection')
    const toast = (await import('react-hot-toast')).default
    const mockStrategies = [
      makeStrategyProcess({
        name: 'strategy_remote',
        running: false,
        managed_remotely: true,
        coordinator: 'coord-2',
      }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^start remote strategy/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^start remote strategy/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateAsync).toHaveBeenCalledWith({
      name: 'strategy_remote',
      body: { action: 'enable' },
    })
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
  it('subscribes to heartbeat topics for strategies', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_macd_btc', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.macd_btc'])
    })
  })
  it('filters only strategy role processes', async () => {
    const mockProcesses = [makeStrategyProcess({ name: 'strategy_macd_btc' })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockProcesses),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Management')).toBeTruthy()
    })
  })
  it('shows register strategy button', async () => {
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
  })
  it('displays available strategy templates', async () => {
    const { useAvailableProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Management')).toBeTruthy()
    })
  })
  it('handles websocket connection callback', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onConnection).toHaveBeenCalled()
    })
  })
  it('resubscribes to heartbeats on reconnect', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.test'])
    })
    storedConnectionCallback?.(true)
    expect(mockWsClient.subscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.test'])
  })
  it('does not resubscribe when connection callback is false', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.test'])
    })
    const subscribeCalls = mockWsClient.subscribe.mock.calls.length

    storedConnectionCallback?.(false)
    expect(mockWsClient.subscribe).toHaveBeenCalledTimes(subscribeCalls)
  })
  it('unsubscribes heartbeat topics on unmount', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const { unmount } = renderWithProviders(<Strategies />)

    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.test'])
    })
    unmount()
    expect(mockWsClient.unsubscribe).toHaveBeenCalledWith(['system.heartbeats.strategy.test'])
  })
  it('handles heartbeat messages', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })
  })
  it('maps a live dotted heartbeat component onto the API row', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_macd_btc_1h', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })
    act(() => {
      storedHeartbeatCallback?.({
        component: 'strategy.macd_btc_1h',
        status: 'healthy',
        lag_ms: 120,
        sequence: 9,
        meta: {},
      })
    })
    await waitFor(() => {
      expect(screen.getByText(/data lag/i)).toBeInTheDocument()
    })
  })
  it('renders configured strategies section header', async () => {
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Configured Strategies')).toBeTruthy()
    })
  })
  it('shows autostart description', async () => {
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText(/Register new strategy processes directly from the UI/i)).toBeTruthy()
    })
  })
  it('shows loading skeleton while loading', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    expect(screen.queryByText('Strategy Management')).toBeNull()
  })
  it('handles start strategy with success', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn().mockImplementation((_data, options) => {
      options?.onSuccess?.()
    })

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    await user.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'strategy_test', mode: 'thread' },
      expect.any(Object)
    )
  })
  it('defaults to thread mode when strategy mode is missing', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_test', mode: '' as 'thread' | 'process' }),
    ]
    const { useStartProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn()

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButton = screen.getByLabelText('Start TEST strategy')

    await user.click(startButton)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'strategy_test', mode: 'thread' },
      expect.any(Object)
    )
  })
  it('shows starting state while start mutation is pending', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName, useStopProcessByName } =
      await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    let startPending = false
    const mockStartMutate = vi.fn()

    vi.mocked(useStartProcessByName).mockImplementation(
      () =>
        ({
          mutate: mockStartMutate,
          isPending: startPending,
        }) as never
    )
    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()
    const queryClient = createQueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButton = screen.getByLabelText('Start TEST strategy')

    await user.click(startButton)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    startPending = true
    rerender(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText('Status: starting')).toBeTruthy()
  })
  it.each([
    ['handles start strategy error - already running', 'Strategy is already running'],
    ['handles start strategy error - not found', 'Process not found'],
    ['handles start strategy error - network error', 'network timeout'],
  ])('%s', async (_name, errorMessage) => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn().mockImplementation((_data, options) => {
      options?.onError?.(new Error(errorMessage))
    })

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    await user.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockMutate).toHaveBeenCalled()
  })
  it.each([
    {
      name: 'handles stop strategy with success',
      errorMessage: undefined,
      expectPayload: true,
    },
    {
      name: 'handles stop strategy error - not running',
      errorMessage: 'Strategy is not running',
      expectPayload: false,
    },
    {
      name: 'handles stop strategy error - network error',
      errorMessage: 'Network timeout',
      expectPayload: false,
    },
  ] satisfies {
    name: string
    errorMessage: string | undefined
    expectPayload: boolean
  }[])('$name', async ({ errorMessage, expectPayload }) => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStopProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn().mockImplementation((_data, options) => {
      if (errorMessage === undefined) {
        options?.onSuccess?.()

        return
      }

      options?.onError?.(new Error(errorMessage))
    })

    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const stopButtons = screen.getAllByRole('button', { name: /stop/i })

    await user.click(stopButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))

    if (expectPayload) {
      expect(mockMutate).toHaveBeenCalledWith({ name: 'strategy_test' }, expect.any(Object))

      return
    }

    expect(mockMutate).toHaveBeenCalled()
  })
  it('disables stop button while stop mutation is pending for active strategy', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName, useStopProcessByName } =
      await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockStartMutate = vi.fn()

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartMutate,
      isPending: false,
    } as never)
    let stopPending = false

    vi.mocked(useStopProcessByName).mockImplementation(
      () =>
        ({
          mutate: vi.fn(),
          isPending: stopPending,
        }) as never
    )
    const user = (await import('@testing-library/user-event')).default.setup()
    const queryClient = createQueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButton = screen.getByLabelText('Start TEST strategy')

    await user.click(startButton)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    stopPending = true
    rerender(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText('Stop TEST strategy')).toBeDisabled()
  })
  it('handles opening and closing strategy launch modal', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
    const registerButton = screen.getByText('Register Strategy')

    await user.click(registerButton)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })

    await user.click(cancelButton)
    await waitFor(() => {
      expect(screen.queryByText('Register Strategy Process')).toBeFalsy()
    })
  })
  it('handles strategy launch with startImmediately', async () => {
    const {
      useAvailableProcesses,
      useCreateProcessConfig,
      useStartProcessByName,
      useProcessSchema,
    } = await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'macd_default' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    const mockMutateAsync = vi.fn().mockResolvedValue({})

    vi.mocked(useCreateProcessConfig).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)
    const mockStartMutateAsync = vi.fn().mockResolvedValue({})

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockStartMutateAsync,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
    const registerButton = screen.getByText('Register Strategy')

    await user.click(registerButton)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
    await waitFor(() => {
      const processNameInput = screen.getByPlaceholderText(
        'strategy_macd_custom'
      ) as HTMLInputElement

      expect(processNameInput.value).toBeTruthy()
    })
    await user.type(screen.getByPlaceholderText(/Describe purpose or parameters/i), 'covered note')
    const buttons = screen.getAllByRole('button', { name: /Register strategy/i })
    const submitButton =
      buttons.find(btn => btn.getAttribute('type') === 'submit') || buttons[buttons.length - 1]

    await user.click(submitButton as HTMLElement)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'covered note' })
      )
    })
    await waitFor(() => {
      expect(mockStartMutateAsync).toHaveBeenCalled()
    })
  })
  it('handles strategy launch without startImmediately', async () => {
    const {
      useAvailableProcesses,
      useCreateProcessConfig,
      useStartProcessByName,
      useProcessSchema,
    } = await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'macd_default' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    const mockMutateAsync = vi.fn().mockResolvedValue({})

    vi.mocked(useCreateProcessConfig).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)
    const mockStartMutateAsync = vi.fn().mockResolvedValue({})

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockStartMutateAsync,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
    const registerButton = screen.getByText('Register Strategy')

    await user.click(registerButton)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
    const startImmediatelyCheckbox = screen.getByRole('checkbox', {
      name: /Start immediately/i,
    })

    await user.click(startImmediatelyCheckbox)
    const submitButtons = screen.getAllByRole('button', { name: /Register strategy/i })
    const submitButton =
      submitButtons.find(btn => btn.getAttribute('type') === 'submit') ||
      submitButtons[submitButtons.length - 1]

    await user.click(submitButton as HTMLElement)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
    expect(mockStartMutateAsync).not.toHaveBeenCalled()
  })
  it('persists a configure-only launch as disabled and never starts it', async () => {
    const {
      useAvailableProcesses,
      useCreateProcessConfig,
      useStartProcessByName,
      useProcessSchema,
    } = await import('../../hooks/queries/processes')
    const { useAuth } = await import('../../stores/auth')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (permission: string) => permission === 'configure:strategies',
    } as never)
    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'macd_default' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    const createConfig = vi.fn().mockResolvedValue({})
    const startConfig = vi.fn().mockResolvedValue({})

    vi.mocked(useCreateProcessConfig).mockReturnValue({
      mutateAsync: createConfig,
      isPending: false,
    } as never)
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: startConfig,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    const registerButtons = await screen.findAllByText('Register Strategy')

    await user.click(registerButtons[0] as HTMLElement)
    const submitButtons = await screen.findAllByRole('button', { name: /Register strategy/i })
    const submit = submitButtons.find(button => button.getAttribute('type') === 'submit')

    expect(submit).toBeDefined()
    await user.click(submit as HTMLElement)
    await waitFor(() => {
      expect(createConfig).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })
    expect(startConfig).not.toHaveBeenCalled()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('handles strategy launch error', async () => {
    const { useAvailableProcesses, useCreateProcessConfig, useProcessSchema } =
      await import('../../hooks/queries/processes')
    const toast = (await import('react-hot-toast')).default

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'macd_default' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Configuration already exists'))

    vi.mocked(useCreateProcessConfig).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
    const registerButton = screen.getByText('Register Strategy')

    await user.click(registerButton)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
    await waitFor(() => {
      const processNameInput = screen.getByPlaceholderText(
        'strategy_macd_custom'
      ) as HTMLInputElement

      expect(processNameInput.value).toBeTruthy()
    })
    const buttons = screen.getAllByRole('button', { name: /Register strategy/i })
    const submitButton =
      buttons.find(btn => btn.getAttribute('type') === 'submit') || buttons[buttons.length - 1]

    await user.click(submitButton as HTMLElement)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register strategy')
      )
    })
  })
  it('handles strategy launch error for non-Error rejection', async () => {
    const { useAvailableProcesses, useCreateProcessConfig, useProcessSchema } =
      await import('../../hooks/queries/processes')
    const toast = (await import('react-hot-toast')).default

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: {
        payload: [
          {
            name: 'strategy_macd',
            class_path: 'snapper.strategy_macd',
            method: 'main',
            description: 'MACD Template',
            lifecycle: 'long_running',
            role: 'strategy',
            tags: [],
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'macd_default' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    const mockMutateAsync = vi.fn().mockRejectedValue('bad')

    vi.mocked(useCreateProcessConfig).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy')).toBeTruthy()
    })
    const registerButton = screen.getByText('Register Strategy')

    await user.click(registerButton)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
    const buttons = screen.getAllByRole('button', { name: /Register strategy/i })
    const submitButton =
      buttons.find(btn => btn.getAttribute('type') === 'submit') || buttons[buttons.length - 1]

    await user.click(submitButton as HTMLElement)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register strategy: Unknown error')
      )
    })
  })
  it('handles stop strategy error - generic error', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStopProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn().mockImplementation((_data, options) => {
      options?.onError?.(new Error('Some unknown error'))
    })

    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const stopButtons = screen.getAllByRole('button', { name: /stop/i })

    await user.click(stopButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockMutate).toHaveBeenCalled()
  })
  it('handles start strategy error - generic error', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName } = await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const mockMutate = vi.fn().mockImplementation((_data, options) => {
      options?.onError?.(new Error('Some unknown error'))
    })

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    await user.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockMutate).toHaveBeenCalled()
  })
  it('handles heartbeat message for warn status', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (storedHeartbeatCallback) {
      storedHeartbeatCallback(
        createHeartbeat('strategy_test', 'warning', 100, 1, {
          feed_health: {
            binance: { status: 'healthy', lag_ms: 10, heartbeat_age_ms: 100, healthy: true },
          },
          inputs: ['input1'],
          outputs: ['output1'],
        })
      )
    }
  })
  it.each([
    {
      name: 'handles heartbeat message for error status',
      strategyName: 'strategy_test',
      heartbeatComponent: 'strategy_test',
      heartbeatStatus: 'error',
      lagMs: 500,
      sequence: 2,
      expectedText: undefined,
    },
    {
      name: 'handles heartbeat message for ok status',
      strategyName: 'strategy_test',
      heartbeatComponent: 'strategy_test',
      heartbeatStatus: 'healthy',
      lagMs: 10,
      sequence: 3,
      expectedText: undefined,
    },
    {
      name: 'defaults lag_ms to 0 when missing from heartbeat',
      strategyName: 'test',
      heartbeatComponent: 'strategy_test',
      heartbeatStatus: 'healthy',
      lagMs: 0,
      sequence: 4,
      expectedText: '0ms',
    },
    {
      name: 'ignores heartbeat messages for unknown strategies',
      strategyName: 'strategy_known',
      heartbeatComponent: 'strategy_unknown',
      heartbeatStatus: 'healthy',
      lagMs: 10,
      sequence: 1,
      expectedText: undefined,
    },
  ] satisfies {
    name: string
    strategyName: string
    heartbeatComponent: string
    heartbeatStatus: 'healthy' | 'warning' | 'error'
    lagMs: number
    sequence: number
    expectedText: string | undefined
  }[])(
    '$name',
    async ({
      strategyName,
      heartbeatComponent,
      heartbeatStatus,
      lagMs,
      sequence,
      expectedText,
    }) => {
      const mockStrategies = [makeStrategyProcess({ name: strategyName, running: true })]
      const { useStrategies } = await import('../../hooks/queries/strategies')

      vi.mocked(useStrategies).mockReturnValue({
        data: makeListEnvelope('strategy_list', mockStrategies),
        isLoading: false,
        refetch: vi.fn(),
      } as never)
      renderWithProviders(<Strategies />)
      await waitFor(() => {
        expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
      })

      if (storedHeartbeatCallback) {
        storedHeartbeatCallback(
          createHeartbeat(heartbeatComponent, heartbeatStatus, lagMs, sequence)
        )
      }

      if (expectedText !== undefined) {
        await waitFor(() => {
          expect(screen.getByText(expectedText)).toBeTruthy()
        })
      }
    }
  )
  it('clears activeStrategyProcess when stopping process that is not running', async () => {
    let mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStartProcessByName, useStopProcessByName } =
      await import('../../hooks/queries/processes')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockImplementation(
      () =>
        ({
          data: makeListEnvelope('strategy_list', mockStrategies),
          isLoading: false,
          refetch: vi.fn(),
        }) as never
    )
    const mockStartMutate = vi.fn()

    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartMutate,
      isPending: false,
    } as never)
    let stopPending = false
    const mockStopMutate = vi.fn().mockImplementation((_data, options) => {
      options?.onError?.(new Error('Strategy is not running'))
    })

    vi.mocked(useStopProcessByName).mockImplementation(
      () =>
        ({
          mutate: mockStopMutate,
          isPending: stopPending,
        }) as never
    )
    const user = (await import('@testing-library/user-event')).default.setup()
    const queryClient = createQueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButton = screen.getByLabelText('Start TEST strategy')

    await user.click(startButton)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    const head0 = mockStrategies[0]

    if (head0 !== undefined) {
      mockStrategies = [
        {
          ...head0,
          running: true,
        },
      ]
    }

    rerender(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )
    const stopButton = await screen.findByLabelText('Stop TEST strategy')

    await user.click(stopButton)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Confirm'))
    expect(mockStopMutate).toHaveBeenCalled()
    stopPending = true
    rerender(
      <QueryClientProvider client={queryClient}>
        <Strategies />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.queryByText('Stopping...')).toBeNull()
    })
  })
  it('handles wsClient being null', async () => {
    const { useWebSocketStore } = await import('../../stores/websocket')

    vi.mocked(useWebSocketStore).mockReturnValue({
      wsClient: null,
    } as never)
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Management')).toBeTruthy()
    })
    expect(mockWsClient.subscribe).not.toHaveBeenCalled()
    vi.mocked(useWebSocketStore).mockReturnValue({
      wsClient: mockWsClient,
    } as never)
  })
  it('does not subscribe when no strategies configured', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', []),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('No strategies configured')).toBeTruthy()
    })
    expect(mockWsClient.subscribe).not.toHaveBeenCalled()
  })
  it('handles heartbeat with warn status', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (storedHeartbeatCallback) {
      storedHeartbeatCallback(createHeartbeat('strategy_test', 'warning', 100, 1))
    }
  })
  it('handles heartbeat with error status', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (storedHeartbeatCallback) {
      storedHeartbeatCallback(
        createHeartbeat('strategy_test', 'error', 500, 1, {
          feed_health: {
            kraken: { status: 'healthy', lag_ms: 10, heartbeat_age_ms: 100, healthy: true },
          },
          inputs: ['feed.kraken.BTC-USD'],
          outputs: ['signal.macd'],
        })
      )
    }
  })
  it('handles heartbeat with warning status alternative', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (storedHeartbeatCallback) {
      storedHeartbeatCallback(createHeartbeat('strategy_test', 'warning', 150, 1))
    }
  })
  it('triggers connection callback and resubscribes', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onConnection).toHaveBeenCalled()
    })

    if (storedConnectionCallback) {
      storedConnectionCallback(true)
      expect(mockWsClient.subscribe).toHaveBeenCalledTimes(2)
    }
  })
  it('ignores heartbeat messages for non-strategy components', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (storedHeartbeatCallback) {
      storedHeartbeatCallback(createHeartbeat('executor_kraken', 'healthy', 10, 1))
    }
  })
  it('filters strategies by status filter', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_running', running: true }),
      makeStrategyProcess({ name: 'strategy_stopped' }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('RUNNING')).toBeTruthy()
    })
    const select = screen.getByRole('combobox')

    await user.click(select)
    await user.click(screen.getByText('Running'))
    expect(screen.getByText('RUNNING')).toBeTruthy()
  })
  it('filters strategies by stopped status filter', async () => {
    const mockStrategies = [
      makeStrategyProcess({ name: 'strategy_running', running: true }),
      makeStrategyProcess({ name: 'strategy_stopped' }),
    ]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('RUNNING')).toBeTruthy()
      expect(screen.getByText('STOPPED')).toBeTruthy()
    })
    const select = screen.getByRole('combobox')

    await user.click(select)
    await user.click(screen.getByText('Stopped'))
    expect(screen.getByText('STOPPED')).toBeTruthy()
    expect(screen.queryByText('RUNNING')).toBeNull()
  })
  it('shows no match state and clears filters', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test', running: true })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const searchInput = screen.getByPlaceholderText('Search strategies...')

    await user.type(searchInput, 'nonexistent')
    await waitFor(() => {
      expect(screen.getByText('No strategies match your filters')).toBeTruthy()
    })
    const clearButton = screen.getByText('Clear filters')

    await user.click(clearButton)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
  })
  it('cancels confirm dialog', async () => {
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    await user.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeTruthy()
    })
    await user.click(screen.getByText('Cancel'))
    await waitFor(() => {
      expect(screen.queryByText('Confirm')).toBeNull()
    })
  })
  it('opens register modal from empty state button', async () => {
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', []),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const user = (await import('@testing-library/user-event')).default.setup()

    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('No strategies configured')).toBeTruthy()
    })
    const registerButtons = screen.getAllByText('Register Strategy')

    await user.click(registerButtons[registerButtons.length - 1] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Register Strategy Process')).toBeTruthy()
    })
  })
  it('hides action buttons without any strategy mutation permission', async () => {
    const { useAuth } = await import('../../stores/auth')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: () => false,
    } as never)
    const mockStrategies = [makeStrategyProcess({ name: 'strategy_test' })]
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', mockStrategies),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeTruthy()
    })
    expect(screen.queryByText('Register Strategy')).toBeNull()
    expect(screen.queryByRole('button', { name: /start/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /stop/i })).toBeNull()
    expect(screen.getByText(/Contact an operator or admin to manage strategies/i)).toBeTruthy()
    vi.mocked(useAuth).mockReturnValue({
      hasPermission: () => true,
    } as never)
  })
  it('shows only Start for a stopped strategy with START_STRATEGIES alone', async () => {
    const { useAuth } = await import('../../stores/auth')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (permission: string) => permission === 'start:strategies',
    } as never)
    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({ name: 'strategy_start_only', running: false }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)

    await screen.findByText('START ONLY')
    expect(screen.getByRole('button', { name: /Start START ONLY strategy/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stop START ONLY strategy/i })).toBeNull()
    expect(screen.queryByText('Register Strategy')).toBeNull()
    expect(screen.queryByText('Edit scope')).toBeNull()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('shows only Stop for a running strategy with STOP_STRATEGIES alone', async () => {
    const { useAuth } = await import('../../stores/auth')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (permission: string) => permission === 'stop:strategies',
    } as never)
    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({
          name: 'strategy_stop_only',
          running: true,
          enabled: true,
          managed_remotely: true,
        }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)

    await screen.findByText('STOP ONLY')
    expect(screen.getByRole('button', { name: /Stop STOP ONLY strategy/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Restart STOP ONLY strategy/i })).toBeNull()
    expect(screen.queryByText('Register Strategy')).toBeNull()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('shows configure controls without execution controls for CONFIGURE_STRATEGIES alone', async () => {
    const { useAuth } = await import('../../stores/auth')
    const { useStrategies } = await import('../../hooks/queries/strategies')
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (permission: string) => permission === 'configure:strategies',
    } as never)
    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({ name: 'strategy_configure_only', running: false }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: {
        payload: [
          makeConfiguredProcess({
            name: 'strategy_configure_only',
            role: 'strategy',
            parameters: { operator_public_id: 'label:default' },
          }),
        ],
      },
      isLoading: false,
    } as never)
    renderWithProviders(<Strategies />)

    await screen.findByText('CONFIGURE ONLY')
    expect(screen.getAllByText('Register Strategy').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Edit scope')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start CONFIGURE ONLY strategy/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Stop CONFIGURE ONLY strategy/i })).toBeNull()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('shows Restart only when a remote strategy grants both START and STOP', async () => {
    const { useAuth } = await import('../../stores/auth')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: (permission: string) =>
        permission === 'start:strategies' || permission === 'stop:strategies',
    } as never)
    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({
          name: 'strategy_restart_grants',
          running: true,
          enabled: true,
          managed_remotely: true,
        }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)

    await screen.findByText('RESTART GRANTS')
    expect(
      screen.getByRole('button', { name: /Restart RESTART GRANTS strategy/i })
    ).toBeInTheDocument()
    expect(screen.queryByText('Register Strategy')).toBeNull()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('rechecks START_STRATEGIES before an already-rendered strategy control executes', async () => {
    const { useAuth } = await import('../../stores/auth')
    const hasPermission = vi.fn<(permission: string) => boolean>(() => true)

    vi.mocked(useAuth).mockReturnValue({ hasPermission } as never)
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({ name: 'strategy_permission_revoked', running: false }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await screen.findByText('PERMISSION REVOKED')
    const startButton = screen.getByRole('button', {
      name: /Start PERMISSION REVOKED strategy/i,
    })

    hasPermission.mockReturnValue(false)
    fireEvent.click(startButton)

    expect(screen.queryByText(/Start strategy_permission_revoked/)).not.toBeInTheDocument()
    expect(mockStartProcess).not.toHaveBeenCalled()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('does not open stop or restart handlers after STOP_STRATEGIES is revoked', async () => {
    const { useAuth } = await import('../../stores/auth')
    const granted = new Set(['start:strategies', 'stop:strategies'])
    const hasPermission = vi.fn((permission: string) => granted.has(permission))

    vi.mocked(useAuth).mockReturnValue({ hasPermission } as never)
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [
        makeStrategyProcess({
          name: 'strategy_stop_revoked',
          running: true,
          enabled: true,
          managed_remotely: true,
        }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await screen.findByText('STOP REVOKED')
    const stopButton = screen.getByRole('button', { name: /Stop STOP REVOKED strategy/i })
    const restartButton = screen.getByRole('button', { name: /Restart STOP REVOKED strategy/i })

    granted.delete('stop:strategies')
    fireEvent.click(stopButton)
    fireEvent.click(restartButton)

    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull()
    expect(mockPatchDesiredStateAsync).not.toHaveBeenCalled()
    vi.mocked(useAuth).mockReturnValue({ hasPermission: () => true } as never)
  })
  it('shows viewer empty state without register button', async () => {
    const { useAuth } = await import('../../stores/auth')

    vi.mocked(useAuth).mockReturnValue({
      hasPermission: () => false,
    } as never)
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', []),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('No strategies configured')).toBeTruthy()
    })
    expect(screen.getByText('No strategies have been configured yet')).toBeTruthy()
    expect(screen.queryByText('Register Strategy')).toBeNull()
    vi.mocked(useAuth).mockReturnValue({
      hasPermission: () => true,
    } as never)
  })
  it('does not subscribe to heartbeats when time traveling', async () => {
    const { useAppStore } = await import('../../stores/app')
    const { useStrategies } = await import('../../hooks/queries/strategies')

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: '2024-01-01T00:00:00Z', isTimeTraveling: true })) as never)
    vi.mocked(useStrategies).mockReturnValue({
      data: makeListEnvelope('strategy_list', [makeStrategyProcess({ name: 'test' })]),
      isLoading: false,
    } as never)
    mockWsClient.subscribe.mockClear()
    renderWithProviders(<Strategies />)
    await waitFor(() => {
      expect(screen.getByText('Strategy Management')).toBeTruthy()
    })

    expect(mockWsClient.subscribe).not.toHaveBeenCalled()
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: null, isTimeTraveling: false })) as never)
  })
})
