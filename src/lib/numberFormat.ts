/**
 * Shared display rounding for quantities, prices, and money.
 *
 * Columns keep a fixed fraction length so rows line up. Float noise is rounded
 * away before formatting. Values smaller than half a unit at the displayed
 * precision render as an approximate zero, never as negative zero, with the
 * exact magnitude available separately for a tooltip.
 */

import { getIntlLocale, resolveLanguageTag } from '../i18n/countryLanguages'
import { DEFAULT_LOCALE } from '../i18n/types'
import { assetClassForExchange, priceDisplayPrecision, type PriceAssetClass } from './formatPrice'

const MAX_QUANTITY_DECIMALS = 8
const MAX_FRACTION_DIGITS = 20
const NON_FINITE_TEXT = '—'
const NEAR_ZERO_PREFIX = '≈ '
const CURRENCY_DIGITS = new Map<string, number>()
const ISO_BY_CODE = new Map<string, boolean>()

export const FALLBACK_ISO_CURRENCIES = new Set<string>([
  'USD',
  'EUR',
  'PLN',
  'GBP',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'TRY',
  'CNY',
  'HKD',
  'SGD',
  'KRW',
  'INR',
  'BRL',
  'MXN',
  'ZAR',
  'ILS',
])

let isoCatalog: ReadonlySet<string> | undefined

export type SignDisplay = 'auto' | 'never' | 'always' | 'exceptZero'

export type SignedTone = 'up' | 'down' | 'flat'

export interface FormattedNumber {
  text: string
  exactText: string
  title: string | null
  nearZero: boolean
  fractionDigits: number
  rounded: number | null
}

export interface DustPositionInput {
  quantity: number
  quantityDecimals: number | null
  markPrice?: number | null | undefined
  averagePrice?: number | null | undefined
  isDust: boolean | null
}

interface ScaleOptions {
  locale: string
  fractionDigits: number
  signDisplay: SignDisplay
}

export const intlLocaleFromLanguage = (language: string): string => {
  const resolved = resolveLanguageTag(language) ?? DEFAULT_LOCALE

  return getIntlLocale(resolved)
}

const clampDigits = (digits: number): number => {
  if (!Number.isInteger(digits) || digits < 0) return 0

  return Math.min(digits, MAX_FRACTION_DIGITS)
}

const roundHalfAwayFromZero = (value: number, fractionDigits: number): number => {
  const parsed = Number(value.toFixed(clampDigits(fractionDigits)))

  if (!Number.isFinite(parsed) || parsed === 0) return 0

  return parsed
}

/**
 * ISO-4217 membership, read on first use.
 *
 * Runtimes without `Intl.supportedValuesOf` use a static fiat allowlist because
 * `Intl.NumberFormat` accepts any well-formed three-letter currency code.
 */
const readIsoCatalog = (): ReadonlySet<string> | null => {
  if (typeof Intl.supportedValuesOf !== 'function') return null

  if (isoCatalog === undefined) {
    isoCatalog = new Set(Intl.supportedValuesOf('currency').map(code => code.toUpperCase()))
  }

  return isoCatalog
}

const isIsoCurrency = (currency: string): boolean => {
  const code = currency.trim().toUpperCase()
  const cached = ISO_BY_CODE.get(code)

  if (cached !== undefined) return cached

  const catalog = readIsoCatalog()
  const iso = catalog === null ? FALLBACK_ISO_CURRENCIES.has(code) : catalog.has(code)

  ISO_BY_CODE.set(code, iso)

  return iso
}

/**
 * Minor units for an ISO-4217 currency. Any other asset uses eight decimals.
 */
export const currencyFractionDigits = (currency: string): number => {
  const code = currency.trim().toUpperCase()

  if (!isIsoCurrency(code)) return MAX_QUANTITY_DECIMALS

  const cached = CURRENCY_DIGITS.get(code)

  if (cached !== undefined) return cached

  let digits = 2

  try {
    const resolved = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).resolvedOptions().maximumFractionDigits

    if (typeof resolved === 'number') digits = resolved
  } catch {
    digits = 2
  }

  CURRENCY_DIGITS.set(code, digits)

  return digits
}

export const quantityFractionDigits = (value: number, quantityDecimals: number | null): number => {
  if (quantityDecimals !== null) return clampDigits(quantityDecimals)

  if (!Number.isFinite(value) || value === 0) return 0

  const snapped = roundHalfAwayFromZero(value, MAX_QUANTITY_DECIMALS)

  if (snapped === 0) return MAX_QUANTITY_DECIMALS

  const fraction = Math.abs(snapped)
    .toFixed(MAX_QUANTITY_DECIMALS)
    .replace(/^\d+\./, '')

  return fraction.replace(/0+$/, '').length
}

export const priceFractionDigits = (
  value: number,
  options: {
    priceDecimals?: number | null | undefined
    assetClass?: PriceAssetClass | undefined
    exchange?: string | undefined
    instrumentKind?: string | null | undefined
  } = {}
): number => {
  if (options.priceDecimals != null) return clampDigits(options.priceDecimals)

  const assetClass =
    options.assetClass ?? assetClassForExchange(options.exchange ?? '', options.instrumentKind)

  return priceDisplayPrecision(Number.isFinite(value) ? value : 0, assetClass)
}

export const maxFractionDigits = (values: readonly number[]): number => {
  let max = 0

  for (const value of values) {
    if (value > max) max = value
  }

  return max
}

/**
 * Dust grouping when the backend omits `is_dust`.
 *
 * An exact zero quantity is flat. Only a non-zero quantity that rounds to
 * zero at lot precision is dust. A notional cutoff is currency-specific, so
 * that rule stays on the backend flag.
 */
