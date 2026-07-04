import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Processes } from './Processes'
import {
  makeConfiguredProcess,
  makeAvailableProcess,
  makeProcessRun,
  makeHeartbeat,
  makeListEnvelope,
} from '../../test/factories'
import {
  useStartProcessByName,
  useStopProcessByName,
  usePatchProcessDesiredState,
} from '../../hooks/queries/processes'

let heartbeatCallback: ((msg: unknown) => void) | null = null
let connectionCallback: ((connected: boolean) => void) | null = null
const mockWsClient = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  onConnection: vi.fn((cb: (connected: boolean) => void) => {
    connectionCallback = cb

    return vi.fn()
  }),
  onMessage: vi.fn((type: string, cb: (msg: unknown) => void) => {
    if (type === 'heartbeat') {
      heartbeatCallback = cb
    }

    return vi.fn()
  }),
}
const mockStartProcessMutate = vi.fn()
const mockStopProcessMutate = vi.fn()
const mockPatchDesiredStateMutate = vi.fn()
const mockPatchDesiredStateMutateAsync = vi.fn()
const mockCreateProcessConfig = vi.fn()

vi.mock('../../hooks/queries/processes', () => ({
  useConfiguredProcesses: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useAvailableProcesses: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useProcessRuns: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useStartProcessByName: vi.fn(() => ({
    mutate: mockStartProcessMutate,
    isPending: false,
  })),
  useStopProcessByName: vi.fn(() => ({
    mutate: mockStopProcessMutate,
    isPending: false,
  })),
  usePatchProcessDesiredState: vi.fn(() => ({
    mutate: mockPatchDesiredStateMutate,
    mutateAsync: mockPatchDesiredStateMutateAsync,
    isPending: false,
    variables: undefined,
  })),
  useCreateProcessConfig: vi.fn(() => ({ mutate: mockCreateProcessConfig })),
}))
vi.mock('../../stores/websocket', () => ({
  useWebSocketStore: vi.fn(() => ({
    wsClient: mockWsClient,
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

describe('Processes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPatchDesiredStateMutate.mockReset()
    mockPatchDesiredStateMutateAsync.mockReset()
    mockPatchDesiredStateMutateAsync.mockReturnValue(new Promise(() => {}))
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartProcessMutate,
      isPending: false,
    } as never)
    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockStopProcessMutate,
      isPending: false,
    } as never)
    vi.mocked(usePatchProcessDesiredState).mockReturnValue({
      mutate: mockPatchDesiredStateMutate,
      mutateAsync: mockPatchDesiredStateMutateAsync,
      isPending: false,
      variables: undefined,
    } as never)
    heartbeatCallback = null
    connectionCallback = null
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })
  it('renders processes page', () => {
    renderWithProviders(<Processes />)
    expect(screen.getByText('Process Control')).toBeTruthy()
  })
  it('displays loading state', async () => {
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByTestId('processes-skeleton')).toBeTruthy()
    })
  })
  it('displays configured processes section', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
  })
  it('shows live controls + the managed-remotely notice and routes Stop to the desired-state PATCH', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: true,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    expect(screen.getByText('Restart')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateMutateAsync).toHaveBeenCalledWith({
      name: 'kraken_feed_publisher',
      body: { action: 'disable' },
    })
  })
  it('routes Start of a stopped remote process to the desired-state enable PATCH', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: false,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(mockPatchDesiredStateMutateAsync).toHaveBeenCalledWith({
      name: 'kraken_feed_publisher',
      body: { action: 'enable' },
    })
  })
  it('routes Restart of a running remote process to the desired-state restart PATCH', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: true,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Restart'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockPatchDesiredStateMutateAsync).toHaveBeenCalledWith({
      name: 'kraken_feed_publisher',
      body: { action: 'restart', restart_nonce: expect.any(String) },
    })
  })
  it('reflects the enable PATCH pending state on the Start button of a remote process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: false,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    await waitFor(() => {
      expect(screen.getByText('Starting...')).toBeTruthy()
    })
  })
  it('clears the remote pending state once the desired-state PATCH settles', async () => {
    mockPatchDesiredStateMutateAsync.mockResolvedValue(undefined)
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: false,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(mockPatchDesiredStateMutateAsync).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText('Starting...')).toBeNull()
    })
  })
  it('recovers the remote controls after a failed desired-state PATCH', async () => {
    mockPatchDesiredStateMutateAsync.mockRejectedValue(new Error('boom'))
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        running: false,
        lifecycle: 'long_running',
        role: 'core',
        managed_remotely: true,
        coordinator: 'coord-1',
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Managed by coord-1')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start/i })).toBeEnabled()
    })
  })
  it('subscribes to heartbeat topics', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Test',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalled()
    })
  })
  it('handles empty process list', async () => {
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', []),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('displays available processes registry', async () => {
    const { useAvailableProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: makeListEnvelope('available_processes', [
        makeAvailableProcess({
          name: 'executor',
          description: 'Trading Executor',
          role: 'core',
          lifecycle: 'long_running',
          tags: [],
        }),
      ]),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('opens execution mode modal on start', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('stops a running process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('displays process with heartbeat status', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('groups processes by role', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
      makeConfiguredProcess({
        name: 'feed_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.feed',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'task',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('displays process runs history', async () => {
    const { useProcessRuns } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', [
        makeProcessRun({
          process_name: 'executor_kraken',
          status: 'succeeded',
          role: 'core',
          lifecycle: 'long_running',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
        }),
      ]),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('keeps latest run when earlier run appears later in list', async () => {
    const { useConfiguredProcesses, useProcessRuns } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', [
        makeConfiguredProcess({
          name: 'task_process',
          enabled: true,
          running: false,
          class_path: 'snapper.task',
          method: 'main',
          parameters: {},
          lifecycle: 'one_shot',
          role: 'task',
          tags: [],
          is_one_shot: true,
        }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', [
        makeProcessRun({
          process_name: 'task_process',
          status: 'failed',
          role: 'task',
          lifecycle: 'one_shot',
          started_at: '2024-01-02T00:00:00Z',
          completed_at: '2024-01-02T01:00:00Z',
        }),
        makeProcessRun({
          process_name: 'task_process',
          status: 'succeeded',
          role: 'task',
          lifecycle: 'one_shot',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
        }),
      ]),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText(/last run:/i)).toBeInTheDocument()
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })
  it('renders last run with null timestamp when missing', async () => {
    const { useConfiguredProcesses, useProcessRuns } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', [
        makeConfiguredProcess({
          name: 'task_process',
          enabled: true,
          running: false,
          class_path: 'snapper.task',
          method: 'main',
          parameters: {},
          lifecycle: 'one_shot',
          role: 'task',
          tags: [],
          is_one_shot: true,
        }),
      ]),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', [
        makeProcessRun({
          process_name: 'task_process',
          status: 'succeeded',
          role: 'task',
          lifecycle: 'one_shot',
          started_at: '',
          completed_at: null,
        }),
      ]),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText(/last run:/i)).toBeInTheDocument()
      expect(screen.getByText(/succeeded \(null\)/i)).toBeInTheDocument()
    })
  })
  it('subscribes to heartbeat topics for executor processes', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.subscribe).toHaveBeenCalled()
    })
  })
  it('handles heartbeat messages', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    if (heartbeatCallback) {
      heartbeatCallback(
        makeHeartbeat({ component: 'executor.kraken', status: 'healthy', lag_ms: 10 })
      )
    }
  })
  it('defaults heartbeat lag and healthy when missing', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })
    act(() => {
      heartbeatCallback?.(makeHeartbeat({ component: 'executor.kraken', status: 'healthy' }))
    })
    await waitFor(() => {
      expect(screen.getByText('(0ms)')).toBeTruthy()
    })
    act(() => {
      heartbeatCallback?.(makeHeartbeat({ component: 'executor.kraken', status: 'error' }))
    })
    expect(screen.getByText('error')).toBeTruthy()
  })
  it('filters long-running processes correctly', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
      makeConfiguredProcess({
        name: 'strategy_test',
        enabled: true,
        running: false,
        class_path: 'snapper.strategy',
        method: 'main',
        parameters: {},
        note: 'Test Strategy',
        lifecycle: 'long_running',
        role: 'strategy',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
    expect(screen.queryByText('Test Strategy')).toBeNull()
  })
  it('filters one-shot task processes', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: true,
        running: false,
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'core',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('shows auto-start and manual badges for non-one-shot tasks', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'auto_task',
        enabled: true,
        running: false,
        class_path: 'snapper.tasks.auto',
        method: 'main',
        parameters: {},
        note: 'Auto task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: false,
      }),
      makeConfiguredProcess({
        name: 'manual_task',
        enabled: false,
        running: false,
        class_path: 'snapper.tasks.manual',
        method: 'main',
        parameters: {},
        note: 'Manual task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    expect(screen.getByText('auto-start')).toBeTruthy()
    expect(screen.getByText('manual')).toBeTruthy()
  })
  it('handles connection callback for websocket', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.onConnection).toHaveBeenCalled()
    })

    if (connectionCallback) {
      connectionCallback(true)
      expect(mockWsClient.subscribe).toHaveBeenCalled()
    }
  })
  it('does not resubscribe when connection callback is false', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(mockWsClient.onConnection).toHaveBeenCalled()
    })
    const initialCalls = mockWsClient.subscribe.mock.calls.length

    act(() => {
      connectionCallback?.(false)
    })
    expect(mockWsClient.subscribe).toHaveBeenCalledTimes(initialCalls)
  })
  it('displays feed publisher processes with heartbeat', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'kraken_feed_publisher',
        enabled: true,
        running: true,
        class_path: 'snapper.feed_publisher',
        method: 'main',
        parameters: {},
        note: 'Kraken Feed Publisher',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
  })
  it('renders executor process with heartbeat data mapping', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const availableItems = [
      makeAvailableProcess({
        name: 'executor_kraken',
        class_path: 'snapper.executor',
        method: 'main',
        description: 'Kraken Trading Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: ['kraken', 'trading'],
        parameters_schema: null,
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: makeListEnvelope('available_processes', availableItems),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Kraken Trading Executor')).toBeTruthy()
    })
  })
  it('opens execution mode modal and starts long-running process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: false,
        running: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    expect(startButtons.length).toBeGreaterThan(0)
    fireEvent.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const modalButtons = screen.getAllByRole('button')
    const modalStartButton = modalButtons.find(
      btn =>
        btn.textContent?.toLowerCase().includes('start') && btn.classList.contains('bg-primary-600')
    )

    expect(modalStartButton).toBeTruthy()

    if (modalStartButton) {
      fireEvent.click(modalStartButton)
    }

    expect(mockStartProcessMutate).toHaveBeenCalled()
  })
  it('starts long-running process from list', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: false,
        running: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: makeListEnvelope('available_processes', []),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Kraken Executor')).toBeTruthy()
    })
    const executorCard = screen.getByText('Kraken Executor').closest('.rounded-2xl')
    const startButton = executorCard?.querySelector('button')

    expect(startButton).toBeTruthy()

    if (startButton) {
      fireEvent.click(startButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /start executor_kraken/i }))
    expect(mockStartProcessMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'executor_kraken',
      })
    )
  })
  it('opens confirm dialog and stops long-running process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const stopButtons = screen.getAllByRole('button', { name: /stop/i })

    expect(stopButtons.length).toBeGreaterThan(0)
    fireEvent.click(stopButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalled()
  })
  it('displays task processes with details including tags and parameters_schema', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: true,
        running: false,
        mode: 'process',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: ['sync', 'data'],
        is_one_shot: true,
        parameters_schema: { type: 'object', properties: { source: { type: 'string' } } },
        active_public_id: 'run-123',
      }),
    ]
    const availableItems = [
      makeAvailableProcess({
        name: 'data_sync_task',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        description: 'Synchronize data from external sources',
        lifecycle: 'one_shot',
        role: 'task',
        tags: ['sync', 'data'],
        parameters_schema: { type: 'object', properties: { source: { type: 'string' } } },
      }),
    ]
    const runItems = [
      makeProcessRun({
        process_name: 'data_sync_task',
        status: 'succeeded',
        role: 'task',
        lifecycle: 'one_shot',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:05:00Z',
      }),
      makeProcessRun({
        process_name: 'data_sync_task',
        status: 'running',
        role: 'task',
        lifecycle: 'one_shot',
        started_at: '2024-01-02T00:00:00Z',
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses, useProcessRuns } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: makeListEnvelope('available_processes', availableItems),
      isLoading: false,
    } as never)
    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', runItems),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    expect(screen.getByText('Synchronize data from external sources')).toBeTruthy()
  })
  it('starts task process with execution mode modal and confirm dialog', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: false,
        running: false,
        mode: 'process',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses } =
      await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: null,
      isLoading: false,
    } as never)

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    const taskTitle = screen.getByText('Data sync task')
    const taskCard = taskTitle.closest('.rounded-2xl')
    const startButton = taskCard?.querySelector('button')

    expect(startButton).toBeTruthy()

    if (startButton) {
      fireEvent.click(startButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const modalButtons = screen.getAllByRole('button')
    const modalStartButton = modalButtons.find(
      btn =>
        btn.textContent?.toLowerCase().includes('start') &&
        btn.textContent?.includes('data_sync_task')
    )

    expect(modalStartButton).toBeTruthy()

    if (modalStartButton) {
      fireEvent.click(modalStartButton)
    }

    expect(mockStartProcessMutate).toHaveBeenCalled()
  })
  it('stops task process with confirm dialog', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: true,
        running: true,
        mode: 'process',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses } =
      await import('../../hooks/queries/processes')

    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: null,
      isLoading: false,
    } as never)

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    const taskTitle = screen.getByText('Data sync task')
    const taskCard = taskTitle.closest('.rounded-2xl')
    const stopButton = taskCard?.querySelector('button')

    expect(stopButton).toBeTruthy()

    if (stopButton) {
      fireEvent.click(stopButton)
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalled()
  })
  it('cancels confirm dialog', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const stopButtons = screen.getAllByRole('button', { name: /stop/i })

    fireEvent.click(stopButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockStopProcessMutate).not.toHaveBeenCalled()
  })
  it('closes execution mode modal', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: false,
        running: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const startButtons = screen.getAllByRole('button', { name: /start/i })

    fireEvent.click(startButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })

    fireEvent.click(cancelButton)
    await waitFor(() => {
      expect(screen.queryByText('Execution Mode:')).toBeNull()
    })
  })
  it('cleans up stale heartbeats after timeout', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
    expect(mockWsClient.onMessage).toHaveBeenCalledWith('heartbeat', expect.any(Function))
    expect(heartbeatCallback).toBeDefined()
    act(() => {
      heartbeatCallback?.(
        makeHeartbeat({ component: 'executor.kraken', status: 'healthy', lag_ms: 10 })
      )
    })
  })
  it('removes stale heartbeats after threshold', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    try {
      const items = [
        makeConfiguredProcess({
          name: 'executor_kraken',
          enabled: true,
          running: true,
          class_path: 'snapper.executor',
          method: 'main',
          parameters: {},
          note: 'Kraken Executor',
          lifecycle: 'long_running',
          role: 'core',
          tags: [],
          is_one_shot: false,
        }),
      ]
      const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

      vi.mocked(useConfiguredProcesses).mockReturnValue({
        data: makeListEnvelope('configured_processes', items),
        isLoading: false,
        refetch: vi.fn(),
      } as never)
      renderWithProviders(<Processes />)
      expect(screen.getByText('Process Control')).toBeTruthy()
      expect(screen.getByText(/unknown/i)).toBeTruthy()
      act(() => {
        heartbeatCallback?.(
          makeHeartbeat({ component: 'executor.kraken', status: 'healthy', lag_ms: 10 })
        )
      })
      expect(screen.queryByText(/unknown/i)).toBeNull()
      act(() => {
        vi.advanceTimersByTime(15000)
      })
      expect(screen.getByText(/unknown/i)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
  it('starts ZMQ Broker process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        enabled: true,
        running: false,
        class_path: 'snapper.zmq_broker',
        method: 'main',
        parameters: {},
        note: 'ZMQ Broker',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('ZMQ Broker')).toBeTruthy()
    })
    const zmqCard = screen.getByText('ZMQ Broker').closest('.rounded-2xl')
    const startButton = zmqCard?.querySelector('button')

    expect(startButton).toBeTruthy()
    expect(startButton?.textContent).toContain('Start')

    if (startButton) {
      fireEvent.click(startButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const modalButtons = screen.getAllByRole('button')
    const modalStartButton = modalButtons.find(
      btn =>
        btn.textContent?.toLowerCase().includes('start') && btn.classList.contains('bg-primary-600')
    )

    expect(modalStartButton).toBeTruthy()

    if (modalStartButton) {
      fireEvent.click(modalStartButton)
    }

    expect(mockStartProcessMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'zmq_broker',
      })
    )
  })
  it('stops ZMQ Broker process with warning', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        enabled: true,
        running: true,
        class_path: 'snapper.zmq_broker',
        method: 'main',
        parameters: {},
        note: 'ZMQ Broker',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('ZMQ Broker')).toBeTruthy()
    })
    const zmqCard = screen.getByText('ZMQ Broker').closest('.rounded-2xl')
    const stopButton = zmqCard?.querySelector('button')

    expect(stopButton).toBeTruthy()
    expect(stopButton?.textContent).toContain('Stop')

    if (stopButton) {
      fireEvent.click(stopButton)
    }

    await waitFor(() => {
      expect(screen.getByText(/This will stop the zmq_broker process/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalledWith({ name: 'zmq_broker' })
  })
  it('formats timestamp correctly', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: true,
        running: false,
        mode: 'process',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const runItems = [
      makeProcessRun({
        process_name: 'data_sync_task',
        status: 'succeeded',
        role: 'task',
        lifecycle: 'one_shot',
        started_at: '2024-06-15T10:30:00Z',
        completed_at: '2024-06-15T10:35:00Z',
      }),
    ]
    const { useConfiguredProcesses, useProcessRuns } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', runItems),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
  })
  it('handles null timestamp gracefully', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'data_sync_task',
        enabled: true,
        running: false,
        mode: 'process',
        class_path: 'snapper.tasks.sync',
        method: 'main',
        parameters: {},
        note: 'Data sync task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const runItems = [
      makeProcessRun({
        process_name: 'data_sync_task',
        status: 'running',
        role: 'task',
        lifecycle: 'one_shot',
        started_at: 'invalid-date',
      }),
    ]
    const { useConfiguredProcesses, useProcessRuns } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useProcessRuns).mockReturnValue({
      data: makeListEnvelope('process_runs', runItems),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
  })
  it('handles task process without tags from registry', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'simple_task',
        enabled: false,
        running: false,
        class_path: 'snapper.tasks.simple',
        method: 'main',
        parameters: {},
        note: 'Simple task',
        lifecycle: 'one_shot',
        role: 'task',
        tags: ['local-tag'],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses, useAvailableProcesses } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAvailableProcesses).mockReturnValue({
      data: makeListEnvelope('available_processes', []),
      isLoading: false,
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    expect(screen.getByText('Simple task')).toBeTruthy()
  })
  it('handles wsClient being null', async () => {
    const { useWebSocketStore } = await import('../../stores/websocket')

    vi.mocked(useWebSocketStore).mockReturnValue({
      wsClient: null,
    } as never)
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
    expect(mockWsClient.subscribe).not.toHaveBeenCalled()
    vi.mocked(useWebSocketStore).mockReturnValue({
      wsClient: mockWsClient,
    } as never)
  })
  it('cleans up stale heartbeats when they exceed threshold', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: 'Kraken Executor',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    const { unmount } = renderWithProviders(<Processes />)

    await waitFor(() => {
      expect(screen.getByText('Process Control')).toBeTruthy()
    })
    act(() => {
      heartbeatCallback?.(
        makeHeartbeat({ component: 'executor.kraken', status: 'healthy', lag_ms: 10 })
      )
    })
    unmount()
  })
  it('shows starting state only for ZMQ Broker when isPending', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        enabled: false,
        running: false,
        class_path: 'snapper.zmq_broker',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses, useStartProcessByName } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartProcessMutate,
      isPending: true,
      variables: { name: 'zmq_broker' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('zmq_broker')).toBeTruthy()
    })
    expect(screen.getByText(/Starting/i)).toBeTruthy()
  })
  it('shows starting state only for targeted long-running process when isPending', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: false,
        running: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses, useStartProcessByName } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartProcessMutate,
      isPending: true,
      variables: { name: 'executor_kraken' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    expect(screen.getByText(/Starting/i)).toBeTruthy()
  })
  it('shows starting state only for targeted task process when isPending', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'sync_task',
        enabled: false,
        running: false,
        class_path: 'snapper.sync_task',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses, useStartProcessByName } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartProcessMutate,
      isPending: true,
      variables: { name: 'sync_task' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    expect(screen.getByText(/Starting/i)).toBeTruthy()
  })
  it('shows stopping state only for targeted long-running process when isPending', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
      makeConfiguredProcess({
        name: 'executor_walutomat',
        enabled: true,
        running: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses, useStopProcessByName } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockStopProcessMutate,
      isPending: true,
      variables: { name: 'executor_kraken' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    expect(screen.getByText(/Stopping/i)).toBeTruthy()
  })
  it('shows stopping state only for targeted task process when isPending', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'sync_task',
        enabled: false,
        running: true,
        class_path: 'snapper.sync_task',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses, useStopProcessByName } =
      await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockStopProcessMutate,
      isPending: true,
      variables: { name: 'sync_task' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    expect(screen.getByText(/Stopping/i)).toBeTruthy()
  })
  it('restarts ZMQ Broker: shows confirm dialog and calls stop with onSuccess', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        enabled: true,
        running: true,
        class_path: 'snapper.zmq_broker',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('zmq_broker')).toBeTruthy()
    })
    const zmqCard = screen.getByText('zmq_broker').closest('.rounded-2xl')
    const restartButton = Array.from(zmqCard?.querySelectorAll('button') ?? []).find(
      (btn: Element) => btn.textContent === 'Restart'
    )

    expect(restartButton).toBeTruthy()

    if (restartButton) {
      fireEvent.click(restartButton)
    }

    await waitFor(() => {
      expect(screen.getByText(/Restart zmq_broker/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalledWith(
      { name: 'zmq_broker' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
  it('restarts ZMQ Broker: onSuccess opens execution mode modal and starts process', async () => {
    let capturedOnSuccess: (() => void) | undefined

    mockStopProcessMutate.mockImplementation(
      (_args: unknown, options?: { onSuccess?: () => void }) => {
        capturedOnSuccess = options?.onSuccess
      }
    )
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        enabled: true,
        running: true,
        class_path: 'snapper.zmq_broker',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('zmq_broker')).toBeTruthy()
    })
    const zmqCard = screen.getByText('zmq_broker').closest('.rounded-2xl')
    const restartButton = Array.from(zmqCard?.querySelectorAll('button') ?? []).find(
      (btn: Element) => btn.textContent === 'Restart'
    )

    if (restartButton) {
      fireEvent.click(restartButton)
    }

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(capturedOnSuccess).toBeDefined()
    act(() => {
      capturedOnSuccess?.()
    })
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const modalButtons = screen.getAllByRole('button')
    const modalStartButton = modalButtons.find(
      (btn: HTMLElement) =>
        btn.textContent?.toLowerCase().includes('start') && btn.classList.contains('bg-primary-600')
    )

    expect(modalStartButton).toBeTruthy()

    if (modalStartButton) {
      fireEvent.click(modalStartButton)
    }

    expect(mockStartProcessMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'zmq_broker' })
    )
  })
  it('restarts long-running process: shows confirm dialog and calls stop with onSuccess', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'my_service',
        enabled: false,
        running: true,
        class_path: 'snapper.my_service',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const restartButtons = screen.getAllByRole('button', { name: /restart/i })

    expect(restartButtons.length).toBeGreaterThan(0)
    fireEvent.click(restartButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText(/Restart my_service/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalledWith(
      { name: 'my_service' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
  it('restarts long-running process: onSuccess opens execution mode modal and starts process', async () => {
    let capturedOnSuccess: (() => void) | undefined

    mockStopProcessMutate.mockImplementation(
      (_args: unknown, options?: { onSuccess?: () => void }) => {
        capturedOnSuccess = options?.onSuccess
      }
    )
    const items = [
      makeConfiguredProcess({
        name: 'my_service',
        enabled: false,
        running: true,
        class_path: 'snapper.my_service',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    const restartButtons = screen.getAllByRole('button', { name: /restart/i })

    fireEvent.click(restartButtons[0] as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(capturedOnSuccess).toBeDefined()
    act(() => {
      capturedOnSuccess?.()
    })
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
    const modalButtons = screen.getAllByRole('button')
    const modalStartButton = modalButtons.find(
      (btn: HTMLElement) =>
        btn.textContent?.toLowerCase().includes('start') && btn.classList.contains('bg-primary-600')
    )

    expect(modalStartButton).toBeTruthy()

    if (modalStartButton) {
      fireEvent.click(modalStartButton)
    }

    expect(mockStartProcessMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my_service' })
    )
  })
  it('restarts task process: shows confirm dialog and calls stop with onSuccess', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'sync_task',
        enabled: false,
        running: true,
        class_path: 'snapper.sync_task',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    const restartButtons = screen.getAllByRole('button', { name: /restart/i })

    expect(restartButtons.length).toBeGreaterThan(0)
    fireEvent.click(restartButtons[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText(/Restart sync_task/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(mockStopProcessMutate).toHaveBeenCalledWith(
      { name: 'sync_task' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
  it('restarts task process: onSuccess opens execution mode modal', async () => {
    let capturedOnSuccess: (() => void) | undefined

    mockStopProcessMutate.mockImplementation(
      (_args: unknown, options?: { onSuccess?: () => void }) => {
        capturedOnSuccess = options?.onSuccess
      }
    )
    const items = [
      makeConfiguredProcess({
        name: 'sync_task',
        enabled: false,
        running: true,
        class_path: 'snapper.sync_task',
        method: 'main',
        parameters: {},
        note: '',
        lifecycle: 'one_shot',
        role: 'task',
        tags: [],
        is_one_shot: true,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Task Processes')).toBeTruthy()
    })
    const restartButtons = screen.getAllByRole('button', { name: /restart/i })

    fireEvent.click(restartButtons[0] as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(capturedOnSuccess).toBeDefined()
    act(() => {
      capturedOnSuccess?.()
    })
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
  })
  it('renders Executor Templates section without Start/Stop buttons', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken',
        kind: 'template',
        running: false,
        enabled: false,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: { throttle: 5 },
        note: 'Kraken Executor Template',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Executor Templates')).toBeTruthy()
    })
    expect(screen.getByTestId('executor-template-executor_kraken')).toBeTruthy()
    expect(
      screen.getByText(
        'Editing template config affects all wallets on this exchange after restart. Templates are config-only — start the per-wallet instance below to run an executor.'
      )
    ).toBeTruthy()
    expect(screen.getByText('1 parameter(s)')).toBeTruthy()
  })
  it('reflects a pending local stop on the matching wallet instance', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000003',
        kind: 'instance',
        wallet_public_id: '00000000-0000-7000-8000-000000000003',
        parent_template: 'executor_kraken',
        running: true,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: { wallet_public_id: '00000000-0000-7000-8000-000000000003' },
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useStartProcessByName).mockReturnValue({
      mutate: mockStartProcessMutate,
      isPending: true,
      variables: { name: 'executor_kraken_w000000000003' },
    } as never)
    vi.mocked(useStopProcessByName).mockReturnValue({
      mutate: mockStopProcessMutate,
      isPending: true,
      variables: { name: 'executor_kraken_w000000000003' },
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    expect(screen.getByText('Stopping...')).toBeTruthy()
  })
  it('clicking Start on a stopped Wallet Instance opens execution mode modal', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000003',
        kind: 'instance',
        wallet_public_id: '00000000-0000-7000-8000-000000000003',
        parent_template: 'executor_kraken',
        running: false,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: { wallet_public_id: '00000000-0000-7000-8000-000000000003' },
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    const startButton = screen
      .getAllByRole('button', { name: /start/i })
      .find(btn => btn instanceof HTMLElement) as HTMLElement | undefined

    expect(startButton).toBeDefined()
    fireEvent.click(startButton as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
  })
  it('clicking Stop on a Wallet Instance opens confirm and stops the process', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000001',
        kind: 'instance',
        wallet_public_id: '00000000-0000-7000-8000-000000000001',
        parent_template: 'executor_kraken',
        running: true,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: { wallet_public_id: '00000000-0000-7000-8000-000000000001' },
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    const stopButton = screen.getAllByRole('button', { name: /stop/i })[0] as HTMLElement

    fireEvent.click(stopButton)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(mockStopProcessMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'executor_kraken_w000000000001' })
      )
    })
  })
  it('clicking Restart on a Wallet Instance triggers stop then start mode modal', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000002',
        kind: 'instance',
        wallet_public_id: '00000000-0000-7000-8000-000000000002',
        parent_template: 'executor_kraken',
        running: true,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    let capturedOnSuccess: (() => void) | undefined

    mockStopProcessMutate.mockImplementation(
      (_vars: unknown, options: { onSuccess?: () => void }) => {
        capturedOnSuccess = options?.onSuccess
      }
    )
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    const restartButton = screen
      .getAllByRole('button', { name: /restart/i })
      .find(btn => btn instanceof HTMLElement) as HTMLElement | undefined

    expect(restartButton).toBeDefined()
    fireEvent.click(restartButton as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(capturedOnSuccess).toBeDefined()
    act(() => {
      capturedOnSuccess?.()
    })
    await waitFor(() => {
      expect(screen.getByText('Execution Mode:')).toBeTruthy()
    })
  })
  it('renders Wallet Instances section with Start/Stop buttons', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000000',
        kind: 'instance',
        wallet_public_id: '00000000-0000-7000-8000-000000000001',
        parent_template: 'executor_kraken',
        running: true,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: { wallet_public_id: '00000000-0000-7000-8000-000000000001' },
        note: 'Per-wallet executor for exchange=kraken',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    expect(screen.getAllByRole('button', { name: /stop/i }).length).toBeGreaterThan(0)
    expect(screen.getByText('00000000…')).toBeTruthy()
    expect(screen.getByText('Executor_kraken')).toBeTruthy()
  })
  it('renders Wallet Instance with null wallet_public_id falling back to "unknown"', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_kraken_w000000000004',
        kind: 'instance',
        wallet_public_id: null,
        parent_template: 'executor_kraken',
        running: false,
        enabled: true,
        class_path: 'snapper.executor',
        method: 'main',
        parameters: {},
        note: null,
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Wallet Instances')).toBeTruthy()
    })
    expect(screen.getByText('Unknown')).toBeTruthy()
  })
  it('renders executor template with empty description falling back to name', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'executor_paper',
        kind: 'template',
        running: false,
        enabled: false,
        class_path: 'snapper.executor.paper',
        method: 'main',
        parameters: {},
        note: null,
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Executor Templates')).toBeTruthy()
    })
    const templateCard = screen.getByTestId('executor-template-executor_paper')

    expect(templateCard.textContent).toContain('executor_paper')
    expect(screen.getByText('no parameters set')).toBeTruthy()
  })
  it('hides Executor Templates section when no templates present', async () => {
    const items = [
      makeConfiguredProcess({
        name: 'zmq_broker',
        kind: 'instance',
        running: true,
        enabled: true,
        class_path: 'snapper.broker',
        method: 'run',
        parameters: {},
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        is_one_shot: false,
      }),
    ]
    const { useConfiguredProcesses } = await import('../../hooks/queries/processes')

    vi.mocked(useConfiguredProcesses).mockReturnValue({
      data: makeListEnvelope('configured_processes', items),
      isLoading: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<Processes />)
    await waitFor(() => {
      expect(screen.getByText('Long-Running Processes')).toBeTruthy()
    })
    expect(screen.queryByText('Executor Templates')).toBeNull()
    expect(screen.queryByText('Wallet Instances')).toBeNull()
  })
})
