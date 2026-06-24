import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import { PairStatsRow } from './PairStatsRow'
import type { CachedStatsPayload, ListedCachedStatsResponse } from '../../types/api'

vi.mock('../../hooks/queries/market', () => ({
  useAllConfiguredPairStats: vi.fn(),
}))

const mockHook = vi.mocked((await import('../../hooks/queries/market')).useAllConfiguredPairStats)

const buildPair = (overrides: Partial<CachedStatsPayload> = {}): CachedStatsPayload => ({
  left: 'kraken:BTC-USD',
  right: 'kraken:ETH-USD',
  pearson_r: 0.91,
  pearson_n: 96,
  coint_t: -3.91,
  coint_pvalue: 0.032,
  coint_critical_values: [-3.9, -3.3, -3],
  computed_at: '2026-05-18T10:00:00Z',
  sample_count: 96,
  is_warm: true,
  ...overrides,
})

const buildResponse = (pairs: readonly CachedStatsPayload[]): ListedCachedStatsResponse => ({
  type: 'listed_cached_stats',
  session_id: 'test-sid',
  sequence_id: 0,
  public_id: 'lcs-1',
  timestamp: '2026-05-18T10:00:00Z',
  topic: null,
  payload: { count: pairs.length, pairs: [...pairs] },
})

const renderRow = (props: {
  selectedExchange: string | null
  selectedInstrument: string | null
  onSelect?: (s: { exchange: string; symbol: string }) => void
}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <PairStatsRow
        selectedExchange={props.selectedExchange}
        selectedInstrument={props.selectedInstrument}
        onSelect={props.onSelect ?? vi.fn()}
      />
    </I18nextProvider>
  )

describe('PairStatsRow', () => {
  it('renders nothing when no instrument selected', () => {
    mockHook.mockReturnValue({ data: undefined } as never)
    const { container } = renderRow({ selectedExchange: null, selectedInstrument: null })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when data is undefined', () => {
    mockHook.mockReturnValue({ data: undefined } as never)
    const { container } = renderRow({
      selectedExchange: 'kraken',
      selectedInstrument: 'BTC-USD',
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no configured pair contains the selected instrument', () => {
    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ left: 'kraken:XYZ-USD', right: 'kraken:ABC-USD' })]),
    } as never)
    const { container } = renderRow({
      selectedExchange: 'kraken',
      selectedInstrument: 'BTC-USD',
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a chip for each pair containing the selected instrument', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({ left: 'kraken:BTC-USD', right: 'kraken:ETH-USD', pearson_r: 0.91 }),
        buildPair({ left: 'kraken:SOL-USD', right: 'kraken:BTC-USD', pearson_r: -0.45 }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    expect(screen.getByText('ETH-USD')).toBeTruthy()
    expect(screen.getByText('SOL-USD')).toBeTruthy()
  })

  it('skips pairs with malformed keys missing the colon separator', () => {
    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ left: 'kraken:BTC-USD', right: 'malformed' })]),
    } as never)
    const { container } = renderRow({
      selectedExchange: 'kraken',
      selectedInstrument: 'BTC-USD',
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('calls onSelect with the other leg when a chip is clicked', () => {
    const onSelect = vi.fn()

    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ left: 'kraken:BTC-USD', right: 'kraken:ETH-USD' })]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD', onSelect })

    fireEvent.click(screen.getByText('ETH-USD'))

    expect(onSelect).toHaveBeenCalledWith({ exchange: 'kraken', symbol: 'ETH-USD' })
  })

  it('switches to the left leg when selected instrument is the right leg', () => {
    const onSelect = vi.fn()

    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ left: 'kraken:ETH-USD', right: 'kraken:BTC-USD' })]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD', onSelect })

    fireEvent.click(screen.getByText('ETH-USD'))

    expect(onSelect).toHaveBeenCalledWith({ exchange: 'kraken', symbol: 'ETH-USD' })
  })

  it('formats negative Pearson with minus and 2 decimals', () => {
    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ pearson_r: -0.456 })]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    expect(screen.getByText(/−0\.46/)).toBeTruthy()
  })

  it('shows em-dash for null Pearson and p-value', () => {
    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ pearson_r: null, coint_pvalue: null, is_warm: false })]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0)
  })

  it('renders <0.001 for p-values below thousandths', () => {
    mockHook.mockReturnValue({
      data: buildResponse([buildPair({ coint_pvalue: 0.0001 })]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    expect(screen.getByText(/<0\.001/)).toBeTruthy()
  })

  it('sorts cointegrated pairs (lowest p-value first), ties broken by abs(rho)', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:A',
          coint_pvalue: 0.02,
          pearson_r: 0.5,
        }),
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:B',
          coint_pvalue: 0.01,
          pearson_r: 0.6,
        }),
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:C',
          coint_pvalue: 0.01,
          pearson_r: -0.8,
        }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    const buttons = screen.getAllByRole('button')

    expect(buttons[0]?.textContent).toContain('C')
    expect(buttons[1]?.textContent).toContain('B')
    expect(buttons[2]?.textContent).toContain('A')
  })

  it('sorts pairs with null coint_pvalue to the end (treated as infinity)', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:NULL_P',
          coint_pvalue: null,
          pearson_r: 0.99,
        }),
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:LOW_P',
          coint_pvalue: 0.01,
          pearson_r: 0.5,
        }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    const buttons = screen.getAllByRole('button')

    expect(buttons[0]?.textContent).toContain('LOW_P')
    expect(buttons[1]?.textContent).toContain('NULL_P')
  })

  it('breaks tie by abs(pearson_r) when both Pearson values are present', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:LOWER',
          coint_pvalue: 0.01,
          pearson_r: 0.3,
        }),
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:HIGHER',
          coint_pvalue: 0.01,
          pearson_r: -0.8,
        }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    const buttons = screen.getAllByRole('button')

    expect(buttons[0]?.textContent).toContain('HIGHER')
    expect(buttons[1]?.textContent).toContain('LOWER')
  })

  it('breaks tie by abs(pearson_r) with null pearson_r treated as 0', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:NULL_R',
          coint_pvalue: null,
          pearson_r: null,
        }),
        buildPair({
          left: 'kraken:BTC-USD',
          right: 'kraken:HIGH_R',
          coint_pvalue: null,
          pearson_r: 0.7,
        }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    const buttons = screen.getAllByRole('button')

    expect(buttons[0]?.textContent).toContain('HIGH_R')
    expect(buttons[1]?.textContent).toContain('NULL_R')
  })

  it('renders the cointegrated check mark only when p < 0.05', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({ left: 'kraken:BTC-USD', right: 'kraken:WARM', coint_pvalue: 0.5 }),
        buildPair({ left: 'kraken:BTC-USD', right: 'kraken:COINT', coint_pvalue: 0.01 }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    expect(screen.getAllByText('✓')).toHaveLength(1)
  })

  it('renders a dimmed chip for not-warm placeholder pairs', () => {
    mockHook.mockReturnValue({
      data: buildResponse([
        buildPair({
          pearson_r: null,
          coint_pvalue: null,
          is_warm: false,
        }),
      ]),
    } as never)
    renderRow({ selectedExchange: 'kraken', selectedInstrument: 'BTC-USD' })

    const chip = screen.getByText('ETH-USD').closest('button')

    expect(chip?.className).toContain('opacity-60')
  })
})
