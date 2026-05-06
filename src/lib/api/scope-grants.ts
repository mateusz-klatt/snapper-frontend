import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  ScopeGrantListResponseSchema,
  ScopeGrantResponseSchema,
  HandoverScopeGrantResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  ScopeGrantListResponse,
  ScopeGrantResponse,
  HandoverScopeGrantResponse,
  CreateScopeGrantBody,
  HandoverScopeGrantBody,
} from '../../types/api'

export async function getScopeGrants(walletPublicId: string): Promise<ScopeGrantListResponse> {
  const params = new URLSearchParams({ wallet_public_id: walletPublicId })
  const asOf = apiClient.getTimeTravelAsOf()

  if (asOf) {
    params.set('as_of', asOf)
  }

  const data = await apiClient.requestJSON(`/api/scope-grants?${params}`, { method: 'GET' })

  return validateResponse(data, ScopeGrantListResponseSchema, '/scope-grants')
}

export async function createScopeGrant(body: CreateScopeGrantBody): Promise<ScopeGrantResponse> {
  const data = await apiClient.postJSON('/api/scope-grants', body)

  return validateResponse(data, ScopeGrantResponseSchema, '/scope-grants POST')
}

export async function handoverScopeGrant(
  body: HandoverScopeGrantBody
): Promise<HandoverScopeGrantResponse> {
  const data = await apiClient.postJSON('/api/scope-grants/handover', body)

  return validateResponse(data, HandoverScopeGrantResponseSchema, '/scope-grants/handover POST')
}
