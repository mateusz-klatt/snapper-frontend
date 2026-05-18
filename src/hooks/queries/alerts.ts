import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getAlert, getAlertHistory } from '../../lib/api/alerts'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

/**
 * Maximum number of alerts the UI will render through `useAlertHistory`.
 *
 * Keeps the in-memory page list bounded (50 alerts × 10 pages) — beyond
 * this, the "Load more" control disables itself and the footer surfaces
 * a "older alerts are available via API/iOS" message. Bursty alert
 * volume during incidents stays renderable; long-tail history reads
 * are out of scope for this surface.
 */
export const ALERT_HISTORY_DISPLAY_CAP = 500

const ALERT_HISTORY_PAGE_SIZE = 50

/**
 * Cursor-paginated alert history for the authenticated caller.
 *
 * Uses TanStack Query's `useInfiniteQuery` against the Phase D backend
 * keyset cursor (`AlertHistoryResponse.next_cursor`). The query is
 * scoped to the current `asOf` / operator / wallet picker triple so
 * impersonation + time-travel both invalidate cleanly.
 *
 * The hook does NOT auto-fetch beyond the first page — the caller
 * triggers `fetchNextPage` from a "Load more" button. Hard cap of
 * `ALERT_HISTORY_DISPLAY_CAP` alerts is enforced by the consuming
 * component, not by this hook (the hook would otherwise have to know
 * about UI behavior).
 */
export const useAlertHistory = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const operatorPublicId = useAppStore(s => s.currentOperatorPublicId)
  const walletPublicId = useAppStore(s => s.currentWalletPublicId)

  return useInfiniteQuery({
    queryKey: queryKeys.alertHistory(asOf, operatorPublicId, walletPublicId),
    queryFn: ({ pageParam }) => getAlertHistory(pageParam, ALERT_HISTORY_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.next_cursor ?? undefined,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

/**
 * Singleton fetch for a single alert by `public_id`.
 *
 * Used by the detail modal when the user clicks a list row (in-cache
 * via the history list) AND when the user deep-links to a row that
 * isn't in the currently-loaded pages. Returns 404 (via APIError)
 * for unknown OR foreign-owned ids — both are caller-indistinguishable
 * by design.
 */
export const useAlert = (publicId: string | undefined) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: queryKeys.alert(publicId),
    queryFn: () => getAlert(publicId as string),
    enabled: isAuthenticated && publicId !== undefined,
    throwOnError: false,
  })
}
