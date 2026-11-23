import { describe, expect, it } from 'vitest'
import {
  currencyFractionDigits,
  formatMoney,
  formatPrice,
  formatQuantity,
  intlLocaleFromLanguage,
  isDustPosition,
  maxFractionDigits,
  priceFractionDigits,
  quantityFractionDigits,
  signedTone,
} from './numberFormat'

describe('intlLocaleFromLanguage', () => {
  it('maps a catalog language onto its Intl tag', () => {
    expect(intlLocaleFromLanguage('en')).toBe('en-US')
    expect(intlLocaleFromLanguage('pl')).toBe('pl-PL')
  })

  it('falls back when the language tag is unknown', () => {
    expect(intlLocaleFromLanguage('xx')).toBe('ga-IE')
  })
})

describe('currencyFractionDigits', () => {
  it('uses minor units for EUR, USD and PLN and zero for JPY', () => {
    expect(currencyFractionDigits('EUR')).toBe(2)
    expect(currencyFractionDigits('eur')).toBe(2)
    expect(currencyFractionDigits('USD')).toBe(2)
    expect(currencyFractionDigits('PLN')).toBe(2)
    expect(currencyFractionDigits('JPY')).toBe(0)
  })

  it('uses two digits when the code is not a currency', () => {
    expect(currencyFractionDigits('')).toBe(2)
    expect(currencyFractionDigits('USDT')).toBe(2)
    expect(currencyFractionDigits('USDT')).toBe(2)
  })

  it('uses two digits when Intl omits a fraction count or rejects the code', () => {
    const RealNumberFormat = Intl.NumberFormat

    function NumberFormat(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
      const currency = options && 'currency' in options ? options.currency : undefined

      if (currency === 'XTS') {
        return { resolvedOptions: () => ({}) } as Intl.NumberFormat
      }

      if (currency === 'XXX') {
        throw new RangeError('invalid currency')
      }

      return new RealNumberFormat(locales, options)
    }

    NumberFormat.prototype = RealNumberFormat.prototype
    Intl.NumberFormat = NumberFormat as typeof Intl.NumberFormat

    try {
      expect(currencyFractionDigits('XTS')).toBe(2)
      expect(currencyFractionDigits('XXX')).toBe(2)
      expect(currencyFractionDigits('XXX')).toBe(2)
    } finally {
      Intl.NumberFormat = RealNumberFormat
    }
  })
})

describe('quantityFractionDigits', () => {
  it('clamps an explicit lot precision', () => {
    expect(quantityFractionDigits(1, 8)).toBe(8)
    expect(quantityFractionDigits(1, 1.5)).toBe(0)
    expect(quantityFractionDigits(1, -3)).toBe(0)
    expect(quantityFractionDigits(1, 25)).toBe(20)
  })

  it('trims float noise down to at most eight significant decimals', () => {
    expect(quantityFractionDigits(0, null)).toBe(0)
    expect(quantityFractionDigits(Number.NaN, null)).toBe(0)
    expect(quantityFractionDigits(1e-12, null)).toBe(8)
    expect(quantityFractionDigits(2.5, null)).toBe(1)
    expect(quantityFractionDigits(9.99999993923e-9, null)).toBe(8)
  })
})

describe('priceFractionDigits', () => {
  it('uses an explicit price precision when the API provides one', () => {
    expect(priceFractionDigits(1.23456, { priceDecimals: 3 })).toBe(3)
  })

  it('falls back to the instrument class precision', () => {
    expect(priceFractionDigits(1.0863, { exchange: 'walutomat' })).toBe(5)
    expect(priceFractionDigits(10, { assetClass: 'equity' })).toBe(2)
    expect(priceFractionDigits(10)).toBe(priceFractionDigits(10, {}))
    expect(priceFractionDigits(Number.NaN, {})).toBe(2)
    expect(priceFractionDigits(10, { exchange: 'polygon', instrumentKind: 'etf' })).toBe(2)
  })
})

describe('maxFractionDigits', () => {
  it('returns the largest requested width', () => {
    expect(maxFractionDigits([])).toBe(0)
    expect(maxFractionDigits([-1, 1, 4, 2])).toBe(4)
  })
})

describe('isDustPosition', () => {
  it('lets an explicit API flag win', () => {
    expect(
      isDustPosition({ quantity: 2, quantityDecimals: null, markPrice: 100, isDust: true })
    ).toBe(true)
    expect(
      isDustPosition({ quantity: 0, quantityDecimals: null, markPrice: 100, isDust: false })
    ).toBe(false)
  })

  it('treats only a non-zero lot-rounded zero as dust when the API omits the flag', () => {
    expect(isDustPosition({ quantity: Number.NaN, quantityDecimals: null, isDust: null })).toBe(
      false
    )
    expect(isDustPosition({ quantity: 0, quantityDecimals: 8, isDust: null })).toBe(false)
    expect(isDustPosition({ quantity: 4e-9, quantityDecimals: 8, isDust: null })).toBe(true)
    expect(isDustPosition({ quantity: 0.004, quantityDecimals: 2, isDust: null })).toBe(true)
    expect(isDustPosition({ quantity: 1e-9, quantityDecimals: null, isDust: null })).toBe(true)
    expect(isDustPosition({ quantity: 1, quantityDecimals: null, isDust: null })).toBe(false)
    expect(isDustPosition({ quantity: 1e-8, quantityDecimals: 8, isDust: null })).toBe(false)
    expect(
      isDustPosition({
        quantity: 0.3,
        quantityDecimals: 8,
        markPrice: 1,
        averagePrice: 1,
        isDust: null,
      })
    ).toBe(false)
  })
})

