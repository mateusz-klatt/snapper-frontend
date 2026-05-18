/**
 * Per-user financial-direction color convention preference.
 *
 * Snapper defaults to the Western convention (green = gain / up, red =
 * loss / down). CN / HK / JP / KR markets traditionally invert this —
 * red = up (auspicious / Chinese New Year), green = down. Each user
 * gets a preference that defaults to `auto` (locale-derived) on first
 * run and can be overridden explicitly via Settings.
 *
 * This module is the cross-platform contract: web and iOS share the
 * same enum raw values + storage key + locale-default resolver so a
 * future server-side sync of the preference is a 1-line change.
 */

import type { AppLocale } from '../i18n/types'

export type FinancialColorPreference = 'auto' | 'rising-red' | 'rising-green'

/**
 * Concrete resolved convention — `auto` is never a runtime value
 * downstream of `resolveFinancialColorConvention`.
 */
export type EffectiveFinancialColorConvention = 'rising-red' | 'rising-green'

export const FINANCIAL_COLOR_PREFERENCES: readonly FinancialColorPreference[] = [
  'auto',
  'rising-green',
  'rising-red',
] as const

export const PREFERENCE_STORAGE_KEY = 'snapper-financial-color-preference'

/**
 * Locales that default to the inverted (red = up) convention.
 *
 * The picker layout currently doesn't include `tw` (Taiwan) — adding
 * `tw` would break LocaleSwitcher's hardcoded `COLS = 15` × 3-row
 * model and the locale-parity tests. `hk` proxies Traditional
 * Chinese (`zh-Hant`) for now; a separate locale-picker redesign PR
 * can add `tw` later. TW users wanting the Asian palette can manually
 * pick `rising-red` in Settings.
 */
export const AUTO_RISING_RED_LOCALES: ReadonlySet<AppLocale> = new Set<AppLocale>([
  'cn',
  'hk',
  'jp',
  'kr',
])

/**
 * Map a stored preference + the current locale to the concrete
 * convention that the UI should render.
 *
 * Pure function so the same call can drive: the AppWithAuth.tsx
 * `<html data-color-convention>` mount, the chart-palette helper,
 * the Settings subtitle ("Currently: …"), and any future surface.
 *
 * @param preference Stored user preference (defaults to `auto`).
 * @param locale Active AppLocale from the picker.
 * @returns Either `'rising-red'` or `'rising-green'` — never `'auto'`.
 */
export function resolveFinancialColorConvention(
  preference: FinancialColorPreference,
  locale: AppLocale
): EffectiveFinancialColorConvention {
  if (preference === 'rising-red' || preference === 'rising-green') {
    return preference
  }

  return AUTO_RISING_RED_LOCALES.has(locale) ? 'rising-red' : 'rising-green'
}

/**
 * Type guard for stored / wire values.
 *
 * Used by the store hydration step to fall back to `'auto'` when
 * `localStorage` returns a tampered or version-mismatched value.
 */
export function isFinancialColorPreference(value: unknown): value is FinancialColorPreference {
  return value === 'auto' || value === 'rising-red' || value === 'rising-green'
}

/**
 * Load the stored preference from localStorage, falling back to
 * `'auto'` on missing / invalid / tampered values.
 *
 * Catches a `try`-wrapped exception path so SSR / sandboxed iframe /
 * privacy-mode contexts (no localStorage) don't crash the bootstrap.
 */
export function loadStoredFinancialColorPreference(): FinancialColorPreference {
  try {
    const raw = localStorage.getItem(PREFERENCE_STORAGE_KEY)

    if (isFinancialColorPreference(raw)) return raw
  } catch {
    /* localStorage unavailable; fall through to default */
  }

  return 'auto'
}

/**
 * Persist the preference to localStorage, swallowing exceptions
 * the same way the loader does. The in-memory store value remains
 * authoritative if persistence fails — better than crashing on
 * sandboxed contexts.
 */
export function storeFinancialColorPreference(preference: FinancialColorPreference): void {
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, preference)
  } catch {
    /* localStorage unavailable; in-memory value remains the source of truth */
  }
}
