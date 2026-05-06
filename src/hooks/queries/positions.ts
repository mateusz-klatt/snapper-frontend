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
    refetchInterval: isAuthenticated && !asOf ? 10000 : false,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const usePositionsSummary = () => {
  const { data: positions, ...rest } = usePositions()
  const summary = React.useMemo(() => {
    if (!positions) return null
    const longCost = positions
      .filter(p => p.quantity > 0)
      .reduce((sum, p) => sum + p.quantity * p.averagePrice, 0)
    const shortCost = positions
      .filter(p => p.quantity < 0)
      .reduce((sum, p) => sum + Math.abs(p.quantity) * p.averagePrice, 0)
    const totalExposure = longCost + shortCost
    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnl + p.realizedPnl, 0)
    const totalValue = totalExposure + totalPnL
    const pnlPercent = totalExposure > 0 ? (totalPnL / totalExposure) * 100 : 0

    return {
      count: positions.length,
      totalValue,
      totalPnL,
      longCost,
      shortCost,
      totalExposure,
      pnlPercent,
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

export const useTrailingStopForCycle = (cyclePublicId: string | undefined) => {
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  return useQuery({
    queryKey: queryKeys.trailingStopForCycle(cyclePublicId),
    queryFn: () => getTrailingStopByCycle(cyclePublicId as string),
    enabled: !!cyclePublicId && !isTimeTraveling,
    refetchInterval: 5000,
  })
}
