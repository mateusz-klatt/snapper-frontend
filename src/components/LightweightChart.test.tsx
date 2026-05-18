import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { LightweightChart } from './LightweightChart'
import { useAppStore } from '../stores/app'

vi.mock('../stores/app', () => ({
  useAppStore: vi.fn(
    (
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: 'auto' | 'rising-red' | 'rising-green'
        locale: 'us' | 'cn' | 'pl'
      }) => unknown
    ) => selector({ isDarkMode: false, financialColorPreference: 'auto', locale: 'us' })
  ),
}))

const mockSetData = vi.fn()
const mockApplyOptions = vi.fn()
const mockSeriesApplyOptions = vi.fn()
const mockAddSeries = vi
  .fn()
  .mockReturnValue({ setData: mockSetData, applyOptions: mockSeriesApplyOptions })
const mockRemove = vi.fn()
const mockTimeScaleFitContent = vi.fn()
const mockCreateChart = vi.fn().mockReturnValue({
  addSeries: mockAddSeries,
  remove: mockRemove,
  timeScale: () => ({ fitContent: mockTimeScaleFitContent }),
  applyOptions: mockApplyOptions,
})

vi.mock('lightweight-charts', () => ({
  createChart: (container: never, options: never) => mockCreateChart(container, options),
  CandlestickSeries: 'CandlestickSeries',
}))
describe('LightweightChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetData.mockImplementation(() => {})
  })
  const sampleData = [
    { time: '2024-01-01' as never, open: 100, high: 110, low: 95, close: 105 },
    { time: '2024-01-02' as never, open: 105, high: 115, low: 100, close: 110 },
  ]

  it('renders chart container', () => {
    const { container } = render(<LightweightChart data={sampleData} />)
    const chartDiv = container.querySelector('div')

    expect(chartDiv).toBeInTheDocument()
  })
  it('creates chart with default height', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        height: 400,
      })
    )
  })
  it('creates chart with custom height', () => {
    render(<LightweightChart data={sampleData} height={600} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        height: 600,
      })
    )
  })
  it('creates chart with custom width', () => {
    render(<LightweightChart data={sampleData} width={800} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        width: 800,
      })
    )
  })
  it('creates chart with alpine theme', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        layout: expect.objectContaining({
          background: { color: '#fdf8f0' },
          textColor: '#6f695f',
        }),
      })
    )
  })
  it('adds candlestick series', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockAddSeries).toHaveBeenCalledWith(
      'CandlestickSeries',
      expect.objectContaining({
        upColor: '#0b8f4d',
        downColor: '#8b1025',
      })
    )
  })
  it('sets data on series', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockSetData).toHaveBeenCalledWith(sampleData)
  })
  it('applies custom className', () => {
    const { container } = render(<LightweightChart data={sampleData} className='custom-chart' />)
    const wrapper = container.firstChild as HTMLElement

    expect(wrapper).toHaveClass('custom-chart')
  })
  it('handles empty data', () => {
    const { container } = render(<LightweightChart data={[]} />)

    expect(container.firstChild).toBeInTheDocument()
  })
  it('cleans up chart on unmount', () => {
    const { unmount } = render(<LightweightChart data={sampleData} />)

    unmount()
    expect(mockRemove).toHaveBeenCalled()
  })
  it('updates data when prop changes', () => {
    const { rerender } = render(<LightweightChart data={sampleData} />)
    const newData = [{ time: '2024-01-03' as never, open: 110, high: 120, low: 105, close: 115 }]

    rerender(<LightweightChart data={newData} />)
    expect(mockSetData).toHaveBeenCalledTimes(2)
    expect(mockSetData).toHaveBeenLastCalledWith(newData)
  })
  it('configures grid colors', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        grid: expect.objectContaining({
          vertLines: { color: '#ece8df' },
          horzLines: { color: '#ece8df' },
        }),
      })
    )
  })
  it('configures time scale with time visible', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        timeScale: expect.objectContaining({
          timeVisible: true,
          secondsVisible: false,
        }),
      })
    )
  })
  it('configures crosshair mode', () => {
    render(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        crosshair: expect.objectContaining({
          mode: 1,
        }),
      })
    )
  })
  it('handles error when setting data and recovers', () => {
    let callCount = 0

    mockSetData.mockImplementation(() => {
      callCount++

      if (callCount === 1) {
        throw new Error('Chart error')
      }
    })
    expect(() => render(<LightweightChart data={sampleData} />)).not.toThrow()
  })
  it('handles error during recovery setData', () => {
    mockSetData.mockImplementation(() => {
      throw new Error('Chart error')
    })
    expect(() => render(<LightweightChart data={sampleData} />)).not.toThrow()
  })
  it('filters duplicate timestamps', () => {
    const dataWithDuplicates = [
      { time: '2024-01-01' as never, open: 100, high: 110, low: 95, close: 105 },
      { time: '2024-01-01' as never, open: 102, high: 112, low: 98, close: 108 },
      { time: '2024-01-02' as never, open: 108, high: 118, low: 103, close: 113 },
    ]

    render(<LightweightChart data={dataWithDuplicates} />)
    expect(mockSetData).toHaveBeenCalledWith([
      { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
      { time: '2024-01-02', open: 108, high: 118, low: 103, close: 113 },
    ])
  })
  it('handles resize event', () => {
    const { container } = render(<LightweightChart data={sampleData} />)

    globalThis.dispatchEvent(new Event('resize'))
    expect(mockApplyOptions).toHaveBeenCalled()
    expect(container.firstChild).toBeInTheDocument()
  })
  it('skips resize when chart ref is missing', async () => {
    vi.resetModules()
    const React = await import('react')
    const containerRef = { current: document.createElement('div') }
    const chartRef = { current: null as unknown }
    const seriesRef = { current: null as unknown }

    vi.doMock('react', async () => {
      let callCount = 0

      return {
        ...React,
        useRef: ((initialValue: unknown) => {
          callCount += 1
          if (callCount === 1) return containerRef
          if (callCount === 2) return chartRef
          if (callCount === 3) return seriesRef

          return React.useRef(initialValue)
        }) as typeof React.useRef,
      }
    })
    const { LightweightChart: MockedLightweightChart } = await import('./LightweightChart')

    render(<MockedLightweightChart data={sampleData} />)
    mockApplyOptions.mockClear()
    chartRef.current = null
    globalThis.dispatchEvent(new Event('resize'))
    expect(mockApplyOptions).not.toHaveBeenCalled()
    vi.doUnmock('react')
    vi.resetModules()
  })
  it('skips setup when container ref is null', async () => {
    vi.resetModules()
    const React = await import('react')
    const originalUseRef = React.useRef

    vi.doMock('react', async () => {
      let callCount = 0

      return {
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
      }
    })
    const { LightweightChart: MockedLightweightChart } = await import('./LightweightChart')

    render(<MockedLightweightChart data={sampleData} />)
    expect(mockCreateChart).not.toHaveBeenCalled()
    vi.doUnmock('react')
    vi.resetModules()
  })
  it('clears data when all filtered out as duplicates', () => {
    mockSetData.mockClear()
    const allDuplicates = [
      { time: '2024-01-01' as never, open: 100, high: 110, low: 95, close: 105 },
      { time: '2024-01-01' as never, open: 102, high: 112, low: 98, close: 108 },
    ]

    render(<LightweightChart data={allDuplicates} />)
    expect(mockSetData).toHaveBeenCalled()
  })
  it('clears data when filter returns empty results', () => {
    mockSetData.mockClear()
    const fakeData = {
      length: 1,
      filter: vi.fn(() => []),
    } as unknown as typeof sampleData

    render(<LightweightChart data={fakeData} />)
    expect(mockSetData).toHaveBeenCalledWith([])
  })
  it('handles case when uniqueData is empty after filtering', () => {
    mockSetData.mockClear()
    const { rerender } = render(<LightweightChart data={sampleData} />)

    mockSetData.mockClear()
    rerender(<LightweightChart data={[]} />)
    expect(mockSetData).toHaveBeenCalledWith([])
  })
  it('does not throw when refs are null during data update', () => {
    const { unmount } = render(<LightweightChart data={sampleData} />)

    expect(mockSetData).toHaveBeenCalled()
    mockSetData.mockClear()
    unmount()
    expect(() => render(<LightweightChart data={sampleData} />)).not.toThrow()
  })
  it('applies dark theme via applyOptions when isDarkMode is true', () => {
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: string
        locale: string
      }) => unknown
    ) =>
      selector({
        isDarkMode: true,
        financialColorPreference: 'auto',
        locale: 'us',
      })) as never)
    render(<LightweightChart data={sampleData} />)
    expect(mockApplyOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          background: { color: '#181a1e' },
          textColor: '#9aa4b4',
        }),
      })
    )
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: string
        locale: string
      }) => unknown
    ) =>
      selector({
        isDarkMode: false,
        financialColorPreference: 'auto',
        locale: 'us',
      })) as never)
  })
  it('observes the container with ResizeObserver and disconnects on unmount', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    const originalResizeObserver = globalThis.ResizeObserver

    class FakeResizeObserver {
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    }

    globalThis.ResizeObserver = FakeResizeObserver as never
    const { unmount } = render(<LightweightChart data={sampleData} />)

    expect(observe).toHaveBeenCalled()
    unmount()
    expect(disconnect).toHaveBeenCalled()
    globalThis.ResizeObserver = originalResizeObserver
  })
  it('falls back to window resize listener when ResizeObserver is missing', () => {
    const originalResizeObserver = globalThis.ResizeObserver
    const addSpy = vi.spyOn(globalThis, 'addEventListener')
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')

    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined
    const { unmount } = render(<LightweightChart data={sampleData} />)

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    globalThis.ResizeObserver = originalResizeObserver
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
  it('applies theme changes without recreating chart', () => {
    const { rerender } = render(<LightweightChart data={sampleData} />)
    const initialCreateCount = mockCreateChart.mock.calls.length

    mockApplyOptions.mockClear()
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: string
        locale: string
      }) => unknown
    ) =>
      selector({
        isDarkMode: true,
        financialColorPreference: 'auto',
        locale: 'us',
      })) as never)
    rerender(<LightweightChart data={sampleData} />)
    expect(mockCreateChart).toHaveBeenCalledTimes(initialCreateCount)
    expect(mockApplyOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          background: { color: '#181a1e' },
        }),
      })
    )
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: string
        locale: string
      }) => unknown
    ) =>
      selector({
        isDarkMode: false,
        financialColorPreference: 'auto',
        locale: 'us',
      })) as never)
  })

  it('initializes candle series with computed --color-rising-500 / --color-falling-500 hex', () => {
    document.documentElement.style.setProperty('--color-rising-500', '#abcdef')
    document.documentElement.style.setProperty('--color-falling-500', '#fedcba')
    render(<LightweightChart data={sampleData} />)

    expect(mockAddSeries).toHaveBeenCalledWith(
      'CandlestickSeries',
      expect.objectContaining({
        upColor: '#abcdef',
        downColor: '#fedcba',
        borderUpColor: '#abcdef',
        borderDownColor: '#fedcba',
        wickUpColor: '#abcdef',
        wickDownColor: '#fedcba',
      })
    )
    document.documentElement.style.removeProperty('--color-rising-500')
    document.documentElement.style.removeProperty('--color-falling-500')
  })

  it('re-applies the candle palette via series.applyOptions on financialColorPreference change', () => {
    document.documentElement.style.setProperty('--color-rising-500', '#0b8f4d')
    document.documentElement.style.setProperty('--color-falling-500', '#8b1025')
    const { rerender } = render(<LightweightChart data={sampleData} />)

    mockSeriesApplyOptions.mockClear()
    document.documentElement.style.setProperty('--color-rising-500', '#8b1025')
    document.documentElement.style.setProperty('--color-falling-500', '#0b8f4d')
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: {
        isDarkMode: boolean
        financialColorPreference: string
        locale: string
      }) => unknown
    ) =>
      selector({
        isDarkMode: false,
        financialColorPreference: 'rising-red',
        locale: 'us',
      })) as never)
    rerender(<LightweightChart data={sampleData} />)

    expect(mockSeriesApplyOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        upColor: '#8b1025',
        downColor: '#0b8f4d',
      })
    )
    document.documentElement.style.removeProperty('--color-rising-500')
    document.documentElement.style.removeProperty('--color-falling-500')
  })

  it('falls back to the Western 500 tokens when CSS vars are absent', () => {
    document.documentElement.style.removeProperty('--color-rising-500')
    document.documentElement.style.removeProperty('--color-falling-500')
    render(<LightweightChart data={sampleData} />)

    expect(mockAddSeries).toHaveBeenCalledWith(
      'CandlestickSeries',
      expect.objectContaining({
        upColor: '#0b8f4d',
        downColor: '#8b1025',
      })
    )
  })
})
