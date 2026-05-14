import { useQuery } from '@tanstack/react-query'
import { getStrategies } from '../../lib/api/strategies'
import { useAppStore } from '../../stores/app'
import type { StrategyListResponse } from '../../types/api'
import { queryKeys } from './keys'

export const useStrategies = () => {
  const asOf = useAppStore(s => s.asOf)

  return useQuery<StrategyListResponse>({
    queryKey: queryKeys.strategies(asOf),
    queryFn: () => getStrategies(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