describe('signedTone', () => {
  it('follows the displayed rounding for a tiny negative across USD, EUR and PLN', () => {
    const raw = -1.5e-9

    for (const currency of ['USD', 'EUR', 'PLN'] as const) {
      const formatted = formatMoney(raw, { locale: 'pl-PL', currency })

      expect(currencyFractionDigits(currency)).toBe(2)
      expect(formatted.text).toBe('≈ 0,00')
      expect(formatted.text).not.toContain('-')
      expect(formatted.rounded).toBe(0)
      expect(signedTone(formatted)).toBe('flat')
    }
  })

  it('stays flat for an empty or exact zero and colors a visible minor unit', () => {
    const infinite = formatMoney(Number.POSITIVE_INFINITY, { locale: 'en-US', currency: 'USD' })
    const visibleLoss = formatMoney(-0.006, { locale: 'pl-PL', currency: 'PLN' })

    expect(signedTone(null)).toBe('flat')
    expect(signedTone(infinite)).toBe('flat')
    expect(signedTone(formatMoney(0, { locale: 'pl-PL', currency: 'PLN' }))).toBe('flat')
    expect(signedTone(formatMoney(-0, { locale: 'en-US', currency: 'EUR' }))).toBe('flat')
    expect(signedTone(formatMoney(0.01, { locale: 'en-US', currency: 'USD' }))).toBe('up')
    expect(signedTone(formatMoney(-0.01, { locale: 'de-DE', currency: 'EUR' }))).toBe('down')
    expect(visibleLoss.text).toBe('-0,01')
    expect(signedTone(visibleLoss)).toBe('down')
  })
})

describe('formatQuantity', () => {
  it('rounds binary noise to the lot precision with locale separators', () => {
    const formatted = formatQuantity(9.99999993923e-9, {
      locale: 'pl-PL',
      quantityDecimals: 8,
    })

    expect(formatted.text).toBe('0,00000001')
    expect(formatted.nearZero).toBe(false)
    expect(formatted.title).toBeNull()
  })

  it('never renders negative zero and marks a near-zero remainder', () => {
    const negativeZero = formatQuantity(-0, { locale: 'en-US', fractionDigits: 2 })
    const nearZero = formatQuantity(-0.001, { locale: 'en-US', fractionDigits: 2 })
    const exactZero = formatQuantity(0, { locale: 'en-US', fractionDigits: 2 })

    expect(negativeZero.text).toBe('0.00')
    expect(nearZero.text).toBe('≈ 0.00')
    expect(nearZero.title).toBe('-0.001')
    expect(exactZero.text).toBe('0.00')
    expect(exactZero.nearZero).toBe(false)
    expect(exactZero.title).toBeNull()
  })

  it('rounds half away from zero and keeps a tooltip for a hidden fraction', () => {
    expect(formatQuantity(0.5, { locale: 'en-US', fractionDigits: 0 }).text).toBe('1')
    expect(formatQuantity(-0.5, { locale: 'en-US', fractionDigits: 0 }).text).toBe('-1')
    expect(formatQuantity(1.234, { locale: 'en-US', fractionDigits: 2 }).title).toContain('1.234')
    expect(formatQuantity(1.0004, { locale: 'en-US', fractionDigits: 2 }).title).toBeNull()
    expect(formatQuantity(Number.POSITIVE_INFINITY, { locale: 'en-US' }).text).toBe('—')
  })
})

describe('formatPrice', () => {
  it('uses the explicit precision and otherwise the instrument class', () => {
    expect(
      formatPrice(1.23456, { locale: 'en-US', priceDecimals: 3, signDisplay: 'always' }).text
    ).toBe('+1.235')
    expect(formatPrice(50000, { locale: 'en-US', exchange: 'kraken' }).text).toBe('50,000.00')
    expect(formatPrice(-0, { locale: 'en-US', priceDecimals: 2 }).text).toBe('0.00')
  })
})

describe('formatMoney', () => {
  it('formats fiat minor units and shows the exact value only as a tooltip', () => {
    expect(
      formatMoney(1000, { locale: 'en-US', currency: 'USD', signDisplay: 'exceptZero' }).text
    ).toBe('+1,000.00')
    expect(
      formatMoney(1234.5, { locale: 'pl-PL', currency: 'PLN', signDisplay: 'exceptZero' }).text
    ).toBe('+1\u00A0234,50')
    expect(
      formatMoney(1234.5, { locale: 'de-DE', currency: 'EUR', signDisplay: 'exceptZero' }).text
    ).toBe('+1.234,50')
    expect(formatMoney(1.2, { locale: 'en-US', currency: 'JPY' }).text).toBe('1')
    expect(formatMoney(1.2, { locale: 'en-US', currency: 'USDT', fractionDigits: 2 }).text).toBe(
      '1.20'
    )

    const dustPnl = formatMoney(-1.2830999922e-9, { locale: 'en-US', currency: 'EUR' })

    expect(dustPnl.text).toBe('≈ 0.00')
    expect(dustPnl.exactText).toBe('-0.0000000012830999922')
    expect(dustPnl.title).toBe(dustPnl.exactText)
  })

  it('keeps a value smaller than the exact digit budget visible in the tooltip', () => {
    const tiny = formatMoney(1e-30, { locale: 'en-US', currency: 'USD' })

    expect(tiny.text).toBe('≈ 0.00')
    expect(tiny.exactText).not.toBe('0')
    expect(tiny.exactText).toContain('1')
  })
})
