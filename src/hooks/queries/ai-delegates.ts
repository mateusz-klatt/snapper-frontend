import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAiDelegates,
  getAiDelegate,
  createAiDelegate,
  updateAiDelegateCaps,
  deactivateAiDelegate,
} from '../../lib/api/ai-delegates'
import { useAuth } from '../../stores/auth'
import type {
  DelegateCreateBody,
  DelegateCreatedResponse,
  DelegateResponse,
  DelegateCapsUpdateBody,
} from '../../types/api'
import { queryKeys } from './keys'
import { Permission } from '../../types/permissions.generated'

const permissionDenied = (permission: string): Error =>
  new Error(`Permission denied: ${permission} required`)

export const useAiDelegates = () => {
  const { isAuthenticated, hasPermission } = useAuth()
  const canRead = hasPermission(Permission.READ_AI_INTEGRATION)

  return useQuery({
    queryKey: queryKeys.aiDelegates(),
    queryFn: () => listAiDelegates(),
    enabled: isAuthenticated && canRead,
    throwOnError: false,
  })
}

export const useAiDelegate = (publicId: string | null) => {
  const { isAuthenticated, hasPermission } = useAuth()
  const canRead = hasPermission(Permission.READ_AI_INTEGRATION)

  return useQuery({
    queryKey: queryKeys.aiDelegate(publicId ?? ''),
    queryFn: () => getAiDelegate(publicId as string),
    enabled: isAuthenticated && canRead && !!publicId,
    throwOnError: false,
  })
}

export const useCreateAiDelegate = () => {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  return useMutation<DelegateCreatedResponse, Error, DelegateCreateBody>({
    mutationFn: body => {
      if (!hasPermission(Permission.MANAGE_AI_INTEGRATION)) {
        throw permissionDenied(Permission.MANAGE_AI_INTEGRATION)
      }

      return createAiDelegate(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
    },
    gcTime: 0,
  })
}

export const useUpdateAiDelegateCaps = () => {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  return useMutation<DelegateResponse, Error, { publicId: string; body: DelegateCapsUpdateBody }>({
    mutationFn: ({ publicId, body }) => {
      if (!hasPermission(Permission.MANAGE_AI_INTEGRATION)) {
        throw permissionDenied(Permission.MANAGE_AI_INTEGRATION)
      }

      return updateAiDelegateCaps(publicId, body)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegate(variables.publicId) })
    },
  })
}

export const useDeactivateAiDelegate = () => {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()

  return useMutation<DelegateResponse, Error, string>({
    mutationFn: publicId => {
      if (!hasPermission(Permission.MANAGE_AI_INTEGRATION)) {
        throw permissionDenied(Permission.MANAGE_AI_INTEGRATION)
      }

      return deactivateAiDelegate(publicId)
    },
    onSuccess: (_data, publicId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegate(publicId) })
    },
  })
}
