import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PnlChart } from './PnlChart'
import type { AppLocale } from '../../i18n/types'
import { getIntlLocale } from '../../i18n/countryLanguages'
import { formatDateTime } from '../../lib/dateFormat'
import type { PnlTimelineMarkerData, PnlTimelinePointData } from '../../types/api'

const appState = vi.hoisted(() => ({
  isDarkMode: false,
  locale: 'us' as AppLocale,
}))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (state: { isDarkMode: boolean; locale: AppLocale }) => unknown) =>
    selector(appState)
  ),
}))

const setNetData = vi.fn()
const setRealizedData = vi.fn()
const setUnrealizedData = vi.fn()
const setMarkerAnchorData = vi.fn()
const setMarkers = vi.fn()
const detachMarkers = vi.fn()
const mockApplyOptions = vi.fn()
const mockTimeScaleFitContent = vi.fn()
const mockRemove = vi.fn()
const mockAddSeries = vi.fn()
const mockCreateChart = vi.fn()
const mockCreateSeriesMarkers = vi.fn()
const mockSubscribeCrosshairMove = vi.fn()
const mockUnsubscribeCrosshairMove = vi.fn()
const mockSubscribeClick = vi.fn()
const mockUnsubscribeClick = vi.fn()

const markerPlugin = {
  setMarkers,
  detach: detachMarkers,
}

const mockChart = () => ({
  addSeries: mockAddSeries,
  remove: mockRemove,
  applyOptions: mockApplyOptions,
  timeScale: () => ({ fitContent: mockTimeScaleFitContent }),
  subscribeCrosshairMove: mockSubscribeCrosshairMove,
  unsubscribeCrosshairMove: mockUnsubscribeCrosshairMove,
  subscribeClick: mockSubscribeClick,
  unsubscribeClick: mockUnsubscribeClick,
})

const configureSeriesMocks = () => {
  const setDataMocks = [setNetData, setRealizedData, setUnrealizedData, setMarkerAnchorData]

  mockAddSeries.mockImplementation(() => ({
    setData: setDataMocks[(mockAddSeries.mock.calls.length - 1) % setDataMocks.length],
  }))
}

vi.mock('lightweight-charts', () => ({
  createChart: (container: never, options: never) => mockCreateChart(container, options),
  createSeriesMarkers: (series: never, markers: never, options: never) =>
    mockCreateSeriesMarkers(series, markers, options),
  LineSeries: 'LineSeries',
}))

const point = (
  pointTime: string,
  netPnl: number | null,
  realizedPnl: number | null,
  unrealizedPnl: number | null,
  valuationStatus: 'complete' | 'incomplete' = 'complete',
  incompletenessReasons: PnlTimelinePointData['incompleteness_reasons'] = [],
  feePnl: number | null = 0,
  accrualPnl: number | null = 0
): PnlTimelinePointData => ({
  point_time: pointTime,
  realized_pnl: realizedPnl,
  fee_pnl: feePnl,
  accrual_pnl: accrualPnl,
  unrealized_pnl: unrealizedPnl,
  net_pnl: netPnl,
  valuation_status: valuationStatus,
  incompleteness_reasons: incompletenessReasons,
  per_instrument: [],
  attribution: [
    {
      origin: 'manual',
      strategy_name: null,
      realized_pnl: realizedPnl,
      fee_pnl: feePnl,
      accrual_pnl: accrualPnl,
      unrealized_pnl: unrealizedPnl,
    },
  ],
})

const fillMarker = (
  markerTime = '2026-01-01T00:01:00Z',
  price: number | null = 101.25,
  executionPublicId = 'execution-1'
): PnlTimelineMarkerData => ({
  kind: 'fill',
  marker_time: markerTime,
  instrument_public_id: 'instrument-fill',
  side: 'buy',
  size: 1.5,
  price,
  execution_public_id: executionPublicId,
  order_public_id: 'order-1',
  outcome: 'executed',
  status: 'filled',
})

