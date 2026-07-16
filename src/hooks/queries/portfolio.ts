import { useQuery } from '@tanstack/react-query'
import { getPortfolioAccounts } from '../../lib/api/portfolio'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

/**
 * List venue-account truth rows (cash balances + open positions) for the
 * current scope.
 *
 * WebSocket account-state events invalidate the active query for low-latency
 * refreshes. A 60s safety-net poll, disabled while time traveling (``asOf``),
 * heals dropped events and keeps ``dataUpdatedAt`` meaningful as a transport
 * liveness signal. The account-observer loop refreshes the server-side truth
 * plane out of band; this query pulls its latest active row per
 * wallet/exchange/mode.
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
    refetchInterval: asOf ? false : 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })
}
