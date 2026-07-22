import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { StrategyScopeEditModal, type StrategyScopeEditTarget } from './StrategyScopeEditModal'
import { useProcessSchema, useUpdateProcessConfig } from '../../hooks/queries/processes'
import { useOperators, useWallets } from '../../hooks/queries/wallets'
import { useUsers } from '../../hooks/queries/users'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'

const mockHasPermission = vi.fn<(permission: string) => boolean>(() => true)

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}))

vi.mock('../../hooks/queries/processes', () => ({
  useProcessSchema: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateProcessConfig: vi.fn(),
}))
vi.mock('../../hooks/queries/wallets', () => ({
  useOperators: vi.fn(() => ({ data: undefined })),
  useWallets: vi.fn(() => ({ data: undefined })),
}))
vi.mock('../../hooks/queries/users', () => ({
  useUsers: vi.fn(() => ({ data: undefined })),
}))
vi.mock('../../hooks/useIsReadOnly', () => ({
  useIsReadOnly: vi.fn(() => false),
}))

const OPERATORS = [
  { public_id: 'op-default-uuid', label: 'default' },
  { public_id: 'op-desk-uuid', label: 'desk' },
]
const WALLETS = [
  { public_id: 'wal-paper-uuid', label: 'paper', is_paper: true },
  { public_id: 'wal-live-uuid', label: 'live', is_paper: false },
]
const USERS = [{ public_id: 'usr-bob-uuid', username: 'bob' }]

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

const mockSchema = (referenceParams: Record<string, string> | null): void => {
  vi.mocked(useProcessSchema).mockReturnValue({
    data:
      referenceParams === null ? null : { payload: { reference_identity_params: referenceParams } },
    isLoading: false,
    error: null,
  } as never)
}

const mockMutation = (overrides?: {
  mutate?: ReturnType<typeof vi.fn>
  isPending?: boolean
  isError?: boolean
  error?: Error | null
}): ReturnType<typeof vi.fn> => {
  const mutate = overrides?.mutate ?? vi.fn()

  vi.mocked(useUpdateProcessConfig).mockReturnValue({
    mutate,
    isPending: overrides?.isPending ?? false,
    isError: overrides?.isError ?? false,
    error: overrides?.error ?? null,
  } as never)

  return mutate
}

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const TARGET: StrategyScopeEditTarget = {
  processName: 'p7_heartbeat_consult_btc_1h',
  template: 'strategy_heartbeat_consult_btc_1h',
  parameters: {
    operator_public_id: 'label:default',
    wallet_public_id: 'label:paper',
    params: { ai_review_user_public_id: 'label:bob' },
  },
}

