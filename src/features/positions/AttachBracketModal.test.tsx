import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AttachBracketModal } from './AttachBracketModal'
import { validateBracketPrices } from './validation'

const mockMutate = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/queries/positions', () => ({
  useCreateBracket: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    reset: mockReset,
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

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  positionCyclePublicId: 'cycle-123',
  instrument: 'BTC-USD',
  side: 'LONG' as const,
  averagePrice: 50000,
}

describe('AttachBracketModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useCreateBracket } = await import('../../hooks/queries/positions')

    vi.mocked(useCreateBracket).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      reset: mockReset,
    } as never)
  })

  it('renders SL and TP input fields', () => {
    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    expect(screen.getByTestId('sl-price-input')).toBeInTheDocument()
    expect(screen.getByTestId('tp-price-input')).toBeInTheDocument()
  })

  it('shows position info header', () => {
    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    expect(screen.getByText('LONG BTC-USD')).toBeInTheDocument()
    expect(screen.getByText('50000.00 USD')).toBeInTheDocument()
  })

  it('requires at least one price', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-error')).toHaveTextContent(
      'At least one of SL or TP price is required'
    )
  })

  it.each([
    {
      name: 'validates SL below entry for LONG',
      side: 'LONG',
      inputTestId: 'sl-price-input',
      price: '55000',
      expectedError: 'SL price must be below entry',
    },
    {
      name: 'validates TP above entry for LONG',
      side: 'LONG',
      inputTestId: 'tp-price-input',
      price: '45000',
      expectedError: 'TP price must be above entry',
    },
    {
      name: 'validates SL above entry for SHORT',
      side: 'SHORT',
      inputTestId: 'sl-price-input',
      price: '45000',
      expectedError: 'SL price must be above entry',
    },
    {
      name: 'validates TP below entry for SHORT',
      side: 'SHORT',
      inputTestId: 'tp-price-input',
      price: '55000',
      expectedError: 'TP price must be below entry',
    },
  ] satisfies {
    name: string
    side: 'LONG' | 'SHORT'
    inputTestId: string
    price: string
    expectedError: string
  }[])('$name', async ({ side, inputTestId, price, expectedError }) => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} side={side} />)
    await user.type(screen.getByTestId(inputTestId), price)
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-error')).toHaveTextContent(expectedError)
  })

  it('shows confirmation screen with valid LONG SL+TP', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.type(screen.getByTestId('tp-price-input'), '55000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByText('Confirm Bracket')).toBeInTheDocument()
    expect(screen.getByText('48000.00 USD')).toBeInTheDocument()
    expect(screen.getByText('55000.00 USD')).toBeInTheDocument()
  })

  it('calls mutate with SL-only payload on confirm', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    await user.click(screen.getByTestId('bracket-confirm'))
    expect(mockMutate).toHaveBeenCalledWith(
      {
        position_cycle_public_id: 'cycle-123',
        sl_price: 48000,
        tp_price: null,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
  })

  it('calls mutate with TP-only payload on confirm', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('tp-price-input'), '55000')
    await user.click(screen.getByTestId('bracket-submit'))
    await user.click(screen.getByTestId('bracket-confirm'))
    expect(mockMutate).toHaveBeenCalledWith(
      {
        position_cycle_public_id: 'cycle-123',
        sl_price: null,
        tp_price: 55000,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
  })

  it('allows SL-only submission', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByText('Confirm Bracket')).toBeInTheDocument()
    expect(screen.queryByText('Take-Profit')).not.toBeInTheDocument()
  })

  it('allows TP-only submission', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('tp-price-input'), '55000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByText('Confirm Bracket')).toBeInTheDocument()
    expect(screen.queryByText('Stop-Loss')).not.toBeInTheDocument()
  })

  it('returns to form from confirmation', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByText('Confirm Bracket')).toBeInTheDocument()
    await user.click(screen.getByText('Back'))
    expect(screen.getByTestId('sl-price-input')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders(<AttachBracketModal {...defaultProps} open={false} />)
    expect(screen.queryByText('Attach SL/TP')).not.toBeInTheDocument()
  })

  it('shows confirmation with TP-only for SHORT position', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} side='SHORT' />)
    await user.type(screen.getByTestId('tp-price-input'), '45000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByText('Confirm Bracket')).toBeInTheDocument()
    expect(screen.getByText('45000.00 USD')).toBeInTheDocument()
    expect(screen.queryByText('Stop-Loss')).not.toBeInTheDocument()
  })

  it('shows Confirm text when not pending', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-confirm')).toHaveTextContent('Confirm')
  })

  it('shows Creating text when pending', async () => {
    const user = userEvent.setup()
    const { useCreateBracket } = await import('../../hooks/queries/positions')

    vi.mocked(useCreateBracket).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      reset: mockReset,
    } as never)
    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-confirm')).toHaveTextContent('Creating…')
  })

  it('validates positive SL price', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '-100')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-error')).toHaveTextContent(
      'Stop-loss price must be positive'
    )
  })

  it('validates positive TP price', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('tp-price-input'), '-200')
    await user.click(screen.getByTestId('bracket-submit'))
    expect(screen.getByTestId('bracket-error')).toHaveTextContent(
      'Take-profit price must be positive'
    )
  })

  it('calls onClose when onSuccess callback fires', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderWithProviders(<AttachBracketModal {...defaultProps} onClose={onClose} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    await user.click(screen.getByTestId('bracket-confirm'))
    const opts = mockMutate.mock.calls[0]?.[1] as { onSuccess: () => void }

    act(() => opts.onSuccess())
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error when onError callback fires', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AttachBracketModal {...defaultProps} />)
    await user.type(screen.getByTestId('sl-price-input'), '48000')
    await user.click(screen.getByTestId('bracket-submit'))
    await user.click(screen.getByTestId('bracket-confirm'))
    const opts = mockMutate.mock.calls[0]?.[1] as { onError: (e: Error) => void }

    act(() => opts.onError(new Error('Duplicate bracket')))
    expect(screen.getByTestId('bracket-error')).toHaveTextContent('Duplicate bracket')
  })
})

