import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { StrategyLaunchModal } from './StrategyLaunchModal'
import type { AvailableProcess } from '../../types/api'
import { useProcessSchema } from '../../hooks/queries/processes'
import { useOperators, useWallets } from '../../hooks/queries/wallets'
import { useUsers } from '../../hooks/queries/users'

vi.mock('../../hooks/queries/processes', () => ({
  useProcessSchema: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}))
vi.mock('../../hooks/queries/wallets', () => ({
  useOperators: vi.fn(() => ({ data: undefined })),
  useWallets: vi.fn(() => ({ data: undefined })),
}))
vi.mock('../../hooks/queries/users', () => ({
  useUsers: vi.fn(() => ({ data: undefined })),
}))

const mockSchemaPayload = (payload: Record<string, unknown>): void => {
  vi.mocked(useProcessSchema).mockReturnValue({
    data: { payload },
    isLoading: false,
    error: null,
  } as never)
}

const mockCatalogues = (options?: {
  operators?: { public_id: string; label: string }[]
  wallets?: { public_id: string; label: string; is_paper?: boolean }[]
  users?: { public_id: string; username: string }[]
}): void => {
  vi.mocked(useOperators).mockReturnValue({
    data: options?.operators ? { payload: options.operators } : undefined,
  } as never)
  vi.mocked(useWallets).mockReturnValue({
    data: options?.wallets ? { payload: options.wallets } : undefined,
  } as never)
  vi.mocked(useUsers).mockReturnValue({
    data: options?.users ? { payload: options.users } : undefined,
  } as never)
}

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

