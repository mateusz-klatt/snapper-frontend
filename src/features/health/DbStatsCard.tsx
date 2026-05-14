import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useDbStats } from '../../hooks/queries/system'
import { formatNumber } from '../../lib/utils'

import type { TableStatsItem } from '../../types/api'

function formatCount(value: number | null): string {
  if (value === null) return '—'

  return formatNumber(value)
}

interface TableRowProps {
  readonly row: TableStatsItem
}

const TableRow: React.FC<TableRowProps> = ({ row }) => {
  const { t } = useTranslation('health')

  return (
    <tr className='border-t border-dark-600'>
      <td className='px-3 py-2 font-mono text-xs text-alpine-900'>{row.table}</td>
      <td className='px-3 py-2 text-xs text-muted-600'>{row.table_kind}</td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatCount(row.total)}
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatCount(row.current)}
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatCount(row.closed)}
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatCount(row.archivable)}
      </td>
      <td className='px-3 py-2 text-center text-xs'>
        {row.is_stale ? <span className='text-loss-600'>{t('dbStats.stale')}</span> : '—'}
      </td>
    </tr>
  )
}

export const DbStatsCard: React.FC = () => {
  const { t } = useTranslation('health')
  const { data, isLoading, error } = useDbStats()

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

    return t('dbStats.fallbackError')
  }, [error, t])

  return (
    <section className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-4'>
      <header className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-alpine-900'>{t('dbStats.title')}</h3>
        {data?.payload && (
          <span className='text-xs text-muted-600'>
            {t('dbStats.sampled', {
              age: formatRelativeAge(data.payload.snapshot_completed_at, new Date()),
            })}
          </span>
        )}
      </header>
      {isLoading && <p className='text-sm text-muted-600'>{t('dbStats.loading')}</p>}
      {errorMessage !== null && (
        <p className='text-sm text-loss-600'>
          {t('dbStats.unavailable', { message: errorMessage })}
        </p>
      )}
      {data?.payload && (
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='bg-alpine-50 text-left text-xs uppercase tracking-wide text-muted-600'>
                <th className='px-3 py-2'>{t('dbStats.columns.table')}</th>
                <th className='px-3 py-2'>{t('dbStats.columns.kind')}</th>
                <th className='px-3 py-2 text-right'>{t('dbStats.columns.total')}</th>
                <th className='px-3 py-2 text-right'>{t('dbStats.columns.current')}</th>
                <th className='px-3 py-2 text-right'>{t('dbStats.columns.closed')}</th>
                <th className='px-3 py-2 text-right'>{t('dbStats.columns.archivable')}</th>
                <th className='px-3 py-2 text-center'>{t('dbStats.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.payload.tables.map(row => (
                <TableRow key={row.table} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.payload && (
        <p className='text-xs text-muted-600'>
          {t('dbStats.samplerSummary', {
            seconds: data.payload.interval_seconds.toString(),
            count: data.payload.tables.length,
          })}
        </p>
      )}
    </section>
  )
}
