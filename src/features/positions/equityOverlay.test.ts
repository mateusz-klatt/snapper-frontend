import { describe, expect, it } from 'vitest'
import type { PnlTimelinePointData } from '../../types/api'
import { latestSampledPoint, maxDrawdown } from './equityOverlay'

const point = (overrides: Partial<PnlTimelinePointData> = {}): PnlTimelinePointData => ({
  point_time: '2026-01-01T00:00:00Z',
  realized_pnl: null,
  fee_pnl: null,
  accrual_pnl: null,
  unrealized_pnl: null,
  net_pnl: null,
  equity: null,
  cash: null,
  position_value: null,
  drawdown: null,
  valuation_status: 'complete',
  incompleteness_reasons: [],
  per_instrument: [],
  attribution: [],
  ...overrides,
})

describe('latestSampledPoint', () => {
  it('returns the most recent point carrying any persisted sample field', () => {
    const points = [
      point({ point_time: 'a', equity: 100 }),
      point({ point_time: 'b', cash: 40 }),
      point({ point_time: 'c' }),
    ]

    expect(latestSampledPoint(points)?.point_time).toBe('b')
  })

  it('detects a sample from position value or drawdown alone', () => {
    expect(latestSampledPoint([point({ position_value: 5 })])?.position_value).toBe(5)
    expect(latestSampledPoint([point({ drawdown: 0.2 })])?.drawdown).toBe(0.2)
  })

  it('returns null when no point exposes a sample', () => {
    expect(latestSampledPoint([point(), point()])).toBeNull()
    expect(latestSampledPoint([])).toBeNull()
  })
})

describe('maxDrawdown', () => {
  it('returns the largest drawdown fraction across sampled points', () => {
    const points = [
      point({ drawdown: 0.05 }),
      point({ drawdown: null }),
      point({ drawdown: 0.18 }),
      point({ drawdown: 0.12 }),
    ]

    expect(maxDrawdown(points)).toBe(0.18)
  })

  it('returns null when no point exposes a drawdown', () => {
    expect(maxDrawdown([point(), point()])).toBeNull()
    expect(maxDrawdown([])).toBeNull()
  })
})
