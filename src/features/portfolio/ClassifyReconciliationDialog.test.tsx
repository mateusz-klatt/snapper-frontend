import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassifyReconciliationDialog } from './ClassifyReconciliationDialog'
import { queryKeys } from '../../hooks/queries/keys'
import type { CredentialSummary, PortfolioAccountState } from '../../types/api'

type CredentialFetchStatus = 'idle' | 'fetching' | 'paused'

const mutationControl = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}))
const credentialControl = vi.hoisted(() => ({
  fetchStatus: 'idle' as CredentialFetchStatus,
  errorMessage: null as string | null,
  payload: null as CredentialSummary[] | null,
  refetch: vi.fn(),
}))
const readOnlyControl = vi.hoisted(() => ({ value: false }))
const queryClientControl = vi.hoisted(() => ({ invalidateQueries: vi.fn() }))

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()

  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: queryClientControl.invalidateQueries }),
  }
})
vi.mock('../../hooks/queries/credentials', () => ({
  useCredentials: () => ({
    data: credentialControl.payload === null ? undefined : { payload: credentialControl.payload },
    fetchStatus: credentialControl.fetchStatus,
    isFetching: credentialControl.fetchStatus === 'fetching',
    isError: credentialControl.errorMessage !== null,
    error:
      credentialControl.errorMessage === null ? null : new Error(credentialControl.errorMessage),
    refetch: credentialControl.refetch,
  }),
  useSetCredentialReconciliationMethod: () => ({
    mutateAsync: mutationControl.mutateAsync,
    isPending: mutationControl.isPending,
  }),
}))
vi.mock('../../hooks/useIsReadOnly', () => ({
  useIsReadOnly: () => readOnlyControl.value,
}))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean
    title: string
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid='modal'>
        <h3>{title}</h3>
        {children}
      </div>
    ) : null,
}))

type PortfolioReconciliationView = PortfolioAccountState['reconciliation']

const makeReconciliation = (
  overrides: Partial<PortfolioReconciliationView> = {}
): PortfolioReconciliationView => ({
  method: 'unclassified',
  evaluation_status: null,
  effective_status: 'incomplete',
  is_authoritative: false,
  evaluated_at: null,
  current_observation_id: null,
  last_full_observation_id: null,
  detail_source_observation_id: null,
  last_full_outcome: null,
  consecutive_full_mismatches: 0,
  anchor_public_id: null,
  venue_account_state_public_id: null,
  venue_account_observation_id: null,
  source_watermark_kind: null,
  source_watermark: null,
  expected: null,
  actual: null,
  difference: null,
  tolerance: null,
  reconciled_at: null,
  authoritative_until: null,
  error: null,
  open_drift_episode: null,
  ...overrides,
})

const makeAccount = (overrides: Partial<PortfolioAccountState> = {}): PortfolioAccountState => ({
  type: 'portfolio_account_state',
  sequence_id: 1,
  public_id: 'acct-1',
  timestamp: '2026-07-13T12:00:00Z',
  session_id: 'sess-1',
  wallet_public_id: 'w-1',
  exchange: 'kraken',
  mode: 'live',
  sync_status: 'observed',
  effective_status: 'observed',
  is_authoritative: true,
  balance_status: 'observed',
  position_status: 'not_applicable',
  valuation_status: 'native_only',
  balances: null,
  open_positions: null,
  balance_observed_at: null,
  position_observed_at: null,
  authoritative_until: null,
  current_attempt_observation_id: 1,
  balance_payload_source_observation_id: null,
  position_payload_source_observation_id: null,
  error: null,
  reconciliation: makeReconciliation(),
  ...overrides,
})

const makeCredential = (overrides: Partial<CredentialSummary> = {}): CredentialSummary => ({
  type: 'credential_summary',
  sequence_id: 1,
  public_id: 'cred-1',
  timestamp: '2026-07-13T12:00:00Z',
  session_id: 'sess-1',
  wallet_public_id: 'w-1',
  exchange: 'kraken',
  credential_type: 'api_key_secret',
  label: null,
  ...overrides,
})

