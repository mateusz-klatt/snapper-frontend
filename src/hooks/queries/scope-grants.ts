import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScopeGrants, createScopeGrant, handoverScopeGrant } from '../../lib/api/scope-grants'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type {
  ScopeGrantListResponse,
  ScopeGrantResponse,
  CreateScopeGrantBody,
  HandoverScopeGrantBody,
  HandoverScopeGrantResponse,
} from '../../types/api'
import { queryKeys } from './keys'

export const useScopeGrants = (walletPublicId: string) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery<ScopeGrantListResponse>({
    queryKey: queryKeys.scopeGrants(walletPublicId, asOf),
    queryFn: () => getScopeGrants(walletPublicId),
    enabled: isAuthenticated && !!walletPublicId,
    staleTime: 30 * 1000,
    throwOnError: false,
  })
}

export const useCreateScopeGrant = () => {
  const queryClient = useQueryClient()

  return useMutation<ScopeGrantResponse, Error, CreateScopeGrantBody>({
    mutationFn: data => createScopeGrant(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scope-grants', variables.wallet_public_id],
      })
    },
  })
}

export const useHandoverScopeGrant = () => {
  const queryClient = useQueryClient()

  return useMutation<HandoverScopeGrantResponse, Error, HandoverScopeGrantBody>({
    mutationFn: data => handoverScopeGrant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-grants'] })
    },
  })
}
