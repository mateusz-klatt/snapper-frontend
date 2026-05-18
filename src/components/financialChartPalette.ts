/**
 * Resolve candle up/down colors from the currently-mounted CSS vars.
 *
 * Reads `--color-rising-500` / `--color-falling-500` from
 * `<html>`, which `AppWithAuth.tsx` keeps in sync with the user's
 * financial-color preference (auto-derived from locale or explicit
 * Settings choice). Falls back to the Western hex on the rare race
 * where the document attribute hasn't mounted yet.
 *
 * Lives in its own module (rather than alongside the
 * `LightweightChart` component) so Vite fast-refresh keeps working
 * on the component file — co-locating non-component exports in a
 * `.tsx` breaks HMR per react-refresh/only-export-components.
 *
 * `lightweight-charts` doesn't consume CSS vars directly — it
 * stores hex on a `CandlestickSeries` via `applyOptions(...)`. This
 * helper is the bridge.
 */
export function getFinancialChartPalette(): { upColor: string; downColor: string } {
  if (typeof window === 'undefined') {
    return { upColor: '#0b8f4d', downColor: '#8b1025' }
  }

  const style = getComputedStyle(document.documentElement)
  const upColor = style.getPropertyValue('--color-rising-500').trim() || '#0b8f4d'
  const downColor = style.getPropertyValue('--color-falling-500').trim() || '#8b1025'

  return { upColor, downColor }
}
