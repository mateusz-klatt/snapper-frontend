import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { PortfolioAccountStateListResponseSchema } from '../schemas/api.generated.zod'
import type { PortfolioAccountStateListResponse } from '../../types/api'

export async function getPortfolioAccounts(): Promise<PortfolioAccountStateListResponse> {
  const data = await apiClient.getJSON('/api/portfolio/accounts')

  return validateResponse(data, PortfolioAccountStateListResponseSchema, '/portfolio/accounts')
}
