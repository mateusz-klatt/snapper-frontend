import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useSystemMetrics } from '../../hooks/queries/system'
import { formatNumber } from '../../lib/utils'

import type { SystemMetricsData } from '../../types/api'

const BYTES_PER_MB = 1024 * 1024

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'

  return `${(value * 100).toFixed(1)}%`
}

interface MetricCellProps {
  readonly label: string
  readonly value: string
  readonly description?: string | undefined
}

const MetricCell: React.FC<MetricCellProps> = ({ label, value, description }) => (
  <div className='flex flex-col rounded-md border border-dark-600 bg-alpine-50 p-3'>
    <span className='text-xs uppercase tracking-wide text-muted-600'>{label}</span>
    <span className='mt-1 text-lg font-semibold text-alpine-900'>{value}</span>
    {description !== undefined && (
      <span className='mt-1 text-xs text-muted-600'>{description}</span>
    )}
  </div>
)

interface ProcessHealthGridProps {
  readonly snapshot: SystemMetricsData
}

const ProcessHealthGrid: React.FC<ProcessHealthGridProps> = ({ snapshot }) => {
  const { t } = useTranslation('health')
  const { process, cpu, memory, asyncio, gc, db_internal, saturation, tracemalloc_active } =
    snapshot
  const memorySaturation = memory.saturation_pct
  const dbPoolDepth =
    db_internal.pool_size === null || db_internal.pool_checked_out === null
      ? '—'
      : `${db_internal.pool_checked_out} / ${db_internal.pool_size}`

  const formatBytes = (bytes: number): string => {
    const mb = bytes / BYTES_PER_MB

    if (mb < 1024) return t('memory.mb', { value: mb.toFixed(1) })

    return t('memory.gb', { value: (mb / 1024).toFixed(2) })
  }

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return t('duration.seconds', { seconds: seconds.toFixed(0) })
    if (seconds < 3600) return t('duration.minutes', { minutes: (seconds / 60).toFixed(1) })
    if (seconds < 86400) return t('duration.hours', { hours: (seconds / 3600).toFixed(1) })

    return t('duration.days', { days: (seconds / 86400).toFixed(1) })
  }

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <MetricCell
        label={t('systemMetrics.pid')}
        value={process.pid.toString()}
        description={t('systemMetrics.statusValue', {
          status: t(`status.${process.status}`, { defaultValue: process.status }),
        })}
      />
      <MetricCell label={t('systemMetrics.uptime')} value={formatUptime(process.uptime_seconds)} />
      <MetricCell label={t('systemMetrics.threads')} value={process.num_threads.toString()} />
      <MetricCell label={t('systemMetrics.openFds')} value={process.num_fds.toString()} />
      <MetricCell
        label={t('systemMetrics.cpu')}
        value={t('systemMetrics.cpuValue', { percent: cpu.process_percent.toFixed(1) })}
        description={
          cpu.cgroup_throttled_count !== null && cpu.cgroup_throttled_count > 0
            ? t('systemMetrics.throttled', { count: cpu.cgroup_throttled_count })
            : undefined
        }
      />
      <MetricCell
        label={t('systemMetrics.memory')}
        value={formatBytes(memory.rss_bytes)}
        description={
          memorySaturation === null
            ? undefined
            : t('systemMetrics.saturation', { percent: formatPercent(memorySaturation) })
        }
      />
      <MetricCell
        label={t('systemMetrics.asyncioTasks')}
        value={t('systemMetrics.asyncioActive', { count: asyncio.active_tasks })}
        description={t('systemMetrics.asyncioPending', { count: asyncio.pending_tasks })}
      />
      <MetricCell
        label={t('systemMetrics.dbPool')}
        value={dbPoolDepth}
        description={t('systemMetrics.liveConns', {
          count: db_internal.aiosqlite_live_connections,
        })}
      />
      <MetricCell
        label={t('systemMetrics.gcGenerations')}
        value={`${gc.collections_gen0.toString()} / ${gc.collections_gen1.toString()} / ${gc.collections_gen2.toString()}`}
        description={t('systemMetrics.gcObjects', { value: formatNumber(gc.current_objects) })}
      />
      <MetricCell
        label={t('systemMetrics.threadsPercent')}
        value={formatPercent(saturation.threads_pct)}
      />
      <MetricCell
        label={t('systemMetrics.networkConns')}
        value={process.num_connections.toString()}
      />
      <MetricCell
        label={t('systemMetrics.tracemalloc')}
        value={
          tracemalloc_active
            ? t('systemMetrics.tracemallocActive')
            : t('systemMetrics.tracemallocIdle')
        }
      />
    </div>
  )
}

export const SystemMetricsCard: React.FC = () => {
  const { t } = useTranslation('health')
  const { data, isLoading, error } = useSystemMetrics()
  const [debugOpen, setDebugOpen] = useState(false)

  const formatRelativeAge = (busTime: string, now: Date): string => {
    const ageMs = now.getTime() - new Date(busTime).getTime()
    const ageS = ageMs / 1000

    if (ageS < 1) return t('relativeAge.justNow')
    if (ageS < 60) return t('relativeAge.seconds', { seconds: ageS.toFixed(0) })
    if (ageS < 3600) return t('relativeAge.minutes', { minutes: (ageS / 60).toFixed(1) })

    return t('relativeAge.hours', { hours: (ageS / 3600).toFixed(1) })
  }

  const errorMessage = useMemo(() => {
    if (!error) return null
    if (error instanceof Error) return error.message

    return t('systemMetrics.fallbackError')
  }, [error, t])

  return (
    <section className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-4'>
      <header className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-alpine-900'>{t('systemMetrics.title')}</h3>
        {data?.payload && (
          <span className='text-xs text-muted-600'>
            {formatRelativeAge(data.payload.bus_time, new Date())}
          </span>
        )}
      </header>
      {isLoading && <p className='text-sm text-muted-600'>{t('systemMetrics.loading')}</p>}
      {errorMessage !== null && (
        <p className='text-sm text-loss-600'>
          {t('systemMetrics.unavailable', { message: errorMessage })}
        </p>
      )}
      {data?.payload && <ProcessHealthGrid snapshot={data.payload} />}
      {data?.payload && (
        <details
          className='text-xs text-muted-600'
          open={debugOpen}
          onToggle={event => {
            setDebugOpen((event.target as HTMLDetailsElement).open)
          }}
        >
          <summary className='cursor-pointer select-none'>{t('systemMetrics.rawJson')}</summary>
          <pre className='mt-2 max-h-64 overflow-auto rounded-md bg-muted-100 p-3 font-mono text-xs'>
            {JSON.stringify(data.payload, null, 2)}
          </pre>
        </details>
      )}
    </section>
  )
}
