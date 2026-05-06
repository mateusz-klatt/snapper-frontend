import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProcessSchema,
  createProcessConfig,
  getConfiguredProcesses,
  getProcessSummary,
  getAvailableProcesses,
  getProcessRuns,
  startProcessByName,
  stopProcessByName,
} from '../../lib/api/processes'
import { useAppStore } from '../../stores/app'
import type {
  ConfiguredProcessesResponse,
  ProcessSummaryResponse,
  AvailableProcessesResponse,
  ProcessRunsResponse,
  ProcessSchemaResponse,
  ProcessCreateBody,
  ProcessCreateResponse,
} from '../../types/api'
import { queryKeys } from './keys'

export const useStartProcessByName = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      name,
      mode,
      parameters,
    }: {
      name: string
      mode?: 'thread' | 'process' | undefined
      parameters?: Record<string, unknown> | undefined
    }) =>
      startProcessByName(name, {
        ...(mode !== undefined ? { mode } : {}),
        ...(parameters !== undefined ? { parameters } : {}),
      }),
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processStatus })
      queryClient.invalidateQueries({ queryKey: queryKeys.processRuntimeForName(variables.name) })
      queryClient.invalidateQueries({ queryKey: queryKeys.configuredProcessesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.processSummaryAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.strategiesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.availableProcesses })
      queryClient.invalidateQueries({ queryKey: queryKeys.processRunsAll })
    },
  })
}

export const useStopProcessByName = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name }: { name: string }) => stopProcessByName(name),
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processStatus })
      queryClient.invalidateQueries({ queryKey: queryKeys.processRuntimeForName(variables.name) })
      queryClient.invalidateQueries({ queryKey: queryKeys.configuredProcessesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.processSummaryAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.strategiesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.availableProcesses })
      queryClient.invalidateQueries({ queryKey: queryKeys.processRunsAll })
    },
  })
}

export const useConfiguredProcesses = () => {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const asOf = useAppStore(s => s.asOf)

  return useQuery<ConfiguredProcessesResponse>({
    queryKey: queryKeys.configuredProcesses(asOf),
    queryFn: () => getConfiguredProcesses(),
    refetchInterval: isTimeTraveling ? false : 5000,
  })
}

export const useProcessSummary = () => {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const asOf = useAppStore(s => s.asOf)

  return useQuery<ProcessSummaryResponse>({
    queryKey: queryKeys.processSummary(asOf),
    queryFn: () => getProcessSummary(),
    refetchInterval: isTimeTraveling ? false : 5000,
  })
}

export const useAvailableProcesses = () => {
  return useQuery<AvailableProcessesResponse>({
    queryKey: queryKeys.availableProcesses,
    queryFn: () => getAvailableProcesses(),
    staleTime: 5 * 60 * 1000,
  })
}

export const useProcessRuns = (options?: {
  name?: string | undefined
  limit?: number | undefined
  enabled?: boolean
}) => {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const asOf = useAppStore(s => s.asOf)

  return useQuery<ProcessRunsResponse>({
    queryKey: queryKeys.processRuns(options?.name, options?.limit, asOf),
    queryFn: () =>
      getProcessRuns({
        ...(options?.name !== undefined ? { name: options.name } : {}),
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      }),
    refetchInterval: isTimeTraveling ? false : 5000,
    enabled: options?.enabled ?? true,
  })
}

export const useProcessSchema = (name: string, options?: { enabled?: boolean }) => {
  return useQuery<ProcessSchemaResponse>({
    queryKey: queryKeys.processSchema(name),
    queryFn: () => getProcessSchema(name),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateProcessConfig = () => {
  const queryClient = useQueryClient()

  return useMutation<ProcessCreateResponse, Error, ProcessCreateBody>({
    mutationFn: body => createProcessConfig(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configuredProcessesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.processSummaryAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.strategiesAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.availableProcesses })
      queryClient.invalidateQueries({ queryKey: queryKeys.processRunsAll })
    },
  })
}
