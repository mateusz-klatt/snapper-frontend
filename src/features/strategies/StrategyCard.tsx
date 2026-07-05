import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../../components/ui'
import { HEARTBEAT_STALE_THRESHOLD_MS } from '../../lib/constants'
import { formatTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'

export interface FeedHealth {
  status: 'healthy' | 'warning' | 'error'
  lag_ms: number
  heartbeat_age_ms: number
  healthy: boolean
}
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error'
  lag_ms: number
  timestamp: number
  seq?: number | undefined
  feed_health?: Record<string, FeedHealth> | undefined
  inputs?: string[] | undefined
  outputs?: string[] | undefined
}

const FeedPublisherEntry: React.FC<Readonly<{ feedKey: string; feed: FeedHealth }>> = ({
  feedKey,
  feed,
}) => {
  const { t } = useTranslation('strategies')
  const isHealthy = feed.healthy
  const isFresh = feed.heartbeat_age_ms < 5000

  return (
    <div className='bg-dark-700 rounded p-2 space-y-1'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <div
            className={clsx('w-2 h-2 rounded-full', {
              'bg-accent-500': isHealthy && isFresh,
              'bg-warning-500': isHealthy && !isFresh,
              'bg-loss-500': !isHealthy,
            })}
          />
          <span className='text-xs font-medium text-alpine-900'>{feedKey}</span>
        </div>
        <span
          className={clsx('text-xs', {
            'text-accent-400': feed.status === 'healthy',
            'text-warning-400': feed.status === 'warning',
            'text-loss-400': feed.status === 'error',
          })}
        >
          {t(`card.healthShort.${feed.status}`, { defaultValue: feed.status })}
        </span>
      </div>
      <div className='grid grid-cols-2 gap-2 text-xs text-muted-500'>
        <div>{t('card.feedLag', { ms: feed.lag_ms })}</div>
        <div>{t('card.heartbeatAge', { seconds: Math.round(feed.heartbeat_age_ms / 1000) })}</div>
      </div>
    </div>
  )
}

const useHealthFreshness = (health: HealthStatus | undefined): boolean => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!health) return undefined
    const remaining = health.timestamp + HEARTBEAT_STALE_THRESHOLD_MS - Date.now()

    if (remaining <= 0) return undefined
    const timer = setTimeout(() => setNow(Date.now()), remaining + 50)

    return () => clearTimeout(timer)
  }, [health])

  return health !== undefined && now - health.timestamp <= HEARTBEAT_STALE_THRESHOLD_MS
}

const HEALTH_COLOR: Record<HealthStatus['status'], string> = {
  healthy: 'bg-accent-500',
  warning: 'bg-warning-500',
  error: 'bg-loss-500',
}

const resolveHealthColor = (health: HealthStatus | undefined): string =>
  health ? HEALTH_COLOR[health.status] : 'bg-muted-400'

const resolveDisplayName = (name: string): string =>
  name
    .replace(/^strategy_/, '')
    .split('_')
    .map(part => part.toUpperCase())
    .join(' ')

const resolveStatusKey = (
  isStarting: boolean,
  isRunning: boolean
): 'starting' | 'running' | 'stopped' => {
  if (isStarting) return 'starting'
  if (isRunning) return 'running'

  return 'stopped'
}

interface StrategyCardProps {
  name: string
  running: boolean
  autoStartEnabled: boolean
  mode: 'thread' | 'process'
  health?: HealthStatus | undefined
  coordinator?: string | null | undefined
  coordinatorLabel?: string | null | undefined
  managedRemotely?: boolean | undefined
  onStart?: (() => void) | undefined
  onStop?: (() => void) | undefined
  onRestart?: (() => void) | undefined
  onBacktest?: (() => void) | undefined
  isStarting?: boolean
  isStopping?: boolean
  isRestarting?: boolean
  readOnly?: boolean | undefined
}

interface StrategyActionControlsProps {
  displayName: string
  showStopButton: boolean
  onStart?: (() => void) | undefined
  onStop?: (() => void) | undefined
  isStarting: boolean
  isStopping: boolean
  isRestarting: boolean
  readOnly: boolean
}

