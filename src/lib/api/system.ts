import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  SystemStatusResponseSchema,
  SystemMetricsResponseSchema,
  DbStatsResponseSchema,
  NotificationMetricsResponseSchema,
  RetentionRunResponseSchema,
  EgressHealthResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  SystemStatusResponse,
  SystemMetricsResponse,
  DbStatsResponse,
  NotificationMetricsResponse,
  RetentionRunResponse,
  EgressHealthResponse,
} from '../../types/api'

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const data = await apiClient.getJSON('/api/status')

  return validateResponse(data, SystemStatusResponseSchema, '/status')
}

export async function getSystemMetrics(): Promise<SystemMetricsResponse> {
  const data = await apiClient.getJSON('/api/metrics/system')

  return validateResponse(data, SystemMetricsResponseSchema, '/metrics/system')
}

export async function getDbStats(): Promise<DbStatsResponse> {
  const data = await apiClient.getJSON('/api/metrics/db/tables')

  return validateResponse(data, DbStatsResponseSchema, '/metrics/db/tables')
}

export async function getNotificationMetrics(): Promise<NotificationMetricsResponse> {
  const data = await apiClient.getJSON('/api/metrics/notifications')

  return validateResponse(data, NotificationMetricsResponseSchema, '/metrics/notifications')
}

export async function getRetentionRun(): Promise<RetentionRunResponse> {
  const data = await apiClient.getJSON('/api/metrics/retention')

  return validateResponse(data, RetentionRunResponseSchema, '/metrics/retention')
}

export async function getEgressHealth(): Promise<EgressHealthResponse> {
  const data = await apiClient.getJSON('/api/health/egress')

  return validateResponse(data, EgressHealthResponseSchema, '/health/egress')
}