describe('StrategyScopeEditModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
    vi.mocked(useIsReadOnly).mockReturnValue(false)
    mockCatalogues({ operators: OPERATORS, wallets: WALLETS, users: USERS })
    mockSchema({ ai_review_user_public_id: 'user' })
    mockMutation()
  })

  it('renders nothing when target is null', () => {
    renderWithProviders(<StrategyScopeEditModal open={false} onClose={onClose} target={null} />)
    expect(screen.queryByText('Edit strategy scope')).not.toBeInTheDocument()
  })

  it('does not expose scope controls with START_STRATEGIES but without CONFIGURE_STRATEGIES', () => {
    mockHasPermission.mockImplementation(permission => permission === 'start:strategies')
    const mutate = mockMutation()

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)

    expect(screen.queryByText('Edit strategy scope')).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('rechecks CONFIGURE_STRATEGIES before an already-rendered scope saves', () => {
    const mutate = mockMutation()

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    const saveButton = screen.getByRole('button', { name: 'Save scope' })

    mockHasPermission.mockReturnValue(false)
    fireEvent.click(saveButton)

    expect(mutate).not.toHaveBeenCalled()
  })

  it('pre-fills label operator/wallet resolved to public_id and reference to the label value', () => {
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    expect(screen.getByText('Edit strategy scope')).toBeInTheDocument()
    expect(screen.getByText(/p7_heartbeat_consult_btc_1h/)).toBeInTheDocument()
    expect((screen.getByLabelText('Operator') as HTMLSelectElement).value).toBe('op-default-uuid')
    expect((screen.getByLabelText('Wallet') as HTMLSelectElement).value).toBe('wal-paper-uuid')
    const refSelect = screen.getByLabelText('Strategy owner (user)') as HTMLSelectElement

    expect(refSelect.value).toBe('label:bob')
  })

  it('leaves the picker empty when a label has no matching entity', () => {
    const target: StrategyScopeEditTarget = {
      ...TARGET,
      parameters: { operator_public_id: 'label:ghost', wallet_public_id: '', params: {} },
    }

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={target} />)
    expect((screen.getByLabelText('Operator') as HTMLSelectElement).value).toBe('')
  })

  it('passes a concrete public_id through unchanged and ignores a non-string scope value', () => {
    const target: StrategyScopeEditTarget = {
      ...TARGET,
      parameters: { operator_public_id: 'op-desk-uuid', wallet_public_id: 42, params: null },
    }

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={target} />)
    expect((screen.getByLabelText('Operator') as HTMLSelectElement).value).toBe('op-desk-uuid')
    expect((screen.getByLabelText('Wallet') as HTMLSelectElement).value).toBe('')
  })

  it('renders the no-operators warning when the operator catalogue is empty', () => {
    mockCatalogues({ operators: [], wallets: WALLETS, users: USERS })
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    expect((screen.getByRole('button', { name: 'Save scope' }) as HTMLButtonElement).disabled).toBe(
      true
    )
  })

  it('saves the scope and shows the restart-required banner on success', () => {
    const mutate = vi.fn((_vars, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.())

    mockMutation({ mutate })
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save scope' }))
    expect(mutate).toHaveBeenCalledTimes(1)
    const [vars] = mutate.mock.calls[0] as [{ name: string; body: Record<string, unknown> }]

    expect(vars.name).toBe('p7_heartbeat_consult_btc_1h')
    expect(vars.body).toEqual({
      operator_public_id: 'op-default-uuid',
      wallet_public_id: 'wal-paper-uuid',
      reference_identity_params: { ai_review_user_public_id: 'label:bob' },
    })
    expect(screen.getByText(/Restart the strategy/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save scope' })).not.toBeInTheDocument()
  })

  it('shows a save error when the mutation fails', () => {
    mockMutation({ isError: true, error: new Error('boom') })
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('shows a pending label and disables save while the mutation is in flight', () => {
    mockMutation({ isPending: true })
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    const save = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement

    expect(save.disabled).toBe(true)
  })

  it('disables save in read-only mode', () => {
    vi.mocked(useIsReadOnly).mockReturnValue(true)
    const mutate = mockMutation()

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    const saveButton = screen.getByRole('button', { name: 'Save scope' }) as HTMLButtonElement

    expect(saveButton.disabled).toBe(true)
    saveButton.removeAttribute('disabled')
    fireEvent.click(saveButton)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('closes via the cancel button', () => {
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables save until every reference field is filled', async () => {
    mockSchema({ ai_review_user_public_id: 'user' })
    const target: StrategyScopeEditTarget = {
      ...TARGET,
      parameters: {
        operator_public_id: 'label:default',
        wallet_public_id: 'label:paper',
        params: {},
      },
    }

    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={target} />)
    const save = screen.getByRole('button', { name: 'Save scope' }) as HTMLButtonElement

    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Strategy owner (user)'), {
      target: { value: 'label:bob' },
    })
    await waitFor(() => expect(save.disabled).toBe(false))
  })

  it('falls back to an empty reference map when the schema has no reference params', () => {
    mockSchema(null)
    renderWithProviders(<StrategyScopeEditModal open onClose={onClose} target={TARGET} />)
    expect(screen.queryByLabelText('Strategy owner (user)')).not.toBeInTheDocument()
  })
})
