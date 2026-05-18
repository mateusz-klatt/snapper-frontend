import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstrumentDescriptionBanner } from './InstrumentDescriptionBanner'
import i18n from '../../i18n/config'
import type { RelatedInstrumentsResponse } from '../../types/api'

vi.mock('../../hooks/queries/market', () => ({
  useRelatedInstruments: vi.fn(),
}))

import { useRelatedInstruments } from '../../hooks/queries/market'

type AssetClass = 'crypto' | 'commodity' | 'forex' | 'index' | 'yield' | 'unknown'

interface UnderlyingOptions {
  readonly assetClass?: AssetClass | string
  readonly description?: string | null
  readonly name?: string
  readonly sector?: string | null
}

const makeResponse = ({
  assetClass = 'commodity',
  description = 'Return-level gold exposure through a listed trust.',
  name = 'Gold',
  sector = 'Precious Metals',
}: UnderlyingOptions = {}): RelatedInstrumentsResponse => ({
  type: 'related_instruments',
  sequence_id: 0,
  public_id: 'ri-env-1',
  timestamp: '2026-05-18T00:00:00Z',
  session_id: 'sid',
  payload: {
    selected: { exchange: 'polygon', native_symbol: 'GLD' },
    underlying: {
      public_id: 'ua-gold',
      ticker: 'GOLD',
      name,
      asset_class: assetClass,
      sector,
      description,
    },
    groups: [],
  },
})

const mockRelatedQuery = (
  options: {
    readonly data?: RelatedInstrumentsResponse
    readonly isError?: boolean
    readonly isFetching?: boolean
  } = {}
): void => {
  vi.mocked(useRelatedInstruments).mockReturnValue({
    data: options.data,
    isError: options.isError ?? false,
    isFetching: options.isFetching ?? false,
  } as ReturnType<typeof useRelatedInstruments>)
}

const renderBanner = (): ReturnType<typeof render> =>
  render(<InstrumentDescriptionBanner selectedExchange='polygon' selectedInstrument='GLD' />)

describe('InstrumentDescriptionBanner', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  it('renders description when present', () => {
    mockRelatedQuery({ data: makeResponse({ description: 'Gold exposure description.' }) })
    renderBanner()
    expect(screen.getByRole('region', { name: 'Instrument description' })).toBeInTheDocument()
    expect(screen.getByText('Gold exposure description.')).toBeInTheDocument()
  })

  it('renders fallback when description is null', () => {
    mockRelatedQuery({
      data: makeResponse({ description: null, name: 'Bitcoin', assetClass: 'crypto' }),
    })
    renderBanner()
    expect(screen.getByText('Bitcoin · Cryptocurrency')).toBeInTheDocument()
  })

  it('renders sector chip when sector present', () => {
    mockRelatedQuery({ data: makeResponse({ sector: 'Precious Metals' }) })
    renderBanner()
    expect(screen.getByText('Precious Metals')).toBeInTheDocument()
  })

  it('falls back to assetClass label when sector is null', () => {
    mockRelatedQuery({ data: makeResponse({ sector: null, assetClass: 'commodity' }) })
    renderBanner()
    expect(screen.getByText('Commodity')).toBeInTheDocument()
  })

  it('renders nothing when underlying is null (orphan)', () => {
    mockRelatedQuery({
      data: {
        ...makeResponse(),
        payload: {
          selected: { exchange: 'polygon', native_symbol: 'UNKNOWN' },
          underlying: null,
          groups: [],
        },
      },
    })
    const { container } = renderBanner()

    expect(container.firstChild).toBeNull()
  })

  it('renders skeleton while query is loading', () => {
    mockRelatedQuery({ isFetching: true })
    renderBanner()
    expect(screen.getByTestId('instrument-description-banner-skeleton')).toBeInTheDocument()
  })

  it('renders cached data instead of skeleton while query is refetching', () => {
    mockRelatedQuery({ data: makeResponse(), isFetching: true })
    renderBanner()
    expect(screen.getByTestId('instrument-description-banner')).toBeInTheDocument()
    expect(screen.queryByTestId('instrument-description-banner-skeleton')).not.toBeInTheDocument()
  })

  it('renders nothing without a selected exchange or instrument', () => {
    mockRelatedQuery({ data: makeResponse() })
    const { container } = render(
      <InstrumentDescriptionBanner selectedExchange={null} selectedInstrument={null} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only the selected instrument is missing', () => {
    mockRelatedQuery({ data: makeResponse() })
    const { container } = render(
      <InstrumentDescriptionBanner selectedExchange='polygon' selectedInstrument={null} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders fallback without chip when the query is in an error state with cached data', () => {
    mockRelatedQuery({
      data: makeResponse({
        assetClass: 'commodity',
        description: 'Stale server description.',
        name: 'Gold',
        sector: 'Precious Metals',
      }),
      isError: true,
    })
    renderBanner()
    expect(screen.getByText('Gold · Commodity')).toBeInTheDocument()
    expect(screen.queryByText('Precious Metals')).not.toBeInTheDocument()
  })

  it('normalizes an unrecognized asset_class to the unknown label and color', () => {
    mockRelatedQuery({
      data: makeResponse({
        assetClass: 'rates',
        description: null,
        name: 'Policy Rate',
        sector: null,
      }),
    })
    renderBanner()
    const chip = screen.getByText('Other')

    expect(screen.getByText('Policy Rate · Other')).toBeInTheDocument()
    expect(chip).toHaveClass('border-gray-300', 'bg-gray-50', 'text-gray-700')
  })

  it.each([
    ['crypto', 'Cryptocurrency', ['border-orange-300', 'bg-orange-50', 'text-orange-700']],
    ['commodity', 'Commodity', ['border-amber-300', 'bg-amber-50', 'text-amber-700']],
    ['forex', 'Forex', ['border-blue-300', 'bg-blue-50', 'text-blue-700']],
    ['index', 'Index', ['border-violet-300', 'bg-violet-50', 'text-violet-700']],
    ['yield', 'Yield', ['border-teal-300', 'bg-teal-50', 'text-teal-700']],
    ['unknown', 'Other', ['border-gray-300', 'bg-gray-50', 'text-gray-700']],
  ] satisfies ReadonlyArray<readonly [AssetClass, string, readonly string[]]>)(
    'for %s renders correct color and label',
    (assetClass, label, colorClasses) => {
      mockRelatedQuery({
        data: makeResponse({
          assetClass,
          description: null,
          name: 'Underlying',
          sector: null,
        }),
      })
      renderBanner()
      const chip = screen.getByText(label)

      for (const colorClass of colorClasses) {
        expect(chip).toHaveClass(colorClass)
      }
    }
  )
})