const signalMarker = (
  outcome: 'executed' | 'no_fill',
  markerTime = '2026-01-01T00:02:00Z',
  side = 'buy',
  signalPublicId = `signal-${outcome}`
): PnlTimelineMarkerData => ({
  kind: 'signal',
  marker_time: markerTime,
  instrument_public_id: 'instrument-signal',
  side,
  strategy_name: outcome === 'executed' ? 'momentum' : null,
  strength: 0.75,
  reason: 'threshold crossed',
  price: outcome === 'executed' ? 102.5 : null,
  signal_public_id: signalPublicId,
  outcome,
  status: outcome,
})

const aiMarker = (
  outcome: 'executed' | 'rejected' | 'no_fill',
  markerTime = '2026-01-01T00:03:00Z',
  eventPublicId = `ai-event-${outcome}`
): PnlTimelineMarkerData => ({
  kind: 'ai_decision',
  marker_time: markerTime,
  instrument_public_id: 'instrument-ai',
  strategy_public_id: 'strategy-1',
  review_public_id: 'review-1',
  event_public_id: eventPublicId,
  decision: outcome === 'no_fill' ? null : outcome,
  rationale: outcome === 'no_fill' ? null : 'risk policy result',
  outcome,
  status: outcome === 'rejected' ? 'declined' : outcome,
})

const emitChartEvent = (
  subscription: ReturnType<typeof vi.fn>,
  event: { hoveredInfo?: { objectId?: unknown } }
): void => {
  const handler = subscription.mock.calls[0]?.[0] as ((value: never) => void) | undefined

  if (handler === undefined) throw new Error('Missing chart event subscription')
  act(() => handler(event as never))
}

beforeEach(() => {
  vi.clearAllMocks()
  appState.isDarkMode = false
  appState.locale = 'us'
  setNetData.mockReset()
  setRealizedData.mockReset()
  setUnrealizedData.mockReset()
  setMarkerAnchorData.mockReset()
  setMarkers.mockReset()
  detachMarkers.mockReset()
  configureSeriesMocks()
  mockCreateChart.mockReturnValue(mockChart())
  mockCreateSeriesMarkers.mockReturnValue(markerPlugin)
})

