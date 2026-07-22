import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAiReviews,
  listPendingAiReviews,
  submitAiReviewDecision,
} from '../../lib/api/ai-reviews'
import { useAuth } from '../../stores/auth'
import {
  type AiReviewActivityFrame,
  AI_REVIEW_ACTIVITY_QUERY_KEY_ROOT,
  aiReviewActivityQueryKey,
} from '../../stores/wsDispatcher'
import { Permission } from '../../types/permissions.generated'
import { queryKeys } from './keys'

/**
 * List pending CONSULT reviews for the authenticated AI delegate.
 *
 * Gated by the effective READ_SIGNALS capability plus a resolved delegate
 * lifecycle identity because the REST snapshot is keyed by
 * ``AuthPrincipal.delegate_public_id``. Pre-empting the call client-side
 * keeps principals without that complete capability and state free of
 * misleading 422 errors.
 *
 * Snapshot-only REST: a single fetch on mount, then refreshes are
 * driven exclusively by the WSDispatcher's invalidation hook on
 * ``ai_review.request`` / ``ai_review.decision_ack`` /
 * ``ai_review.caps_violation`` frames (`refetchType: 'active'` so
 * only mounted observers re-pull). Reconnect invalidates the prefix
 * to catch missed frames.
 */
export const usePendingAiReviews = (
  params: Readonly<{ walletPublicId?: string | null; limit?: number | undefined }> = {}
) => {
  const { isAuthenticated, user, hasPermission } = useAuth()
  const walletPublicId = params.walletPublicId ?? null
  const limit = params.limit ?? null
  const canReadPending = user?.delegate_public_id != null && hasPermission(Permission.READ_SIGNALS)
  const userPublicId = user?.public_id ?? null

  return useQuery({
    queryKey: queryKeys.pendingAiReviews(userPublicId, walletPublicId, limit),
    queryFn: () =>
      listPendingAiReviews({
        ...(walletPublicId === null ? {} : { wallet_public_id: walletPublicId }),
        ...(limit === null ? {} : { limit }),
      }),
    enabled: isAuthenticated && canReadPending && userPublicId !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })
}

const AI_REVIEWS_DEFAULT_LIMIT = 100

/**
 * List AI reviews (newest-first) for the audit view.
 *
 * Backs the read-only "AI decisions" surface for principals with the
 * effective READ_AI_REVIEWS permission. Snapshot poll (30s) plus
 * refetch-on-focus keeps decisions fresh without a manual reload.
 */
export const useAiReviews = (limit: number = AI_REVIEWS_DEFAULT_LIMIT) => {
  const { isAuthenticated, hasPermission } = useAuth()
  const canReadDecisions = hasPermission(Permission.READ_AI_REVIEWS)

  return useQuery({
    queryKey: queryKeys.aiReviews(limit),
    queryFn: () => listAiReviews({ limit }),
    enabled: isAuthenticated && canReadDecisions,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    throwOnError: false,
  })
}

/**
 * Submit an AI delegate's approve/reject decision on a pending review.
 *
 * Optimistically invalidates the pending-reviews snapshot on success so
 * the inbox visibly drops the resolved row before the next 5s poll
 * refetches the authoritative list. The WS-driven activity stream
 * receives the ``ai_review.decision_ack`` frame independently so the
 * Recent Activity panel updates without invalidation here.
 *
 * Note: the invalidation key is the canonical `pendingAiReviewsAll`
 * prefix, NOT the historical `['pending-ai-reviews']` literal which
 * never matched the actual `['ai-reviews', 'pending', ...]` query key.
 */
export const useSubmitAiReviewDecision = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      reviewPublicId,
      decision,
      rationale,
    }: {
      reviewPublicId: string
      decision: 'approve' | 'reject'
      rationale?: string | undefined
    }) => submitAiReviewDecision(reviewPublicId, decision, rationale),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pendingAiReviewsAll })
    },
  })
}

/**
 * Read-only view onto the WS-driven AI review activity ring buffer
 * maintained by :class:`WSDispatcher`.
 *
 * The dispatcher merges :data:`AiReviewRequestFrameData`,
 * :data:`AiReviewDecisionAckFrameData`, and
 * :data:`AiReviewCapsViolationFrameData` envelopes into the
 * ``['ai-review-activity']`` cache deduped by
 * ``(type, review_public_id, dispatch_version)`` and capped at
 * :data:`AI_REVIEW_ACTIVITY_RING_CAP`.
 *
 * Unlike :func:`usePendingAiReviews` this hook needs no client capability
 * gate because the server filters frames by effective permissions and
 * delegate lifecycle state before they enter this cache.
 */
export const useAiReviewActivity = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userPublicId = user?.public_id ?? null
  const queryKey = React.useMemo(() => aiReviewActivityQueryKey(userPublicId), [userPublicId])
  const subscribe = React.useCallback(
    (notify: () => void) => {
      const unsubscribe = queryClient.getQueryCache().subscribe(event => {
        const eventKey = event.query.queryKey

        if (eventKey[0] === AI_REVIEW_ACTIVITY_QUERY_KEY_ROOT && eventKey[1] === userPublicId) {
          notify()
        }
      })

      return unsubscribe
    },
    [queryClient, userPublicId]
  )
  const getSnapshot = React.useCallback(
    () =>
      (queryClient.getQueryData(queryKey) ??
        EMPTY_AI_REVIEW_ACTIVITY) as readonly AiReviewActivityFrame[],
    [queryClient, queryKey]
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

const EMPTY_AI_REVIEW_ACTIVITY: readonly AiReviewActivityFrame[] = []
