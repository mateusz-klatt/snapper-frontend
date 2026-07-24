import type { PnlTimelinePointData } from '../../types/api'

/**
 * Return the most recent point that carries a persisted equity sample.
 *
 * Equity, cash, position value, and drawdown only appear together on
 * current-truth USD minutes with a complete persisted sample. Any one of
 * them being present marks the point as sampled, so the latest such point is
 * the single coherent source for the equity legend value, the current
 * drawdown, and the cash/position split.
 */
export const latestSampledPoint = (
  points: readonly PnlTimelinePointData[]
): PnlTimelinePointData | null => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]

    if (
      point !== undefined &&
      (point.equity !== null ||
        point.cash !== null ||
        point.position_value !== null ||
        point.drawdown !== null)
    ) {
      return point
    }
  }

  return null
}

/**
 * Largest drawdown fraction observed across the sampled points in the window,
 * or ``null`` when no point exposes a drawdown.
 */
export const maxDrawdown = (points: readonly PnlTimelinePointData[]): number | null => {
  let peak: number | null = null

  for (const point of points) {
    const value = point.drawdown

    if (value !== null) {
      peak = peak === null ? value : Math.max(peak, value)
    }
  }

  return peak
}
