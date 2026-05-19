import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSystemStatus } from '../../hooks/queries/system'
import { HealthSkeleton } from '../../components/Skeleton'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import { SystemMetricsCard } from './SystemMetricsCard'
import { DbStatsCard } from './DbStatsCard'
import { NotificationMetricsCard } from './NotificationMetricsCard'
import { RetentionCard } from './RetentionCard'
import clsx from 'clsx'
import type { ProcessStatus } from '../../types/api'

type HealthStatusKind = 'healthy' | 'warning' | 'error'

interface HealthMetric {
  name: string
  value: string | number
  status: HealthStatusKind
  description: string
  icon: React.ReactNode
}

const StatusIndicator: React.FC<{ status: string; showLabel: boolean }> = ({
  status,
  showLabel,
}) => {
  const { t } = useTranslation('health')

  const getStatusConfig = (s: string) => {
    switch (s.toLowerCase()) {
      case 'running':
      case 'healthy':
        return { color: 'bg-accent-500', label: t('status.healthy'), textColor: 'text-gain-600' }
      case 'stopped':
        return { color: 'bg-muted-400', label: t('status.stopped'), textColor: 'text-muted-600' }
      case 'error':
      case 'failed':
        return { color: 'bg-loss-500', label: t('status.error'), textColor: 'text-loss-600' }
      case 'warning':
        return {
          color: 'bg-warning-500',
          label: t('status.warning'),
          textColor: 'text-warning-600',
        }
      default:
        return { color: 'bg-info-500', label: t('status.completed'), textColor: 'text-info-600' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <div className='flex items-center space-x-2'>
      <div
        className={clsx(
          'w-2 h-2 rounded-full',
          config.color,
          status === 'running' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={clsx('text-sm font-medium', config.textColor)}>{config.label}</span>
      )}
    </div>
  )
}

const BacktestProcessCard: React.FC<{
  name: string
  status: ProcessStatus
}> = ({ name, status }) => {
  const { t } = useTranslation('health')

  const formatUptime = (startedAt?: string): string => {
    if (!startedAt) return t('process.uptimeNotAvailable')
    const start = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return t('process.uptimeMinutes', { minutes: diffMins })
    if (diffMins < 1440)
      return t('process.uptimeHours', {
        hours: Math.floor(diffMins / 60),
        minutes: diffMins % 60,
      })

    return t('process.uptimeDays', {
      days: Math.floor(diffMins / 1440),
      hours: Math.floor((diffMins % 1440) / 60),
    })
  }

  return (
    <div className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <div className='text-muted-500'>
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
          </div>
          <div>
            <h3 className='font-medium text-alpine-900'>{name}</h3>
            <p className='text-xs capitalize text-muted-500'>{t('process.backtest')}</p>
          </div>
        </div>
        <StatusIndicator status={status.status} showLabel />
      </div>
      <div className='grid grid-cols-2 gap-4 text-sm'>
        <div>
          <div className='text-muted-500'>{t('process.pidLabel')}</div>
          <div className='font-mono text-alpine-900'>
            {status.pid || t('process.pidNotAvailable')}
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('process.uptimeLabel')}</div>
          <div className='text-alpine-900'>{formatUptime(status.started_at ?? undefined)}</div>
        </div>
      </div>
      {status.error && (
        <div className='mt-3 rounded-lg border border-loss-100 bg-loss-50 p-2 text-xs text-loss-700'>
          {status.error}
        </div>
      )}
      {status.exit_code !== undefined && status.status !== 'running' && (
        <div className='mt-2 text-xs text-muted-500'>
          {t('process.exitCode', { code: status.exit_code })}
        </div>
      )}
    </div>
  )
}

const MetricCard: React.FC<{ metric: HealthMetric }> = ({ metric }) => {
  const statusColors: Record<HealthMetric['status'], string> = {
    healthy: 'border-accent-100 bg-accent-50 text-accent-700',
    warning: 'border-warning-100 bg-warning-50 text-warning-700',
    error: 'border-loss-100 bg-loss-50 text-loss-700',
  }
  const getStatusColor = (status: HealthMetric['status']) => statusColors[status]

  return (
    <div className={clsx('p-4 rounded-lg border', getStatusColor(metric.status))}>
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <div className='text-current shrink-0'>{metric.icon}</div>
          <span className='font-medium'>{metric.name}</span>
        </div>
        <div className='text-lg font-bold shrink-0'>{metric.value}</div>
      </div>
      <p className='text-xs opacity-80'>{metric.description}</p>
    </div>
  )
}

export const Health: React.FC = () => {
  const { t } = useTranslation('health')
  const { data: systemStatus, isLoading } = useSystemStatus()
  const statusPayload = systemStatus?.payload
  const backtestsList = Object.values(statusPayload?.backtests || {})
  const runningBacktests = backtestsList.filter(b => b.status === 'running').length
  const hasErroredBacktest = backtestsList.some(b => b.status === 'error')
  const backtestStatus: HealthStatusKind = hasErroredBacktest ? 'error' : 'healthy'
  const healthMetrics: HealthMetric[] = [
    {
      name: t('metrics.tradingEngine'),
      value:
        statusPayload?.trader?.status === 'running' ? t('metrics.active') : t('metrics.inactive'),
      status: statusPayload?.trader?.status === 'running' ? 'healthy' : 'warning',
      description: t('metrics.tradingEngineDescription'),
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
    },
    {
      name: t('metrics.activeBacktests'),
      value: runningBacktests,
      status: backtestStatus,
      description: t('metrics.activeBacktestsDescription'),
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      ),
    },
  ]

  const resolveOverallHealth = (): HealthStatusKind => {
    if (healthMetrics.every(m => m.status === 'healthy')) return 'healthy'
    if (healthMetrics.some(m => m.status === 'error')) return 'error'

    return 'warning'
  }

  const overallHealth = resolveOverallHealth()

  return (
    <div className='space-y-6'>
      <LiveOnlyNotice />
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
        <StatusIndicator status={overallHealth} showLabel />
      </div>
      <div>
        <h3 className='mb-4 text-lg font-medium text-alpine-900'>
          {t('page.healthMetricsHeading')}
        </h3>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {healthMetrics.map(metric => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </div>
      {isLoading && <HealthSkeleton className='mt-0 p-0' />}
      {!isLoading &&
        statusPayload?.backtests &&
        Object.keys(statusPayload.backtests).length > 0 && (
          <div>
            <h3 className='mb-4 text-lg font-medium text-alpine-900'>
              {t('page.activeBacktestsHeading')}
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {Object.entries(statusPayload.backtests).map(([id, status]) => (
                <BacktestProcessCard
                  key={id}
                  name={t('process.backtestName', { id: id.slice(0, 8) })}
                  status={status}
                />
              ))}
            </div>
          </div>
        )}
      <SystemMetricsCard />
      <DbStatsCard />
      <NotificationMetricsCard />
      <RetentionCard />
    </div>
  )
}