describe('StrategyLaunchModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const mockTemplates: AvailableProcess[] = [
    {
      type: 'available_process' as const,
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      name: 'strategy_macd',
      class_path: 'snapper.strategies.macd',
      method: 'main',
      description: 'MACD Strategy',
      lifecycle: 'long_running',
      role: 'strategy',
      tags: [],
      parameters_schema: null,
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useProcessSchema).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as never)
    mockCatalogues()
  })
  it('renders modal when open', () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    expect(screen.getByText('Register Strategy Process')).toBeTruthy()
  })
  it('does not render when closed', () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={false}
        onClose={mockOnClose}
        templates={[]}
        onSubmit={mockOnSubmit}
      />
    )
    expect(screen.queryByText('Register Strategy Process')).toBeFalsy()
  })
  it('shows empty state when no templates', () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={[]}
        onSubmit={mockOnSubmit}
      />
    )
    expect(screen.getByText(/No strategy templates registered/i)).toBeTruthy()
  })
  it.each([
    { name: 'displays template dropdown with options', expectedTexts: ['Strategy template'] },
    { name: 'displays process name input', expectedTexts: ['Process name'] },
    { name: 'displays strategy instance name input', expectedTexts: ['Strategy instance name'] },
    { name: 'displays execution mode selector', expectedTexts: ['Execution mode'] },
    { name: 'displays autostart checkbox', expectedTexts: ['Autostart on server boot'] },
    {
      name: 'displays start immediately checkbox',
      expectedTexts: ['Start immediately after registration'],
    },
    { name: 'displays note textarea', expectedTexts: ['Note (optional)'] },
    { name: 'displays cancel and submit buttons', expectedTexts: ['Cancel', 'Register strategy'] },
  ])('$name', async ({ expectedTexts }) => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expectedTexts.forEach(text => {
        expect(screen.getByText(text)).toBeTruthy()
      })
    })
  })
  it('calls onClose when cancel is clicked', async () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
  it('shows loading state when schema is loading', async () => {
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/Loading template defaults/i)).toBeTruthy()
    })
  })
  it('shows error when schema fails to load', async () => {
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/Unable to load template defaults/i)).toBeTruthy()
    })
  })
  it('disables submit button when submitting', async () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    )
    await waitFor(() => {
      const button = screen.getByText('Registering…')

      expect(button).toBeTruthy()
    })
  })
  it('shows close button in empty state', async () => {
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={[]}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeTruthy()
    })
  })
  it('submits form with correct data', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'test_strategy' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Register strategy')).toBeTruthy()
    })
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })
  it('repopulates default names after clearing inputs', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const processNameInput = await screen.findByPlaceholderText('strategy_macd_custom')
    const strategyNameInput = screen.getByPlaceholderText('macd_custom')

    await waitFor(() => {
      expect(processNameInput).toHaveValue('strategy_macd_instance')
      expect(strategyNameInput).toHaveValue('macd')
    })
    await user.clear(processNameInput)
    await user.clear(strategyNameInput)
    await waitFor(() => {
      expect(processNameInput).toHaveValue('strategy_macd_instance')
      expect(strategyNameInput).toHaveValue('macd')
    })
  })
  it('logs error when submit fails', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockOnSubmit.mockRejectedValue(new Error('Submit failed'))
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const processNameInput = await screen.findByPlaceholderText('strategy_macd_custom')

    await user.clear(processNameInput)
    await user.type(processNameInput, 'strategy_macd_custom')
    const strategyNameInput = screen.getByPlaceholderText('macd_custom')

    await user.clear(strategyNameInput)
    await user.type(strategyNameInput, 'macd_custom')
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })
    consoleSpy.mockRestore()
  })
  it('allows changing template', async () => {
    const user = userEvent.setup()
    const multipleTemplates: AvailableProcess[] = [
      {
        type: 'available_process' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        name: 'strategy_macd',
        class_path: 'snapper.strategies.macd',
        method: 'main',
        description: 'MACD Strategy',
        lifecycle: 'long_running',
        role: 'strategy',
        tags: [],
        parameters_schema: null,
      },
      {
        type: 'available_process' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        name: 'strategy_rsi',
        class_path: 'snapper.strategies.rsi',
        method: 'main',
        description: 'RSI Strategy',
        lifecycle: 'long_running',
        role: 'strategy',
        tags: [],
        parameters_schema: null,
      },
    ]

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={multipleTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
    })
    const selects = screen.getAllByRole('combobox')

    await user.selectOptions(selects[0] as HTMLElement, 'strategy_rsi')
    await waitFor(() => {
      expect(selects[0]).toHaveValue('strategy_rsi')
    })
  })
  it('uses empty parameters when default_parameters is not an object', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: 'invalid',
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Register strategy')).toBeTruthy()
    })
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.any(Object),
        })
      )
    })
  })
  it('strips leading/trailing underscore artefacts from sanitised names', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const processNameInput = await screen.findByPlaceholderText('strategy_macd_custom')
    const strategyNameInput = screen.getByPlaceholderText('macd_custom')

    fireEvent.change(processNameInput, { target: { value: '  custom name  ' } })
    fireEvent.change(strategyNameInput, { target: { value: '__macd alpha__' } })
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          processName: 'custom_name',
          strategyName: 'macd_alpha',
        })
      )
    })
  })

  it('allows toggling autostart checkbox', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const autostartCheckbox = screen.getByRole('checkbox', { name: /Autostart on server boot/i })

    expect(autostartCheckbox).not.toBeChecked()
    await user.click(autostartCheckbox)
    expect(autostartCheckbox).toBeChecked()
  })
  it('allows toggling start immediately checkbox', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const startCheckbox = screen.getByRole('checkbox', { name: /Start immediately/i })

    expect(startCheckbox).toBeChecked()
    await user.click(startCheckbox)
    expect(startCheckbox).not.toBeChecked()
  })
  it('allows entering note', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe purpose or parameters/i)).toBeTruthy()
    })
    const noteTextarea = screen.getByPlaceholderText(/Describe purpose or parameters/i)

    await user.type(noteTextarea, 'Test note for strategy')
    expect(noteTextarea).toHaveValue('Test note for strategy')
  })
  it('allows selecting execution mode', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')

      expect(selects.length).toBeGreaterThan(1)
    })
    const selects = screen.getAllByRole('combobox')
    const executionModeSelect = selects[1]

    await user.selectOptions(executionModeSelect as HTMLElement, 'process')
    expect(executionModeSelect).toHaveValue('process')
  })
  it('uses default mode from schema', async () => {
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: {},
          default_mode: 'process',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')
      const executionModeSelect = selects[1]

      expect(executionModeSelect).toHaveValue('process')
    })
  })
  it('handles output transformation with prefix', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'test', output: 'signals.original' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Register strategy')).toBeTruthy()
    })
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            output: expect.stringMatching(/^signals\./),
          }),
        })
      )
    })
  })
  it('handles output transformation without prefix', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    const { useProcessSchema } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSchema).mockReturnValue({
      data: {
        payload: {
          default_args: [],
          default_parameters: { name: 'test', output: 'signals' },
          default_mode: 'thread',
        },
      },
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    const submitButton = screen.getByText('Register strategy')

    await user.click(submitButton)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            output: 'test',
          }),
        })
      )
    })
  })
  it('shows fallback description when template lacks description', async () => {
    const templates: AvailableProcess[] = [
      {
        type: 'available_process' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        name: 'strategy_simple',
        class_path: 'snapper.strategies.simple',
        method: 'main',
        description: '',
        lifecycle: 'long_running',
        role: 'strategy',
        tags: [],
        parameters_schema: null,
      },
    ]

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={templates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Strategy registered in backend')).toBeTruthy()
    })
  })

  it('renders scope pickers for a scoped strategy', async () => {
    mockSchemaPayload({
      default_parameters: { name: 'heartbeat', params: {} },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({
      operators: [{ public_id: 'op-1', label: 'desk' }],
      wallets: [{ public_id: 'w-1', label: 'paper', is_paper: true }],
      users: [{ public_id: 'u-1', username: 'alice' }],
    })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Scope')).toBeTruthy()
      expect(screen.getByLabelText('Operator')).toBeTruthy()
      expect(screen.getByLabelText('Wallet')).toBeTruthy()
      expect(screen.getByLabelText('Strategy owner (user)')).toBeTruthy()
    })
  })

  it('shows the fail-closed warning and disables submit when no operators exist', async () => {
    mockSchemaPayload({
      default_parameters: { name: 'heartbeat', params: {} },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({ users: [{ public_id: 'u-1', username: 'alice' }] })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/No operators exist yet/i)).toBeTruthy()
    })
    expect(screen.getByText('Register strategy')).toBeDisabled()
  })

  it('keeps submit disabled until the scope selection is complete', async () => {
    mockSchemaPayload({
      default_parameters: { name: 'heartbeat', params: {} },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({
      operators: [{ public_id: 'op-1', label: 'desk' }],
      wallets: [{ public_id: 'w-1', label: 'paper', is_paper: true }],
      users: [{ public_id: 'u-1', username: 'alice' }],
    })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Register strategy')).toBeTruthy()
    })
    expect(screen.getByText('Register strategy')).toBeDisabled()
  })

  it('submits a scoped strategy with operator, wallet, and a label user reference', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    mockSchemaPayload({
      default_parameters: { name: 'heartbeat', params: { existing: 'keep' } },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({
      operators: [{ public_id: 'op-1', label: 'desk' }],
      wallets: [
        { public_id: 'w-1', label: 'paper', is_paper: true },
        { public_id: 'w-2', label: 'live', is_paper: false },
      ],
      users: [{ public_id: 'u-1', username: 'alice' }],
    })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await user.selectOptions(await screen.findByLabelText('Operator'), 'op-1')
    await user.selectOptions(screen.getByLabelText('Wallet'), 'w-1')
    await user.selectOptions(screen.getByLabelText('Strategy owner (user)'), 'label:alice')
    await user.type(screen.getByPlaceholderText(/Describe purpose or parameters/i), 'scoped note')
    await user.click(screen.getByText('Register strategy'))
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'scoped note',
          parameters: expect.objectContaining({
            operator_public_id: 'op-1',
            wallet_public_id: 'w-1',
            params: expect.objectContaining({
              existing: 'keep',
              ai_review_user_public_id: 'label:alice',
            }),
          }),
        })
      )
    })
  })

  it('renders operator and wallet reference pickers by kind', async () => {
    mockSchemaPayload({
      default_parameters: { name: 's', params: {} },
      default_mode: 'thread',
      reference_identity_params: { delegate_op: 'operator', maker_wallet: 'wallet' },
    })
    mockCatalogues({
      operators: [{ public_id: 'op-1', label: 'desk' }],
      wallets: [
        { public_id: 'w-1', label: 'mm', is_paper: true },
        { public_id: 'w-2', label: 'live', is_paper: false },
      ],
    })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByLabelText('Operator reference')).toBeTruthy()
      expect(screen.getByLabelText('Wallet reference')).toBeTruthy()
    })
  })

  it('renders an empty picker and the raw kind label for an unknown reference kind', async () => {
    mockSchemaPayload({
      default_parameters: { name: 's', params: {} },
      default_mode: 'thread',
      reference_identity_params: { mystery: 'bogus' },
    })
    mockCatalogues({ operators: [{ public_id: 'op-1', label: 'desk' }] })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByLabelText('bogus')).toBeTruthy()
    })
  })

  it('injects nested references when the schema params default is not an object', async () => {
    const user = userEvent.setup()

    mockOnSubmit.mockResolvedValue(undefined)
    mockSchemaPayload({
      default_parameters: { name: 's', params: 'not-an-object' },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({
      operators: [{ public_id: 'op-1', label: 'desk' }],
      wallets: [{ public_id: 'w-1', label: 'paper', is_paper: true }],
      users: [{ public_id: 'u-1', username: 'alice' }],
    })
    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={mockTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await user.selectOptions(await screen.findByLabelText('Operator'), 'op-1')
    await user.selectOptions(screen.getByLabelText('Wallet'), 'w-1')
    await user.selectOptions(screen.getByLabelText('Strategy owner (user)'), 'label:alice')
    await user.click(screen.getByText('Register strategy'))
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            params: { ai_review_user_public_id: 'label:alice' },
          }),
        })
      )
    })
  })

  it('does not render scope pickers for a non-strategy template', async () => {
    mockSchemaPayload({
      default_parameters: { name: 'x' },
      default_mode: 'thread',
      reference_identity_params: { ai_review_user_public_id: 'user' },
    })
    mockCatalogues({ operators: [{ public_id: 'op-1', label: 'desk' }] })
    const coreTemplates: AvailableProcess[] = [
      {
        type: 'available_process' as const,
        sequence_id: 0,
        public_id: 'core-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        name: 'zmq_broker',
        class_path: 'snapper.ipc.zmq_broker',
        method: 'run',
        description: 'Broker',
        lifecycle: 'long_running',
        role: 'core',
        tags: [],
        parameters_schema: null,
      },
    ]

    renderWithProviders(
      <StrategyLaunchModal
        open={true}
        onClose={mockOnClose}
        templates={coreTemplates}
        onSubmit={mockOnSubmit}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Register strategy')).toBeTruthy()
    })
    expect(screen.queryByText('Scope')).toBeFalsy()
  })
})
