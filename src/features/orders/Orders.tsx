import React, { useState } from 'react'
import { Download, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOrders, useExecutions, useCancelOrder } from '../../hooks/queries/orders'
import { NewOrderModal } from './NewOrderModal'
import type { Order, Execution } from '../../types/entities'
import { OrderCardSkeleton } from '../../components/Skeleton'
import { ThemeSelect } from '../../components/ThemeSelect'
import { exportToCSV } from '../../lib/csvExport'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import { EmptyState } from '../../components/ui'
import clsx from 'clsx'
import { useAuth } from '../../stores/auth'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { Permission } from '../../types/permissions.generated'

const TERMINAL_ORDER_STATUSES = new Set([
  'filled',
  'cancelled',
  'canceled',
  'rejected',
  'error',
  'expired',
  'closed',
])

const OrderCard: React.FC<{
  order: Order
  canCancel: boolean
  canCancelNow: () => boolean
}> = ({ order, canCancel, canCancelNow }) => {
  const { t, i18n } = useTranslation('orders')
  const cancelOrder = useCancelOrder()
  const isTerminal = TERMINAL_ORDER_STATUSES.has(order.status.toLowerCase())

  const handleCancel = (): void => {
    if (!canCancelNow()) return

    cancelOrder.mutate(order.clientOrderId)
  }

  const getStatusColor = (status: string) => {
    /**
     * Order status colors are SEVERITY semantics (success/error/info),
     * NOT financial direction — they stay on gain-* / loss-* tokens
     * so a CN user who picks the inverted convention doesn't see
     * "filled" rendered in red on a successful trade.
     */
    switch (status.toLowerCase()) {
      case 'filled':
        return 'text-gain-400 bg-gain-900/20'
      case 'new':
      case 'open':
        return 'text-info-400 bg-info-900/20'
      case 'cancelled':
      case 'canceled':
      case 'closed':
        return 'text-muted-400 bg-muted-900/20'
      case 'rejected':
      case 'error':
        return 'text-loss-400 bg-loss-900/20'
      case 'partially_filled':
        return 'text-warning-400 bg-warning-900/20'
      default:
        return 'text-muted-400 bg-muted-900/20'
    }
  }

  const getSideColor = (side: string) => {
    /**
     * Order side BUY/SELL IS financial direction — flips per the
     * user's color convention (cn/hk/jp/kr default to red-up, others
     * green-up; explicit Settings override always wins).
     */
    return side === 'buy' ? 'text-rising-400' : 'text-falling-400'
  }

  const formatPrice = (price: number | null | undefined) => {
    return price ? `$${price.toFixed(2)}` : t('orderCard.priceMarket')
  }

  return (
    <div className='rounded-2xl border border-dark-600 bg-alpine-50 p-5 transition-colors hover:border-muted-400'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <span className='font-semibold text-alpine-900'>{order.instrument}</span>
          <span className={clsx('text-sm font-medium', order.side ? getSideColor(order.side) : '')}>
            {order.side
              ? t(`newOrderModal.sideOptions.${order.side}`, {
                  defaultValue: order.side.toUpperCase(),
                })
              : t('orderCard.sideUnknown')}
          </span>
          <span className='text-sm text-muted-500'>
            {t(`newOrderModal.orderTypeOptions.${order.orderType}`, {
              defaultValue: order.orderType,
            })}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <span
            className={clsx(
              'px-2 py-1 text-xs font-medium rounded-full',
              getStatusColor(order.status)
            )}
          >
            {t(`filters.options.${order.status.toLowerCase()}`, {
              defaultValue: order.status,
            })}
          </span>
          {!isTerminal && canCancel && (
            <button
              type='button'
              onClick={handleCancel}
              disabled={cancelOrder.isPending}
              aria-label={t('orderCard.cancelAriaLabel', { orderId: order.clientOrderId })}
              data-testid={`cancel-order-${order.clientOrderId}`}
              className='flex items-center gap-1 rounded-lg border border-loss-500 px-2 py-1 text-xs font-medium text-loss-500 transition-colors hover:bg-loss-900/20 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <X size={12} />
              {cancelOrder.isPending ? t('orderCard.cancelling') : t('orderCard.cancel')}
            </button>
          )}
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4 text-sm'>
        <div>
          <div className='text-muted-500'>{t('orderCard.quantity')}</div>
          <div className='font-mono text-alpine-900'>{order.size.toFixed(4)}</div>
        </div>
        <div>
          <div className='text-muted-500'>{t('orderCard.price')}</div>
          <div className='font-mono text-alpine-900'>{formatPrice(order.price)}</div>
        </div>
        <div>
          <div className='text-muted-500'>{t('orderCard.created')}</div>
          <div className='text-xs text-alpine-900'>
            {order.createdAt
              ? formatDateTime(order.createdAt, i18n.language as AppLocale)
              : t('orderCard.createdUnknown')}
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('orderCard.orderId')}</div>
          <div className='text-xs font-mono text-alpine-900'>{order.clientOrderId}</div>
        </div>
        {order.leverage != null && (
          <div>
            <div className='text-muted-500'>{t('orderCard.leverage')}</div>
            <div
              className='font-mono text-alpine-900'
              data-testid={`order-leverage-${order.clientOrderId}`}
            >
              {t('orderCard.leverageValue', { leverage: order.leverage })}
            </div>
          </div>
        )}
        {order.reduceOnly === true && (
          <div className='col-span-2'>
            <span
              className='inline-block rounded-full bg-info-900/20 px-2 py-1 text-xs font-medium text-info-400'
              data-testid={`order-reduce-only-${order.clientOrderId}`}
            >
              {t('orderCard.reduceOnly')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const ExecutionCard: React.FC<{ execution: Execution }> = ({ execution }) => {
  const { t, i18n } = useTranslation('orders')
  const totalCost = execution.price * execution.size
  const fees = execution.fee || 0

  return (
    <div className='rounded-2xl border border-dark-600 bg-alpine-50 p-5 transition-colors hover:border-muted-400'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <span className='font-semibold text-alpine-900'>
            {t('executionCard.orderNumber', { orderId: execution.clientOrderId })}
          </span>
          <span className='rounded-full bg-gain-50 px-2 py-1 text-xs text-gain-600'>
            {t('executionCard.filled')}
          </span>
        </div>
        <div className='text-sm text-muted-500'>
          {t('executionCard.orderLabel', { orderId: execution.clientOrderId })}
        </div>
      </div>
      <div className='grid grid-cols-3 gap-4 text-sm'>
        <div>
          <div className='text-muted-500'>{t('executionCard.size')}</div>
          <div className='font-mono text-alpine-900'>{execution.size.toFixed(4)}</div>
        </div>
        <div>
          <div className='text-muted-500'>{t('executionCard.price')}</div>
          <div className='font-mono text-alpine-900'>${execution.price.toFixed(2)}</div>
        </div>
        <div>
          <div className='text-muted-500'>{t('executionCard.total')}</div>
          <div className='font-mono text-alpine-900'>${totalCost.toFixed(2)}</div>
        </div>
        <div className='col-span-2'>
          <div className='text-muted-500'>{t('executionCard.executed')}</div>
          <div className='text-xs text-alpine-900'>
            {formatDateTime(execution.executedAt, i18n.language as AppLocale)}
          </div>
        </div>
        {fees > 0 && (
          <div>
            <div className='text-muted-500'>{t('executionCard.fees')}</div>
            <div className='text-loss-400 text-xs font-mono'>
              ${fees.toFixed(2)} {execution.feeAsset}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const Orders: React.FC = () => {
  const { t, i18n } = useTranslation('orders')
  const { hasPermission } = useAuth()
  const readOnly = useIsReadOnly()
  const canCreateOrders = hasPermission(Permission.CREATE_ORDERS) && !readOnly
  const canCancelOrders = hasPermission(Permission.CANCEL_ORDERS) && !readOnly
  const [activeTab, setActiveTab] = useState<'orders' | 'executions'>('orders')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showNewOrder, setShowNewOrder] = useState(false)
  const { data: orders = [], isLoading: ordersLoading } = useOrders({ limit: 50 })
  const { data: executions = [], isLoading: executionsLoading } = useExecutions({ limit: 50 })
  const filteredOrders = orders.filter(
    (order: Order) => statusFilter === 'all' || order.status.toLowerCase() === statusFilter
  )

  const openNewOrder = (): void => {
    if (!hasPermission(Permission.CREATE_ORDERS) || readOnly) return

    setShowNewOrder(true)
  }

  const handleExportOrders = () => {
    const headers = [
      t('csv.orders.instrument'),
      t('csv.orders.side'),
      t('csv.orders.type'),
      t('csv.orders.status'),
      t('csv.orders.quantity'),
      t('csv.orders.price'),
      t('csv.orders.leverage'),
      t('csv.orders.reduceOnly'),
      t('csv.orders.created'),
    ]
    const rows = filteredOrders.map((o: Order) => [
      o.instrument,
      o.side ?? '',
      o.orderType,
      o.status,
      o.size.toFixed(4),
      o.price ? o.price.toFixed(2) : t('orderCard.priceMarket'),
      o.leverage?.toString() ?? '',
      o.reduceOnly === true ? 'true' : 'false',
      o.createdAt ? formatDateTime(o.createdAt, i18n.language as AppLocale) : '',
    ])

    exportToCSV('orders.csv', headers, rows)
  }

  const handleExportExecutions = () => {
    const headers = [
      t('csv.executions.orderId'),
      t('csv.executions.instrument'),
      t('csv.executions.side'),
      t('csv.executions.size'),
      t('csv.executions.price'),
      t('csv.executions.total'),
      t('csv.executions.fee'),
      t('csv.executions.feeAsset'),
      t('csv.executions.executed'),
    ]
    const rows = executions.map((e: Execution) => [
      e.clientOrderId,
      e.instrument,
      e.side,
      e.size.toFixed(4),
      e.price.toFixed(2),
      (e.price * e.size).toFixed(2),
      e.fee ? e.fee.toFixed(2) : '0',
      e.feeAsset ?? '',
      formatDateTime(e.executedAt, i18n.language as AppLocale),
    ])

    exportToCSV('executions.csv', headers, rows)
  }

  const statusOptions = [
    { value: 'all', label: t('filters.options.all') },
    { value: 'new', label: t('filters.options.new') },
    { value: 'open', label: t('filters.options.open') },
    { value: 'partially_filled', label: t('filters.options.partiallyFilled') },
    { value: 'filled', label: t('filters.options.filled') },
    { value: 'cancelled', label: t('filters.options.cancelled') },
    { value: 'rejected', label: t('filters.options.rejected') },
  ]

  return (
    <div className='space-y-6'>
      <NewOrderModal
        open={showNewOrder && canCreateOrders}
        onClose={() => setShowNewOrder(false)}
      />
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
        <div className='flex items-center gap-2'>
          {canCreateOrders && (
            <button
              onClick={openNewOrder}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white hover:bg-brand-500 rounded-lg transition-colors'
            >
              <Plus size={14} />
              {t('page.newOrder')}
            </button>
          )}
          <button
            onClick={activeTab === 'orders' ? handleExportOrders : handleExportExecutions}
            disabled={
              activeTab === 'orders' ? filteredOrders.length === 0 : executions.length === 0
            }
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-dark-600 bg-alpine-50 hover:bg-muted-200 disabled:opacity-50 disabled:cursor-not-allowed text-alpine-900 rounded-lg transition-colors'
          >
            <Download size={14} />
            {t('page.exportCsv')}
          </button>
        </div>
      </div>
      <div className='flex space-x-1 rounded-xl border border-dark-600 bg-dark-700 p-1'>
        <button
          onClick={() => setActiveTab('orders')}
          className={clsx(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'orders'
              ? 'bg-brand-600 text-white'
              : 'text-muted-600 hover:bg-alpine-50 hover:text-alpine-900'
          )}
        >
          {t('tabs.orders', { total: orders.length })}
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={clsx(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'executions'
              ? 'bg-brand-600 text-white'
              : 'text-muted-600 hover:bg-alpine-50 hover:text-alpine-900'
          )}
        >
          {t('tabs.executions', { total: executions.length })}
        </button>
      </div>
      {activeTab === 'orders' && (
        <div className='flex items-center space-x-4 rounded-xl border border-dark-600 bg-alpine-50 px-4 py-3'>
          <label htmlFor='status-filter' className='text-sm text-muted-600'>
            {t('filters.byStatus')}
          </label>
          <ThemeSelect
            id='status-filter'
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            className='max-w-56'
          />
        </div>
      )}
      <div className='space-y-4'>
        {activeTab === 'orders' && (
          <>
            {ordersLoading && (
              <div className='space-y-3'>
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            )}
            {!ordersLoading && filteredOrders.length === 0 && (
              <EmptyState
                icon={
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                    />
                  </svg>
                }
                title={t('empty.ordersTitle')}
                message={
                  statusFilter === 'all'
                    ? t('empty.ordersStartTrading')
                    : t('empty.ordersFilterless', { status: statusFilter })
                }
              />
            )}
            {!ordersLoading && filteredOrders.length > 0 && (
              <div className='grid gap-4'>
                {filteredOrders.map((order: Order) => (
                  <OrderCard
                    key={order.clientOrderId}
                    order={order}
                    canCancel={canCancelOrders}
                    canCancelNow={() => hasPermission(Permission.CANCEL_ORDERS) && !readOnly}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'executions' && (
          <>
            {executionsLoading && (
              <div className='space-y-3'>
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            )}
            {!executionsLoading && executions.length === 0 && (
              <EmptyState
                icon={
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                }
                title={t('empty.executionsTitle')}
                message={t('empty.executionsMessage')}
              />
            )}
            {!executionsLoading && executions.length > 0 && (
              <div className='grid gap-4'>
                {executions.map((execution: Execution) => (
                  <ExecutionCard key={execution.clientOrderId} execution={execution} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
