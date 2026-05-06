import { z } from 'zod'
import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  PositionListResponseSchema,
  ExecutionPlanResponseSchema,
  TrailingStopStateResponseSchema,
  MessageResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  PositionListResponse,
  ExecutionPlanResponse,
  BracketCreateBody,
  BracketCancelBody,
  TrailingStopCreateBody,
  TrailingStopCancelBody,
  TrailingStopByCycleResult,
} from '../../types/api'

const TrailingStopByCycleResultSchema = z.union([
  TrailingStopStateResponseSchema,
  MessageResponseSchema,
])

export async function getPositions(): Promise<PositionListResponse> {
  const data = await apiClient.getJSON('/api/positions')

  return validateResponse(data, PositionListResponseSchema, '/positions')
}

export async function createBracket(body: BracketCreateBody): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON('/api/execution-plans', body)

  return validateResponse(data, ExecutionPlanResponseSchema, '/execution-plans POST')
}

export async function cancelBracket(
  planPublicId: string,
  body?: BracketCancelBody
): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON(
    `/api/execution-plans/${encodeURIComponent(planPublicId)}/cancel`,
    body ?? {}
  )

  return validateResponse(data, ExecutionPlanResponseSchema, '/execution-plans/:id/cancel POST')
}

export async function getBracket(planPublicId: string): Promise<ExecutionPlanResponse> {
  const data = await apiClient.getJSON(`/api/execution-plans/${encodeURIComponent(planPublicId)}`)

  return validateResponse(data, ExecutionPlanResponseSchema, '/execution-plans/:id')
}

export async function createTrailingStop(
  body: TrailingStopCreateBody
): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON('/api/trailing-stops', body)

  return validateResponse(data, ExecutionPlanResponseSchema, '/trailing-stops POST')
}

export async function cancelTrailingStop(
  planPublicId: string,
  body?: TrailingStopCancelBody
): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON(
    `/api/trailing-stops/${encodeURIComponent(planPublicId)}/cancel`,
    body ?? {}
  )

  return validateResponse(data, ExecutionPlanResponseSchema, '/trailing-stops/:id/cancel POST')
}

export async function getTrailingStopByCycle(
  cyclePublicId: string
): Promise<TrailingStopByCycleResult> {
  const data = await apiClient.getJSON(
    `/api/trailing-stops/by-cycle/${encodeURIComponent(cyclePublicId)}`
  )

  return validateResponse(
    data,
    TrailingStopByCycleResultSchema,
    '/trailing-stops/by-cycle/:id'
  ) as TrailingStopByCycleResult
}
