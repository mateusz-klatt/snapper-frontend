import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NewOrderModal } from './NewOrderModal'

const mockHasPermission = vi.fn(() => true)

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}))
vi.mock('../../hooks/useIsReadOnly', () => ({
  useIsReadOnly: () => false,
}))

vi.mock('../../components/ui/Modal', () => ({
  Modal: (props: { open: boolean; onClose: () => void; children: ReactNode }) =>
    props.open ? <div data-testid='modal'>{props.children}</div> : null,
}))

vi.mock('../../components/ThemeSelect', () => ({
  ThemeSelect: ({
    value,
    onChange,
    options,
  }: {
    value: string
    onChange: (v: string) => void
    options: readonly { value: string; label: string }[]
  }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}))

const mockMutateAsync = vi.fn()
const mockCreateOrderState = { isPending: false }

type MockInstrumentRow = {
  symbol: string
  can_trade: boolean
}
const mockHookState: {
  exchanges: { payload: string[] } | undefined
  instruments: { payload: MockInstrumentRow[] } | undefined
  wallets: { public_id: string; label: string; is_paper: boolean }[] | undefined
} = {
  exchanges: { payload: ['kraken', 'walutomat'] },
  instruments: {
    payload: [
      { symbol: 'BTC-USD', can_trade: true },
      { symbol: 'ETH-USD', can_trade: true },
    ],
  },
  wallets: [
    { public_id: 'wallet-1', label: 'default', is_paper: false },
    { public_id: 'wallet-2', label: 'paper', is_paper: true },
  ],
}

vi.mock('../../hooks/queries/market', () => ({
  useExchanges: () => ({
    data: mockHookState.exchanges,
  }),
  useExchangeInstrumentsDetail: () => ({
    data: mockHookState.instruments,
  }),
}))
vi.mock('../../hooks/queries/orders', () => ({
  useCreateOrder: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockCreateOrderState.isPending,
  }),
}))
vi.mock('../../hooks/queries/wallets', () => ({
  useWallets: () => ({
    data: mockHookState.wallets ? { payload: mockHookState.wallets } : undefined,
  }),
}))

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

function fillLimitOrder(): void {
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0.5' } })
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '50000' } })
}

async function confirmOrder(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Confirm Order' }))
}

