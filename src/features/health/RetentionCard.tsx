import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useRetentionRun } from '../../hooks/queries/system'
import { formatNumber } from '../../lib/utils'

import type { RetentionPolicyResult } from '../../types/api'

interface PolicyRowProps {
  readonly policy: RetentionPolicyResult
}

const PolicyRow: React.FC<PolicyRowProps> = ({ policy }) => {
  const { t } = useTranslation('health')
  const window =
    policy.day_start === null || policy.day_end === null
      ? '—'
      : `${policy.day_start} → ${policy.day_end}`

  return (
    <tr className='border-t border-dark-600'>
      <td className='px-3 py-2 font-mono text-xs text-alpine-900'>{policy.table}</td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {t('retention.retainDays', { days: policy.retain_days.toString() })}
      </td>
      <td className='px-3 py-2 font-mono text-xs text-muted-600'>{window}</td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatNumber(policy.archived_rows)}
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatNumber(policy.purged_rows)}
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {policy.files_written.toString()}
      </td>
      <td className='px-3 py-2 text-xs'>
        {policy.error === null ? (
          <span className='text-gain-600'>{t('retention.ok')}</span>
        ) : (
          <span className='text-loss-600' title={policy.error}>
            {t('retention.error')}
          </span>
        )}
      </td>
    </tr>
  )
}

export const RetentionCard: React.FC = () => {
  const { t } = useTranslation('health')
  const { data, isLoading, error } = useRetentionRun()

  const formatRelativeAge = (busTime: string, now: Date): string => {
    const ageMs = now.getTime() - new Date(busTime).getTime()
    const ageS = ageMs / 1000

    if (ageS < 1) return t('relativeAge.justNow')
    if (ageS < 60) return t('relativeAge.seconds', { seconds: ageS.toFixed(0) })
    if (ageS < 3600) return t('relativeAge.minutes', { minutes: (ageS / 60).toFixed(1) })
    if (ageS < 86400) return t('relativeAge.hours', { hours: (ageS / 3600).toFixed(1) })

    return t('relativeAge.days', { days: (ageS / 86400).toFixed(1) })
  }

  const errorMessage = useMemo(() => {
    if (!error) return null
    if (error instanceof Error) return error.message

    return t('retention.fallbackError')
  }, [error, t])

  return (
    <section className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-4'>
      <header className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-alpine-900'>{t('retention.title')}</h3>
        {data?.payload && (
          <span className='text-xs text-muted-600'>
            {t('retention.lastRun', {
              age: formatRelativeAge(data.payload.run_completed_at, new Date()),
            })}
          </span>
        )}
      </header>
      {isLoading && <p className='text-sm text-muted-600'>{t('retention.loading')}</p>}
      {errorMessage !== null && (
        <p className='text-sm text-loss-600'>
          {t('retention.unavailable', { message: errorMessage })}
        </p>
      )}
      {data?.payload && (
        <>
          {data.payload.dry_run && (
            <p className='rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700'>
              {t('retention.dryRunNotice')}
            </p>
          )}
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr className='bg-alpine-50 text-left text-xs uppercase tracking-wide text-muted-600'>
                  <th className='px-3 py-2'>{t('retention.columns.table')}</th>
                  <th className='px-3 py-2 text-right'>{t('retention.columns.retain')}</th>
                  <th className='px-3 py-2'>{t('retention.columns.archivedWindow')}</th>
                  <th className='px-3 py-2 text-right'>{t('retention.columns.archived')}</th>
                  <th className='px-3 py-2 text-right'>{t('retention.columns.purged')}</th>
                  <th className='px-3 py-2 text-right'>{t('retention.columns.files')}</th>
                  <th className='px-3 py-2'>{t('retention.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.payload.results.map(row => (
                  <PolicyRow key={row.table} policy={row} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
