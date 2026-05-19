/**
 * Extract the `?param=value` suffix of the current hash, if any.
 *
 * The app's hash routing carries scope query params (`?wallet=X`,
 * `?operator=Y`, `?as_of=Z`) appended to the tab segment. When code
 * rewrites the hash (e.g. to open a detail modal or navigate from a
 * toast click) we MUST preserve that suffix; otherwise the next
 * render of the `WalletPicker` / `OperatorPicker` would see them
 * dropped and silently reset scope.
 *
 * Shared between `Notifications.tsx` (Phase E Alerts tab) and the
 * `openAlertModal` helper invoked by the WS live-refresh toast
 * click-handler so navigation triggered from either path keeps the
 * same suffix-preservation invariant.
 */
export function currentHashQuery(): string {
  const hash = globalThis.location.hash
  const qIdx = hash.indexOf('?')

  return qIdx === -1 ? '' : hash.slice(qIdx)
}
