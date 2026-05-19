import toast from 'react-hot-toast'

import { currentHashQuery } from '../../lib/hash/currentHashQuery'

/**
 * Dismiss the alert toast and deep-link to the alert detail modal.
 *
 * Used by the live-refresh dispatcher (`stores/wsDispatcher.ts`)
 * inside the toast `onClick` handler. The navigation flips the URL
 * hash to `#notifications/{public_id}` so the existing hash-router
 * in `useHashRouting` mounts the `AlertDetailModal` for that alert.
 *
 * The hash-query suffix (`?wallet=&operator=&as_of=`) is preserved
 * via the shared `currentHashQuery()` helper — without preservation
 * the next render of `WalletPicker` / `OperatorPicker` would silently
 * reset scope (see `feedback_locale_switch_no_sync_signal.md` for
 * the equivalent locale-switch race we fixed in PR #113).
 *
 * Side-effect ordering: dismiss BEFORE the hash flip so an in-flight
 * toast does not leak past the navigation; once the toast is gone
 * the hash change drives the modal mount synchronously.
 */
export function openAlertModal(publicId: string, toastId: string): void {
  toast.dismiss(toastId)
  const encoded = encodeURIComponent(publicId)

  globalThis.location.hash = `#notifications/${encoded}${currentHashQuery()}`
}
