export interface ValidationError {
  /** i18n key suffix under ``positions:validation`` */
  key: string
  /** Optional interpolation values for the translated message */
  params?: Record<string, string | number>
}

const validateBracketField = (
  value: number | null,
  invalidKey: string,
  nonPositiveKey: string
): ValidationError | null => {
  if (value !== null && !Number.isFinite(value)) return { key: invalidKey }
  if (value !== null && value <= 0) return { key: nonPositiveKey }

  return null
}

const validateLongBracketRelation = (
  sl: number | null,
  tp: number | null,
  averagePrice: number,
  formattedPrice: string
): ValidationError | null => {
  if (sl !== null && sl >= averagePrice) {
    return { key: 'slLongBelowEntry', params: { price: formattedPrice } }
  }

  if (tp !== null && tp <= averagePrice) {
    return { key: 'tpLongAboveEntry', params: { price: formattedPrice } }
  }

  return null
}

const validateShortBracketRelation = (
  sl: number | null,
  tp: number | null,
  averagePrice: number,
  formattedPrice: string
): ValidationError | null => {
  if (sl !== null && sl <= averagePrice) {
    return { key: 'slShortAboveEntry', params: { price: formattedPrice } }
  }

  if (tp !== null && tp >= averagePrice) {
    return { key: 'tpShortBelowEntry', params: { price: formattedPrice } }
  }

  return null
}

export const validateBracketPrices = (
  sl: number | null,
  tp: number | null,
  side: 'LONG' | 'SHORT',
  averagePrice: number,
  quote: string
): ValidationError | null => {
  if (sl === null && tp === null) return { key: 'bracketRequired' }

  const stopLossError = validateBracketField(sl, 'invalidSlPrice', 'slPricePositive')

  if (stopLossError !== null) return stopLossError

  const takeProfitError = validateBracketField(tp, 'invalidTpPrice', 'tpPricePositive')

  if (takeProfitError !== null) return takeProfitError

  const price = averagePrice.toFixed(2)
  const fmt = quote === '' ? price : `${price} ${quote}`

  if (side === 'LONG') {
    return validateLongBracketRelation(sl, tp, averagePrice, fmt)
  }

  return validateShortBracketRelation(sl, tp, averagePrice, fmt)
}

export const validateTrailingStopParams = (
  trailingPct: number | null,
  minLockPct: number | null
): ValidationError | null => {
  if (trailingPct === null) return { key: 'trailingRequired' }
  if (!Number.isFinite(trailingPct)) return { key: 'trailingInvalid' }
  if (trailingPct <= 0 || trailingPct >= 100) return { key: 'trailingRange' }

  if (minLockPct !== null) {
    if (!Number.isFinite(minLockPct)) return { key: 'minLockInvalid' }
    if (minLockPct < 0 || minLockPct >= 100) return { key: 'minLockRange' }
  }

  return null
}
