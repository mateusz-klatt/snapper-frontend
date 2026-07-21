import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  PnlSeriesResponseSchema,
  PnlTimelineResponseSchema,
  PortfolioAccountStateListResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  PnlSeriesResponse,
  PnlTimelineResponse,
  PortfolioAccountStateListResponse,
  PortfolioPnlGranularity,
} from '../../types/api'

export interface PortfolioPnlSeriesParams {
  mode: string
  granularity: PortfolioPnlGranularity
  from: string
  to: string
  asOf: string | null
  valuationCcy: string
}

export type PortfolioPnlTimelineParams = PortfolioPnlSeriesParams

const buildPnlSearchParams = (params: Readonly<PortfolioPnlSeriesParams>): URLSearchParams => {
  const search = new URLSearchParams({
    mode: params.mode,
    granularity: params.granularity,
    from: params.from,
    to: params.to,
    valuation_ccy: params.valuationCcy,
  })

  if (params.asOf !== null) {
    search.set('as_of', params.asOf)
  }

  return search
}

export async function getPortfolioAccounts(): Promise<PortfolioAccountStateListResponse> {
  const data = await apiClient.getJSON('/api/portfolio/accounts')

  return validateResponse(data, PortfolioAccountStateListResponseSchema, '/portfolio/accounts')
}

export async function getPortfolioPnlSeries(
  params: Readonly<PortfolioPnlSeriesParams>
): Promise<PnlSeriesResponse> {
  const search = buildPnlSearchParams(params)

  const data = await apiClient.getJSON(`/api/portfolio/pnl/series?${search.toString()}`, {
    skipAsOf: true,
  })

  return validateResponse(data, PnlSeriesResponseSchema, '/portfolio/pnl/series')
}

export async function getPortfolioPnlTimeline(
  params: Readonly<PortfolioPnlTimelineParams>
): Promise<PnlTimelineResponse> {
  const search = buildPnlSearchParams(params)
  const data = await apiClient.getJSON(`/api/portfolio/pnl/timeline?${search.toString()}`, {
    skipAsOf: true,
  })

  return validateResponse(data, PnlTimelineResponseSchema, '/portfolio/pnl/timeline')
}
