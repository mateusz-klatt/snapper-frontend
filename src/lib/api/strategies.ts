import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { StrategyListResponseSchema } from '../schemas/api.generated.zod'
import type { StrategyListResponse } from '../../types/api'

export async function getStrategies(): Promise<StrategyListResponse> {
  const data = await apiClient.getJSON('/api/strategies')

  return validateResponse(data, StrategyListResponseSchema, '/strategies')
}
