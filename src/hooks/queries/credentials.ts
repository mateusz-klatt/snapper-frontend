import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCredentials,
  createCredential,
  rotateCredential,
  setCredentialReconciliationMethod,
} from '../../lib/api/credentials'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type {
  CredentialListResponse,
  CredentialReconciliationMethodResponse,
  CredentialResponse,
  CreateCredentialBody,
  RotateCredentialBody,
  SetCredentialReconciliationMethodBody,
} from '../../types/api'
import { queryKeys } from './keys'

export const useCredentials = (walletPublicId: string) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery<CredentialListResponse>({
    queryKey: queryKeys.credentials(walletPublicId, asOf),
    queryFn: () => getCredentials(walletPublicId),
    enabled: isAuthenticated && !!walletPublicId,
    staleTime: 30 * 1000,
    throwOnError: false,
  })
}

export const useCreateCredential = () => {
  const queryClient = useQueryClient()

  return useMutation<
    CredentialResponse,
    Error,
    { walletPublicId: string; data: CreateCredentialBody }
  >({
    mutationFn: ({ walletPublicId, data }) => createCredential(walletPublicId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credentialsForWallet(variables.walletPublicId),
      })
    },
  })
}

export const useRotateCredential = () => {
  const queryClient = useQueryClient()

  return useMutation<
    CredentialResponse,
    Error,
    { walletPublicId: string; credentialPublicId: string; data: RotateCredentialBody }
  >({
    mutationFn: ({ walletPublicId, credentialPublicId, data }) =>
      rotateCredential(walletPublicId, credentialPublicId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credentialsForWallet(variables.walletPublicId),
      })
    },
  })
}

export const useSetCredentialReconciliationMethod = () => {
  const queryClient = useQueryClient()

  return useMutation<
    CredentialReconciliationMethodResponse,
    Error,
    {
      walletPublicId: string
      credentialPublicId: string
      data: SetCredentialReconciliationMethodBody
    }
  >({
    mutationFn: ({ walletPublicId, credentialPublicId, data }) =>
      setCredentialReconciliationMethod(walletPublicId, credentialPublicId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.credentialsForWallet(variables.walletPublicId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAccountsAll })
    },
  })
}
