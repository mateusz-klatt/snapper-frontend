/**
 * Builds a {@link ChartNavAdapter} from a live lightweight-charts handle. This
 * is the only place that maps the controller's plain numbers onto
 * lightweight-charts' branded `Time` / `Logical` types, so the controller and
 * its tests stay free of charting types.
 */
import type { CandlestickData, Time, UTCTimestamp } from 'lightweight-charts'
import type { ChartHandle } from '../../components/LightweightChart'
import type { ChartDatum, LogicalSpan } from './chartNavigation'
import type { ChartNavAdapter } from './marketChartController'

const toCandlestick = (datum: ChartDatum): CandlestickData<Time> => ({
  time: datum.time as UTCTimestamp,
  open: datum.open,
  high: datum.high,
  low: datum.low,
  close: datum.close,
})

export function createChartNavAdapter(handle: ChartHandle): ChartNavAdapter {
  const { chart, series } = handle

  return {
    setData(data: ChartDatum[]): void {
      series.setData(data.map(toCandlestick))
    },
    updateLast(datum: ChartDatum): void {
      series.update(toCandlestick(datum))
    },
    getVisibleLogicalRange(): LogicalSpan | null {
      const range = chart.timeScale().getVisibleLogicalRange()

      return range ? { from: range.from, to: range.to } : null
    },
    setVisibleLogicalRange(range: LogicalSpan): void {
      chart.timeScale().setVisibleLogicalRange(range)
    },
    barsBefore(range: LogicalSpan): number | null {
      return series.barsInLogicalRange(range)?.barsBefore ?? null
    },
    barsAfter(range: LogicalSpan): number | null {
      return series.barsInLogicalRange(range)?.barsAfter ?? null
    },
    fitContent(): void {
      chart.timeScale().fitContent()
    },
    width(): number {
      return chart.timeScale().width()
    },
    subscribeVisibleLogicalRangeChange(handler: () => void): () => void {
      const wrapped = (): void => {
        handler()
      }

      const timeScale = chart.timeScale()

      timeScale.subscribeVisibleLogicalRangeChange(wrapped)

      return () => {
        timeScale.unsubscribeVisibleLogicalRangeChange(wrapped)
      }
    },
  }
}
