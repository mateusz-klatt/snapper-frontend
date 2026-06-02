import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  BacktestRunListResponseSchema,
  BacktestStrategyClassListResponseSchema,
  BacktestRunResponseSchema,
  BacktestRunDetailResponseSchema,
  BacktestTradeListResponseSchema,
  BacktestSignalListResponseSchema,
  BacktestComparisonResponseSchema,
  BacktestComparisonDetailResponseSchema,
  BacktestComparisonListResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  BacktestRunListResponse,
  BacktestStrategyClassListResponse,
  BacktestRunResponse,
  BacktestRunDetailResponse,
  BacktestTradeListResponse,
  BacktestSignalListResponse,
  BacktestCreateBody,
  BacktestCompareBody,
  BacktestComparisonResponse,
  BacktestComparisonDetailResponse,
  BacktestComparisonListResponse,
} from '../../types/api'

export async function getBacktests(
  limit = 20,
  offset = 0,
  strategy?: string,
  status?: string,
  configHash?: string | null
): Promise<BacktestRunListResponse> {
  const params = new URLSearchParams()

  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (strategy) params.set('strategy', strategy)
  if (status) params.set('status', status)
  if (configHash) params.set('config_hash', configHash)
  const data = await apiClient.getJSON(`/api/backtests?${params.toString()}`)

  return validateResponse(
    data,
    BacktestRunListResponseSchema,
    '/backtests'
  ) as BacktestRunListResponse
}

export async function getBacktest(runId: string): Promise<BacktestRunDetailResponse> {
  const data = await apiClient.getJSON(`/api/backtests/${encodeURIComponent(runId)}`)

  return validateResponse(
    data,
    BacktestRunDetailResponseSchema,
    '/backtests/:id'
  ) as BacktestRunDetailResponse
}

export async function getBacktestStrategyClasses(): Promise<BacktestStrategyClassListResponse> {
  const data = await apiClient.getJSON('/api/backtests/strategy-classes')

  return validateResponse(
    data,
    BacktestStrategyClassListResponseSchema,
    '/backtests/strategy-classes'
  ) as BacktestStrategyClassListResponse
}

export async function createBacktest(body: BacktestCreateBody): Promise<BacktestRunResponse> {
  const data = await apiClient.postJSON('/api/backtests', body)

  return validateResponse(data, BacktestRunResponseSchema, '/backtests POST') as BacktestRunResponse
}

export async function cancelBacktest(runId: string): Promise<BacktestRunResponse> {
  const data = await apiClient.postJSON(`/api/backtests/${encodeURIComponent(runId)}/cancel`, {
    reason: '',
  })

  return validateResponse(
    data,
    BacktestRunResponseSchema,
    '/backtests/:id/cancel'
  ) as BacktestRunResponse
}

export async function rerunBacktest(runId: string): Promise<BacktestRunResponse> {
  const data = await apiClient.postJSON(`/api/backtests/${encodeURIComponent(runId)}/rerun`, {})

  return validateResponse(
    data,
    BacktestRunResponseSchema,
    '/backtests/:id/rerun'
  ) as BacktestRunResponse
}

export async function getBacktestTrades(
  runId: string,
  limit = 100
): Promise<BacktestTradeListResponse> {
  const data = await apiClient.getJSON(
    `/api/backtests/${encodeURIComponent(runId)}/trades?limit=${limit}`
  )

  return validateResponse(
    data,
    BacktestTradeListResponseSchema,
    '/backtests/:id/trades'
  ) as BacktestTradeListResponse
}

export async function getBacktestSignals(
  runId: string,
  limit = 100
): Promise<BacktestSignalListResponse> {
  const data = await apiClient.getJSON(
    `/api/backtests/${encodeURIComponent(runId)}/signals?limit=${limit}`
  )

  return validateResponse(
    data,
    BacktestSignalListResponseSchema,
    '/backtests/:id/signals'
  ) as BacktestSignalListResponse
}

export async function createBacktestComparison(
  body: BacktestCompareBody
): Promise<BacktestComparisonResponse> {
  const data = await apiClient.postJSON('/api/backtests/compare', body)

  return validateResponse(
    data,
    BacktestComparisonResponseSchema,
    '/backtests/compare POST'
  ) as BacktestComparisonResponse
}

export async function getBacktestComparison(
  comparisonPublicId: string
): Promise<BacktestComparisonDetailResponse> {
  const data = await apiClient.getJSON(
    `/api/backtests/compare/${encodeURIComponent(comparisonPublicId)}`
  )

  return validateResponse(
    data,
    BacktestComparisonDetailResponseSchema,
    '/backtests/compare/:id'
  ) as BacktestComparisonDetailResponse
}

export async function getBacktestComparisons(
  limit = 20,
  offset = 0
): Promise<BacktestComparisonListResponse> {
  const params = new URLSearchParams()

  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const data = await apiClient.getJSON(`/api/backtests/compare?${params.toString()}`)

  return validateResponse(
    data,
    BacktestComparisonListResponseSchema,
    '/backtests/compare'
  ) as BacktestComparisonListResponse
}
