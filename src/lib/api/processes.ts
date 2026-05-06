import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  ProcessSchemaResponseSchema,
  ProcessCreateResponseSchema,
  ConfiguredProcessesResponseSchema,
  ProcessSummaryResponseSchema,
  AvailableProcessesResponseSchema,
  ProcessRunsResponseSchema,
  ProcessStartResponseSchema,
  ProcessStopResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  ProcessSchemaResponse,
  ProcessCreateBody,
  ProcessCreateResponse,
  ConfiguredProcessesResponse,
  ProcessSummaryResponse,
  AvailableProcessesResponse,
  ProcessRunsResponse,
  ProcessStartBody,
  ProcessStartResponse,
  ProcessStopResponse,
} from '../../types/api'

export async function getProcessSchema(name: string): Promise<ProcessSchemaResponse> {
  const data = await apiClient.getJSON(`/api/processes/schema/${encodeURIComponent(name)}`)

  return validateResponse(data, ProcessSchemaResponseSchema, '/processes/schema/:name')
}

export async function createProcessConfig(body: ProcessCreateBody): Promise<ProcessCreateResponse> {
  const data = await apiClient.postJSON('/api/processes', body)

  return validateResponse(data, ProcessCreateResponseSchema, '/processes')
}

export async function getConfiguredProcesses(): Promise<ConfiguredProcessesResponse> {
  const data = await apiClient.getJSON('/api/processes/configured')

  return validateResponse(data, ConfiguredProcessesResponseSchema, '/processes/configured')
}

export async function getProcessSummary(): Promise<ProcessSummaryResponse> {
  const data = await apiClient.getJSON('/api/processes/summary')

  return validateResponse(data, ProcessSummaryResponseSchema, '/processes/summary')
}

export async function getAvailableProcesses(): Promise<AvailableProcessesResponse> {
  const data = await apiClient.getJSON('/api/processes/available')

  return validateResponse(data, AvailableProcessesResponseSchema, '/processes/available')
}

export async function getProcessRuns(options?: {
  limit?: number
  name?: string
}): Promise<ProcessRunsResponse> {
  const params = new URLSearchParams()

  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.name) params.set('name', options.name)
  const query = params.toString()
  const data = await apiClient.getJSON(`/api/processes/runs${query ? '?' + query : ''}`)

  return validateResponse(data, ProcessRunsResponseSchema, '/processes/runs')
}

export async function startProcessByName(
  name: string,
  options?: ProcessStartBody
): Promise<ProcessStartResponse> {
  const data = await apiClient.postJSON(
    `/api/processes/${encodeURIComponent(name)}/start`,
    options || {}
  )

  return validateResponse(data, ProcessStartResponseSchema, '/processes/:name/start')
}

export async function stopProcessByName(name: string): Promise<ProcessStopResponse> {
  const data = await apiClient.postJSON(`/api/processes/${encodeURIComponent(name)}/stop`)

  return validateResponse(data, ProcessStopResponseSchema, '/processes/:name/stop')
}