describe('PnlChart', () => {
  it('creates three P&L lines plus an invisible marker anchor and renders the legend', () => {
    const { getByText, getByTestId } = render(
      <PnlChart points={[]} valuationCcy='USD' height={240} className='custom-chart' />
    )

    expect(mockAddSeries).toHaveBeenCalledTimes(4)
    expect(mockAddSeries.mock.calls[0]?.[0]).toBe('LineSeries')
    expect(mockAddSeries.mock.calls[0]?.[1]).toMatchObject({ color: '#3b82f6', lineWidth: 2 })
    expect(mockAddSeries.mock.calls[1]?.[1]).toMatchObject({ color: '#22c55e', lineWidth: 2 })
    expect(mockAddSeries.mock.calls[2]?.[1]).toMatchObject({ color: '#f97316', lineWidth: 2 })
    expect(mockAddSeries.mock.calls[3]?.[1]).toEqual({
      color: 'transparent',
      lineVisible: false,
      pointMarkersVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    expect(mockCreateSeriesMarkers).toHaveBeenCalledWith(mockAddSeries.mock.results[3]?.value, [], {
      autoScale: true,
      zOrder: 'top',
    })
    expect(getByText('P&L over time')).toBeInTheDocument()
    expect(getByText('Net P&L')).toBeInTheDocument()
    expect(getByText('Realized P&L')).toBeInTheDocument()
    expect(getByText('Unrealized P&L')).toBeInTheDocument()
    expect(getByText('Valuation currency: USD')).toBeInTheDocument()
    expect(getByTestId('pnl-chart')).toHaveClass('custom-chart')
    expect(getByTestId('pnl-chart').querySelector('[style="height: 240px;"]')).toBeInTheDocument()
  })

  it('gaps only withheld components and plots realized P&L at a MARK-incomplete point', () => {
    const points = [
      point('2026-01-01T00:00:00Z', 10, 5, 3),
      point('2026-01-01T00:01:00Z', null, 8, null, 'incomplete', [
        {
          reason: 'mark_unavailable',
          withholding_tier: 'mark_incomplete',
          withholding_scope: 'instrument',
          trigger_instrument_public_id: 'instrument-mark',
        },
      ]),
      point(
        '2026-01-01T00:02:00Z',
        null,
        null,
        null,
        'incomplete',
        [
          {
            reason: 'cumulative_non_finite',
            withholding_tier: 'untrusted',
            withholding_scope: 'instrument',
            trigger_instrument_public_id: 'instrument-untrusted',
          },
        ],
        null,
        null
      ),
    ]

    render(<PnlChart points={points} markers={[fillMarker()]} valuationCcy='USD' />)

    const firstTime = 1_767_225_600
    const secondTime = 1_767_225_660
    const thirdTime = 1_767_225_720

    expect(setNetData).toHaveBeenCalledWith([
      { time: firstTime, value: 10 },
      { time: secondTime },
      { time: thirdTime },
    ])
    expect(setRealizedData).toHaveBeenCalledWith([
      { time: firstTime, value: 5 },
      { time: secondTime, value: 8 },
      { time: thirdTime },
    ])
    expect(setUnrealizedData).toHaveBeenCalledWith([
      { time: firstTime, value: 3 },
      { time: secondTime },
      { time: thirdTime },
    ])

    expect(setMarkerAnchorData).toHaveBeenCalledWith([{ time: secondTime, value: 10 }])
    expect(setMarkers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'fill:execution-1:0',
        time: secondTime,
        color: '#16a34a',
        position: 'belowBar',
        shape: 'square',
      }),
    ])
    expect(mockTimeScaleFitContent).toHaveBeenCalledTimes(2)
  })

  it('uses a zero anchor without replacing all-whitespace P&L datasets', () => {
    const points = [
      point(
        '2026-01-01T00:01:00Z',
        null,
        null,
        null,
        'incomplete',
        [
          {
            reason: 'cumulative_non_finite',
            withholding_tier: 'untrusted',
            withholding_scope: 'instrument',
            trigger_instrument_public_id: 'instrument-untrusted',
          },
        ],
        null,
        null
      ),
    ]

    render(
      <PnlChart
        points={points}
        markers={[signalMarker('no_fill', '2026-01-01T00:01:00Z')]}
        valuationCcy='USD'
      />
    )

    expect(setNetData).toHaveBeenCalledWith([{ time: 1_767_225_660 }])
    expect(setRealizedData).toHaveBeenCalledWith([{ time: 1_767_225_660 }])
    expect(setUnrealizedData).toHaveBeenCalledWith([{ time: 1_767_225_660 }])
    expect(setMarkerAnchorData).toHaveBeenCalledWith([{ time: 1_767_225_660, value: 0 }])
  })

  it('anchors each unique marker time to the nearest prior trustworthy net value', () => {
    const points = [
      point('2026-01-01T00:00:00Z', 10, 5, 5),
      point('2026-01-01T00:02:00Z', 30, 15, 15),
    ]
    const markers = [
      fillMarker('2025-12-31T23:59:00Z'),
      signalMarker('executed', '2026-01-01T00:01:00Z'),
      aiMarker('rejected', '2026-01-01T00:01:00Z'),
      aiMarker('executed', '2026-01-01T00:03:00Z'),
    ]

    render(<PnlChart points={points} markers={markers} valuationCcy='USD' />)

    expect(setMarkerAnchorData).toHaveBeenCalledWith([
      { time: 1_767_225_540, value: 10 },
      { time: 1_767_225_660, value: 10 },
      { time: 1_767_225_780, value: 30 },
    ])
  })

  it('sorts source-prefixed markers and distinguishes every kind and outcome', () => {
    const markers = [
      aiMarker('executed', '2026-01-01T00:07:00Z'),
      fillMarker('2026-01-01T00:01:00Z'),
      signalMarker('no_fill', '2026-01-01T00:02:00Z'),
      signalMarker('executed', '2026-01-01T00:03:00Z', 'sell', 'signal-sell'),
      signalMarker('executed', '2026-01-01T00:04:00Z', 'buy', 'signal-buy'),
      aiMarker('rejected', '2026-01-01T00:05:00Z'),
      aiMarker('no_fill', '2026-01-01T00:06:00Z'),
    ]

    render(<PnlChart points={[]} markers={markers} valuationCcy='USD' />)

    expect(setMarkers).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'fill:execution-1:1', color: '#16a34a', shape: 'square' }),
      expect.objectContaining({
        id: 'signal:signal-no_fill:2',
        color: '#64748b',
        shape: 'circle',
      }),
      expect.objectContaining({
        id: 'signal:signal-sell:3',
        color: '#2563eb',
        position: 'aboveBar',
        shape: 'arrowDown',
      }),
      expect.objectContaining({
        id: 'signal:signal-buy:4',
        color: '#2563eb',
        position: 'belowBar',
        shape: 'arrowUp',
      }),
      expect.objectContaining({
        id: 'ai_decision:ai-event-rejected:5',
        color: '#dc2626',
        shape: 'square',
      }),
      expect.objectContaining({
        id: 'ai_decision:ai-event-no_fill:6',
        color: '#d97706',
        shape: 'circle',
      }),
      expect.objectContaining({
        id: 'ai_decision:ai-event-executed:0',
        color: '#9333ea',
        shape: 'arrowUp',
      }),
    ])
    expect(mockTimeScaleFitContent).toHaveBeenCalledTimes(1)
  })

  it('selects typed fill, signal, and AI details from hover and click object IDs', () => {
    appState.locale = 'pl'
    const fill = fillMarker()
    const markers = [
      fill,
      signalMarker('executed'),
      signalMarker('no_fill', '2026-01-01T00:02:30Z', 'buy', 'signal-empty'),
      aiMarker('rejected'),
      aiMarker('no_fill', '2026-01-01T00:04:00Z', 'ai-event-empty'),
    ]

    render(<PnlChart points={[]} markers={markers} valuationCcy='USD' />)
    expect(screen.queryByTestId('pnl-marker-detail')).not.toBeInTheDocument()

    emitChartEvent(mockSubscribeCrosshairMove, {
      hoveredInfo: { objectId: 'fill:execution-1:0' },
    })
    let detail = screen.getByTestId('pnl-marker-detail')

    expect(within(detail).getByText('Fill')).toBeInTheDocument()
    expect(within(detail).getByText('Executed')).toBeInTheDocument()
    expect(
      within(detail).getByText(formatDateTime(new Date(fill.marker_time), 'pl'))
    ).toBeInTheDocument()
    expect(within(detail).getByText('execution-1')).toBeInTheDocument()
    expect(within(detail).getByText('order-1')).toBeInTheDocument()
    expect(
      within(detail).getByText(
        new Intl.NumberFormat(getIntlLocale('pl'), { maximumFractionDigits: 8 }).format(1.5)
      )
    ).toBeInTheDocument()
    expect(
      within(detail).getByText(
        new Intl.NumberFormat(getIntlLocale('pl'), { maximumFractionDigits: 8 }).format(101.25)
      )
    ).toBeInTheDocument()

    emitChartEvent(mockSubscribeClick, {
      hoveredInfo: { objectId: 'signal:signal-executed:1' },
    })
    detail = screen.getByTestId('pnl-marker-detail')
    expect(within(detail).getByText('Signal')).toBeInTheDocument()
    expect(within(detail).getByText('momentum')).toBeInTheDocument()
    expect(
      within(detail).getByText(
        new Intl.NumberFormat(getIntlLocale('pl'), { maximumFractionDigits: 8 }).format(102.5)
      )
    ).toBeInTheDocument()
    expect(within(detail).getByText('signal-executed')).toBeInTheDocument()

    emitChartEvent(mockSubscribeCrosshairMove, {
      hoveredInfo: { objectId: 'signal:signal-empty:2' },
    })
    detail = screen.getByTestId('pnl-marker-detail')
    expect(within(detail).getByText('No fill')).toBeInTheDocument()
    expect(within(detail).getAllByText('—')).toHaveLength(2)

    emitChartEvent(mockSubscribeClick, {
      hoveredInfo: { objectId: 'ai_decision:ai-event-rejected:3' },
    })
    detail = screen.getByTestId('pnl-marker-detail')
    expect(within(detail).getByText('AI decision')).toBeInTheDocument()
    expect(within(detail).getByText('Rejected')).toBeInTheDocument()
    expect(within(detail).getByText('declined')).toBeInTheDocument()
    expect(within(detail).getByText('risk policy result')).toBeInTheDocument()

    emitChartEvent(mockSubscribeClick, { hoveredInfo: { objectId: 99 } })
    expect(screen.getByTestId('pnl-marker-detail')).toHaveTextContent('ai-event-rejected')

    emitChartEvent(mockSubscribeCrosshairMove, {
      hoveredInfo: { objectId: 'ai_decision:ai-event-empty:4' },
    })
    detail = screen.getByTestId('pnl-marker-detail')
    expect(within(detail).getByText('ai-event-empty')).toBeInTheDocument()
    expect(within(detail).getAllByText('—')).toHaveLength(2)

    emitChartEvent(mockSubscribeCrosshairMove, { hoveredInfo: { objectId: 'missing-marker' } })
    emitChartEvent(mockSubscribeCrosshairMove, { hoveredInfo: { objectId: null } })
    expect(screen.getByTestId('pnl-marker-detail')).toHaveTextContent('ai-event-empty')
  })

  it('renders proven and withheld fill prices distinctly', () => {
    const pricedFill = fillMarker('2026-01-01T00:01:00Z', 101.25, 'execution-priced')
    const withheldFill = fillMarker('2026-01-01T00:02:00Z', null, 'execution-withheld')

    render(<PnlChart points={[]} markers={[pricedFill, withheldFill]} valuationCcy='USD' />)

    emitChartEvent(mockSubscribeClick, {
      hoveredInfo: { objectId: 'fill:execution-priced:0' },
    })
    let detail = screen.getByTestId('pnl-marker-detail')

    expect(within(detail).getByText('101.25')).toBeInTheDocument()

    emitChartEvent(mockSubscribeClick, {
      hoveredInfo: { objectId: 'fill:execution-withheld:1' },
    })
    detail = screen.getByTestId('pnl-marker-detail')

    expect(within(detail).getByText('—')).toBeInTheDocument()
    expect(within(detail).getByText('execution-withheld')).toBeInTheDocument()
  })

  it('clears marker data and selected detail when overlays are hidden', () => {
    const marker = fillMarker()
    const { rerender } = render(
      <PnlChart points={[]} markers={[marker]} showMarkers valuationCcy='USD' />
    )

    emitChartEvent(mockSubscribeClick, {
      hoveredInfo: { objectId: 'fill:execution-1:0' },
    })
    expect(screen.getByTestId('pnl-marker-detail')).toBeInTheDocument()

    rerender(<PnlChart points={[]} markers={[marker]} showMarkers={false} valuationCcy='USD' />)

    expect(setMarkers).toHaveBeenLastCalledWith([])
    expect(setMarkerAnchorData).toHaveBeenLastCalledWith([])
    expect(screen.queryByTestId('pnl-marker-detail')).not.toBeInTheDocument()
  })

  it('skips fitContent when neither points nor markers are available', () => {
    render(<PnlChart points={[]} valuationCcy='USD' />)

    expect(setNetData).toHaveBeenCalledWith([])
    expect(setRealizedData).toHaveBeenCalledWith([])
    expect(setUnrealizedData).toHaveBeenCalledWith([])
    expect(setMarkerAnchorData).toHaveBeenCalledWith([])
    expect(setMarkers).toHaveBeenCalledWith([])
    expect(mockTimeScaleFitContent).not.toHaveBeenCalled()
  })

  it('resizes, unsubscribes, detaches markers, and removes the chart', () => {
    const { unmount } = render(<PnlChart points={[]} valuationCcy='USD' />)

    mockApplyOptions.mockClear()
    globalThis.dispatchEvent(new Event('resize'))
    expect(mockApplyOptions).toHaveBeenCalledWith({ width: 0 })

    const crosshairHandler = mockSubscribeCrosshairMove.mock.calls[0]?.[0]
    const clickHandler = mockSubscribeClick.mock.calls[0]?.[0]

    unmount()
    expect(mockUnsubscribeCrosshairMove).toHaveBeenCalledWith(crosshairHandler)
    expect(mockUnsubscribeClick).toHaveBeenCalledWith(clickHandler)
    expect(detachMarkers).toHaveBeenCalledTimes(1)
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  it('repopulates series and markers after a height-driven chart recreation', () => {
    const points = [point('2026-01-01T00:01:00Z', 20, 8, 12)]
    const markers = [fillMarker()]
    const { rerender } = render(
      <PnlChart points={points} markers={markers} valuationCcy='USD' height={240} />
    )

    setNetData.mockClear()
    setRealizedData.mockClear()
    setUnrealizedData.mockClear()
    setMarkerAnchorData.mockClear()
    setMarkers.mockClear()

    rerender(<PnlChart points={points} markers={markers} valuationCcy='USD' height={420} />)

    expect(mockCreateChart).toHaveBeenCalledTimes(2)
    expect(mockCreateChart.mock.calls[1]?.[1]).toMatchObject({ height: 420 })
    expect(setNetData).toHaveBeenCalledWith([{ time: 1_767_225_660, value: 20 }])
    expect(setRealizedData).toHaveBeenCalledWith([{ time: 1_767_225_660, value: 8 }])
    expect(setUnrealizedData).toHaveBeenCalledWith([{ time: 1_767_225_660, value: 12 }])
    expect(setMarkerAnchorData).toHaveBeenCalledWith([{ time: 1_767_225_660, value: 20 }])
    expect(setMarkers).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'fill:execution-1:0', time: 1_767_225_660 }),
    ])
  })

  it('applies the dark theme', () => {
    appState.isDarkMode = true
    render(<PnlChart points={[]} valuationCcy='USD' />)

    expect(mockApplyOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ background: { color: '#181a1e' } }),
      })
    )
  })

  it('skips chart setup when the container ref is unavailable', async () => {
    vi.resetModules()
    const React = await import('react')
    const originalUseRef = React.useRef
    let callCount = 0

    vi.doMock('react', async () => ({
      ...React,
      useRef: ((initialValue: unknown) => {
        callCount += 1
        const ref = originalUseRef(initialValue)

        if (callCount === 1) {
          Object.defineProperty(ref, 'current', {
            get: () => null,
            set: () => {},
            configurable: true,
          })
        }

        return ref
      }) as typeof React.useRef,
    }))
    const { PnlChart: MockedPnlChart } = await import('./PnlChart')

    mockCreateChart.mockClear()
    render(<MockedPnlChart points={[]} valuationCcy='USD' />)
    expect(mockCreateChart).not.toHaveBeenCalled()
    vi.doUnmock('react')
    vi.resetModules()
  })

  it('skips resize when the chart ref is unavailable', async () => {
    vi.resetModules()
    const React = await import('react')
    const containerRef = { current: document.createElement('div') }
    const chartRef = { current: null as unknown }
    const netSeriesRef = { current: null as unknown }
    const realizedSeriesRef = { current: null as unknown }
    const unrealizedSeriesRef = { current: null as unknown }
    const markerAnchorSeriesRef = { current: null as unknown }
    const markerPluginRef = { current: null as unknown }
    const markerByIdRef = { current: new Map() }
    const refs = [
      containerRef,
      chartRef,
      netSeriesRef,
      realizedSeriesRef,
      unrealizedSeriesRef,
      markerAnchorSeriesRef,
      markerPluginRef,
      markerByIdRef,
    ]
    let callCount = 0

    vi.doMock('react', async () => ({
      ...React,
      useRef: ((initialValue: unknown) => {
        const ref = refs[callCount]

        callCount += 1

        return ref ?? React.useRef(initialValue)
      }) as typeof React.useRef,
    }))
    const { PnlChart: MockedPnlChart } = await import('./PnlChart')

    render(<MockedPnlChart points={[]} valuationCcy='USD' />)
    mockApplyOptions.mockClear()
    chartRef.current = null
    globalThis.dispatchEvent(new Event('resize'))
    expect(mockApplyOptions).not.toHaveBeenCalled()
    vi.doUnmock('react')
    vi.resetModules()
  })
})
