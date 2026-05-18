import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTO_RISING_RED_LOCALES,
  FINANCIAL_COLOR_PREFERENCES,
  PREFERENCE_STORAGE_KEY,
  isFinancialColorPreference,
  loadStoredFinancialColorPreference,
  resolveFinancialColorConvention,
  storeFinancialColorPreference,
  type FinancialColorPreference,
} from './financialColorPreference'
import type { AppLocale } from '../i18n/types'
import { SUPPORTED_LOCALES } from '../i18n/types'

describe('resolveFinancialColorConvention', () => {
  it('returns rising-red for every locale in AUTO_RISING_RED_LOCALES when preference is auto', () => {
    for (const locale of AUTO_RISING_RED_LOCALES) {
      expect(resolveFinancialColorConvention('auto', locale)).toBe('rising-red')
    }
  })

  it('returns rising-green for every non-Asian locale when preference is auto', () => {
    const western = SUPPORTED_LOCALES.filter(l => !AUTO_RISING_RED_LOCALES.has(l))

    expect(western.length).toBeGreaterThan(35)

    for (const locale of western) {
      expect(resolveFinancialColorConvention('auto', locale)).toBe('rising-green')
    }
  })

  it('returns the explicit preference for rising-red regardless of locale', () => {
    const sampleLocales: AppLocale[] = ['us', 'cn', 'pl', 'jp']

    for (const locale of sampleLocales) {
      expect(resolveFinancialColorConvention('rising-red', locale)).toBe('rising-red')
    }
  })

  it('returns the explicit preference for rising-green regardless of locale', () => {
    const sampleLocales: AppLocale[] = ['us', 'cn', 'pl', 'jp']

    for (const locale of sampleLocales) {
      expect(resolveFinancialColorConvention('rising-green', locale)).toBe('rising-green')
    }
  })
})

describe('AUTO_RISING_RED_LOCALES', () => {
  it('locks the auto-flip locale set to cn / hk / jp / kr (4 entries)', () => {
    expect(AUTO_RISING_RED_LOCALES.size).toBe(4)
    expect(AUTO_RISING_RED_LOCALES.has('cn')).toBe(true)
    expect(AUTO_RISING_RED_LOCALES.has('hk')).toBe(true)
    expect(AUTO_RISING_RED_LOCALES.has('jp')).toBe(true)
    expect(AUTO_RISING_RED_LOCALES.has('kr')).toBe(true)
  })

  it('explicitly excludes `tw` (deferred to a separate AppLocale-add PR)', () => {
    expect(AUTO_RISING_RED_LOCALES.has('tw' as AppLocale)).toBe(false)
  })
})

describe('isFinancialColorPreference', () => {
  it('accepts the 3 enum values', () => {
    expect(isFinancialColorPreference('auto')).toBe(true)
    expect(isFinancialColorPreference('rising-red')).toBe(true)
    expect(isFinancialColorPreference('rising-green')).toBe(true)
  })

  it('rejects strings, numbers, null, undefined, and objects', () => {
    expect(isFinancialColorPreference('green')).toBe(false)
    expect(isFinancialColorPreference('')).toBe(false)
    expect(isFinancialColorPreference(null)).toBe(false)
    expect(isFinancialColorPreference(undefined)).toBe(false)
    expect(isFinancialColorPreference(0)).toBe(false)
    expect(isFinancialColorPreference({ value: 'auto' })).toBe(false)
  })
})

describe('FINANCIAL_COLOR_PREFERENCES', () => {
  it('exposes the 3 enum values in a stable order for Settings UI iteration', () => {
    expect(FINANCIAL_COLOR_PREFERENCES).toEqual(['auto', 'rising-green', 'rising-red'])
  })

  it('contains every value that the type guard accepts', () => {
    const candidates: FinancialColorPreference[] = ['auto', 'rising-red', 'rising-green']

    for (const c of candidates) {
      expect(FINANCIAL_COLOR_PREFERENCES.includes(c)).toBe(true)
    }
  })
})

describe('PREFERENCE_STORAGE_KEY', () => {
  it('exposes a stable storage key shared with iOS', () => {
    expect(PREFERENCE_STORAGE_KEY).toBe('snapper-financial-color-preference')
  })
})

describe('loadStoredFinancialColorPreference + storeFinancialColorPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns `auto` when storage is empty', () => {
    expect(loadStoredFinancialColorPreference()).toBe('auto')
  })

  it('round-trips each enum value through localStorage', () => {
    for (const pref of FINANCIAL_COLOR_PREFERENCES) {
      storeFinancialColorPreference(pref)
      expect(loadStoredFinancialColorPreference()).toBe(pref)
    }
  })

  it('falls back to `auto` on tampered / invalid stored values', () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, 'green-up')
    expect(loadStoredFinancialColorPreference()).toBe('auto')

    localStorage.setItem(PREFERENCE_STORAGE_KEY, '')
    expect(loadStoredFinancialColorPreference()).toBe('auto')

    localStorage.setItem(PREFERENCE_STORAGE_KEY, '{}')
    expect(loadStoredFinancialColorPreference()).toBe('auto')
  })

  it('falls back to `auto` and does not throw when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })

    expect(loadStoredFinancialColorPreference()).toBe('auto')
  })

  it('swallows localStorage.setItem failures so the UI does not crash on sandboxed contexts', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => storeFinancialColorPreference('rising-red')).not.toThrow()
  })
})