function pendingSubmission(): {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
} {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe('NewOrderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
    mockCreateOrderState.isPending = false
  })

  it('does not render when closed', () => {
    render(<NewOrderModal open={false} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    expect(screen.queryByTestId('modal')).toBeNull()
  })

  it('renders form when open', () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('New Manual Order')).toBeTruthy()
    expect(screen.getByText('Review Order')).toBeTruthy()
  })

  it('does not expose order creation without create:orders', () => {
    mockHasPermission.mockReturnValue(false)
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByText('Review Order')).toBeDisabled()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('rechecks create:orders before reviewing an already-rendered order', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    mockHasPermission.mockReturnValue(false)
    await userEvent.click(screen.getByText('Review Order'))

    expect(screen.queryByText('All required fields must be filled')).not.toBeInTheDocument()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('rechecks create:orders before confirming an already-reviewed order', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await screen.findByRole('button', { name: 'Confirm Order' })
    mockHasPermission.mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('shows validation error when required fields empty', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    await userEvent.click(screen.getByText('Review Order'))
    expect(screen.getByText('All required fields must be filled')).toBeTruthy()
  })

  it('shows confirmation view after filling form', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))

    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
  })

  it('calls createOrder on confirm', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    const onClose = vi.fn()

    render(<NewOrderModal open={true} onClose={onClose} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))

    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error on submit failure', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('API error'))

    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))

    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))

    await waitFor(() => {
      expect(screen.getByText('API error')).toBeTruthy()
    })
  })

  it('shows fallback error message when thrown value is not an Error', async () => {
    mockMutateAsync.mockRejectedValueOnce('string failure')

    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
    await waitFor(() => {
      expect(screen.getByText('Order creation failed')).toBeTruthy()
    })
  })

  it('goes back from confirmation', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))

    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })

    await userEvent.click(screen.getByText('Back'))

    await waitFor(() => {
      expect(screen.getByText('New Manual Order')).toBeTruthy()
    })
  })

  it('shows stop price field for stop order type', () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[3] as HTMLElement, { target: { value: 'stop' } })
    expect(screen.getByText('Stop Price')).toBeTruthy()
  })

  it.each([
    {
      name: 'shows error for zero quantity',
      inputValues: [
        [0, '0'],
        [1, '50000'],
      ],
      expectedError: 'Quantity must be a positive number',
    },
    {
      name: 'shows error for negative price',
      inputValues: [
        [0, '1'],
        [1, '-5'],
      ],
      expectedError: 'Price must be a positive number',
    },
    {
      name: 'shows price required error for limit without price',
      inputValues: [
        [0, '1'],
        [1, ''],
      ],
      expectedError: 'Price is required for this order type',
    },
    {
      name: 'shows stop price required error for stop without stop_price',
      orderType: 'stop',
      inputValues: [[0, '1']],
      expectedError: 'Stop price is required for this order type',
    },
    {
      name: 'shows stop price positive error for stop with non-positive stop_price',
      orderType: 'stop',
      inputValues: [
        [0, '1'],
        [1, '0'],
      ],
      expectedError: 'Stop price must be a positive number',
    },
  ] satisfies {
    name: string
    orderType?: 'stop'
    inputValues: [number, string][]
    expectedError: string
  }[])('$name', async ({ orderType, inputValues, expectedError }) => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    if (orderType !== undefined) {
      const selects = screen.getAllByRole('combobox')

      fireEvent.change(selects[3] as HTMLElement, { target: { value: orderType } })
    }

    const inputs = screen.getAllByPlaceholderText('0.00')

    inputValues.forEach(([index, value]) => {
      fireEvent.change(inputs[index] as HTMLElement, { target: { value } })
    })
    await userEvent.click(screen.getByText('Review Order'))
    expect(screen.getByText(expectedError)).toBeTruthy()
  })

  it('renders with empty fallback lists when hooks return undefined data', () => {
    const prev = {
      exchanges: mockHookState.exchanges,
      instruments: mockHookState.instruments,
      wallets: mockHookState.wallets,
    }

    mockHookState.exchanges = undefined
    mockHookState.instruments = undefined
    mockHookState.wallets = undefined

    try {
      render(<NewOrderModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })
      expect(screen.getByTestId('modal')).toBeTruthy()
    } finally {
      mockHookState.exchanges = prev.exchanges
      mockHookState.instruments = prev.instruments
      mockHookState.wallets = prev.wallets
    }
  })

  it('submits stop_limit order with both price and stop_price', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[3] as HTMLElement, { target: { value: 'stop_limit' } })
    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    fireEvent.change(inputs[2] as HTMLElement, { target: { value: '48000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })
    const body = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>

    expect(body.price).toBe(50000)
    expect(body.stop_price).toBe(48000)
  })

  it('submits market order with null price and null stop_price', async () => {
    mockMutateAsync.mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[3] as HTMLElement, { target: { value: 'market' } })
    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })
    const body = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>

    expect(body.price).toBeNull()
    expect(body.stop_price).toBeNull()
  })

  it('shows sell side styling in confirmation view', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[2] as HTMLElement, { target: { value: 'sell' } })
    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Sell').length).toBeGreaterThan(0)
  })

  it('shows submitting label only while the current ticket request is pending', async () => {
    const pending = pendingSubmission()

    mockMutateAsync.mockImplementationOnce(() => pending.promise)
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await confirmOrder()
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled()
    await act(async () => {
      pending.resolve()
    })
  })

  it('confirmation shows stop price and mode', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    fireEvent.change(selects[3] as HTMLElement, { target: { value: 'stop' } })
    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '1' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '48000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Stop Price')).toBeTruthy()
    expect(screen.getByText('48000.00 USD')).toBeTruthy()
  })

  it('handles instrument change via select', () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    const selects = screen.getAllByRole('combobox')

    expect(() => {
      fireEvent.change(selects[1] as HTMLElement, { target: { value: 'ETH-USD' } })
    }).not.toThrow()
    expect((selects[1] as HTMLSelectElement).value).toBe('ETH-USD')
  })

  it('resets state on close', async () => {
    const onClose = vi.fn()

    render(<NewOrderModal open={true} onClose={onClose} />, {
      wrapper: createWrapper(),
    })
    await userEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables submit and shows inline notice when instrument is market-data-only', async () => {
    const prev = mockHookState.instruments

    mockHookState.instruments = {
      payload: [{ symbol: 'MNQM6-CME', can_trade: false }],
    }

    try {
      render(<NewOrderModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })
      await waitFor(() => {
        const badges = screen.getAllByTestId('market-data-only-badge')

        expect(badges.length).toBeGreaterThan(0)
      })
      expect(
        screen.getByText(
          /This instrument is observation-only — place orders on an execution-capable instrument\./
        )
      ).toBeTruthy()
      const reviewBtn = screen.getByText('Review Order') as HTMLButtonElement

      expect(reviewBtn.disabled).toBe(true)
    } finally {
      mockHookState.instruments = prev
    }
  })

  it('does not show badge or disable submit for tradable instruments', () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })
    expect(screen.queryByTestId('market-data-only-badge')).toBeNull()
    const reviewBtn = screen.getByText('Review Order') as HTMLButtonElement

    expect(reviewBtn.disabled).toBe(false)
  })

  it('shows mapped error when APIError carries instrument_market_data_only code', async () => {
    const { APIError } = await import('../../lib/apiClient')
    const rejection = new APIError('raw reason text', 422, 'Unprocessable Entity', {
      error_code: 'instrument_market_data_only',
      symbol: 'MNQM6-CME',
      exchange: 'kraken_equities',
      reason: 'raw reason text',
    })

    mockMutateAsync.mockRejectedValueOnce(rejection)

    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
    await waitFor(() => {
      expect(
        screen.getByText(
          /This instrument is observation-only — place orders on an execution-capable instrument\./
        )
      ).toBeTruthy()
    })
  })

  it('falls back to APIError.message when error_code is unknown', async () => {
    const { APIError } = await import('../../lib/apiClient')
    const rejection = new APIError('raw 500 message', 500, 'Internal Server Error', {
      error_code: 'not_in_map',
      reason: 'raw 500 message',
    })

    mockMutateAsync.mockRejectedValueOnce(rejection)

    render(<NewOrderModal open={true} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    })

    const inputs = screen.getAllByPlaceholderText('0.00')

    fireEvent.change(inputs[0] as HTMLElement, { target: { value: '0.5' } })
    fireEvent.change(inputs[1] as HTMLElement, { target: { value: '50000' } })
    await userEvent.click(screen.getByText('Review Order'))
    await waitFor(() => {
      expect(screen.getAllByText('Confirm Order').length).toBeGreaterThan(0)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
    await waitFor(() => {
      expect(screen.getByText('raw 500 message')).toBeTruthy()
    })
  })

  it('reuses the submission key after a lost response and equivalent numeric formatting', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await confirmOrder()
    await screen.findByText('Response lost')
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0.5000' } })
    await confirmOrder()

    const first = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>
    const retry = mockMutateAsync.mock.calls[1]?.[0] as Record<string, unknown>

    expect(retry.idempotency_key).toBe(first.idempotency_key)
    expect(retry).toEqual(first)
  })

  it.each([
    ['Quantity', '1'],
    ['Price', '49000'],
    ['Side', 'sell'],
    ['Exchange', 'walutomat'],
    ['Instrument', 'ETH-USD'],
    ['Wallet', 'wallet-2'],
    ['Mode', 'paper'],
    ['Order Type', 'market'],
  ])('rotates the submission key after changing %s', async (label: string, value: string) => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await confirmOrder()
    await screen.findByText('Response lost')
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    await confirmOrder()

    const first = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>
    const changed = mockMutateAsync.mock.calls[1]?.[0] as Record<string, unknown>

    expect(changed.idempotency_key).not.toBe(first.idempotency_key)
  })

  it('rotates the key when a material edit is reverted before retry', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await confirmOrder()
    await screen.findByText('Response lost')
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0.5' } })
    await confirmOrder()

    const first = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>
    const changed = mockMutateAsync.mock.calls[1]?.[0] as Record<string, unknown>

    expect(changed.idempotency_key).not.toBe(first.idempotency_key)
  })

  it('starts another submission when an unchanged ticket is closed and reopened by its parent', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    const onClose = vi.fn()
    const { rerender } = render(<NewOrderModal open={true} onClose={onClose} />, {
      wrapper: createWrapper(),
    })

    fillLimitOrder()
    await confirmOrder()
    await screen.findByText('Response lost')
    rerender(<NewOrderModal open={false} onClose={onClose} />)
    rerender(<NewOrderModal open={true} onClose={onClose} />)
    await confirmOrder()

    const first = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>
    const reopened = mockMutateAsync.mock.calls[1]?.[0] as Record<string, unknown>

    expect(reopened.idempotency_key).not.toBe(first.idempotency_key)
  })

  it('does not submit twice while the first confirmation is still in flight', async () => {
    let finishSubmission!: () => void

    mockMutateAsync.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishSubmission = resolve
        })
    )
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
    const confirm = await screen.findByRole('button', { name: 'Confirm Order' })

    act(() => {
      fireEvent.click(confirm)
      fireEvent.click(confirm)
    })
    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    await act(async () => {
      finishSubmission()
    })
  })

  it('prevents editing a ticket while its confirmation is pending', async (): Promise<void> => {
    const pending = pendingSubmission()
    const onClose = vi.fn()

    mockMutateAsync.mockImplementationOnce(() => pending.promise)
    render(<NewOrderModal open={true} onClose={onClose} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await confirmOrder()
    const back = screen.getByRole('button', { name: 'Back' })

    expect(back).toBeDisabled()
    await userEvent.click(back)
    expect(screen.getByRole('heading', { name: 'Confirm Order' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 0.5, price: 50000 })
    )
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['EUR-PLN', 'walutomat', 'PLN'],
    ['NVDAx-EUR', 'kraken', 'EUR'],
    ['BTC-USD-PERP', 'kraken_futures', 'USD'],
    ['BTC-USD-261225-INV', 'kraken_futures', 'USD'],
    ['BTC-USD-BTNL', 'kraken', 'USD'],
    ['SPX', 'kraken_equities', ''],
  ])(
    'reviews %s prices in their quote currency',
    async (symbol: string, exchange: string, quote: string) => {
      const previous = {
        exchanges: mockHookState.exchanges,
        instruments: mockHookState.instruments,
      }

      mockHookState.exchanges = { payload: [exchange] }
      mockHookState.instruments = { payload: [{ symbol, can_trade: true }] }

      try {
        render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
        fireEvent.change(screen.getByLabelText('Order Type'), { target: { value: 'stop_limit' } })
        fillLimitOrder()
        fireEvent.change(screen.getByLabelText('Stop Price'), { target: { value: '48000' } })
        await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
        expect(
          screen.getByText(quote === '' ? '50000.00' : `50000.00 ${quote}`)
        ).toBeInTheDocument()
        expect(
          screen.getByText(quote === '' ? '48000.00' : `48000.00 ${quote}`)
        ).toBeInTheDocument()
      } finally {
        mockHookState.exchanges = previous.exchanges
        mockHookState.instruments = previous.instruments
      }
    }
  )

  it.each([
    ['kraken', 'limit', 'live', true, false],
    ['kraken', 'stop_limit', 'live', true, false],
    ['kraken', 'market', 'live', false, false],
    ['kraken', 'stop', 'live', false, false],
    ['kraken_futures', 'limit', 'live', true, true],
    ['kraken_futures', 'stop_limit', 'live', false, true],
    ['kraken_futures', 'market', 'live', false, true],
    ['walutomat', 'limit', 'live', false, false],
    ['kraken_equities', 'limit', 'live', false, false],
    ['kraken', 'limit', 'paper', false, false],
    ['kraken_futures', 'limit', 'paper', false, false],
  ] as const)(
    'offers only effective modifiers for %s %s in %s mode',
    (exchange: string, orderType: string, mode: string, maker: boolean, reduce: boolean): void => {
      const previous = mockHookState.exchanges

      mockHookState.exchanges = { payload: [exchange] }

      try {
        render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
        fireEvent.change(screen.getByLabelText('Order Type'), { target: { value: orderType } })
        fireEvent.change(screen.getByLabelText('Mode'), { target: { value: mode } })
        expect(screen.queryByRole('checkbox', { name: 'Maker only' }) !== null).toBe(maker)
        expect(screen.queryByRole('checkbox', { name: 'Reduce Only' }) !== null).toBe(reduce)
        expect(screen.queryByLabelText('Leverage')).not.toBeInTheDocument()
      } finally {
        mockHookState.exchanges = previous
      }
    }
  )

  it('reviews and submits maker-only and reduce-only futures intent', async () => {
    const previous = mockHookState.exchanges

    mockHookState.exchanges = { payload: ['kraken_futures'] }

    try {
      render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
      fillLimitOrder()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Maker only' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Reduce Only' }))
      await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
      expect(screen.getByText('Maker only')).toBeInTheDocument()
      expect(screen.getByText('Reduce Only')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: 'kraken_futures',
          post_only: true,
          reduce_only: true,
        })
      )
    } finally {
      mockHookState.exchanges = previous
    }
  })

  it('resets maker-only when a changed order type cannot carry it', async () => {
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Maker only' }))
    fireEvent.change(screen.getByLabelText('Order Type'), { target: { value: 'market' } })
    fireEvent.change(screen.getByLabelText('Order Type'), { target: { value: 'limit' } })
    expect(screen.getByRole('checkbox', { name: 'Maker only' })).not.toBeChecked()
  })

  it('resets futures modifiers when switching away from live mode', async () => {
    const previous = mockHookState.exchanges

    mockHookState.exchanges = { payload: ['kraken_futures'] }

    try {
      render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
      await userEvent.click(screen.getByRole('checkbox', { name: 'Maker only' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Reduce Only' }))
      fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'paper' } })
      fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'live' } })
      expect(screen.getByRole('checkbox', { name: 'Maker only' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Reduce Only' })).not.toBeChecked()
    } finally {
      mockHookState.exchanges = previous
    }
  })

  it('rotates the submission key when changing a requested execution modifier', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({})
    render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
    fillLimitOrder()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Maker only' }))
    await confirmOrder()
    await screen.findByText('Response lost')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Maker only' }))
    await confirmOrder()

    const first = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>
    const changed = mockMutateAsync.mock.calls[1]?.[0] as Record<string, unknown>

    expect(first.post_only).toBe(true)
    expect(changed).not.toHaveProperty('post_only')
    expect(changed.idempotency_key).not.toBe(first.idempotency_key)
  })

  it.each(['success', 'error'] as const)(
    'ignores stale %s completion after a new ticket starts another pending submission',
    async (outcome: 'success' | 'error') => {
      const first = pendingSubmission()
      const second = pendingSubmission()
      const onClose = vi.fn()

      mockMutateAsync.mockImplementationOnce(() => {
        mockCreateOrderState.isPending = true

        return first.promise
      })
      mockMutateAsync.mockImplementationOnce(() => second.promise)
      const { rerender } = render(<NewOrderModal open={true} onClose={onClose} />, {
        wrapper: createWrapper(),
      })

      fillLimitOrder()
      await confirmOrder()
      rerender(<NewOrderModal open={false} onClose={onClose} />)
      rerender(<NewOrderModal open={true} onClose={onClose} />)
      await userEvent.click(screen.getByRole('button', { name: 'Back' }))
      fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } })
      await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
      expect(screen.getByRole('button', { name: 'Confirm Order' })).toBeEnabled()
      await userEvent.click(screen.getByRole('button', { name: 'Confirm Order' }))
      expect(mockMutateAsync).toHaveBeenCalledTimes(2)
      await act(async () => {
        if (outcome === 'success') first.resolve()
        else first.reject(new Error('Stale request failed'))
      })
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Confirm Order' })).toBeInTheDocument()
      expect(screen.queryByText('Stale request failed')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Submitting...' }))
      expect(mockMutateAsync).toHaveBeenCalledTimes(2)
      await act(async () => {
        second.resolve()
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  )

  it('blocks confirmation when the reviewed instrument becomes market-data-only', async () => {
    const previous = mockHookState.instruments
    const onClose = vi.fn()
    const { rerender } = render(<NewOrderModal open={true} onClose={onClose} />, {
      wrapper: createWrapper(),
    })

    fillLimitOrder()
    await userEvent.click(screen.getByRole('button', { name: 'Review Order' }))
    mockHookState.instruments = { payload: [{ symbol: 'BTC-USD', can_trade: false }] }

    try {
      rerender(<NewOrderModal open={true} onClose={onClose} />)
      const confirm = screen.getByRole('button', { name: 'Confirm Order' })

      expect(confirm).toBeDisabled()
      fireEvent.click(confirm)
      expect(mockMutateAsync).not.toHaveBeenCalled()
    } finally {
      mockHookState.instruments = previous
    }
  })

  it('ignores an old successful request after the ticket unmounts and is created again', async () => {
    const pending = pendingSubmission()
    const onClose = vi.fn()

    mockMutateAsync.mockImplementationOnce(() => pending.promise)
    const previous = render(<NewOrderModal open={true} onClose={onClose} />, {
      wrapper: createWrapper(),
    })

    fillLimitOrder()
    await confirmOrder()
    previous.unmount()
    render(<NewOrderModal open={true} onClose={onClose} />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } })
    await act(async () => {
      pending.resolve()
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Quantity')).toHaveValue(2)
  })

  it('does not advertise margin or add leverage fields to an xStock order', async () => {
    const previous = mockHookState.instruments

    mockHookState.instruments = { payload: [{ symbol: 'NVDAx-EUR', can_trade: true }] }

    try {
      render(<NewOrderModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })
      expect(screen.queryByLabelText('Leverage')).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: 'Reduce Only' })).not.toBeInTheDocument()
      fillLimitOrder()
      await confirmOrder()
      const body = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>

      expect(body.instrument).toBe('NVDAx-EUR')
      expect(body).not.toHaveProperty('leverage')
      expect(body).not.toHaveProperty('reduce_only')
    } finally {
      mockHookState.instruments = previous
    }
  })
})
