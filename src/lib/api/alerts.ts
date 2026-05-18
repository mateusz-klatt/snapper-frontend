import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { AlertEventResponseSchema, AlertHistoryResponseSchema } from '../schemas/api.generated.zod'
import type { AlertEventResponse, AlertHistoryResponse } from '../../types/api'

const DEFAULT_LIMIT = 50

/**
 * Fetch one page of the authenticated caller's alert history.
 *
 * Pairs with the Phase D backend's `GET /api/alerts/history` keyset
 * pagination — `before` is the opaque cursor from the previous page's
 * `next_cursor` (omit on the first page).
 *
 * The response's `payload[*].title_loc_key` / `body_loc_key` carry the
 * iOS catalog keys when the row is Phase C+ vintage; callers should
 * resolve via `resolveAlertTitle` / `resolveAlertBody` in
 * `features/notifications/formatAlert.ts` to honor the in-app locale
 * picker without a server round-trip.
 */
export async function getAlertHistory(
  before?: string,
  limit: number = DEFAULT_LIMIT
): Promise<AlertHistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit) })

  if (before !== undefined && before !== '') params.set('before', before)
  const data = await apiClient.getJSON(`/api/alerts/history?${params}`)

  return validateResponse(data, AlertHistoryResponseSchema, '/alerts/history')
}

/**
 * Fetch a single alert by its `public_id`.
 *
 * Server returns 404 if the alert is unknown OR owned by another user
 * (ownership leak protection) — both surface as the same APIError to
 * the caller; the detail modal should treat 404 as "alert no longer
 * available" rather than distinguishing the two cases.
 */
export async function getAlert(publicId: string): Promise<AlertEventResponse> {
  const data = await apiClient.getJSON(`/api/alerts/${encodeURIComponent(publicId)}`)

  return validateResponse(data, AlertEventResponseSchema, '/alerts/:public_id')
}
