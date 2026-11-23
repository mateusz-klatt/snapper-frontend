import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Positions } from './Positions'
import type { Position } from '../../types/entities'
import { formatQuoted } from './instrumentQuote'
import i18n from '../../i18n/config'

const mockHasPermission = vi.fn(() => true)

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: { isTimeTraveling: boolean }) => boolean) =>
    selector({ isTimeTraveling: false })
  ),
}))

vi.mock('../../hooks/queries/positions', () => ({
  usePositions: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateBracket: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  })),
  useCreateTrailingStop: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  })),
  useTrailingStopForCycle: vi.fn(() => ({
    data: null,
  })),
}))

vi.mock('./PortfolioTimeline', () => ({
  PortfolioTimeline: () => <div data-testid='mock-portfolio-timeline' />,
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

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  sequenceId: 1,
  publicId: 'pos-1',
  timestamp: new Date('2026-04-06T12:00:00Z'),
  sessionId: 'sess-1',
  instrument: 'BTC-USD',
  exchange: 'kraken',
  quantity: 1.5,
  averagePrice: 50000,
  unrealizedPnl: 1000,
  realizedPnl: 250,
  positionCyclePublicId: null,
  ...overrides,
})

describe('Positions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders honest N/A for null valuation and shows the mark with its timestamp', async () => {
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [
        makePosition({
          averagePrice: null,
          unrealizedPnl: null,
          realizedPnl: Number.NaN,
          markPrice: null,
          markedAt: null,
        }),
        makePosition({
          publicId: 'pos-2',
          instrument: 'ETH-USD',
          markPrice: 2050,
          markedAt: new Date('2026-04-05T11:59:00Z'),
        }),
      ],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('position-unrealized-BTC-USD-kraken-live')).toHaveTextContent('N/A')
    expect(screen.getByTestId('position-realized-BTC-USD-kraken-live')).toHaveTextContent('N/A')
    expect(screen.getByTestId('position-mark-BTC-USD-kraken-live')).toHaveTextContent('N/A')
    expect(screen.queryByTestId('position-marked-at-BTC-USD-kraken-live')).not.toBeInTheDocument()
    expect(screen.getByTestId('position-mark-ETH-USD-kraken-live')).toHaveTextContent(
      '2,050.00 USD'
    )
    expect(screen.getByTestId('position-marked-at-ETH-USD-kraken-live')).toHaveTextContent(/2026/)
  })

  it('never opens the bracket modal for a position without an entry price', async () => {
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [
        makePosition({
          averagePrice: null,
          positionCyclePublicId: 'cycle-1',
        }),
      ],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    const bracketButton = screen.getByTestId('attach-bracket-BTC-USD-kraken-live')

    expect(bracketButton).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(bracketButton)
    expect(screen.queryByText('Attach SL/TP Bracket')).not.toBeInTheDocument()
    const trailButton = screen.getByTestId('attach-trailing-stop-BTC-USD-kraken-live')

    expect(trailButton).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(trailButton)
    expect(screen.queryByText('Attach Trailing Stop')).not.toBeInTheDocument()
  })

  it('renders the page title', () => {
    renderWithProviders(<Positions />)
    expect(screen.getByText('Positions')).toBeInTheDocument()
  })

  it('toggles between the current positions and P&L timeline views', () => {
    renderWithProviders(<Positions />)
    const currentButton = screen.getByRole('button', { name: 'Current' })
    const timelineButton = screen.getByRole('button', { name: 'P&L Timeline' })

    expect(currentButton).toHaveAttribute('aria-pressed', 'true')
    expect(timelineButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(timelineButton)
    expect(currentButton).toHaveAttribute('aria-pressed', 'false')
    expect(timelineButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mock-portfolio-timeline')).toBeInTheDocument()

    fireEvent.click(currentButton)
    expect(currentButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('mock-portfolio-timeline')).not.toBeInTheDocument()
  })

  it('renders empty state when no positions are returned', async () => {
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByText('No open positions')).toBeInTheDocument()
  })

  it('renders skeletons while loading', async () => {
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never)
    const { container } = renderWithProviders(<Positions />)

    expect(container.querySelectorAll('[data-testid="position-"]')).toHaveLength(0)
    expect(screen.getByText('Positions')).toBeInTheDocument()
  })

  it('renders a LONG position with green badge and absolute quantity', async () => {
    const long = makePosition({
      instrument: 'BTC-USD',
      quantity: 2.5,
      averagePrice: 50000,
      unrealizedPnl: 1000,
      realizedPnl: 0,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [long],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('position-side-BTC-USD-kraken-live')).toHaveTextContent('LONG')
    expect(screen.getByText('2.5')).toBeInTheDocument()
    expect(screen.getByTestId('position-unrealized-BTC-USD-kraken-live')).toHaveTextContent(
      '+1,000.00 USD'
    )
  })

  it('renders a SHORT position with red badge and absolute quantity', async () => {
    const short = makePosition({
      instrument: 'ETH-USD',
      quantity: -3,
      averagePrice: 2000,
      unrealizedPnl: -150,
      realizedPnl: 50,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [short],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    const sideBadge = screen.getByTestId('position-side-ETH-USD-kraken-live')

    expect(sideBadge).toHaveTextContent('SHORT')
    expect(sideBadge.className).toContain('text-falling-400')
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByTestId('position-unrealized-ETH-USD-kraken-live')).toHaveTextContent(
      '-150.00 USD'
    )
    expect(screen.getByTestId('position-realized-ETH-USD-kraken-live')).toHaveTextContent(
      '+50.00 USD'
    )
  })

  it('renders a FLAT position with neutral badge and zero P&L formatting', async () => {
    const flat = makePosition({
      instrument: 'SOL-USD',
      quantity: 0,
      averagePrice: 100,
      unrealizedPnl: 0,
      realizedPnl: 0,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [flat],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('dust-positions')).not.toBeInTheDocument()
    const sideBadge = screen.getByTestId('position-side-SOL-USD-kraken-live')

    expect(sideBadge).toHaveTextContent('FLAT')
    expect(sideBadge.className).toContain('text-muted-400')
    expect(screen.getByTestId('position-unrealized-SOL-USD-kraken-live')).toHaveTextContent(
      '0.00 USD'
    )
  })

  it('renders a non-USD position in its own quote currency, not dollars', async () => {
    const euroZloty = makePosition({
      instrument: 'EUR-PLN',
      quantity: 20,
      averagePrice: 4.38,
      markPrice: 4.33,
      unrealizedPnl: -1,
      realizedPnl: 0,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [euroZloty],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)

    expect(screen.getByTestId('position-mark-EUR-PLN-kraken-live')).toHaveTextContent('4.3300 PLN')
    expect(screen.getByTestId('position-unrealized-EUR-PLN-kraken-live')).toHaveTextContent(
      '-1.00 PLN'
    )
  })

  it('formats native position values without binary tails while keeping shared quote previews unchanged', async () => {
    const position = makePosition({
      instrument: 'EUR-PLN',
      quantity: 20,
      averagePrice: 7.123000000000001,
      markPrice: Number('7.129450000000001'),
      unrealizedPnl: Number('0.06450000000000073'),
      realizedPnl: -Number('0.06450000000000073'),
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [position], isLoading: false } as never)
    renderWithProviders(<Positions />)

    expect(screen.getByText('7.1230').parentElement).toHaveTextContent('7.1230 PLN')
    expect(screen.getByTestId('position-mark-EUR-PLN-kraken-live')).toHaveTextContent('7.1295 PLN')
    expect(screen.getByTestId('position-unrealized-EUR-PLN-kraken-live')).toHaveTextContent(
      '+0.06 PLN'
    )
    expect(
      screen.getByTestId('position-unrealized-EUR-PLN-kraken-live').querySelector('[title]')
    ).toHaveAttribute('title', expect.stringContaining('0.0645'))
    expect(screen.getByTestId('position-realized-EUR-PLN-kraken-live')).toHaveTextContent(
      '-0.06 PLN'
    )
    expect(formatQuoted(Number('7.129450000000001'), 'PLN')).toBe('7.129450000000001 PLN')
  })

  it('keeps a tiny nonzero native position value visible in its own quote', async () => {
    const position = makePosition({
      instrument: 'TINY-BTC',
      quantity: 20,
      averagePrice: 0.000000000000012345,
      markPrice: 0.000000000000012345,
      unrealizedPnl: 0.000000000000012345,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [position], isLoading: false } as never)
    renderWithProviders(<Positions />)

    expect(screen.queryByTestId('dust-positions')).not.toBeInTheDocument()
    expect(screen.getByTestId('position-mark-TINY-BTC-kraken-live')).toHaveTextContent(
      '≈ 0.00000000 BTC'
    )
    expect(screen.getByTestId('position-unrealized-TINY-BTC-kraken-live')).toHaveTextContent(
      '≈ 0.00000000 BTC'
    )
    expect(
      screen.getByTestId('position-mark-TINY-BTC-kraken-live').querySelector('[title]')
    ).toHaveAttribute('title', expect.stringContaining('0.000000000000012345'))
  })

  it.each([1, -1])(
    'renders a value just below the Intl significant-digit boundary without throwing (PnL sign %s)',
    async sign => {
      const nearUpper = 1e19 - 2048
      const position = makePosition({
        instrument: 'EUR-PLN',
        quantity: 1,
        averagePrice: nearUpper,
        markPrice: nearUpper,
        unrealizedPnl: sign * nearUpper,
      })
      const { usePositions } = await import('../../hooks/queries/positions')

      vi.mocked(usePositions).mockReturnValue({ data: [position], isLoading: false } as never)
      expect(() => renderWithProviders(<Positions />)).not.toThrow()
      const mark = screen.getByTestId('position-mark-EUR-PLN-kraken-live')
      const pnl = screen.getByTestId('position-unrealized-EUR-PLN-kraken-live')

      expect(mark).toHaveTextContent(/^9[0-9., ]+PLN$/)
      expect(pnl.textContent?.startsWith(sign > 0 ? '+' : '-')).toBe(true)
      expect(pnl).toHaveTextContent('PLN')
      expect(pnl.textContent).not.toContain('NaN')
    }
  )

  it.each([Number.NaN, 1e19])(
    'keeps the existing formatter fallback for an outlying value %s without inventing zero',
    async value => {
      const position = makePosition({ instrument: 'EUR-PLN', quantity: 1, markPrice: value })
      const { usePositions } = await import('../../hooks/queries/positions')

      vi.mocked(usePositions).mockReturnValue({ data: [position], isLoading: false } as never)
      expect(() => renderWithProviders(<Positions />)).not.toThrow()
      const mark = screen.getByTestId('position-mark-EUR-PLN-kraken-live')

      expect(mark).toHaveTextContent('PLN')
      expect(mark.textContent).not.toBe('0.00 PLN')
    }
  )

  it('renders a bare number when the symbol has no resolvable quote currency', async () => {
    const malformed = makePosition({
      instrument: 'BTCUSD',
      markPrice: 66000,
      unrealizedPnl: 12,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [malformed],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)

    const mark = screen.getByTestId('position-mark-BTCUSD-kraken-live')

    expect(mark).toHaveTextContent('66,000.00')
    expect(mark.textContent).not.toContain('$')
    expect(screen.getByTestId('position-unrealized-BTCUSD-kraken-live')).toHaveTextContent('+12')
  })

  it('renders multiple positions side by side', async () => {
    const long = makePosition({
      instrument: 'BTC-USD',
      quantity: 1,
      unrealizedPnl: 100,
    })
    const short = makePosition({
      instrument: 'ETH-USD',
      quantity: -2,
      unrealizedPnl: -50,
      publicId: 'pos-2',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [long, short],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('position-side-BTC-USD-kraken-live')).toHaveTextContent('LONG')
    expect(screen.getByTestId('position-side-ETH-USD-kraken-live')).toHaveTextContent('SHORT')
  })

  it('disambiguates same instrument across exchanges and modes', async () => {
    const krakenLive = makePosition({
      instrument: 'BTC-USD',
      exchange: 'kraken',
      mode: 'live',
      quantity: 1,
      publicId: 'pos-k-live',
    })
    const krakenPaper = makePosition({
      instrument: 'BTC-USD',
      exchange: 'kraken',
      mode: 'paper',
      quantity: -1,
      publicId: 'pos-k-paper',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [krakenLive, krakenPaper],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('position-side-BTC-USD-kraken-live')).toHaveTextContent('LONG')
    expect(screen.getByTestId('position-side-BTC-USD-kraken-paper')).toHaveTextContent('SHORT')
  })

  it('shows SL/TP button when position has an open cycle', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('attach-bracket-BTC-USD-kraken-live')).toBeInTheDocument()
  })

  it('hides SL/TP button when position has no cycle', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: null,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('attach-bracket-BTC-USD-kraken-live')).not.toBeInTheDocument()
  })

  it('hides SL/TP button for FLAT positions even with a cycle', async () => {
    const pos = makePosition({
      quantity: 0,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('dust-positions')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attach-bracket-BTC-USD-kraken-live')).not.toBeInTheDocument()
  })

  it('opens bracket modal when SL/TP button is clicked', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    fireEvent.click(screen.getByTestId('attach-bracket-BTC-USD-kraken-live'))
    expect(screen.getByText('Attach SL/TP — BTC-USD')).toBeInTheDocument()
  })

  it('closes bracket modal when onClose fires', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    fireEvent.click(screen.getByTestId('attach-bracket-BTC-USD-kraken-live'))
    expect(screen.getByText('Attach SL/TP — BTC-USD')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByText('Attach SL/TP — BTC-USD')).not.toBeInTheDocument()
  })

  it('shows Trail button when position has an open cycle', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('attach-trailing-stop-BTC-USD-kraken-live')).toBeInTheDocument()
  })

  it('hides Trail button when position has no cycle', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: null,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('attach-trailing-stop-BTC-USD-kraken-live')).not.toBeInTheDocument()
  })

  it('opens trailing stop modal when Trail button is clicked', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    fireEvent.click(screen.getByTestId('attach-trailing-stop-BTC-USD-kraken-live'))
    expect(screen.getByText('Attach Trailing Stop — BTC-USD')).toBeInTheDocument()
  })

  it('rechecks create:orders before already-rendered attach controls open modals', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [pos], isLoading: false } as never)
    renderWithProviders(<Positions />)
    const bracketButton = screen.getByTestId('attach-bracket-BTC-USD-kraken-live')
    const trailingButton = screen.getByTestId('attach-trailing-stop-BTC-USD-kraken-live')

    mockHasPermission.mockReturnValue(false)
    fireEvent.click(bracketButton)
    fireEvent.click(trailingButton)

    expect(screen.queryByText('Attach SL/TP — BTC-USD')).not.toBeInTheDocument()
    expect(screen.queryByText('Attach Trailing Stop — BTC-USD')).not.toBeInTheDocument()
  })

  it('closes trailing stop modal when onClose fires', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    fireEvent.click(screen.getByTestId('attach-trailing-stop-BTC-USD-kraken-live'))
    expect(screen.getByText('Attach Trailing Stop — BTC-USD')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByText('Attach Trailing Stop — BTC-USD')).not.toBeInTheDocument()
  })

  it('hides buttons and badge when time traveling', async () => {
    const { useAppStore } = await import('../../stores/app')

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: { isTimeTraveling: boolean }) => boolean
    ) => selector({ isTimeTraveling: true })) as never)
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('attach-bracket-BTC-USD-kraken-live')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attach-trailing-stop-BTC-USD-kraken-live')).not.toBeInTheDocument()
    expect(screen.queryByTestId('trailing-stop-badge')).not.toBeInTheDocument()

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: { isTimeTraveling: boolean }) => boolean
    ) => selector({ isTimeTraveling: false })) as never)
  })

  it('omits the currency on a trailing stop when the symbol has no quote', async () => {
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [
        makePosition({
          instrument: 'BTCUSD',
          quantity: 1,
          positionCyclePublicId: 'cycle-bare',
        }),
      ],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: { current_stop: 95000 } },
    } as never)
    renderWithProviders(<Positions />)
    const badge = screen.getByTestId('trailing-stop-badge')

    expect(badge).toHaveTextContent('TS: 95,000.00')
    expect(badge.textContent).not.toContain('USD')
  })

  it('shows trailing stop badge when active stop exists', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: { current_stop: 95000 } },
    } as never)
    renderWithProviders(<Positions />)
    const badge = screen.getByTestId('trailing-stop-badge')

    expect(badge).toHaveTextContent('TS: 95,000.00 USD')
  })

  it('preserves the quote currency and precision of a small active trailing stop', async () => {
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [makePosition({ instrument: 'ETH-BTC', positionCyclePublicId: 'cycle-btc' })],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: { current_stop: 0.000012345 } },
    } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('trailing-stop-badge')).toHaveTextContent('TS: 0.00001234 BTC')
  })

  it('keeps protective-order state visible but hides attach controls without create:orders', async () => {
    mockHasPermission.mockReturnValue(false)
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [pos], isLoading: false } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: { current_stop: 95000 } },
    } as never)
    renderWithProviders(<Positions />)

    expect(screen.getByTestId('trailing-stop-badge')).toHaveTextContent('TS: 95,000.00 USD')
    expect(screen.queryByTestId('attach-bracket-BTC-USD-kraken-live')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attach-trailing-stop-BTC-USD-kraken-live')).not.toBeInTheDocument()
  })

  it('shows pending badge when stop is not yet activated', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: { current_stop: 0 } },
    } as never)
    renderWithProviders(<Positions />)
    const badge = screen.getByTestId('trailing-stop-badge')

    expect(badge).toHaveTextContent('TS: pending')
  })

  it('shows pending badge when current_stop is missing', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'trailing_stop_state', payload: {} },
    } as never)
    renderWithProviders(<Positions />)
    const badge = screen.getByTestId('trailing-stop-badge')

    expect(badge).toHaveTextContent('TS: pending')
  })

  it('hides badge when response is message type (no trailing stop)', async () => {
    const pos = makePosition({
      quantity: 1.5,
      positionCyclePublicId: 'cycle-123',
    })
    const { usePositions, useTrailingStopForCycle } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [pos],
      isLoading: false,
    } as never)
    vi.mocked(useTrailingStopForCycle).mockReturnValue({
      data: { type: 'message', payload: 'none' },
    } as never)
    renderWithProviders(<Positions />)

    expect(screen.queryByTestId('trailing-stop-badge')).not.toBeInTheDocument()
  })

  it('keeps dust collapsed until the operator expands it', async () => {
    const active = makePosition({ quantity: 2, unrealizedPnl: 10 })
    const dust = Object.assign(
      makePosition({
        publicId: 'pos-dust',
        instrument: 'XRP-EUR',
        quantity: 9.99999993923e-9,
        averagePrice: 0.5,
        markPrice: 0.5,
        unrealizedPnl: -1.2830999922e-9,
        realizedPnl: 0,
      }),
      { quantityDecimals: 8, isDust: true }
    )
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({
      data: [active, dust],
      isLoading: false,
    } as never)
    renderWithProviders(<Positions />)
    const toggle = screen.getByTestId('dust-toggle')

    expect(toggle).toHaveTextContent('Dust (1)')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('title', 'Show dust positions')
    expect(screen.getByTestId('position-side-BTC-USD-kraken-live')).toBeInTheDocument()
    expect(screen.queryByText('0.00000001')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('title', 'Hide dust positions')
    expect(screen.getByText('0.00000001')).toBeInTheDocument()
    expect(screen.getByTestId('position-unrealized-XRP-EUR-kraken-live')).toHaveTextContent(
      '≈ 0.00 EUR'
    )
    expect(
      screen.getByTestId('position-unrealized-XRP-EUR-kraken-live').querySelector('[title]')
    ).toHaveAttribute('title', expect.stringContaining('0.0000000012830999922'))
    fireEvent.click(toggle)
    expect(screen.queryByText('0.00000001')).not.toBeInTheDocument()
  })

  it('keeps a 0.3 BTC position in the main list when the API omits is_dust', async () => {
    const position = makePosition({
      instrument: 'ETH-BTC',
      quantity: 0.3,
      markPrice: 1,
      averagePrice: 1,
      unrealizedPnl: 0.01,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [position], isLoading: false } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('dust-positions')).not.toBeInTheDocument()
    expect(screen.getByTestId('position-side-ETH-BTC-kraken-live')).toBeInTheDocument()
  })

  it('keeps a position in the main list when the API says it is not dust', async () => {
    const kept = Object.assign(
      makePosition({ quantity: 1e-8, markPrice: 1, averagePrice: 1, unrealizedPnl: 0 }),
      { isDust: false }
    )
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [kept], isLoading: false } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('dust-positions')).not.toBeInTheDocument()
    expect(screen.getByText('0.00000001')).toBeInTheDocument()
  })

  it('parks a large position in dust when the API marks it as dust', async () => {
    const parked = Object.assign(makePosition({ quantity: 2, unrealizedPnl: 10 }), { isDust: true })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [parked], isLoading: false } as never)
    renderWithProviders(<Positions />)
    expect(screen.queryByTestId('position-side-BTC-USD-kraken-live')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('dust-toggle'))
    expect(screen.getByTestId('position-side-BTC-USD-kraken-live')).toHaveTextContent('LONG')
  })

  it('colors a displayed zero as flat for USD, EUR and PLN', async () => {
    await i18n.changeLanguage('pl')
    const raw = -1.5e-9
    const rows = [
      makePosition({ instrument: 'BTC-USD', quantity: 1, unrealizedPnl: raw, publicId: 'usd' }),
      makePosition({ instrument: 'BTC-EUR', quantity: 1, unrealizedPnl: raw, publicId: 'eur' }),
      makePosition({ instrument: 'EUR-PLN', quantity: 1, unrealizedPnl: raw, publicId: 'pln' }),
    ]
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: rows, isLoading: false } as never)
    renderWithProviders(<Positions />)

    for (const instrument of ['BTC-USD', 'BTC-EUR', 'EUR-PLN']) {
      const pnl = screen.getByTestId(`position-unrealized-${instrument}-kraken-live`)

      expect(pnl).toHaveTextContent('≈ 0,00')
      expect(pnl.textContent).not.toContain('-0,00000001')
      expect(pnl.className).toContain('text-muted-400')
      expect(pnl.className).not.toContain('text-falling-400')
      expect(pnl.className).not.toContain('text-rising-400')
    }
  })

  it('labels the dust section in Polish', async () => {
    await i18n.changeLanguage('pl')
    const dust = Object.assign(makePosition({ quantity: 4e-9, unrealizedPnl: 0, realizedPnl: 0 }), {
      quantityDecimals: 8,
    })
    const { usePositions } = await import('../../hooks/queries/positions')

    vi.mocked(usePositions).mockReturnValue({ data: [dust], isLoading: false } as never)
    renderWithProviders(<Positions />)
    expect(screen.getByTestId('dust-toggle')).toHaveTextContent('Pył (1)')
    expect(screen.getByTestId('dust-toggle')).toHaveAttribute('title', 'Pokaż pozycje pyłu')
  })
})
