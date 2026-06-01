import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, StatusBadge } from '../../components/ui'
import {
  useMetricCoordinators,
  useMetricProcessNames,
  useMetricRow,
  useMetricContainerRssTotal,
} from '../../stores/processMetrics'
import type { ProcessSummaryItem } from '../../types/ws.generated'

const BYTES_PER_MB = 1024 * 1024
const MB_PER_GB = 1024
const EM_DASH = '—'

/**
 * Render a byte count as a compact MB/GB string.
 *
 * Mirrors the precedent in `SystemMetricsCard`: values below 1024 MB are
 * shown in MB with one decimal, larger values roll up to GB with two
 * decimals. The unit suffix is intentionally untranslated because MB/GB
 * are universal across locales.
 */
function formatBytes(bytes: number): string {
  const mb = bytes / BYTES_PER_MB

  if (mb < MB_PER_GB) return `${mb.toFixed(1)} MB`

  return `${(mb / MB_PER_GB).toFixed(2)} GB`
}

function formatMemory(rssBytes: number | null | undefined): string {
  if (rssBytes == null) return EM_DASH

  return formatBytes(rssBytes)
}

function formatCpu(cpuPercent: number | null | undefined): string {
  if (cpuPercent == null) return EM_DASH

  return `${cpuPercent.toFixed(1)}%`
}

type ProcessStatus = 'running' | 'stopped' | 'disabled'

/**
 * Derive a display status from the running/enabled flags.
 *
 * Running takes precedence; a non-running but enabled process is
 * Stopped, and a non-running disabled process is Disabled.
 */
function deriveStatus(item: ProcessSummaryItem): ProcessStatus {
  if (item.running) return 'running'
  if (item.enabled) return 'stopped'

  return 'disabled'
}

const STATUS_BADGE: Record<ProcessStatus, 'connected' | 'stale' | 'disconnected'> = {
  running: 'connected',
  stopped: 'stale',
  disabled: 'disconnected',
}

const STATUS_LABEL_KEY: Record<
  ProcessStatus,
  | 'processResources.statusRunning'
  | 'processResources.statusStopped'
  | 'processResources.statusDisabled'
> = {
  running: 'processResources.statusRunning',
  stopped: 'processResources.statusStopped',
  disabled: 'processResources.statusDisabled',
}

interface ProcessMetricRowProps {
  readonly coordinator: string
  readonly name: string
}

const ProcessMetricRowInner: React.FC<ProcessMetricRowProps> = ({ coordinator, name }) => {
  const { t } = useTranslation('overview')
  const row = useMetricRow(coordinator, name)

  if (row === undefined) return null

  const status = deriveStatus(row)

  return (
    <tr className='border-t border-dark-600'>
      <td className='py-2 pr-4 text-sm font-medium text-alpine-900'>{row.name}</td>
      <td className='py-2 pr-4'>
        <StatusBadge status={STATUS_BADGE[status]}>{t(STATUS_LABEL_KEY[status])}</StatusBadge>
      </td>
      <td className='py-2 pr-4 text-sm text-muted-600'>{row.role}</td>
      <td className='py-2 pr-4 text-right font-mono text-sm text-alpine-900'>
        {formatMemory(row.rss_bytes)}
      </td>
      <td className='py-2 text-right font-mono text-sm text-alpine-900'>
        {formatCpu(row.cpu_percent)}
      </td>
    </tr>
  )
}

export const ProcessMetricRow = React.memo(ProcessMetricRowInner)

ProcessMetricRow.displayName = 'ProcessMetricRow'

interface ContainerGroupProps {
  readonly coordinator: string
}

const ContainerGroup: React.FC<ContainerGroupProps> = ({ coordinator }) => {
  const { t } = useTranslation('overview')
  const names = useMetricProcessNames(coordinator)
  const rssTotal = useMetricContainerRssTotal(coordinator)
  const totalLabel = rssTotal === null ? EM_DASH : formatBytes(rssTotal)

  return (
    <section className='space-y-2'>
      <header className='flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-alpine-900'>{coordinator}</h4>
        <span className='font-mono text-xs text-muted-600'>
          {t('processResources.containerTotal', { value: totalLabel })}
        </span>
      </header>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='text-left text-xs uppercase tracking-wide text-muted-600'>
              <th className='py-1 pr-4 font-medium'>{t('processResources.colName')}</th>
              <th className='py-1 pr-4 font-medium'>{t('processResources.colStatus')}</th>
              <th className='py-1 pr-4 font-medium'>{t('processResources.colRole')}</th>
              <th className='py-1 pr-4 text-right font-medium'>
                {t('processResources.colMemory')}
              </th>
              <th className='py-1 text-right font-medium' title={t('processResources.cpuTooltip')}>
                {t('processResources.colCpu')}
              </th>
            </tr>
          </thead>
          <tbody>
            {names.map(name => (
              <ProcessMetricRow key={name} coordinator={coordinator} name={name} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export const ProcessResourceTable: React.FC = () => {
  const { t } = useTranslation('overview')
  const coordinators = useMetricCoordinators()

  return (
    <Card title={t('processResources.title')}>
      {coordinators.length === 0 ? (
        <div className='text-center py-8 text-muted-500'>{t('processResources.empty')}</div>
      ) : (
        <div className='space-y-6'>
          {coordinators.map(coordinator => (
            <ContainerGroup key={coordinator} coordinator={coordinator} />
          ))}
        </div>
      )}
    </Card>
  )
}
