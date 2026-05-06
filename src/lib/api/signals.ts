import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { SignalListResponseSchema } from '../schemas/api.generated.zod'
import type { SignalListResponse } from '../../types/api'

export async function getSignals(
  strategy?: string,
  limit: number = 100,
  instrument?: string,
  hours: number = 24,
  exchange?: string
): Promise<SignalListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    hours: String(hours),
  })

  if (strategy) params.set('strategy', strategy)
  if (instrument) params.set('instrument', instrument)
  if (exchange) params.set('exchange', exchange)
  const data = await apiClient.getJSON(`/api/signals?${params}`)

  return validateResponse(data, SignalListResponseSchema, '/signals')
}
