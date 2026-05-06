import React, { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSignals } from '../../lib/api/signals'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { safeSignalFromAPI } from '../../lib/transforms'
import { queryKeys } from './keys'

export const useSignals = (
  strategyId: string | undefined,
  limit: number,
  instrument?: string,
  hours = 24
) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)
  const walletId = useAppStore(s => s.currentWalletPublicId)
  const selectSignals = useCallback(
    (data: Awaited<ReturnType<typeof getSignals>>) =>
      data.payload.map(safeSignalFromAPI).filter((s): s is NonNullable<typeof s> => s !== null),
    []
  )

  return useQuery({
    queryKey: queryKeys.signals(strategyId, limit, instrument, hours, asOf, opId, walletId),
    queryFn: () => getSignals(strategyId, limit, instrument, hours),
    select: selectSignals,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useLatestSignals = (limit: number = 10) => {
  const { data: signals, ...rest } = useSignals(undefined, 50)
  const latestSignals = React.useMemo(() => {
    if (!signals) return []

    return signals
      .toSorted((a, b) => (b.firedAt?.getTime() ?? 0) - (a.firedAt?.getTime() ?? 0))
      .slice(0, limit)
  }, [signals, limit])

  return {
    data: latestSignals,
    ...rest,
  }
}
