import React from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useBacktestComparison } from '../../hooks/queries/backtests'
import { APIError } from '../../lib/apiClient'
import { MetricsDiffTable } from './compare/MetricsDiffTable'
import { EquityOverlayChart } from './compare/EquityOverlayChart'
import { TradesDiffList } from './compare/TradesDiffList'
import { SignalsDiffList } from './compare/SignalsDiffList'

interface Props {
  comparisonPublicId: string
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-gain-400',
  failed: 'text-loss-400',
  cancelled: 'text-muted-400',
  running: 'text-brand-400',
  pending: 'text-muted-400',
}

const labelRun = (
  t: TFunction<'backtests'>,
  label: 'A' | 'B',
  publicId: string,
  status: string
): string => {
  const statusText = t(`status.${status}`, { defaultValue: status })

  return t('compare.runLabel', { label, id: publicId.slice(0, 8), status: statusText })
}

/**
 * Compare page — full implementation. Branches:
 * - loading: spinner-like message.
 * - 404 APIError: "comparison not found in current wallet" + back link.
 *   Triggered when the user switches wallet picker after navigation.
 * - other error: generic fallback.
 * - success: header + 4 panels (metrics, equity overlay, trades, signals).
 */
export const ComparePage: React.FC<Props> = ({ comparisonPublicId }) => {
  const { t } = useTranslation('backtests')
  const { data, isLoading, error } = useBacktestComparison(comparisonPublicId)

  if (isLoading) {
    return (
      <div className='p-4 text-sm text-muted-500' data-testid='compare-page'>
        {t('compare.loading')}
      </div>
    )
  }

  if (error) {
    const isNotFound = error instanceof APIError && error.status === 404
    const errorMessage = error instanceof Error ? error.message : t('compare.errors.unknown')
    const message = isNotFound
      ? t('compare.errors.notFound')
      : t('compare.errors.loadFailed', { message: errorMessage })

    return (
      <div className='space-y-3 p-4' data-testid='compare-page'>
        <h2 className='text-lg font-semibold'>{t('compare.title')}</h2>
        <div className='text-sm text-loss-400'>{message}</div>
        <a href='#backtests' className='text-sm text-brand-400 hover:underline'>
          {t('nav.backToList')}
        </a>
      </div>
    )
  }

  if (!data?.payload) {
    return (
      <div className='p-4 text-sm text-loss-400' data-testid='compare-page'>
        {t('compare.errors.emptyResponse')}
      </div>
    )
  }

  const { comparison, run_a, run_b, metrics_diff, equity_overlay, trades_diff, signals_diff } =
    data.payload

  return (
    <div className='space-y-6 p-4' data-testid='compare-page'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{t('compare.headingFull')}</h2>
        <a href='#backtests' className='text-sm text-brand-400 hover:underline'>
          {t('nav.back')}
        </a>
      </div>
      <div className='flex flex-wrap items-center gap-3 text-sm'>
        <span
          className={clsx('font-medium', STATUS_COLOR[run_a.status] ?? 'text-muted-400')}
          data-testid='compare-run-a-label'
        >
          {labelRun(t, 'A', run_a.public_id, run_a.status)}
        </span>
        <span className='text-muted-500'>{t('compare.vs')}</span>
        <span
          className={clsx('font-medium', STATUS_COLOR[run_b.status] ?? 'text-muted-400')}
          data-testid='compare-run-b-label'
        >
          {labelRun(t, 'B', run_b.public_id, run_b.status)}
        </span>
        <span
          className='rounded bg-dark-600 px-2 py-0.5 text-xs text-muted-400'
          data-testid='compare-pairing-mode'
        >
          {t(`compare.pairingMode.${comparison.pairing_mode}`, {
            defaultValue: comparison.pairing_mode,
          })}
        </span>
        {comparison.config_hash && (
          <code className='font-mono text-xs text-muted-400'>{comparison.config_hash}</code>
        )}
      </div>
      <section>
        <h3 className='mb-2 text-base font-semibold text-alpine-900'>
          {t('compare.sections.metrics')}
        </h3>
        <MetricsDiffTable rows={metrics_diff} />
      </section>
      <section>
        <h3 className='mb-2 text-base font-semibold text-alpine-900'>
          {t('compare.sections.equityOverlay')}
        </h3>
        <EquityOverlayChart points={equity_overlay} />
      </section>
      <section>
        <h3 className='mb-2 text-base font-semibold text-alpine-900'>
          {t('compare.sections.trades')}
        </h3>
        <TradesDiffList entries={trades_diff} />
      </section>
      <section>
        <h3 className='mb-2 text-base font-semibold text-alpine-900'>
          {t('compare.sections.signals')}
        </h3>
        <SignalsDiffList entries={signals_diff} />
      </section>
    </div>
  )
}
