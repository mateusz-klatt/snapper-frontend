import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScopeGrants, createScopeGrant, handoverScopeGrant } from '../../lib/api/scope-grants'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type {
  ScopeGrantInfo,
  ScopeGrantListResponse,
  ScopeGrantResponse,
  CreateScopeGrantBody,
  HandoverScopeGrantBody,
  HandoverScopeGrantResponse,
} from '../../types/api'
import { queryKeys } from './keys'
import { useInvalidatingMutation } from './mutations'

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

export interface AllScopeGrantsResult {
  readonly grants: ScopeGrantInfo[]
  readonly isLoading: boolean
  readonly error: Error | null
}

/**
 * Aggregate active scope grants across many wallets by fanning the
 * per-wallet REST endpoint out over `useQueries`.
 *
 * The backend exposes only `list_scope_grants(wallet_public_id)`; there
 * is no cross-wallet endpoint. The admin "All wallets" view therefore
 * runs one query per wallet and flattens the payloads. Each grant
 * already carries its own `wallet_public_id`, so the caller can label
 * rows without extra lookups. Passing an empty id list issues no
 * requests (the single-wallet path stays active instead).
 */
export const useAllScopeGrants = (walletPublicIds: readonly string[]): AllScopeGrantsResult => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  const results = useQueries({
    queries: walletPublicIds.map(walletPublicId => ({
      queryKey: queryKeys.scopeGrants(walletPublicId, asOf),
      queryFn: () => getScopeGrants(walletPublicId),
      enabled: isAuthenticated,
      staleTime: 30 * 1000,
      throwOnError: false,
    })),
  })

  const grants = results.flatMap(result => result.data?.payload ?? [])
  const isLoading = results.some(result => result.isLoading)
  const error = results.find(result => result.error)?.error ?? null

  return { grants, isLoading, error }
}

export const useCreateScopeGrant = () =>
  useInvalidatingMutation<ScopeGrantResponse, CreateScopeGrantBody>({
    mutationFn: data => createScopeGrant(data),
    invalidate: (_data, variables) => queryKeys.scopeGrantsForWallet(variables.wallet_public_id),
  })

export const useHandoverScopeGrant = () => {
  const queryClient = useQueryClient()

  return useMutation<HandoverScopeGrantResponse, Error, HandoverScopeGrantBody>({
    mutationFn: data => handoverScopeGrant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scopeGrantsAll })
    },
  })
}
