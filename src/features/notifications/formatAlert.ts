import type { TFunction } from 'i18next'
import type { AlertEventInfo } from '../../types/api'

const ALERTS_NAMESPACE_PREFIX = 'alerts.'

/**
 * Build the `{ "0": "...", "1": "..." }` arg map i18next expects when
 * a template uses positional placeholders (`{{0}}`, `{{1}}`, …).
 *
 * Web Phase E sends raw `string[]` over the wire (matches Phase D
 * backend's `_extract_loc_pair` output), so the resolver indexes each
 * arg into its zero-based position.
 */
function argsToObject(args: readonly string[] | null | undefined): Record<string, string> {
  if (!args || args.length === 0) return {}
  const out: Record<string, string> = {}

  args.forEach((value, index) => {
    out[index.toString()] = value
  })

  return out
}

/**
 * Strip the iOS `alerts.` prefix from a wire `loc_key`.
 *
 * The wire keys (matching the iOS xcstrings catalog) all start with
 * `alerts.`, but the frontend catalog file IS the alerts namespace
 * (loaded via `useTranslation('alerts')`), so the runtime key has
 * the prefix removed. Keys without the prefix are returned unchanged
 * (defensive — covers a future contract where the prefix is dropped
 * upstream).
 */
function stripAlertsNamespace(locKey: string): string {
  return locKey.startsWith(ALERTS_NAMESPACE_PREFIX)
    ? locKey.slice(ALERTS_NAMESPACE_PREFIX.length)
    : locKey
}

/**
 * Resolve the alert title via the in-app i18n catalog when the row
 * carries a Phase D `title_loc_key`; otherwise return the server-
 * rendered `alert.title` (which was already localized server-side
 * against the caller's `user.default_language`).
 *
 * The `defaultValue` chain returns `alert.title` whenever i18next
 * cannot resolve the key — covers legacy rows, catalog misses, and
 * unknown languages. Mirrors iOS `AlertEventInfo.displayTitle(in:)`.
 *
 * @param alert Wire row from `/api/alerts/history`.
 * @param t i18next translator scoped to the `'alerts'` namespace.
 */
export function resolveAlertTitle(alert: AlertEventInfo, t: TFunction<'alerts'>): string {
  if (alert.title_loc_key === null || alert.title_loc_key === undefined) {
    return alert.title
  }

  const argsMap = argsToObject(alert.title_loc_args)
  const namespacedKey = stripAlertsNamespace(alert.title_loc_key)

  return t(namespacedKey as never, { ...argsMap, defaultValue: alert.title })
}

/**
 * Body counterpart to {@link resolveAlertTitle}. Same fallback chain.
 */
export function resolveAlertBody(alert: AlertEventInfo, t: TFunction<'alerts'>): string {
  if (alert.body_loc_key === null || alert.body_loc_key === undefined) {
    return alert.body
  }

  const argsMap = argsToObject(alert.body_loc_args)
  const namespacedKey = stripAlertsNamespace(alert.body_loc_key)

  return t(namespacedKey as never, { ...argsMap, defaultValue: alert.body })
}
