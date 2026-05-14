import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useNotificationMetrics } from '../../hooks/queries/system'
import { formatNumber } from '../../lib/utils'

interface CounterCellProps {
  readonly label: string
  readonly value: number
  readonly description?: string
  readonly tone?: 'neutral' | 'warning' | 'loss'
}

const TONE_CLASS_BY_TONE = {
  loss: 'text-loss-700',
  neutral: 'text-alpine-900',
  warning: 'text-warning-700',
} satisfies Record<NonNullable<CounterCellProps['tone']>, string>

const CounterCell: React.FC<CounterCellProps> = ({
  label,
  value,
  description,
  tone = 'neutral',
}) => {
  const toneClass = TONE_CLASS_BY_TONE[tone]

  return (
    <div className='flex flex-col rounded-md border border-dark-600 bg-alpine-50 p-3'>
      <span className='text-xs uppercase tracking-wide text-muted-600'>{label}</span>
      <span className={`mt-1 text-2xl font-semibold ${toneClass}`}>{formatNumber(value)}</span>
      {description !== undefined && (
        <span className='mt-1 text-xs text-muted-600'>{description}</span>
      )}
    </div>
  )
}

export const NotificationMetricsCard: React.FC = () => {
  const { t } = useTranslation('health')
  const { data, isLoading, error } = useNotificationMetrics()

  const errorMessage = useMemo(() => {
    if (!error) return null
    if (error instanceof Error) return error.message

    return t('notification.fallbackError')
  }, [error, t])

  return (
    <section className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-4'>
      <header>
        <h3 className='text-lg font-medium text-alpine-900'>{t('notification.title')}</h3>
      </header>
      {isLoading && <p className='text-sm text-muted-600'>{t('notification.loading')}</p>}
      {errorMessage !== null && (
        <p className='text-sm text-loss-600'>
          {t('notification.unavailable', { message: errorMessage })}
        </p>
      )}
      {data?.payload && (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
          <CounterCell
            label={t('notification.sent')}
            value={data.payload.delivery_success_total}
            description={t('notification.sentDescription')}
          />
          <CounterCell
            label={t('notification.failed')}
            value={data.payload.delivery_failed_total}
            description={t('notification.failedDescription')}
            tone={data.payload.delivery_failed_total > 0 ? 'loss' : 'neutral'}
          />
          <CounterCell
            label={t('notification.unregistered')}
            value={data.payload.delivery_410_unregistered_total}
            description={t('notification.unregisteredDescription')}
          />
          <CounterCell
            label={t('notification.cancelledScope')}
            value={data.payload.delivery_cancelled_scope_total}
            description={t('notification.cancelledScopeDescription')}
          />
          <CounterCell
            label={t('notification.outboxDepth')}
            value={data.payload.outbox_queued_depth}
            description={t('notification.outboxDepthDescription')}
            tone={data.payload.outbox_queued_depth > 0 ? 'warning' : 'neutral'}
          />
        </div>
      )}
    </section>
  )
}