describe('ClassifyReconciliationDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mutationControl.mutateAsync = vi.fn(() => Promise.resolve())
    mutationControl.isPending = false
    credentialControl.fetchStatus = 'idle'
    credentialControl.errorMessage = null
    credentialControl.payload = [makeCredential()]
    credentialControl.refetch = vi.fn()
    readOnlyControl.value = false
    queryClientControl.invalidateQueries = vi.fn()
  })

  it('does not render when closed', () => {
    render(<ClassifyReconciliationDialog account={makeAccount()} open={false} onClose={onClose} />)
    expect(screen.queryByTestId('classify-dialog')).not.toBeInTheDocument()
    expect(credentialControl.refetch).not.toHaveBeenCalled()
  })

  it('refetches credentials each time it opens', () => {
    const { rerender } = render(
      <ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />
    )

    expect(credentialControl.refetch).toHaveBeenCalledTimes(1)
    rerender(
      <ClassifyReconciliationDialog account={makeAccount()} open={false} onClose={onClose} />
    )
    rerender(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(credentialControl.refetch).toHaveBeenCalledTimes(2)
  })

  it('shows the loading state and disables confirm while fetching, even with cached data', async () => {
    const user = userEvent.setup()

    credentialControl.fetchStatus = 'fetching'
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-credential-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('classify-load-error')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-ambiguous-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('fails closed on a paused refetch (offline) even with cached data', async () => {
    const user = userEvent.setup()

    credentialControl.fetchStatus = 'paused'
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-credential-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('classify-load-error')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-ambiguous-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('renders no credential-state boxes and disables confirm when idle without data', async () => {
    const user = userEvent.setup()

    credentialControl.payload = null
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.queryByTestId('classify-credential-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-load-error')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-ambiguous-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('shows the load-error state when the initial credentials query fails', async () => {
    const user = userEvent.setup()

    credentialControl.payload = null
    credentialControl.errorMessage = 'load failed'
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-load-error')).toHaveTextContent('Error: load failed')
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('fails closed on a failed refetch even when stale data is retained', async () => {
    const user = userEvent.setup()

    credentialControl.errorMessage = 'stale fetch'
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-load-error')).toHaveTextContent('Error: stale fetch')
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('warns and disables confirm when no live credential matches', async () => {
    const user = userEvent.setup()

    credentialControl.payload = []
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-no-credential')).toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('warns and disables confirm when several live credentials match', async () => {
    const user = userEvent.setup()

    credentialControl.payload = [
      makeCredential(),
      makeCredential({ public_id: 'cred-2', label: 'second' }),
    ]
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-ambiguous-credential')).toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('resolves the single live credential among paper and other-exchange ones and submits with it', async () => {
    const user = userEvent.setup()
    const { toast } = await import('react-hot-toast')

    credentialControl.payload = [
      makeCredential({ public_id: 'cred-paper', credential_type: 'paper' }),
      makeCredential({ public_id: 'cred-other', exchange: 'kraken_futures' }),
      makeCredential(),
    ]
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.queryByTestId('classify-no-credential')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-ambiguous-credential')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeEnabled()
    await user.click(screen.getByTestId('classify-confirm'))
    await waitFor(() => {
      expect(mutationControl.mutateAsync).toHaveBeenCalledWith({
        walletPublicId: 'w-1',
        credentialPublicId: 'cred-1',
        data: { reconciliation_method: 'margin_ledger_replay' },
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Account classified: Margin ledger replay')
    })
  })

  it('renders both kraken methods with localized labels and descriptions', () => {
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-method-spot_execution_replay')).toBeInTheDocument()
    expect(screen.getByTestId('classify-method-margin_ledger_replay')).toBeInTheDocument()
    expect(screen.queryByTestId('classify-method-futures_position')).not.toBeInTheDocument()
    expect(screen.getByText('Spot execution replay')).toBeInTheDocument()
    expect(screen.getByText('Margin ledger replay')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Replays spot executions against cash balances. For cash-only accounts that never trade on margin.'
      )
    ).toBeInTheDocument()
  })

  it('requires explicitly selecting the sole method for a single-method venue', async () => {
    const user = userEvent.setup()

    credentialControl.payload = [makeCredential({ exchange: 'kraken_futures' })]
    render(
      <ClassifyReconciliationDialog
        account={makeAccount({ exchange: 'kraken_futures' })}
        open
        onClose={onClose}
      />
    )
    expect(screen.queryByTestId('classify-method-spot_execution_replay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('classify-method-margin_ledger_replay')).not.toBeInTheDocument()
    const soleRadio = screen.getByTestId('classify-method-futures_position')

    expect(soleRadio).not.toBeChecked()
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
    await user.click(soleRadio)
    expect(soleRadio).toBeChecked()
    expect(screen.getByTestId('classify-confirm')).toBeEnabled()
  })

  it('keeps confirm disabled until a method is selected', async () => {
    const user = userEvent.setup()

    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('keeps confirm disabled until the acknowledgment is checked', async () => {
    const user = userEvent.setup()

    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('keeps confirm disabled in read-only mode', async () => {
    const user = userEvent.setup()

    readOnlyControl.value = true
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('keeps confirm disabled while the mutation is pending', async () => {
    const user = userEvent.setup()

    mutationControl.isPending = true
    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-confirm')).toBeDisabled()
  })

  it('classifies with exact args, toasts, notifies onClassified, and closes on success', async () => {
    const user = userEvent.setup()
    const { toast } = await import('react-hot-toast')
    const onClassified = vi.fn()

    render(
      <ClassifyReconciliationDialog
        account={makeAccount()}
        open
        onClose={onClose}
        onClassified={onClassified}
      />
    )
    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    await user.click(screen.getByTestId('classify-confirm'))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Account classified: Margin ledger replay')
    })
    expect(mutationControl.mutateAsync).toHaveBeenCalledWith({
      walletPublicId: 'w-1',
      credentialPublicId: 'cred-1',
      data: { reconciliation_method: 'margin_ledger_replay' },
    })
    expect(onClassified).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('toasts the error message and stays open on failure', async () => {
    const user = userEvent.setup()
    const { toast } = await import('react-hot-toast')
    const onClassified = vi.fn()

    mutationControl.mutateAsync = vi.fn(() => Promise.reject(new Error('boom')))
    render(
      <ClassifyReconciliationDialog
        account={makeAccount()}
        open
        onClose={onClose}
        onClassified={onClassified}
      />
    )
    await user.click(screen.getByTestId('classify-method-spot_execution_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    await user.click(screen.getByTestId('classify-confirm'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Classification failed: boom')
    })
    expect(onClassified).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('classify-dialog')).toBeInTheDocument()
  })

  it('completes success feedback even when unmounted before the mutation settles', async () => {
    const user = userEvent.setup()
    const { toast } = await import('react-hot-toast')
    const onClassified = vi.fn()
    let resolveMutation: (() => void) | undefined

    mutationControl.mutateAsync = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveMutation = () => resolve()
        })
    )
    const { unmount } = render(
      <ClassifyReconciliationDialog
        account={makeAccount()}
        open
        onClose={onClose}
        onClassified={onClassified}
      />
    )

    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    await user.click(screen.getByTestId('classify-confirm'))
    expect(mutationControl.mutateAsync).toHaveBeenCalledTimes(1)
    unmount()
    expect(queryClientControl.invalidateQueries).not.toHaveBeenCalled()
    resolveMutation?.()
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Account classified: Margin ledger replay')
    })
    expect(queryClientControl.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.credentialsForWallet('w-1'),
    })
    expect(queryClientControl.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.portfolioAccountsAll,
    })
    expect(onClassified).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose from the cancel button', async () => {
    const user = userEvent.setup()

    render(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    await user.click(screen.getByTestId('classify-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('resets the method selection and acknowledgment when reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />
    )

    await user.click(screen.getByTestId('classify-method-margin_ledger_replay'))
    await user.click(screen.getByTestId('classify-acknowledge'))
    expect(screen.getByTestId('classify-method-margin_ledger_replay')).toBeChecked()
    expect(screen.getByTestId('classify-acknowledge')).toBeChecked()
    rerender(
      <ClassifyReconciliationDialog account={makeAccount()} open={false} onClose={onClose} />
    )
    rerender(<ClassifyReconciliationDialog account={makeAccount()} open onClose={onClose} />)
    expect(screen.getByTestId('classify-method-margin_ledger_replay')).not.toBeChecked()
    expect(screen.getByTestId('classify-acknowledge')).not.toBeChecked()
  })
})
