import React, { useState } from 'react'
import { ChartNoAxesCombined, Info, TriangleAlert, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NativeSelect } from '../../components/NativeSelect'
import { EmptyState, LoadingSpinner } from '../../components/ui'
import { usePortfolioPnlTimeline } from '../../hooks/queries/portfolio'
import { useWallets } from '../../hooks/queries/wallets'
import { useAppStore } from '../../stores/app'
import type { PortfolioPnlGranularity } from '../../types/api'
import { AttributionBreakdown } from './AttributionBreakdown'
import { ContributionTable } from './ContributionTable'
import { PnlChart } from './PnlChart'
import { PNL_MARKER_COLORS } from './pnlMarkerStyles'

type TimelineWindow = '24h' | '7d' | '30d' | '90d'
type TimelineValuationCurrency = 'USD' | 'PLN' | 'EUR'

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

const VALUATION_CURRENCIES: readonly {
  value: TimelineValuationCurrency
  labelKey:
    | 'timeline.controls.valuationCurrencyOptions.usd'
    | 'timeline.controls.valuationCurrencyOptions.pln'
    | 'timeline.controls.valuationCurrencyOptions.eur'
}[] = [
  { value: 'USD', labelKey: 'timeline.controls.valuationCurrencyOptions.usd' },
  { value: 'PLN', labelKey: 'timeline.controls.valuationCurrencyOptions.pln' },
  { value: 'EUR', labelKey: 'timeline.controls.valuationCurrencyOptions.eur' },
]

export const PortfolioTimeline: React.FC = () => {
  const { t } = useTranslation('positions')
  const walletPublicId = useAppStore(s => s.currentWalletPublicId)
  const asOf = useAppStore(s => s.asOf)
  const [window, setWindow] = useState<TimelineWindow>('24h')
  const [granularity, setGranularity] = useState<PortfolioPnlGranularity>('1m')
  const [valuationCcy, setValuationCcy] = useState<TimelineValuationCurrency>('USD')
  const [showMarkers, setShowMarkers] = useState(true)
  const [liveWindowEnd, setLiveWindowEnd] = useState(() => Date.now())
  const walletQuery = useWallets()
  const selectedWallet = walletQuery.data?.payload.find(
    wallet => wallet.public_id === walletPublicId
  )
  const walletModeReady = selectedWallet !== undefined
  const mode = selectedWallet?.is_paper === true ? 'paper' : 'live'
  const anchorMs = asOf === null ? liveWindowEnd : new Date(asOf).getTime()
  const from = new Date(anchorMs - WINDOW_DURATIONS_MS[window]).toISOString()
  const to = new Date(anchorMs).toISOString()
  const {
    data,
    isLoading: isTimelineLoading,
    isError: isTimelineError,
  } = usePortfolioPnlTimeline(
    {
      from,
      to,
      granularity,
      mode,
      valuationCcy,
    },
    walletModeReady
  )
  const points = data?.points ?? []
  const markers = data?.markers ?? []
  const isWalletMetadataLoading =
    !walletModeReady && walletQuery.data === undefined && !walletQuery.isError
  const isWalletMetadataError = !walletModeReady && !isWalletMetadataLoading
  const isLoading = isWalletMetadataLoading || isTimelineLoading
  const isError = isWalletMetadataError || isTimelineError

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
  const valuationCurrencyOptions = VALUATION_CURRENCIES.map(({ value, labelKey }) => ({
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
      <div className='space-y-1'>
        <label
          htmlFor='pnl-valuation-currency'
          className='block text-xs font-medium text-muted-500'
        >
          {t('timeline.controls.valuationCurrency')}
        </label>
        <NativeSelect
          id='pnl-valuation-currency'
          value={valuationCcy}
          onChange={value => setValuationCcy(value as TimelineValuationCurrency)}
          options={valuationCurrencyOptions}
          ariaLabel={t('timeline.controls.valuationCurrencyAriaLabel')}
        />
      </div>
      <button
        type='button'
        className='rounded-lg border border-brand-500 px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-900/20'
        aria-pressed={showMarkers}
        onClick={() => setShowMarkers(current => !current)}
        data-testid='pnl-marker-toggle'
      >
        {showMarkers ? t('timeline.markers.hide') : t('timeline.markers.show')}
      </button>
    </div>
  )

  const markerLegend = showMarkers ? (
    <div
      className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-500'
      aria-label={t('timeline.markers.legendAriaLabel')}
      data-testid='pnl-marker-legend'
    >
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.fill }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-fill-executed'
        >
          ■
        </span>
        {t('timeline.markers.legend.fillExecuted')}
      </span>
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.signal }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-signal-executed'
        >
          ▲
        </span>
        {t('timeline.markers.legend.signalExecuted')}
      </span>
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.signalNoFill }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-signal-no-fill'
        >
          ●
        </span>
        {t('timeline.markers.legend.signalNoFill')}
      </span>
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.aiDecision }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-ai-executed'
        >
          ▲
        </span>
        {t('timeline.markers.legend.aiExecuted')}
      </span>
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.rejected }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-ai-rejected'
        >
          ■
        </span>
        {t('timeline.markers.legend.aiRejected')}
      </span>
      <span className='flex items-center gap-1'>
        <span
          style={{ color: PNL_MARKER_COLORS.noFill }}
          aria-hidden='true'
          data-testid='pnl-marker-legend-ai-no-fill'
        >
          ●
        </span>
        {t('timeline.markers.legend.aiNoFill')}
      </span>
    </div>
  ) : null

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
  } else if (points.length === 0 && markers.length === 0) {
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
    const latestPoint = points[points.length - 1]

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
          <PnlChart
            points={points}
            markers={markers}
            showMarkers={showMarkers}
            valuationCcy={series.valuation_ccy}
          />
        </section>
        {latestPoint !== undefined && (
          <>
            <AttributionBreakdown
              attribution={latestPoint.attribution}
              valuationCcy={series.valuation_ccy}
            />
            <ContributionTable
              contributions={latestPoint.per_instrument}
              valuationCcy={series.valuation_ccy}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-4' data-testid='portfolio-timeline'>
      {controls}
      {asOf !== null && (
        <div
          className='flex items-center gap-2 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-700'
          role='status'
          data-testid='pnl-time-travel-notice'
        >
          <Info className='h-4 w-4 shrink-0' aria-hidden='true' />
          <span>{t('timeline.timeTravelNotice', { asOf })}</span>
        </div>
      )}
      {markerLegend}
      {data?.markers_truncated === true && (
        <div
          className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-sm text-warning-600'
          role='alert'
          data-testid='pnl-marker-truncation-warning'
        >
          <TriangleAlert className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
          <span>{t('timeline.markers.truncated', { limit: data.marker_limit })}</span>
        </div>
      )}
      {content}
    </div>
  )
}
