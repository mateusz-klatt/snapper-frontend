import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPositions,
  createBracket,
  createTrailingStop,
  getTrailingStopByCycle,
} from '../../lib/api/positions'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { positionFromAPI } from '../../lib/transforms'
import type {
  ExecutionPlanResponse,
  BracketCreateBody,
  TrailingStopCreateBody,
} from '../../types/api'
import { queryKeys } from './keys'

/**
 * List wallet positions for the current scope.
 *
 * REST with a bounded latest-state poll: WSDispatcher invalidation on
 * ``order`` / ``execution`` frames stays the low-latency trigger, and a
 * 5s refetch interval covers what events cannot — the executor
 * publishes before the trader commits its projection (the invalidated
 * refetch can win that race), and funding accruals mutate positions
 * with no execution frame at all. Polling is disabled while time
 * traveling (``asOf``). Reconnect invalidates the prefix to catch
 * missed frames.
 */
export const usePositions = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)
  const walletId = useAppStore(s => s.currentWalletPublicId)

  return useQuery({
    queryKey: queryKeys.positions(asOf, opId, walletId),
    queryFn: async () => {
      const data = await getPositions()

      return data.payload.map(positionFromAPI)
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
    refetchInterval: asOf ? false : 5_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
  })
}

/**
 * Preserve position coverage without inventing a portfolio valuation basis.
 *
 * The position projection has no verified reporting currency, settlement or
 * contract multiplier, and no account cash. Its fields cannot establish equity,
 * cross-position monetary totals or a return denominator. Those aggregates stay
 * unknown; the reconstructed P&L timeline supplies explicit valuation coverage.
 */
export const usePositionsSummary = () => {
  const { data: positions, ...rest } = usePositions()
  const summary = React.useMemo(() => {
    if (!positions) return null
    const incompleteValuation = positions.some(position => {
      if (!Number.isFinite(position.quantity)) return true
      if (Math.abs(position.quantity) <= 1e-12) return false

      return [
        position.averagePrice,
        position.markPrice,
        position.unrealizedPnl,
        position.realizedPnl,
      ].some(value => !Number.isFinite(value))
    })

    return {
      count: positions.length,
      totalValue: null,
      totalPnL: null,
      totalUnrealizedPnl: null,
      totalRealizedPnl: null,
      longCost: null,
      shortCost: null,
      totalExposure: null,
      pnlPercent: null,
      incompleteValuation,
      instruments: [...new Set(positions.map(p => p.instrument))],
    }
  }, [positions])

  return {
    data: summary,
    positions,
    ...rest,
  }
}

export const useCreateBracket = () => {
  const queryClient = useQueryClient()

  return useMutation<ExecutionPlanResponse, Error, BracketCreateBody>({
    mutationFn: body => createBracket(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionsAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll })
    },
  })
}

export const useCreateTrailingStop = () => {
  const queryClient = useQueryClient()

  return useMutation<ExecutionPlanResponse, Error, TrailingStopCreateBody>({
    mutationFn: body => createTrailingStop(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionsAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll })
      queryClient.invalidateQueries({ queryKey: queryKeys.trailingStopAll })
    },
  })
}

/**
 * Trailing stop state for one position cycle.
 *
 * Snapshot-only REST: a single fetch on mount, then refreshes are
 * driven by the WSDispatcher's invalidation hook on ``execution``
 * frames (a trail trigger surfaces as a fill execution). Reconnect
 * invalidates the prefix to catch missed frames. Trail-active state
 * transitions that don't fill (e.g. trigger-price moving with the
 * market) do not currently emit a dedicated WS frame and are
 * therefore eventually consistent via reconnect / mount-refetch.
 */
export const useTrailingStopForCycle = (cyclePublicId: string | undefined) => {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: queryKeys.trailingStopForCycle(cyclePublicId),
    queryFn: () => getTrailingStopByCycle(cyclePublicId as string),
    enabled: !!cyclePublicId && !isTimeTraveling,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
