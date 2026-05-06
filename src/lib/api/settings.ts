import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  SettingListResponseSchema,
  SettingCategoriesResponseSchema,
  SettingResponseSchema,
  MessageResponseSchema,
} from '../schemas/api.generated.zod'
import type { SettingListResponse, SettingResponse, SettingUpdateBody } from '../../types/api'

export async function getSettings(category?: string): Promise<SettingListResponse> {
  const params = category ? new URLSearchParams({ category }) : ''
  const data = await apiClient.getJSON(`/api/settings${params ? '?' + params : ''}`)

  return validateResponse(data, SettingListResponseSchema, '/settings')
}

export async function getSettingCategories(): Promise<string[]> {
  const data = await apiClient.getJSON('/api/settings/categories')
  const response = validateResponse(data, SettingCategoriesResponseSchema, '/settings/categories')

  return response.payload
}

export async function updateSetting(
  key: string,
  data: SettingUpdateBody
): Promise<SettingResponse> {
  const response = await apiClient.postJSON(`/api/settings/${encodeURIComponent(key)}/set`, data)

  return validateResponse(response, SettingResponseSchema, '/settings/:key/set')
}

export async function removeSetting(key: string): Promise<{ payload: string }> {
  const data = await apiClient.postJSON(`/api/settings/${encodeURIComponent(key)}/remove`, {})

  return validateResponse(data, MessageResponseSchema, '/settings/:key/remove')
}
