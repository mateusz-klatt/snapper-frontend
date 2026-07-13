import { useQuery } from '@tanstack/react-query'
import { getPortfolioAccounts } from '../../lib/api/portfolio'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

/**
 * List venue-account truth rows (cash balances + open positions) for the
 * current scope.
 *
 * Same bounded latest-state poll as positions: a 5s refetch interval, disabled
 * while time traveling (``asOf``). The account-observer loop refreshes the
 * server-side truth plane out of band; this query just pulls the latest active
 * row per wallet/exchange/mode. ``dataUpdatedAt``/``isError`` from the returned
 * query drive client-side polling-failure demotion in the page.
 */
export const usePortfolioAccounts = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)
  const walletId = useAppStore(s => s.currentWalletPublicId)

  return useQuery({
    queryKey: queryKeys.portfolioAccounts(asOf, opId, walletId),
    queryFn: async () => {
      const data = await getPortfolioAccounts()

      return data.payload
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
    refetchInterval: asOf ? false : 5_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })
}
