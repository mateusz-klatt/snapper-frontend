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

export const useAiDelegates = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: queryKeys.aiDelegates(),
    queryFn: () => listAiDelegates(),
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useAiDelegate = (publicId: string | null) => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: queryKeys.aiDelegate(publicId ?? ''),
    queryFn: () => getAiDelegate(publicId as string),
    enabled: isAuthenticated && !!publicId,
    throwOnError: false,
  })
}

export const useCreateAiDelegate = () => {
  const queryClient = useQueryClient()

  return useMutation<DelegateCreatedResponse, Error, DelegateCreateBody>({
    mutationFn: body => createAiDelegate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
    },
    gcTime: 0,
  })
}

export const useUpdateAiDelegateCaps = () => {
  const queryClient = useQueryClient()

  return useMutation<DelegateResponse, Error, { publicId: string; body: DelegateCapsUpdateBody }>({
    mutationFn: ({ publicId, body }) => updateAiDelegateCaps(publicId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegate(variables.publicId) })
    },
  })
}

export const useDeactivateAiDelegate = () => {
  const queryClient = useQueryClient()

  return useMutation<DelegateResponse, Error, string>({
    mutationFn: publicId => deactivateAiDelegate(publicId),
    onSuccess: (_data, publicId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegates() })
      queryClient.invalidateQueries({ queryKey: queryKeys.aiDelegate(publicId) })
    },
  })
}
