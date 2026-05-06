import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { FeatureFlagsResponseSchema } from '../schemas/api.generated.zod'
import type { FeatureFlagsResponse } from '../../types/api'

export async function getFeatureFlags(): Promise<FeatureFlagsResponse> {
  const data = await apiClient.getJSON('/api/settings/features')

  return validateResponse(data, FeatureFlagsResponseSchema, '/settings/features')
}
