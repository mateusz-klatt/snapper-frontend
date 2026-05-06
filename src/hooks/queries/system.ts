import { useQuery } from '@tanstack/react-query'
import {
  getSystemStatus,
  getSystemMetrics,
  getDbStats,
  getNotificationMetrics,
  getRetentionRun,
} from '../../lib/api/system'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

export const useSystemStatus = () => {
  const { isAuthenticated } = useAuth()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: () => getSystemStatus(),
    refetchInterval: isAuthenticated && !isTimeTraveling ? 30000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useSystemMetrics = () => {
  const { isAuthenticated } = useAuth()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: ['system', 'metrics'] as const,
    queryFn: () => getSystemMetrics(),
    refetchInterval: isAuthenticated && !isTimeTraveling ? 10000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useDbStats = () => {
  const { isAuthenticated } = useAuth()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: ['system', 'db-stats'] as const,
    queryFn: () => getDbStats(),
    refetchInterval: isAuthenticated && !isTimeTraveling ? 30000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useNotificationMetrics = () => {
  const { isAuthenticated } = useAuth()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: ['system', 'notification-metrics'] as const,
    queryFn: () => getNotificationMetrics(),
    refetchInterval: isAuthenticated && !isTimeTraveling ? 30000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useRetentionRun = () => {
  const { isAuthenticated } = useAuth()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: ['system', 'retention'] as const,
    queryFn: () => getRetentionRun(),
    refetchInterval: isAuthenticated && !isTimeTraveling ? 60000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}