const StrategyActionControls: React.FC<Readonly<StrategyActionControlsProps>> = ({
  displayName,
  showStopButton,
  onStart,
  onStop,
  isStarting,
  isStopping,
  isRestarting,
  readOnly,
}) => {
  const { t } = useTranslation('strategies')
  const controlsDisabled = isStopping || isStarting || isRestarting || readOnly

  if (showStopButton) {
    return (
      <button
        onClick={onStop}
        disabled={controlsDisabled}
        aria-label={t('card.stopAriaLabel', { name: displayName })}
        className={clsx(
          'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          controlsDisabled
            ? 'bg-loss-400/20 text-loss-600 cursor-not-allowed'
            : 'bg-loss-600 text-white hover:bg-loss-700 focus:outline-none focus:ring-2 focus:ring-loss-500'
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
    )
  }

  return (
    <button
      onClick={onStart}
      disabled={controlsDisabled}
      aria-label={t('card.startAriaLabel', { name: displayName })}
      className={clsx(
        'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
        controlsDisabled
          ? 'bg-accent-400/20 text-accent-300 cursor-not-allowed'
          : 'bg-accent-600 text-white hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500'
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
  )
}

export const StrategyCard: React.FC<Readonly<StrategyCardProps>> = React.memo(
  ({
    name,
    running,
    autoStartEnabled,
    mode,
    health,
    coordinator,
    coordinatorLabel,
    managedRemotely = false,
    onStart,
    onStop,
    onRestart,
    onBacktest,
    isStarting = false,
    isStopping = false,
    isRestarting = false,
    readOnly = false,
  }) => {
    const { t, i18n } = useTranslation('strategies')
    const [expanded, setExpanded] = useState(false)
    const healthFresh = useHealthFreshness(health)
    const isRunning = running || isStarting
    const showStopButton = running || isStopping
    const healthColor = resolveHealthColor(health)
    const healthLabel = health
      ? t(`card.health.${health.status}` as const)
      : t('card.health.unknown')
    const statusColor = {
      running: 'text-accent-400 bg-accent-400/10',
      stopped: 'text-muted-400 bg-muted-400/10',
      starting: 'text-info-400 bg-info-400/10',
    }[resolveStatusKey(isStarting, isRunning)]

    const resolveStatusText = (): string => {
      if (isStarting) return t('card.status.starting')
      if (isStopping) return t('card.status.stopping')
      if (isRunning) return t('card.status.running')

      return t('card.status.stopped')
    }

    const statusText = resolveStatusText()
    const showLagBadge = health && health.lag_ms > 2000
    const displayName = resolveDisplayName(name)
    const healthStatusShort = (status: HealthStatus['status']): string =>
      t(`card.healthShort.${status}` as const)

    return (
      <article
        className='bg-alpine-50 border border-dark-600 rounded-2xl p-6 space-y-4'
        aria-label={t('card.ariaLabel', { name: displayName })}
      >
        {}
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-3'>
            {}
            <output
              className={clsx('w-3 h-3 rounded-full block', healthColor)}
              title={healthLabel}
              aria-label={healthLabel}
            />
            <div>
              <h3 className='text-lg font-semibold text-alpine-900'>{displayName}</h3>
              <p className='text-sm text-muted-600 mt-1'>{t('card.modeLabel', { mode })}</p>
              <p className='text-xs text-muted-500 mt-0.5'>
                {autoStartEnabled ? t('card.autostartEnabled') : t('card.autostartDisabled')}
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <output
              className={clsx('px-2 py-1 rounded-md text-xs font-medium', statusColor)}
              aria-label={t('card.statusAriaLabel', { status: statusText })}
            >
              {statusText}
            </output>
            {showLagBadge && (
              <output
                className='px-2 py-1 rounded-md text-xs font-medium text-warning-400 bg-warning-400/10'
                aria-label={t('card.dataLagAriaLabel', {
                  seconds: Math.round(health.lag_ms / 1000),
                })}
              >
                {t('card.lagBadge', { seconds: Math.round(health.lag_ms / 1000) })}
              </output>
            )}
          </div>
        </div>
        {}
        {health && healthFresh && (
          <div className='space-y-3'>
            {}
            <div className='grid grid-cols-3 gap-3 text-xs'>
              <div className='bg-dark-700 rounded p-2'>
                <div className='text-muted-500 mb-1'>{t('card.metrics.status')}</div>
                <div
                  className={clsx('font-medium', {
                    'text-accent-400': health.status === 'healthy',
                    'text-warning-400': health.status === 'warning',
                    'text-loss-400': health.status === 'error',
                  })}
                >
                  {healthStatusShort(health.status)}
                </div>
              </div>
              <div className='bg-dark-700 rounded p-2'>
                <div className='text-muted-500 mb-1'>{t('card.metrics.dataLag')}</div>
                <div className='text-alpine-900 font-medium'>
                  {t('card.metrics.dataLagValue', { ms: health.lag_ms })}
                </div>
              </div>
              <div className='bg-dark-700 rounded p-2'>
                <div className='text-muted-500 mb-1'>{t('card.metrics.heartbeat')}</div>
                <div className='text-alpine-900 font-medium'>
                  {health.seq
                    ? t('card.metrics.heartbeatValue', { seq: health.seq })
                    : t('card.metrics.heartbeatUnknown')}
                </div>
              </div>
            </div>
            {}
            <button
              onClick={() => setExpanded(!expanded)}
              className='w-full text-xs text-muted-500 hover:text-alpine-900 transition-colors flex items-center justify-center space-x-1'
            >
              <span>{expanded ? t('card.hideDetails') : t('card.showDetails')}</span>
              <svg
                className={clsx('w-4 h-4 transition-transform', { 'rotate-180': expanded })}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </button>
            {expanded && (
              <div className='space-y-3 pt-2 border-t border-dark-600'>
                {}
                {(health.inputs || health.outputs) && (
                  <div className='space-y-2'>
                    {health.inputs && health.inputs.length > 0 && (
                      <div>
                        <div className='text-xs font-medium text-muted-500 mb-1'>
                          {t('card.inputs', { count: health.inputs.length })}
                        </div>
                        <div className='space-y-1'>
                          {health.inputs.map(input => (
                            <div
                              key={input}
                              className='text-xs text-muted-600 bg-dark-700 rounded px-2 py-1 font-mono'
                            >
                              {input}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {health.outputs && health.outputs.length > 0 && (
                      <div>
                        <div className='text-xs font-medium text-muted-500 mb-1'>
                          {t('card.outputs', { count: health.outputs.length })}
                        </div>
                        <div className='flex flex-wrap gap-1'>
                          {health.outputs.map(output => (
                            <span
                              key={output}
                              className='text-xs text-info-400 bg-info-400/10 rounded px-2 py-1'
                            >
                              {output}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {}
                {health.feed_health && Object.keys(health.feed_health).length > 0 && (
                  <div>
                    <div className='text-xs font-medium text-muted-500 mb-2'>
                      {t('card.feedPublishers', { count: Object.keys(health.feed_health).length })}
                    </div>
                    <div className='space-y-2'>
                      {Object.entries(health.feed_health).map(([feedKey, feed]) => (
                        <FeedPublisherEntry key={feedKey} feedKey={feedKey} feed={feed} />
                      ))}
                    </div>
                  </div>
                )}
                {}
                <div className='text-xs text-muted-400 text-center pt-2 border-t border-dark-600'>
                  {t('card.lastUpdate', {
                    time: formatTime(new Date(health.timestamp), i18n.language as AppLocale),
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {!health && isRunning && (
          <div className='text-xs text-muted-400 text-center py-2'>{t('card.waiting')}</div>
        )}
        {}
        {managedRemotely && (
          <p
            className='flex items-center gap-1.5 pt-2 border-t border-dark-600 text-xs text-muted-500'
            data-testid='managed-remotely-notice'
          >
            <span className='w-1.5 h-1.5 rounded-full bg-info-400 shrink-0' />
            {t('card.managedRemotely', {
              coordinator: coordinatorLabel ?? coordinator ?? t('card.remoteCoordinatorUnknown'),
            })}
          </p>
        )}
        {(onStart || onStop || onRestart || onBacktest) && (
          <div
            className={clsx('flex space-x-2 pt-2', !managedRemotely && 'border-t border-dark-600')}
          >
            {(onStart || onStop) && (
              <StrategyActionControls
                displayName={displayName}
                showStopButton={showStopButton}
                onStart={onStart}
                onStop={onStop}
                isStarting={isStarting}
                isStopping={isStopping}
                isRestarting={isRestarting}
                readOnly={readOnly}
              />
            )}
            {onRestart && (showStopButton || (managedRemotely === true && autoStartEnabled)) && (
              <button
                type='button'
                onClick={onRestart}
                disabled={readOnly || isStarting || isStopping || isRestarting}
                aria-label={t('card.restartAriaLabel', { name: displayName })}
                className='flex-1 px-4 py-2 rounded-md text-sm font-medium bg-info-600 text-white transition-colors hover:bg-info-700 focus:outline-none focus:ring-2 focus:ring-info-500 disabled:opacity-50 disabled:cursor-not-allowed'
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
            {onBacktest && (
              <button
                type='button'
                onClick={onBacktest}
                aria-label={t('card.backtestAriaLabel', { name: displayName })}
                className='px-4 py-2 rounded-md text-sm font-medium bg-brand-600 text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500'
              >
                {t('card.backtest')}
              </button>
            )}
          </div>
        )}
      </article>
    )
  }
)
