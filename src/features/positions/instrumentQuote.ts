/**
 * Resolve the quote-currency code from a canonical native instrument symbol.
 *
 * Snapper native symbols are `BASE-QUOTE` (for example `EUR-PLN` or
 * `BTC-USD`), so the quote is the segment after the final hyphen. The last
 * hyphen is used so a multiplier-prefixed base (a hypothetical `1000-SHIB-USD`)
 * still yields the quote. A symbol without a usable trailing segment resolves
 * to an empty string, letting callers render the bare number rather than a
 * misleading hardcoded currency.
 */
export const quoteCurrency = (instrument: string): string => {
  const separatorIndex = instrument.lastIndexOf('-')

  if (separatorIndex <= 0 || separatorIndex === instrument.length - 1) return ''

  return instrument.slice(separatorIndex + 1)
}

/**
 * Render a price fixed to two decimals with its quote-currency code appended.
 *
 * An empty quote (an unresolved symbol) yields the bare number rather than a
 * misleading hardcoded currency symbol.
 */
export const formatQuoted = (value: number, quote: string): string => {
  const formatted = value.toFixed(2)

  return quote === '' ? formatted : `${formatted} ${quote}`
}
