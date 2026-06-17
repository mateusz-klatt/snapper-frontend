import { describe, it, expect } from 'vitest'
import {
  assetClassForExchange,
  formatAtPrecision,
  minMoveForPrecision,
  priceDisplayPrecision,
} from './formatPrice'

describe('assetClassForExchange', () => {
  it('maps walutomat to fx', () => {
    expect(assetClassForExchange('walutomat')).toBe('fx')
  })
  it('maps kraken_equities to equity', () => {
    expect(assetClassForExchange('kraken_equities')).toBe('equity')
  })
  it('maps kraken_futures to future', () => {
    expect(assetClassForExchange('kraken_futures')).toBe('future')
  })
  it('maps a perpetual instrument kind to future regardless of exchange', () => {
    expect(assetClassForExchange('kraken', 'perpetual')).toBe('future')
  })
  it('maps a future instrument kind to future', () => {
    expect(assetClassForExchange('polygon', 'future')).toBe('future')
  })
  it('maps an etf instrument kind to equity', () => {
    expect(assetClassForExchange('polygon', 'etf')).toBe('equity')
  })
  it('maps an option instrument kind to equity', () => {
    expect(assetClassForExchange('polygon', 'option')).toBe('equity')
  })
  it('defaults spot crypto venues to crypto', () => {
    expect(assetClassForExchange('kraken')).toBe('crypto')
  })
  it('defaults to crypto when kind is null', () => {
    expect(assetClassForExchange('kraken', null)).toBe('crypto')
  })
})

describe('priceDisplayPrecision', () => {
  it('renders FX majors with five decimals (fractional pip)', () => {
    expect(priceDisplayPrecision(1.0863, 'fx')).toBe(5)
  })
  it('renders JPY-style FX pairs with three decimals', () => {
    expect(priceDisplayPrecision(150.12, 'fx')).toBe(3)
  })
  it('clamps a sub-unit FX price to the fx maximum of five decimals', () => {
    expect(priceDisplayPrecision(0.009, 'fx')).toBe(5)
  })
  it('clamps large crypto prices to the minimum of two decimals', () => {
    expect(priceDisplayPrecision(67000, 'crypto')).toBe(2)
  })
  it('clamps micro-cap crypto prices to the maximum of eight decimals', () => {
    expect(priceDisplayPrecision(0.000023, 'crypto')).toBe(8)
  })
  it('gives mid-range crypto prices significant-figure precision', () => {
    expect(priceDisplayPrecision(1.2345, 'crypto')).toBe(4)
  })
  it('pins equities to two decimals even for small prices', () => {
    expect(priceDisplayPrecision(5.5, 'equity')).toBe(2)
  })
  it('returns the class minimum for a zero price', () => {
    expect(priceDisplayPrecision(0, 'crypto')).toBe(2)
  })
  it('returns the class minimum for a non-finite price', () => {
    expect(priceDisplayPrecision(Number.NaN, 'fx')).toBe(3)
  })
  it('defaults the asset class to unknown', () => {
    expect(priceDisplayPrecision(42)).toBe(3)
  })
})

describe('minMoveForPrecision', () => {
  it('maps five decimals to 0.00001', () => {
    expect(minMoveForPrecision(5)).toBeCloseTo(0.00001, 10)
  })
  it('maps two decimals to 0.01', () => {
    expect(minMoveForPrecision(2)).toBeCloseTo(0.01, 10)
  })
  it('maps zero decimals to 1', () => {
    expect(minMoveForPrecision(0)).toBe(1)
  })
})

describe('formatAtPrecision', () => {
  it('formats a value at the given decimal precision', () => {
    expect(formatAtPrecision(1.0863, 5)).toBe('1.08630')
  })
  it('keeps the sign of a negative change', () => {
    expect(formatAtPrecision(-0.0012, 5)).toBe('-0.00120')
  })
  it('formats a large value at two decimals', () => {
    expect(formatAtPrecision(67000, 2)).toBe('67000.00')
  })
  it('renders an em dash for NaN', () => {
    expect(formatAtPrecision(Number.NaN, 2)).toBe('—')
  })
  it('renders an em dash for Infinity', () => {
    expect(formatAtPrecision(Number.POSITIVE_INFINITY, 2)).toBe('—')
  })
})
