import React from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { MetricDiffRow } from '../../../types/api'

interface Props {
  rows: MetricDiffRow[]
}

const formatNumber = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '—'

  return Number.isFinite(v) ? v.toFixed(4) : String(v)
}

const formatPct = (t: TFunction<'backtests'>, v: number | null | undefined): string => {
  if (v === null || v === undefined) return '—'

  return t('compare.metrics.percent', { value: (v * 100).toFixed(2) })
}

const deltaColor = (v: number | null | undefined): string => {
  if (v === null || v === undefined || v === 0) return 'text-muted-400'

  return v > 0 ? 'text-rising-400' : 'text-falling-400'
}

/**
 * Metrics diff table — one row per metric name, columns for run A
 * value, run B value, absolute delta, percent delta. Renders an
 * empty state when the diff is empty (e.g. both runs had no equity
 * points).
 */
export const MetricsDiffTable: React.FC<Props> = ({ rows }) => {
  const { t } = useTranslation('backtests')

  if (rows.length === 0) {
    return (
      <div className='text-sm text-muted-500' data-testid='metrics-diff-empty'>
        {t('compare.metrics.empty')}
      </div>
    )
  }

  return (
    <table className='w-full text-sm' data-testid='metrics-diff-table'>
      <thead>
        <tr className='text-left text-muted-500'>
          <th className='py-1'>{t('compare.metrics.columns.name')}</th>
          <th className='py-1 text-right'>{t('compare.metrics.columns.runA')}</th>
          <th className='py-1 text-right'>{t('compare.metrics.columns.runB')}</th>
          <th className='py-1 text-right'>{t('compare.metrics.columns.delta')}</th>
          <th className='py-1 text-right'>{t('compare.metrics.columns.deltaPct')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.name} className='border-t border-dark-600'>
            <td className='py-1 text-alpine-900'>{row.name}</td>
            <td className='py-1 text-right font-mono text-alpine-900'>{formatNumber(row.run_a)}</td>
            <td className='py-1 text-right font-mono text-alpine-900'>{formatNumber(row.run_b)}</td>
            <td className={clsx('py-1 text-right font-mono', deltaColor(row.delta))}>
              {formatNumber(row.delta)}
            </td>
            <td className={clsx('py-1 text-right font-mono', deltaColor(row.pct))}>
              {formatPct(t, row.pct)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
