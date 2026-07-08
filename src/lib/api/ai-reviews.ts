import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  PendingReviewListResponseSchema,
  AiReviewDecisionResponseSchema,
  AdminAiReviewListResponseSchema,
  type PendingReviewListResponse,
  type AiReviewDecisionResponse,
  type AdminAiReviewListResponse,
} from '../schemas/api.generated.zod'

export async function listAiReviews(
  params: Readonly<{ limit?: number | undefined }> = {}
): Promise<AdminAiReviewListResponse> {
  const search = new URLSearchParams()

  if (params.limit !== undefined) {
    search.set('limit', String(params.limit))
  }

  const qs = search.toString()
  const path = qs ? `/api/ai-reviews?${qs}` : '/api/ai-reviews'
  const data = await apiClient.requestJSON(path, { method: 'GET' })

  return validateResponse(data, AdminAiReviewListResponseSchema, '/ai-reviews')
}

export async function listPendingAiReviews(
  params: Readonly<{ wallet_public_id?: string | undefined; limit?: number | undefined }> = {}
): Promise<PendingReviewListResponse> {
  const search = new URLSearchParams()

  if (params.wallet_public_id !== undefined) {
    search.set('wallet_public_id', params.wallet_public_id)
  }

  if (params.limit !== undefined) {
    search.set('limit', String(params.limit))
  }

  const qs = search.toString()
  const path = qs ? `/api/ai-reviews/pending?${qs}` : '/api/ai-reviews/pending'
  const data = await apiClient.requestJSON(path, { method: 'GET' })

  return validateResponse(data, PendingReviewListResponseSchema, '/ai-reviews/pending')
}

export async function submitAiReviewDecision(
  reviewPublicId: string,
  decision: 'approve' | 'reject',
  rationale?: string
): Promise<AiReviewDecisionResponse> {
  const body: { decision: string; rationale?: string } = { decision }

  if (rationale !== undefined && rationale.length > 0) {
    body.rationale = rationale
  }

  const data = await apiClient.postJSON(
    `/api/ai-reviews/${encodeURIComponent(reviewPublicId)}/decision`,
    body
  )

  return validateResponse(data, AiReviewDecisionResponseSchema, '/ai-reviews/decision POST')
}
