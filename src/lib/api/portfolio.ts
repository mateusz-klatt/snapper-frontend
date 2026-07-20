import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  PnlSeriesResponseSchema,
  PortfolioAccountStateListResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  PnlSeriesResponse,
  PortfolioAccountStateListResponse,
  PortfolioPnlGranularity,
} from '../../types/api'

export interface PortfolioPnlSeriesParams {
  mode: string
  granularity: PortfolioPnlGranularity
  from: string
  to: string
}

export async function getPortfolioAccounts(): Promise<PortfolioAccountStateListResponse> {
  const data = await apiClient.getJSON('/api/portfolio/accounts')

  return validateResponse(data, PortfolioAccountStateListResponseSchema, '/portfolio/accounts')
}

export async function getPortfolioPnlSeries(
  params: Readonly<PortfolioPnlSeriesParams>
): Promise<PnlSeriesResponse> {
  const search = new URLSearchParams({
    mode: params.mode,
    granularity: params.granularity,
    from: params.from,
    to: params.to,
  })

  const data = await apiClient.getJSON(`/api/portfolio/pnl/series?${search.toString()}`)

  return validateResponse(data, PnlSeriesResponseSchema, '/portfolio/pnl/series')
}
