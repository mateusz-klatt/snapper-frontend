import { useQuery } from '@tanstack/react-query'
import { createOperator, getOperators, getWallets } from '../../lib/api/wallets'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type { CreateOperatorBody, OperatorResponse } from '../../types/api'
import { queryKeys } from './keys'
import { useInvalidatingMutation } from './mutations'

export const useOperators = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.operators(asOf),
    queryFn: () => getOperators(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    throwOnError: false,
  })
}

export const useCreateOperator = () =>
  useInvalidatingMutation<OperatorResponse, CreateOperatorBody>({
    mutationFn: data => createOperator(data),
    invalidate: queryKeys.operatorsAll,
  })

export const useWallets = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)

  return useQuery({
    queryKey: queryKeys.wallets(asOf, opId),
    queryFn: () => getWallets(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    throwOnError: false,
  })
}
