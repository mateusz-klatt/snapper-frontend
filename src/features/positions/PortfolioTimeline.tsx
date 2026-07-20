import React, { useState } from 'react'
import { ChartNoAxesCombined, TriangleAlert, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NativeSelect } from '../../components/NativeSelect'
import { EmptyState, LoadingSpinner } from '../../components/ui'
import { usePortfolioPnlSeries } from '../../hooks/queries/portfolio'
import { useAppStore } from '../../stores/app'
import type { PortfolioPnlGranularity } from '../../types/api'
import { ContributionTable } from './ContributionTable'
import { PnlChart } from './PnlChart'

type TimelineWindow = '24h' | '7d' | '30d' | '90d'

const WINDOW_DURATIONS_MS: Record<TimelineWindow, number> = {
  '24h': 24 * 60 * 60 * 1_000,
  '7d': 7 * 24 * 60 * 60 * 1_000,
  '30d': 30 * 24 * 60 * 60 * 1_000,
  '90d': 90 * 24 * 60 * 60 * 1_000,
}

const GRANULARITIES: readonly {
  value: PortfolioPnlGranularity
  labelKey:
    | 'timeline.controls.granularityOptions.oneMinute'
    | 'timeline.controls.granularityOptions.fiveMinutes'
    | 'timeline.controls.granularityOptions.oneHour'
    | 'timeline.controls.granularityOptions.oneDay'
}[] = [
  { value: '1m', labelKey: 'timeline.controls.granularityOptions.oneMinute' },
  { value: '5m', labelKey: 'timeline.controls.granularityOptions.fiveMinutes' },
  { value: '1h', labelKey: 'timeline.controls.granularityOptions.oneHour' },
  { value: '1d', labelKey: 'timeline.controls.granularityOptions.oneDay' },
]

export const PortfolioTimeline: React.FC = () => {
  const { t } = useTranslation('positions')
  const walletPublicId = useAppStore(s => s.currentWalletPublicId)
  const asOf = useAppStore(s => s.asOf)
  const [window, setWindow] = useState<TimelineWindow>('24h')
  const [granularity, setGranularity] = useState<PortfolioPnlGranularity>('1m')
  const [liveWindowEnd, setLiveWindowEnd] = useState(() => Date.now())
  const anchorMs = asOf === null ? liveWindowEnd : new Date(asOf).getTime()
  const from = new Date(anchorMs - WINDOW_DURATIONS_MS[window]).toISOString()
  const to = new Date(anchorMs).toISOString()
  const { data, isLoading, isError } = usePortfolioPnlSeries({
    from,
    to,
    granularity,
    mode: 'live',
  })
  const points = data?.points ?? []

  if (walletPublicId === null) {
    return (
      <EmptyState
        icon={<WalletCards className='h-6 w-6' />}
        title={t('timeline.noWallet.title')}
        message={t('timeline.noWallet.message')}
      />
    )
  }

  const windowOptions = [
    { value: '24h', label: t('timeline.controls.last24Hours') },
    { value: '7d', label: t('timeline.controls.last7Days') },
    { value: '30d', label: t('timeline.controls.last30Days') },
    { value: '90d', label: t('timeline.controls.last90Days') },
  ]
  const granularityOptions = GRANULARITIES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }))

  const controls = (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='space-y-1'>
        <label htmlFor='pnl-window' className='block text-xs font-medium text-muted-500'>
          {t('timeline.controls.window')}
        </label>
        <NativeSelect
          id='pnl-window'
          value={window}
          onChange={value => {
            setWindow(value as TimelineWindow)
            setLiveWindowEnd(Date.now())
          }}
          options={windowOptions}
          ariaLabel={t('timeline.controls.windowAriaLabel')}
        />
      </div>
      <div className='space-y-1'>
        <label htmlFor='pnl-granularity' className='block text-xs font-medium text-muted-500'>
          {t('timeline.controls.granularity')}
        </label>
        <NativeSelect
          id='pnl-granularity'
          value={granularity}
          onChange={value => setGranularity(value as PortfolioPnlGranularity)}
          options={granularityOptions}
          ariaLabel={t('timeline.controls.granularityAriaLabel')}
        />
      </div>
    </div>
  )

  let content: React.ReactNode

  if (isLoading) {
    content = (
      <div className='flex items-center justify-center gap-3 py-12 text-sm text-muted-500'>
        <LoadingSpinner />
        <span>{t('timeline.loading')}</span>
      </div>
    )
  } else if (isError) {
    content = (
      <EmptyState
        icon={<TriangleAlert className='h-6 w-6' />}
        title={t('timeline.error.title')}
        message={t('timeline.error.message')}
      />
    )
  } else if (points.length === 0) {
    content = (
      <EmptyState
        icon={<ChartNoAxesCombined className='h-6 w-6' />}
        title={t('timeline.empty.title')}
        message={t('timeline.empty.message')}
      />
    )
  } else {
    const series = data as NonNullable<typeof data>
    const incompleteCount = points.filter(point => point.valuation_status === 'incomplete').length
    const latestPoint = points[points.length - 1] as (typeof points)[number]

    content = (
      <div className='space-y-4'>
        <section className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'>
          {incompleteCount > 0 && (
            <div className='mb-3 flex justify-end'>
              <span
                className='rounded-full border border-warning-500/40 bg-warning-500/10 px-2 py-1 text-xs font-medium text-warning-600'
                data-testid='pnl-incomplete-badge'
              >
                {t('timeline.incompleteBadge', { count: incompleteCount })}
              </span>
            </div>
          )}
          <PnlChart points={points} valuationCcy={series.valuation_ccy} />
        </section>
        <ContributionTable
          contributions={latestPoint.per_instrument}
          valuationCcy={series.valuation_ccy}
        />
      </div>
    )
  }

  return (
    <div className='space-y-4' data-testid='portfolio-timeline'>
      {controls}
      {content}
    </div>
  )
}
