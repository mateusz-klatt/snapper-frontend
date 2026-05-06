import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  DelegateListResponseSchema,
  DelegateResponseSchema,
  DelegateCreatedResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  DelegateListResponse,
  DelegateResponse,
  DelegateCreatedResponse,
  DelegateCreateBody,
  DelegateCapsUpdateBody,
} from '../../types/api'

export async function listAiDelegates(): Promise<DelegateListResponse> {
  const data = await apiClient.getJSON('/api/ai-delegates')

  return validateResponse(data, DelegateListResponseSchema, '/ai-delegates')
}

export async function getAiDelegate(publicId: string): Promise<DelegateResponse> {
  const data = await apiClient.getJSON(`/api/ai-delegates/${encodeURIComponent(publicId)}`)

  return validateResponse(data, DelegateResponseSchema, '/ai-delegates/{id}')
}

export async function createAiDelegate(body: DelegateCreateBody): Promise<DelegateCreatedResponse> {
  const data = await apiClient.postJSON('/api/ai-delegates', body)

  return validateResponse(data, DelegateCreatedResponseSchema, '/ai-delegates')
}

export async function updateAiDelegateCaps(
  publicId: string,
  body: DelegateCapsUpdateBody
): Promise<DelegateResponse> {
  const data = await apiClient.patchJSON(`/api/ai-delegates/${encodeURIComponent(publicId)}`, body)

  return validateResponse(data, DelegateResponseSchema, '/ai-delegates/{id}')
}

export async function deactivateAiDelegate(publicId: string): Promise<DelegateResponse> {
  const data = await apiClient.postJSON(
    `/api/ai-delegates/${encodeURIComponent(publicId)}/deactivate`
  )

  return validateResponse(data, DelegateResponseSchema, '/ai-delegates/{id}/deactivate')
}
