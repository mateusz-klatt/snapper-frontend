import { useLayoutEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getPortfolioAccounts,
  getPortfolioPnlSeries,
  getPortfolioPnlTimeline,
} from '../../lib/api/portfolio'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type { PortfolioPnlGranularity } from '../../types/api'
import { queryKeys, type PortfolioPnlQueryKeyParams } from './keys'

export interface PortfolioPnlSeriesQueryParams {
  from: string
  to?: string | undefined
  granularity: PortfolioPnlGranularity
  mode: string
  valuationCcy: string
}

export type PortfolioPnlTimelineQueryParams = PortfolioPnlSeriesQueryParams & {
  rollingWindowMs?: number | undefined
}

const TIMELINE_SCOPE_FIELDS = [
  'asOf',
  'operatorPublicId',
  'walletPublicId',
  'to',
  'granularity',
  'mode',
  'valuationCcy',
  'rollingWindowMs',
  'authUserPublicId',
  'authGeneration',
  'authIsAuthenticated',
] as const

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

export const usePortfolioPnlSeries = (params: Readonly<PortfolioPnlSeriesQueryParams>) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const operatorPublicId = useAppStore(s => s.currentOperatorPublicId)
  const walletPublicId = useAppStore(s => s.currentWalletPublicId)

  return useQuery({
    queryKey: queryKeys.portfolioPnlSeries({
      asOf,
      operatorPublicId,
      walletPublicId,
      from: params.from,
      to: params.to,
      granularity: params.granularity,
      mode: params.mode,
      valuationCcy: params.valuationCcy,
    }),
    queryFn: async () => {
      const data = await getPortfolioPnlSeries({
        mode: params.mode,
        granularity: params.granularity,
        from: params.from,
        to: params.to,
        asOf,
        valuationCcy: params.valuationCcy,
      })

      return data.payload
    },
    enabled: isAuthenticated && walletPublicId !== null,
    throwOnError: false,
  })
}

export const usePortfolioPnlTimeline = (
  params: Readonly<PortfolioPnlTimelineQueryParams>,
  enabled: boolean = true
) => {
  const { isAuthenticated, user } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const operatorPublicId = useAppStore(s => s.currentOperatorPublicId)
  const walletPublicId = useAppStore(s => s.currentWalletPublicId)
  const authUserPublicId = user?.public_id ?? null
  const [authScope, setAuthScope] = useState({ isAuthenticated, authUserPublicId, generation: 0 })
  const authChanged =
    authScope.isAuthenticated !== isAuthenticated || authScope.authUserPublicId !== authUserPublicId
  const authGeneration = authScope.generation + (authChanged ? 1 : 0)

  useLayoutEffect(() => {
    if (authChanged) setAuthScope({ isAuthenticated, authUserPublicId, generation: authGeneration })
  }, [authChanged, isAuthenticated, authUserPublicId, authGeneration])

  const keyScope: PortfolioPnlQueryKeyParams = {
    asOf,
    operatorPublicId,
    walletPublicId,
    from: params.from,
    to: params.to,
    granularity: params.granularity,
    mode: params.mode,
    valuationCcy: params.valuationCcy,
    rollingWindowMs: params.rollingWindowMs,
    authUserPublicId,
    authGeneration,
    authIsAuthenticated: isAuthenticated,
  }

  return useQuery({
    queryKey: queryKeys.portfolioPnlTimeline(keyScope),
    queryFn: async () => {
      const data = await getPortfolioPnlTimeline({
        mode: params.mode,
        granularity: params.granularity,
        from: params.from,
        to: params.to,
        asOf,
        valuationCcy: params.valuationCcy,
      })

      return data.payload
    },
    placeholderData: (previousData, previousQuery) => {
      const previous = previousQuery?.queryKey[3] as
        Readonly<PortfolioPnlQueryKeyParams> | undefined

      if (!isAuthenticated || asOf !== null || params.to !== undefined || !previous)
        return undefined
      if (TIMELINE_SCOPE_FIELDS.some(field => previous[field] !== keyScope[field])) return undefined

      const advance = Date.parse(params.from) - Date.parse(previous.from)

      if (
        !Number.isFinite(advance) ||
        advance < 0 ||
        (params.rollingWindowMs === undefined && advance > 60_000)
      )
        return undefined

      return previousData
    },
    enabled: enabled && isAuthenticated && walletPublicId !== null,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })
}
