import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { HealthCheckResponseSchema } from '../schemas/api.generated.zod'
import type { HealthCheckResponse } from '../../types/api'

export async function getHealth(): Promise<HealthCheckResponse> {
  const data = await apiClient.getJSON('/api/health')

  return validateResponse(data, HealthCheckResponseSchema, '/health')
}