describe('validateBracketPrices', () => {
  it('returns error when both prices are null', () => {
    expect(validateBracketPrices(null, null, 'LONG', 50000, 'USD')).toEqual({
      key: 'bracketRequired',
    })
  })

  it('rejects non-finite SL (Infinity)', () => {
    expect(validateBracketPrices(Infinity, null, 'LONG', 50000, 'USD')).toEqual({
      key: 'invalidSlPrice',
    })
  })

  it('rejects non-finite SL (NaN)', () => {
    expect(validateBracketPrices(NaN, null, 'LONG', 50000, 'USD')).toEqual({
      key: 'invalidSlPrice',
    })
  })

  it('rejects non-finite TP (Infinity)', () => {
    expect(validateBracketPrices(48000, Infinity, 'LONG', 50000, 'USD')).toEqual({
      key: 'invalidTpPrice',
    })
  })

  it('rejects non-finite TP (NaN)', () => {
    expect(validateBracketPrices(48000, NaN, 'LONG', 50000, 'USD')).toEqual({
      key: 'invalidTpPrice',
    })
  })

  it('returns null for valid LONG SL+TP', () => {
    expect(validateBracketPrices(48000, 55000, 'LONG', 50000, 'USD')).toBeNull()
  })

  it('returns null for valid SHORT SL+TP', () => {
    expect(validateBracketPrices(55000, 45000, 'SHORT', 50000, 'USD')).toBeNull()
  })

  it('formats the entry price with the quote currency in a relation error', () => {
    expect(validateBracketPrices(51000, null, 'LONG', 50000, 'PLN')).toEqual({
      key: 'slLongBelowEntry',
      params: { price: '50000.00 PLN' },
    })
  })

  it('omits the currency when the quote is unresolved', () => {
    expect(validateBracketPrices(51000, null, 'LONG', 50000, '')).toEqual({
      key: 'slLongBelowEntry',
      params: { price: '50000.00' },
    })
  })
})
