import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPendingAiReviews, submitAiReviewDecision } from '../../lib/api/ai-reviews'
import { useAuth } from '../../stores/auth'
import {
  type AiReviewActivityFrame,
  AI_REVIEW_ACTIVITY_QUERY_KEY_ROOT,
  aiReviewActivityQueryKey,
} from '../../stores/wsDispatcher'
import { queryKeys } from './keys'

const PENDING_AI_REVIEWS_REFETCH_MS = 5_000

/**
 * List pending CONSULT reviews for the authenticated AI delegate.
 *
 * Gated by ``role === 'ai_delegate'`` because the REST endpoint
 * (`GET /api/ai-reviews/pending`) returns 422 for any other role:
 * the snapshot is keyed by ``AuthPrincipal.delegate_public_id`` which
 * is only populated for delegate principals. Pre-empting the call
 * client-side keeps non-delegate UIs free of misleading 422 errors.
 *
 * Refetches every 5s plus on window focus so the inbox stays
 * eventually consistent with the WS-driven activity stream after
 * disconnect / reconnect.
 */
export const usePendingAiReviews = (
  params: Readonly<{ walletPublicId?: string | null; limit?: number | undefined }> = {}
) => {
  const { isAuthenticated, user } = useAuth()
  const walletPublicId = params.walletPublicId ?? null
  const limit = params.limit ?? null
  const isDelegate = user?.role === 'ai_delegate'
  const userPublicId = user?.public_id ?? null

  return useQuery({
    queryKey: queryKeys.pendingAiReviews(userPublicId, walletPublicId, limit),
    queryFn: () =>
      listPendingAiReviews({
        ...(walletPublicId === null ? {} : { wallet_public_id: walletPublicId }),
        ...(limit === null ? {} : { limit }),
      }),
    enabled: isAuthenticated && isDelegate && userPublicId !== null,
    refetchInterval: PENDING_AI_REVIEWS_REFETCH_MS,
    refetchOnWindowFocus: true,
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
 * Unlike :func:`usePendingAiReviews` this hook does not gate by role
 * because non-delegate sockets receive zero ai_reviews frames anyway
 * (the WS scope filter at ``snapper.interface.websocket.scope_filter``
 * drops them), so the cache stays empty for non-delegates without
 * extra logic here.
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
