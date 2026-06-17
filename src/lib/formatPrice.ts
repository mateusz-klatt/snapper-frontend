/**
 * Adaptive price formatting for the market view.
 *
 * A fixed decimal count is wrong for a multi-asset feed: 2 decimals hides
 * sub-pip FX moves (EUR/USD `1.16`), while 5 decimals is noise on BTC.
 * Precision is derived from the price magnitude (significant figures) and
 * nudged per asset class, so each instrument shows just enough decimals to
 * resolve its real tick without trailing noise.
 */

export type PriceAssetClass = 'fx' | 'crypto' | 'future' | 'equity' | 'unknown'

interface PrecisionRule {
  sigFigs: number
  minDecimals: number
  maxDecimals: number
}

/**
 * Per-class significant-figure target and decimal clamp.
 *
 * `fx` targets 6 sig figs so majors render 5dp (EUR/USD `1.08630`) and
 * JPY-style pairs 3dp (`150.120`). `equity` is pinned to 2dp. `crypto`
 * spans 2..8dp so large coins stay tidy and micro-caps stay legible.
 */
const PRECISION_RULES: Record<PriceAssetClass, PrecisionRule> = {
  fx: { sigFigs: 6, minDecimals: 3, maxDecimals: 5 },
  crypto: { sigFigs: 5, minDecimals: 2, maxDecimals: 8 },
  future: { sigFigs: 5, minDecimals: 2, maxDecimals: 6 },
  equity: { sigFigs: 5, minDecimals: 2, maxDecimals: 2 },
  unknown: { sigFigs: 5, minDecimals: 2, maxDecimals: 8 },
}

const NON_FINITE_DISPLAY = '—'

/**
 * Map an exchange (and optional instrument kind) to a price asset class.
 *
 * Exchange is the strongest signal (walutomat is FX, kraken_equities is
 * equities, kraken_futures is futures). For mixed venues (polygon) and
 * spot crypto the instrument kind refines it, defaulting to crypto.
 */
export function assetClassForExchange(
  exchange: string,
  instrumentKind?: string | null
): PriceAssetClass {
  if (exchange === 'walutomat') {
    return 'fx'
  }

  if (exchange === 'kraken_equities') {
    return 'equity'
  }

  if (exchange === 'kraken_futures') {
    return 'future'
  }

  if (instrumentKind === 'future' || instrumentKind === 'perpetual') {
    return 'future'
  }

  if (instrumentKind === 'etf' || instrumentKind === 'option') {
    return 'equity'
  }

  return 'crypto'
}

/**
 * Decimal places to display for a price, by magnitude and asset class.
 *
 * `decimals = sigFigs - 1 - floor(log10(|price|))`, clamped to the class
 * range. Non-finite or zero prices fall back to the class minimum.
 */
export function priceDisplayPrecision(
  price: number,
  assetClass: PriceAssetClass = 'unknown'
): number {
  const rule = PRECISION_RULES[assetClass]

  if (!Number.isFinite(price) || price === 0) {
    return rule.minDecimals
  }

  const magnitude = Math.floor(Math.log10(Math.abs(price)))
  const raw = rule.sigFigs - 1 - magnitude

  return Math.min(rule.maxDecimals, Math.max(rule.minDecimals, raw))
}

/**
 * Smallest representable price step for a decimal count (lightweight-charts
 * `minMove`). Precision 5 -> 0.00001, precision 2 -> 0.01.
 */
export function minMoveForPrecision(precision: number): number {
  return 10 ** -precision
}

/**
 * Format a value at an explicit decimal precision (em dash for non-finite).
 *
 * Used to render a price, its high/low and its change at ONE shared
 * precision (the instrument's), so the stats cards stay visually aligned
 * instead of each picking decimals from its own magnitude.
 */
export function formatAtPrecision(value: number, precision: number): string {
  if (!Number.isFinite(value)) {
    return NON_FINITE_DISPLAY
  }

  return value.toFixed(precision)
}
