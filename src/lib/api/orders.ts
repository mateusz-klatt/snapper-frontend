import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  OrderListResponseSchema,
  ExecutionListResponseSchema,
  ExecutionPlanResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  OrderListResponse,
  ExecutionListResponse,
  ExecutionPlanResponse,
} from '../../types/api'

export async function getOrders(
  symbol?: string,
  limit: number = 100,
  offset: number = 0,
  exchange?: string
): Promise<OrderListResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })

  if (symbol) {
    params.set('symbol', symbol)
  }

  if (exchange) {
    params.set('exchange', exchange)
  }

  const data = await apiClient.getJSON(`/api/orders?${params}`)

  return validateResponse(data, OrderListResponseSchema, '/orders')
}

export async function getExecutions(limit: number = 100): Promise<ExecutionListResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  const data = await apiClient.getJSON(`/api/executions?${params}`)

  return validateResponse(data, ExecutionListResponseSchema, '/executions')
}

export async function createOrder(body: Record<string, unknown>): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON('/api/orders', body)

  return validateResponse(data, ExecutionPlanResponseSchema, '/orders POST')
}

export async function cancelOrder(clientOrderId: string): Promise<ExecutionPlanResponse> {
  const data = await apiClient.postJSON(
    `/api/orders/by-client-order-id/${encodeURIComponent(clientOrderId)}/cancel`,
    {}
  )

  return validateResponse(data, ExecutionPlanResponseSchema, '/orders/by-client-order-id/cancel')
}
