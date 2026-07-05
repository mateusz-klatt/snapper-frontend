import React from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { HeartbeatData } from '../../hooks/useHeartbeats'
import { LoadingSpinner } from '../../components/ui'
import { formatDurationMs } from '../../lib/duration'

interface ProcessControlCardProps {
  title: string
  description: string
  status: 'running' | 'stopped' | 'error'
  statusBadge?: string
  details?: Record<string, unknown> | undefined
  onStart: () => void
  onStop: () => void
  onRestart?: () => void
  isStarting?: boolean
  isStopping?: boolean
  isRestarting?: boolean
  readOnly?: boolean | undefined
  managedRemotely?: boolean | undefined
  enabled?: boolean | undefined
  coordinator?: string | null | undefined
  coordinatorLabel?: string | null | undefined
  heartbeat?: HeartbeatData | undefined
}

const formatDetailKey = (key: string): string =>
  key.replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase())

const formatDetailValue = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const str = String(value)

    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return JSON.stringify(value)
}

const HeartbeatIndicator: React.FC<{ heartbeat: HeartbeatData }> = ({ heartbeat }) => {
  const { t } = useTranslation('processes')
  const color = heartbeat.healthy ? 'text-accent-400' : 'text-loss-400'
  const dot = heartbeat.healthy ? 'bg-accent-400' : 'bg-loss-400'

  return (
    <div className={clsx('flex items-center gap-1.5 text-xs', color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      <span>
        {t(`card.status.${heartbeat.status}`, { defaultValue: heartbeat.status })}
        {heartbeat.lag_ms !== undefined && (
          <span className='opacity-70 ml-1'>({formatDurationMs(heartbeat.lag_ms)})</span>
        )}
      </span>
    </div>
  )
}

export const ProcessControlCard: React.FC<Readonly<ProcessControlCardProps>> = ({
  title,
  description,
  status,
  statusBadge,
  details,
  onStart,
  onStop,
  onRestart = () => {},
  isStarting = false,
  isStopping = false,
  isRestarting = false,
  readOnly = false,
  managedRemotely = false,
  enabled = false,
  coordinator,
  coordinatorLabel,
  heartbeat,
}) => {
  const { t } = useTranslation('processes')
  const isRunning = status === 'running'
  const controlsBusy = isStarting || isStopping || isRestarting
  const statusColor = {
    running: 'text-accent-400 bg-accent-400/10',
    stopped: 'text-muted-400 bg-muted-400/10',
    error: 'text-loss-400 bg-loss-400/10',
  }[status]

  return (
    <div className='bg-alpine-50 border border-dark-600 rounded-2xl p-6 flex flex-col gap-4'>
      {}
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <h3 className='text-lg font-semibold text-alpine-900 line-clamp-2 leading-snug'>
            {title}
          </h3>
          {description && <p className='text-sm text-muted-600 mt-1 line-clamp-2'>{description}</p>}
        </div>
        <div className='flex flex-col items-end gap-1 shrink-0'>
          <div className='flex items-center gap-1.5'>
            <span className={clsx('px-2 py-1 rounded-md text-xs font-medium', statusColor)}>
              {t(`card.status.${status}`, { defaultValue: status })}
            </span>
            {statusBadge && (
              <span className='px-2 py-1 rounded-md text-xs font-medium text-info-400 bg-info-400/10'>
                {statusBadge}
              </span>
            )}
          </div>
          {heartbeat && <HeartbeatIndicator heartbeat={heartbeat} />}
        </div>
      </div>
      {}
      {details && (
        <div className='space-y-1'>
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className='flex gap-2 text-xs'>
              <span className='text-muted-400 font-medium shrink-0'>
                {t(`card.detail.${key}`, { defaultValue: formatDetailKey(key) })}:
              </span>
              <span className='text-muted-600 break-all'>{formatDetailValue(value)}</span>
            </div>
          ))}
        </div>
      )}
      {}
      <div className='mt-auto pt-2 border-t border-dark-600'>
        {managedRemotely && (
          <p
            className='flex items-center gap-1.5 text-xs text-muted-500 mb-2'
            data-testid='managed-remotely-notice'
          >
            <span className='w-1.5 h-1.5 rounded-full bg-info-400 shrink-0' />
            {t('card.managedRemotely', {
              coordinator: coordinatorLabel ?? coordinator ?? t('card.remoteCoordinatorUnknown'),
            })}
          </p>
        )}
        <div className='flex space-x-2'>
          {isRunning ? (
            <button
              onClick={onStop}
              disabled={controlsBusy || readOnly}
              className={clsx(
                'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                controlsBusy || readOnly
                  ? 'bg-loss-400/20 text-loss-600 cursor-not-allowed'
                  : 'bg-loss-600 text-white hover:bg-loss-700'
              )}
            >
              {isStopping ? (
                <>
                  <LoadingSpinner size='sm' className='inline-block mr-2' />
                  {t('card.stopping')}
                </>
              ) : (
                t('card.stop')
              )}
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={controlsBusy || readOnly}
              className={clsx(
                'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                controlsBusy || readOnly
                  ? 'bg-accent-400/20 text-accent-300 cursor-not-allowed'
                  : 'bg-accent-600 text-white hover:bg-accent-700'
              )}
            >
              {isStarting ? (
                <>
                  <LoadingSpinner size='sm' className='inline-block mr-2' />
                  {t('card.starting')}
                </>
              ) : (
                t('card.start')
              )}
            </button>
          )}
          {}
          {(isRunning || (managedRemotely === true && enabled === true)) && (
            <button
              onClick={onRestart}
              disabled={controlsBusy || readOnly}
              className='flex-1 px-4 py-2 rounded-md text-sm font-medium bg-info-600 text-white hover:bg-info-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isRestarting ? (
                <>
                  <LoadingSpinner size='sm' className='inline-block mr-2' />
                  {t('card.restart')}
                </>
              ) : (
                t('card.restart')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
