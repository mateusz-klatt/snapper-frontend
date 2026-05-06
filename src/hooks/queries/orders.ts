import React, { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, getExecutions, createOrder, cancelOrder } from '../../lib/api/orders'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { safeOrderFromAPI, safeExecutionFromAPI } from '../../lib/transforms'
import type { ExecutionPlanResponse } from '../../types/api'
import { queryKeys } from './keys'

export const useOrders = (filters?: { symbol?: string; limit?: number; offset?: number }) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)
  const walletId = useAppStore(s => s.currentWalletPublicId)
  const selectOrders = useCallback(
    (data: Awaited<ReturnType<typeof getOrders>>) =>
      data.payload.map(safeOrderFromAPI).filter((o): o is NonNullable<typeof o> => o !== null),
    []
  )

  return useQuery({
    queryKey: queryKeys.orders(filters, asOf, opId, walletId),
    queryFn: () => getOrders(filters?.symbol, filters?.limit, filters?.offset),
    select: selectOrders,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useExecutions = (filters?: { limit?: number }) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const opId = useAppStore(s => s.currentOperatorPublicId)
  const walletId = useAppStore(s => s.currentWalletPublicId)
  const selectExecutions = useCallback(
    (data: Awaited<ReturnType<typeof getExecutions>>) =>
      data.payload.map(safeExecutionFromAPI).filter((e): e is NonNullable<typeof e> => e !== null),
    []
  )

  return useQuery({
    queryKey: queryKeys.executions(filters, asOf, opId, walletId),
    queryFn: () => getExecutions(filters?.limit),
    select: selectExecutions,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation<ExecutionPlanResponse, Error, Record<string, unknown>>({
    mutationFn: body => createOrder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll })
    },
  })
}

export const useCancelOrder = () => {
  const queryClient = useQueryClient()

  return useMutation<ExecutionPlanResponse, Error, string>({
    mutationFn: clientOrderId => cancelOrder(clientOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll })
    },
  })
}

export const useOrdersGrouped = (filters?: {
  symbol?: string
  limit?: number
  offset?: number
}) => {
  const { data: orders, ...rest } = useOrders(filters)
  const groupedData = React.useMemo(() => {
    if (!orders) return null

    return {
      new: orders.filter(o => o.status.toLowerCase() === 'new'),
      open: orders.filter(o => o.status.toLowerCase() === 'open'),
      filled: orders.filter(o => o.status.toLowerCase() === 'filled'),
      partially_filled: orders.filter(o => o.status.toLowerCase() === 'partially_filled'),
      cancelled: orders.filter(o => o.status.toLowerCase() === 'cancelled'),
      rejected: orders.filter(o => o.status.toLowerCase() === 'rejected'),
    }
  }, [orders])

  return {
    data: groupedData,
    orders,
    ...rest,
  }
}