export const isDustPosition = (input: DustPositionInput): boolean => {
  if (input.isDust !== null) return input.isDust

  if (!Number.isFinite(input.quantity)) return false

  if (input.quantity === 0) return false

  const digits = input.quantityDecimals ?? MAX_QUANTITY_DECIMALS

  return roundHalfAwayFromZero(input.quantity, digits) === 0
}

const formatFixed = (
  value: number,
  fractionDigits: number,
  locale: string,
  signDisplay: SignDisplay
): string => {
  const safe = value === 0 ? 0 : value

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
    signDisplay,
  }).format(safe)
}

const isDisplayedZero = (text: string): boolean => {
  const digits = text.replace(/[^\d]/g, '')

  return digits.length > 0 && /^0+$/.test(digits)
}

const formatExact = (value: number, locale: string): string => {
  const safe = value === 0 ? 0 : value
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: MAX_FRACTION_DIGITS,
    minimumFractionDigits: 0,
    useGrouping: true,
    signDisplay: 'auto',
  }).format(safe)

  if (safe !== 0 && isDisplayedZero(formatted)) {
    return new Intl.NumberFormat(locale, {
      maximumSignificantDigits: 12,
      useGrouping: false,
      signDisplay: 'auto',
    }).format(safe)
  }

  return formatted
}

const hasHiddenFraction = (value: number, rounded: number, fractionDigits: number): boolean => {
  if (value === rounded) return false

  return Math.abs(value - rounded) >= 10 ** -(fractionDigits + 1)
}

const formatScaled = (value: number, options: ScaleOptions): FormattedNumber => {
  const fractionDigits = clampDigits(options.fractionDigits)

  if (!Number.isFinite(value)) {
    return {
      text: NON_FINITE_TEXT,
      exactText: NON_FINITE_TEXT,
      title: null,
      nearZero: false,
      fractionDigits,
      rounded: null,
    }
  }

  const mathematical = roundHalfAwayFromZero(value, fractionDigits)
  const exactText = formatExact(value, options.locale)
  const nearZero = value !== 0 && Math.abs(value) < 0.5 * 10 ** -fractionDigits
  const rounded = nearZero ? 0 : mathematical
  const body = formatFixed(
    rounded,
    fractionDigits,
    options.locale,
    nearZero ? 'auto' : options.signDisplay
  )
  const text = nearZero ? `${NEAR_ZERO_PREFIX}${body}` : body
  const title =
    nearZero || hasHiddenFraction(value, mathematical, fractionDigits) ? exactText : null

  return { text, exactText, title, nearZero, fractionDigits, rounded }
}

export const formatQuantity = (
  value: number,
  options: {
    locale: string
    quantityDecimals?: number | null
    fractionDigits?: number
    signDisplay?: SignDisplay
  }
): FormattedNumber => {
  const fractionDigits =
    options.fractionDigits ?? quantityFractionDigits(value, options.quantityDecimals ?? null)

  return formatScaled(value, {
    locale: options.locale,
    fractionDigits,
    signDisplay: options.signDisplay ?? 'auto',
  })
}

export const formatPrice = (
  value: number,
  options: {
    locale: string
    priceDecimals?: number | null | undefined
    fractionDigits?: number | undefined
    assetClass?: PriceAssetClass | undefined
    exchange?: string | undefined
    instrumentKind?: string | null | undefined
    signDisplay?: SignDisplay | undefined
  }
): FormattedNumber => {
  const fractionDigits =
    options.fractionDigits ??
    priceFractionDigits(value, {
      priceDecimals: options.priceDecimals,
      assetClass: options.assetClass,
      exchange: options.exchange,
      instrumentKind: options.instrumentKind,
    })

  return formatScaled(value, {
    locale: options.locale,
    fractionDigits,
    signDisplay: options.signDisplay ?? 'auto',
  })
}

/**
 * Fiat uses ISO minor units. Any other asset uses its lot size, or trims
 * float noise to at most eight decimals.
 */
export const formatMoney = (
  value: number,
  options: {
    locale: string
    currency: string
    fractionDigits?: number | undefined
    quantityDecimals?: number | null | undefined
    signDisplay?: SignDisplay | undefined
  }
): FormattedNumber => {
  const fractionDigits =
    options.fractionDigits ??
    (isIsoCurrency(options.currency)
      ? currencyFractionDigits(options.currency)
      : quantityFractionDigits(value, options.quantityDecimals ?? null))

  return formatScaled(value, {
    locale: options.locale,
    fractionDigits,
    signDisplay: options.signDisplay ?? 'auto',
  })
}

/** Dot-decimal digits for a CSV cell, without grouping or an approximate-zero mark. */
export const formatRawDecimal = (value: number): string => {
  if (!Number.isFinite(value)) return ''

  if (value === 0) return '0'

  const negative = value < 0
  const text = Math.abs(value).toString()

  if (!text.includes('e')) return negative ? `-${text}` : text

  const marker = text.indexOf('e')
  const coefficient = text.slice(0, marker)
  const exponent = Number(text.slice(marker + 1))
  const dot = coefficient.indexOf('.')
  const whole = dot === -1 ? coefficient : coefficient.slice(0, dot)
  const fraction = dot === -1 ? '' : coefficient.slice(dot + 1)
  const digits = `${whole}${fraction}`
  const point = whole.length + exponent
  const body =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : `${digits}${'0'.repeat(point - digits.length)}`

  return negative ? `-${body}` : body
}

/** Color follows the rounded text, so a displayed zero is never a loss or a gain. */
export const signedTone = (formatted: FormattedNumber | null): SignedTone => {
  if (
    formatted === null ||
    formatted.nearZero ||
    formatted.rounded === null ||
    formatted.rounded === 0
  ) {
    return 'flat'
  }

  return formatted.rounded > 0 ? 'up' : 'down'
}
