import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { PnlChart } from './PnlChart'
import type { Components } from '../../types/api'

type PnlTimelinePoint = Components['schemas']['PnlTimelinePointData']

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (state: { isDarkMode: boolean }) => boolean) =>
    selector({ isDarkMode: false })
  ),
}))

const setNetData = vi.fn()
const setRealizedData = vi.fn()
const setUnrealizedData = vi.fn()
const mockApplyOptions = vi.fn()
const mockTimeScaleFitContent = vi.fn()
const mockRemove = vi.fn()
const mockAddSeries = vi.fn()
const mockCreateChart = vi.fn()

const mockChart = () => ({
  addSeries: mockAddSeries,
  remove: mockRemove,
  applyOptions: mockApplyOptions,
  timeScale: () => ({ fitContent: mockTimeScaleFitContent }),
})

const configureSeriesMocks = () => {
  const setDataMocks = [setNetData, setRealizedData, setUnrealizedData]

  mockAddSeries.mockImplementation(() => ({
    setData: setDataMocks[(mockAddSeries.mock.calls.length - 1) % setDataMocks.length],
  }))
}

vi.mock('lightweight-charts', () => ({
  createChart: (container: never, options: never) => mockCreateChart(container, options),
  LineSeries: 'LineSeries',
}))

const point = (
  pointTime: string,
  netPnl: number | null,
  realizedPnl: number | null,
  unrealizedPnl: number | null,
  valuationStatus: 'complete' | 'incomplete' = 'complete'
): PnlTimelinePoint => ({
  point_time: pointTime,
  realized_pnl: realizedPnl,
  fee_pnl: 0,
  accrual_pnl: 0,
  unrealized_pnl: unrealizedPnl,
  net_pnl: netPnl,
  valuation_status: valuationStatus,
  per_instrument: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  setNetData.mockReset()
  setRealizedData.mockReset()
  setUnrealizedData.mockReset()
  configureSeriesMocks()
  mockCreateChart.mockReturnValue(mockChart())
})

describe('PnlChart', () => {
  it('creates three line series and renders the currency-aware legend', () => {
    const { getByText, getByTestId } = render(
      <PnlChart points={[]} valuationCcy='USD' height={240} className='custom-chart' />
    )

    expect(mockAddSeries).toHaveBeenCalledTimes(3)
    expect(mockAddSeries.mock.calls[0]?.[0]).toBe('LineSeries')
    expect(mockAddSeries.mock.calls[0]?.[1]).toMatchObject({ color: '#3b82f6', lineWidth: 2 })
    expect(mockAddSeries.mock.calls[1]?.[0]).toBe('LineSeries')
    expect(mockAddSeries.mock.calls[1]?.[1]).toMatchObject({ color: '#22c55e', lineWidth: 2 })
    expect(mockAddSeries.mock.calls[2]?.[0]).toBe('LineSeries')
    expect(mockAddSeries.mock.calls[2]?.[1]).toMatchObject({ color: '#f97316', lineWidth: 2 })
    expect(getByText('P&L over time')).toBeInTheDocument()
    expect(getByText('Net P&L')).toBeInTheDocument()
    expect(getByText('Realized P&L')).toBeInTheDocument()
    expect(getByText('Unrealized P&L')).toBeInTheDocument()
    expect(getByText('Valuation currency: USD')).toBeInTheDocument()
    expect(getByTestId('pnl-chart')).toHaveClass('custom-chart')
    expect(getByTestId('pnl-chart').querySelector('[style="height: 240px;"]')).toBeInTheDocument()
  })

  it('preserves null and incomplete values as whitespace entries in every series', () => {
    const points = [
      point('2026-01-01T00:00:00Z', 10, null, 3),
      point('2026-01-01T00:01:00Z', 20, 8, 12, 'incomplete'),
      point('2026-01-01T00:02:00Z', null, 0, null),
    ]

    render(<PnlChart points={points} valuationCcy='USD' />)

    const firstTime = 1_767_225_600
    const secondTime = 1_767_225_660
    const thirdTime = 1_767_225_720

    expect(setNetData).toHaveBeenCalledWith([
      { time: firstTime, value: 10 },
      { time: secondTime },
      { time: thirdTime },
    ])
    expect(setRealizedData).toHaveBeenCalledWith([
      { time: firstTime },
      { time: secondTime },
      { time: thirdTime, value: 0 },
    ])
    expect(setUnrealizedData).toHaveBeenCalledWith([
      { time: firstTime, value: 3 },
      { time: secondTime },
      { time: thirdTime },
    ])

    for (const setData of [setNetData, setRealizedData, setUnrealizedData]) {
      const incompleteEntry = setData.mock.calls[0]?.[0][1]

      expect(incompleteEntry).toEqual({ time: secondTime })
      expect(incompleteEntry).not.toHaveProperty('value')
    }

    expect(mockTimeScaleFitContent).toHaveBeenCalledTimes(1)
  })

  it('skips fitContent when no points are available', () => {
    render(<PnlChart points={[]} valuationCcy='USD' />)

    expect(setNetData).toHaveBeenCalledWith([])
    expect(setRealizedData).toHaveBeenCalledWith([])
    expect(setUnrealizedData).toHaveBeenCalledWith([])
    expect(mockTimeScaleFitContent).not.toHaveBeenCalled()
  })

  it('resizes and removes the chart', () => {
    const { unmount } = render(<PnlChart points={[]} valuationCcy='USD' />)

    mockApplyOptions.mockClear()
    globalThis.dispatchEvent(new Event('resize'))
    expect(mockApplyOptions).toHaveBeenCalledWith({ width: 0 })

    unmount()
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  it('applies the dark theme', async () => {
    const appStore = await import('../../stores/app')

    vi.mocked(appStore.useAppStore).mockImplementation(((
      selector: (state: { isDarkMode: boolean }) => boolean
    ) => selector({ isDarkMode: true })) as never)
    render(<PnlChart points={[]} valuationCcy='USD' />)

    expect(mockApplyOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ background: { color: '#181a1e' } }),
      })
    )
    vi.mocked(appStore.useAppStore).mockImplementation(((
      selector: (state: { isDarkMode: boolean }) => boolean
    ) => selector({ isDarkMode: false })) as never)
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
    let callCount = 0

    vi.doMock('react', async () => ({
      ...React,
      useRef: ((initialValue: unknown) => {
        callCount += 1
        if (callCount === 1) return containerRef
        if (callCount === 2) return chartRef
        if (callCount === 3) return netSeriesRef
        if (callCount === 4) return realizedSeriesRef
        if (callCount === 5) return unrealizedSeriesRef

        return React.useRef(initialValue)
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
