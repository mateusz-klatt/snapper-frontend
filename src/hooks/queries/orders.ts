import React, { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, getExecutions, createOrder, cancelOrder } from '../../lib/api/orders'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { safeOrderFromAPI, safeExecutionFromAPI } from '../../lib/transforms'
import type { ExecutionPlanResponse } from '../../types/api'
import type { Order } from '../../types/entities'
import { queryKeys } from './keys'

const ORDER_GROUP_STATUSES = [
  'new',
  'open',
  'filled',
  'partially_filled',
  'cancelled',
  'rejected',
] as const

type OrderGroupStatus = (typeof ORDER_GROUP_STATUSES)[number]
type GroupedOrders = Record<OrderGroupStatus, Order[]>

const ORDER_GROUP_STATUS_SET: ReadonlySet<string> = new Set(ORDER_GROUP_STATUSES)

function isOrderGroupStatus(status: string): status is OrderGroupStatus {
  return ORDER_GROUP_STATUS_SET.has(status)
}

function createEmptyOrderGroups(): GroupedOrders {
  return {
    new: [],
    open: [],
    filled: [],
    partially_filled: [],
    cancelled: [],
    rejected: [],
  }
}

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

    const grouped = createEmptyOrderGroups()

    for (const order of orders) {
      const status = order.status.toLowerCase()

      if (isOrderGroupStatus(status)) {
        grouped[status].push(order)
      }
    }

    return grouped
  }, [orders])

  return {
    data: groupedData,
    orders,
    ...rest,
  }
}
