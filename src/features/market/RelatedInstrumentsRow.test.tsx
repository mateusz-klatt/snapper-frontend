import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RelatedInstrumentsRow } from './RelatedInstrumentsRow'

vi.mock('../../hooks/queries/market', () => ({
  useRelatedInstruments: vi.fn(),
}))

import { useRelatedInstruments } from '../../hooks/queries/market'

vi.mock('../../components/InstrumentIcon', () => ({
  InstrumentIcon: ({ symbol }: { symbol: string }) => <span data-testid={`icon-${symbol}`} />,
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderRow(ui: ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function makePayload(
  groups: Array<{
    relationship_type: 'exact' | 'derivative' | 'proxy'
    label: string
    items: Array<{
      instrument_public_id: string
      native_symbol: string
      exchange: string
      asset_type: string
      relationship_type: string
      contract_family: string | null
      is_selected: boolean
    }>
  }>,
  underlying: { public_id: string; ticker: string } | null = {
    public_id: 'ua-1',
    ticker: 'BTC',
  }
) {
  return {
    type: 'related_instruments' as const,
    sequence_id: 0,
    public_id: 'env-1',
    timestamp: '2026-04-21T00:00:00Z',
    session_id: 'sid',
    payload: {
      selected: { exchange: 'kraken', native_symbol: 'BTC-USD' },
      underlying:
        underlying === null
          ? null
          : {
              public_id: underlying.public_id,
              ticker: underlying.ticker,
              name: underlying.ticker,
              asset_class: 'crypto',
              sector: null,
              description: null,
            },
      groups: groups.map(g => ({
        relationship_type: g.relationship_type,
        label: g.label,
        items: g.items.map((it, idx) => ({
          type: 'related_instrument' as const,
          sequence_id: idx,
          public_id: `r-${idx}`,
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 'sid',
          ...it,
        })),
      })),
    },
  }
}

describe('RelatedInstrumentsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns nothing when no selection is set', () => {
    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useRelatedInstruments>)
    const { container } = renderRow(
      <RelatedInstrumentsRow selectedExchange={null} selectedInstrument={null} onSelect={vi.fn()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('hides while initial fetch is in flight', () => {
    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as ReturnType<typeof useRelatedInstruments>)
    const { container } = renderRow(
      <RelatedInstrumentsRow
        selectedExchange='kraken'
        selectedInstrument='BTC-USD'
        onSelect={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders orphan placeholder when underlying is null and groups empty', () => {
    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: makePayload([], null),
      isFetching: false,
    } as ReturnType<typeof useRelatedInstruments>)
    renderRow(
      <RelatedInstrumentsRow
        selectedExchange='kraken'
        selectedInstrument='UNKNOWN'
        onSelect={vi.fn()}
      />
    )
    expect(
      screen.getByText(/No related instruments configured for UNKNOWN on kraken/i)
    ).toBeInTheDocument()
  })

  it('renders one chip per item with group label and selected aria-current', () => {
    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: makePayload([
        {
          relationship_type: 'exact',
          label: 'Same underlying',
          items: [
            {
              instrument_public_id: 'inst-btc-kraken',
              native_symbol: 'BTC-USD',
              exchange: 'kraken',
              asset_type: 'crypto',
              relationship_type: 'exact',
              contract_family: null,
              is_selected: true,
            },
            {
              instrument_public_id: 'inst-btc-eur-kraken',
              native_symbol: 'BTC-EUR',
              exchange: 'kraken',
              asset_type: 'crypto',
              relationship_type: 'exact',
              contract_family: null,
              is_selected: false,
            },
          ],
        },
        {
          relationship_type: 'derivative',
          label: 'Derivatives',
          items: [
            {
              instrument_public_id: 'inst-btc-perp',
              native_symbol: 'BTC-USD-PERP',
              exchange: 'kraken_futures',
              asset_type: 'crypto',
              relationship_type: 'derivative',
              contract_family: 'BTC',
              is_selected: false,
            },
          ],
        },
      ]),
      isFetching: false,
    } as ReturnType<typeof useRelatedInstruments>)
    renderRow(
      <RelatedInstrumentsRow
        selectedExchange='kraken'
        selectedInstrument='BTC-USD'
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Same underlying:')).toBeInTheDocument()
    expect(screen.getByText('Derivatives:')).toBeInTheDocument()
    const selectedChip = screen.getByRole('button', { name: /^BTC-USD(?!-).*kraken$/i })

    expect(selectedChip).toHaveAttribute('aria-current', 'true')
    const unselectedChip = screen.getByRole('button', { name: /BTC-EUR.*kraken/i })

    expect(unselectedChip).not.toHaveAttribute('aria-current')
  })

  it('invokes onSelect with the chip exchange + symbol', () => {
    const onSelect = vi.fn()

    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: makePayload([
        {
          relationship_type: 'derivative',
          label: 'Derivatives',
          items: [
            {
              instrument_public_id: 'inst-btc-perp',
              native_symbol: 'BTC-USD-PERP',
              exchange: 'kraken_futures',
              asset_type: 'crypto',
              relationship_type: 'derivative',
              contract_family: 'BTC',
              is_selected: false,
            },
          ],
        },
      ]),
      isFetching: false,
    } as ReturnType<typeof useRelatedInstruments>)
    renderRow(
      <RelatedInstrumentsRow
        selectedExchange='kraken'
        selectedInstrument='BTC-USD'
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /BTC-USD-PERP.*kraken_futures/i }))
    expect(onSelect).toHaveBeenCalledWith({
      exchange: 'kraken_futures',
      symbol: 'BTC-USD-PERP',
    })
  })
})
