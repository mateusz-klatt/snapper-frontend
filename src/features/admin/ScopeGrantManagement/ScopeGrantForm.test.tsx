import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ScopeGrantForm from './ScopeGrantForm'

const mockCreateMutation = {
  mutate: vi.fn(),
  isPending: false,
}

const mockUseOperators = vi.fn()
const mockUseWallets = vi.fn()
const mockUseUnderlyings = vi.fn()
const mockUseExchanges = vi.fn()
const mockUseExchangeInstrumentsDetail = vi.fn()

vi.mock('../../../hooks/queries/scope-grants', () => ({
  useCreateScopeGrant: () => mockCreateMutation,
}))
vi.mock('../../../hooks/queries/wallets', () => ({
  useOperators: () => mockUseOperators(),
  useWallets: () => mockUseWallets(),
}))
vi.mock('../../../hooks/queries/market', () => ({
  useUnderlyings: () => mockUseUnderlyings(),
  useExchanges: () => mockUseExchanges(),
  useExchangeInstrumentsDetail: (exchange: string | null) =>
    mockUseExchangeInstrumentsDetail(exchange),
}))
vi.mock('../../../components/ThemeSelect', () => ({
  ThemeSelect: ({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
  }: {
    id: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    disabled?: boolean
  }) => (
    <select
      data-testid={id}
      id={id}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    >
      <option value=''>{placeholder ?? 'Select...'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))
vi.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid='modal'>
        <h3>{title}</h3>
        <button onClick={onClose} data-testid='modal-close'>
          Close
        </button>
        {children}
      </div>
    ) : null,
}))

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ScopeGrantForm', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMutation.mutate = vi.fn()
    mockCreateMutation.isPending = false
    mockUseOperators.mockReturnValue({
      data: {
        payload: [
          {
            type: 'operator_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'op-1',
            timestamp: '2026-01-01T00:00:00Z',
            label: 'alice',
          },
        ],
      },
    })
    mockUseWallets.mockReturnValue({
      data: {
        payload: [
          {
            type: 'wallet_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'w-1',
            timestamp: '2026-01-01T00:00:00Z',
            label: 'default',
            is_paper: false,
          },
        ],
      },
    })
    mockUseUnderlyings.mockReturnValue({
      data: {
        payload: [
          {
            type: 'underlying_asset',
            session_id: 's',
            sequence_id: 1,
            public_id: 'ua-btc',
            timestamp: '2026-01-01T00:00:00Z',
            ticker: 'BTC',
            name: 'Bitcoin',
            asset_class: 'crypto',
            sector: null,
            description: null,
            instrument_count: 3,
          },
          {
            type: 'underlying_asset',
            session_id: 's',
            sequence_id: 2,
            public_id: 'ua-eth',
            timestamp: '2026-01-01T00:00:00Z',
            ticker: 'ETH',
            name: 'Ethereum',
            asset_class: 'crypto',
            sector: null,
            description: null,
            instrument_count: 2,
          },
        ],
      },
    })
    mockUseExchanges.mockReturnValue({ data: { payload: ['kraken', 'kraken_futures'] } })
    mockUseExchangeInstrumentsDetail.mockReturnValue({
      data: {
        payload: [
          {
            type: 'instrument_detail',
            session_id: 's',
            sequence_id: 1,
            public_id: 'i-1',
            timestamp: '2026-01-01T00:00:00Z',
            instrument_public_id: 'inst-btc-perp',
            symbol_public_id: 'sym-1',
            symbol: 'BTC-USD-PERP',
            exchange: 'kraken_futures',
            can_trade: true,
            can_market_data: true,
            instrument_resolved: true,
            instrument_kind: 'perpetual',
            expiry_at: null,
          },
        ],
      },
    })
  })
  it('does not render when closed', () => {
    renderWithQuery(<ScopeGrantForm open={false} onClose={onClose} />)
    expect(screen.queryByTestId('modal')).toBeNull()
  })
  it('renders form when open', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    expect(screen.getByText('Create Scope Grant')).toBeDefined()
    expect(screen.getByTestId('sg-operator')).toBeDefined()
    expect(screen.getByTestId('sg-wallet')).toBeDefined()
    expect(screen.getByTestId('sg-scope-kind')).toBeDefined()
  })
  it('shows validation errors when submitting empty form', async () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText('Operator is required')).toBeDefined()
      expect(screen.getByText('Wallet is required')).toBeDefined()
      expect(screen.getByText('Target ID is required')).toBeDefined()
    })
  })
  it('renders underlying options as a picker with human-readable labels', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    const targetSelect = screen.getByTestId('sg-target')
    const labels = Array.from(targetSelect.querySelectorAll('option')).map(o => o.textContent)

    expect(labels).toContain('BTC (Bitcoin)')
    expect(labels).toContain('ETH (Ethereum)')
    const values = Array.from(targetSelect.querySelectorAll('option')).map(o =>
      o.getAttribute('value')
    )

    expect(values).toContain('ua-btc')
    expect(values).toContain('ua-eth')
  })
  it('calls createScopeGrant with the selected underlying public_id', async () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        {
          operator_public_id: 'op-1',
          wallet_public_id: 'w-1',
          scope_kind: 'underlying',
          underlying_public_id: 'ua-btc',
          instrument_public_id: undefined,
          note: undefined,
        },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      )
    })
  })
  it('reveals the exchange and instrument pickers when scope kind changes to instrument', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    expect(screen.getByTestId('sg-exchange')).toBeDefined()
    expect(screen.getByLabelText(/Instrument Public ID/)).toBeDefined()
  })
  it('disables the instrument picker until an exchange is chosen', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    const instrumentSelect = screen.getByTestId('sg-target') as HTMLSelectElement

    expect(instrumentSelect.disabled).toBe(true)
    expect(screen.getByText('Select an exchange first')).toBeDefined()
    expect(mockUseExchangeInstrumentsDetail).toHaveBeenCalledWith(null)
  })
  it('populates and enables the instrument picker once an exchange is chosen', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    fireEvent.change(screen.getByTestId('sg-exchange'), { target: { value: 'kraken_futures' } })
    const instrumentSelect = screen.getByTestId('sg-target') as HTMLSelectElement
    const labels = Array.from(instrumentSelect.querySelectorAll('option')).map(o => o.textContent)

    expect(instrumentSelect.disabled).toBe(false)
    expect(labels).toContain('Select instrument...')
    expect(labels).toContain('BTC-USD-PERP')
    expect(mockUseExchangeInstrumentsDetail).toHaveBeenCalledWith('kraken_futures')
  })
  it('calls createScopeGrant with the selected instrument public_id', async () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    fireEvent.change(screen.getByTestId('sg-exchange'), { target: { value: 'kraken_futures' } })
    fireEvent.change(screen.getByTestId('sg-target'), { target: { value: 'inst-btc-perp' } })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          scope_kind: 'instrument',
          instrument_public_id: 'inst-btc-perp',
        }),
        expect.anything()
      )
    })
    expect(mockCreateMutation.mutate.mock.calls[0]?.[0]).not.toHaveProperty('underlying_public_id')
  })
  it('resets the chosen exchange and instrument when returning to the underlying scope kind', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    fireEvent.change(screen.getByTestId('sg-exchange'), { target: { value: 'kraken_futures' } })
    fireEvent.change(screen.getByTestId('sg-target'), { target: { value: 'inst-btc-perp' } })
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'underlying' } })
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    const exchangeSelect = screen.getByTestId('sg-exchange') as HTMLSelectElement

    expect(exchangeSelect.value).toBe('')
    expect((screen.getByTestId('sg-target') as HTMLSelectElement).disabled).toBe(true)
  })
  it('includes note when provided', async () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-eth' },
    })
    fireEvent.change(screen.getByPlaceholderText('Optional note'), {
      target: { value: 'test note' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'test note' }),
        expect.anything()
      )
    })
  })
  it('clears target error when an underlying is selected', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    expect(screen.getByText('Target ID is required')).toBeDefined()
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    expect(screen.queryByText('Target ID is required')).toBeNull()
  })
  it('resets the target when the scope kind changes', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), { target: { value: 'ua-btc' } })
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    const instrumentInput = screen.getByLabelText(/Instrument Public ID/) as HTMLInputElement

    expect(instrumentInput.value).toBe('')
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    expect(screen.getByText('Target ID is required')).toBeDefined()
  })
  it('calls onClose and resets form on Cancel', () => {
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })
  it('handles 409 conflict error specially', async () => {
    mockCreateMutation.mutate = vi.fn((_data, opts) => {
      opts.onError(new Error('HTTP 409: Conflict'))
    })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalled()
    })
  })
  it('handles generic error', async () => {
    mockCreateMutation.mutate = vi.fn((_data, opts) => {
      opts.onError(new Error('Server error'))
    })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalled()
    })
  })
  it('handles success callback', async () => {
    mockCreateMutation.mutate = vi.fn((_data, opts) => {
      opts.onSuccess()
    })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
  it('handles undefined wallets/operators/underlyings data gracefully', () => {
    mockUseOperators.mockReturnValue({ data: undefined })
    mockUseWallets.mockReturnValue({ data: undefined })
    mockUseUnderlyings.mockReturnValue({ data: undefined })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    expect(screen.getByText('Create Scope Grant')).toBeDefined()
    const targetSelect = screen.getByTestId('sg-target')

    expect(targetSelect.querySelectorAll('option')).toHaveLength(1)
  })
  it('handles undefined exchanges and instruments data gracefully', () => {
    mockUseExchanges.mockReturnValue({ data: undefined })
    mockUseExchangeInstrumentsDetail.mockReturnValue({ data: undefined })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-scope-kind'), { target: { value: 'instrument' } })
    expect(screen.getByTestId('sg-exchange').querySelectorAll('option')).toHaveLength(1)
    expect(screen.getByTestId('sg-target').querySelectorAll('option')).toHaveLength(1)
  })
  it('shows paper annotation for paper wallets', () => {
    mockUseWallets.mockReturnValue({
      data: {
        payload: [
          {
            type: 'wallet_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'w-paper',
            timestamp: '2026-01-01T00:00:00Z',
            label: 'paper-test',
            is_paper: true,
          },
        ],
      },
    })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    const walletSelect = screen.getByTestId('sg-wallet')
    const options = walletSelect.querySelectorAll('option')
    const labels = Array.from(options).map(o => o.textContent)

    expect(labels).toContain('paper-test (paper)')
  })
  it('handles error with empty message using fallback text', async () => {
    mockCreateMutation.mutate = vi.fn((_data, opts) => {
      const emptyErr = new Error('non-empty')

      emptyErr.message = ''
      opts.onError(emptyErr)
    })
    renderWithQuery(<ScopeGrantForm open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('sg-operator'), { target: { value: 'op-1' } })
    fireEvent.change(screen.getByTestId('sg-wallet'), { target: { value: 'w-1' } })
    fireEvent.change(screen.getByTestId('sg-target'), {
      target: { value: 'ua-btc' },
    })
    const form = screen.getByText('Create Grant').closest('form') as HTMLFormElement

    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalled()
    })
  })
})
