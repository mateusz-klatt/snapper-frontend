import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, MetricCard, StatusBadge } from '../../components/ui'
import { CardSkeleton } from '../../components/Skeleton'
import { useAppStore } from '../../stores/app'
import { useOrdersGrouped, useExecutions } from '../../hooks/queries/orders'
import { usePositionsSummary } from '../../hooks/queries/positions'
import { useProcessSummary } from '../../hooks/queries/processes'
import { useLatestSignals } from '../../hooks/queries/signals'
import { ProcessResourceTable } from './ProcessResourceTable'
import { useProcessMetricsStore } from '../../stores/processMetrics'
import { formatDate, formatTime } from '../../lib/dateFormat'
import { currentHashQuery } from '../../lib/hash/currentHashQuery'
import { formatNumber } from '../../lib/utils'
import { formatQuoted, quoteCurrency } from '../positions/instrumentQuote'
import type { Signal, Execution } from '../../types/entities'
import type { ProcessSummaryData } from '../../types/api'
import type { ProcessSummaryItem } from '../../types/ws.generated'

const runningBadgeStatus = (count: number): 'connected' | 'disconnected' =>
  count > 0 ? 'connected' : 'disconnected'

const countChangeType = (count: number): 'positive' | 'neutral' =>
  count > 0 ? 'positive' : 'neutral'

const sideStatus = (side: string): 'rising' | 'falling' => (side === 'buy' ? 'rising' : 'falling')

const ProcessStatusRow: React.FC<
  Readonly<{ label: string; running: number; total?: number; activeLabel: string }>
> = ({ label, running, total, activeLabel }) => {
  const { t } = useTranslation('overview')
  const badgeLabel = ((): string => {
    if (running <= 0) return t('status.stopped')
    if (total !== undefined) return t('status.ratioActive', { running, total, label: activeLabel })

    return t('status.countActive', { running, label: activeLabel })
  })()

  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm font-medium'>{label}</span>
      <StatusBadge status={runningBadgeStatus(running)}>{badgeLabel}</StatusBadge>
    </div>
  )
}

interface PortfolioContentProps {
  readonly count: number
  readonly incompleteValuation: boolean
}

const UNAVAILABLE_PORTFOLIO_METRICS = [
  ['portfolio.totalValue', 'overview-total-value'],
  ['portfolio.longExposure', 'overview-long-exposure'],
  ['portfolio.shortExposure', 'overview-short-exposure'],
  ['portfolio.netDelta', 'overview-net-delta'],
  ['portfolio.unrealizedPnl', 'overview-unrealized-pnl'],
  ['portfolio.pnlPercent', 'overview-pnl-percent'],
] as const

const PortfolioContent: React.FC<PortfolioContentProps> = ({ count, incompleteValuation }) => {
  const { t } = useTranslation('overview')
  const { t: tPositions } = useTranslation('positions')
  const { t: tCommon } = useTranslation('common')

  return (
    <div className='space-y-3'>
      {UNAVAILABLE_PORTFOLIO_METRICS.map(([label, testId]) => (
        <div key={label} className='flex items-center justify-between'>
          <span className='text-sm font-medium'>{t(label)}</span>
          <span className='font-mono text-right text-muted-500' data-testid={testId}>
            —
          </span>
        </div>
      ))}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{t('portfolio.positions')}</span>
        <span className='font-mono text-right' data-testid='overview-position-count'>
          {formatNumber(count)}
        </span>
      </div>
      <p className='text-xs text-muted-500'>
        {t('portfolio.aggregationUnavailable', { tab: tPositions('view.timeline') })}
      </p>
      <a href={`#positions${currentHashQuery()}`} className='text-sm text-brand-600 underline'>
        {tCommon('nav.positions')}
      </a>
      {incompleteValuation && (
        <div className='text-xs text-warning-600' data-testid='overview-incomplete-valuation'>
          {t('portfolio.incompleteValuation')}
        </div>
      )}
    </div>
  )
}

const signalKey = (signal: Signal, index: number): string | number =>
  signal.firedAt?.getTime() ?? `signal-${index}`

const SignalRow: React.FC<Readonly<{ signal: Signal; index: number }>> = ({ signal, index }) => {
  const { t, i18n } = useTranslation('overview')
  const normalizedSide = signal.side.toLowerCase()

  return (
    <div
      key={signalKey(signal, index)}
      className='flex items-center justify-between gap-3 p-2 bg-dark-700 rounded-sm'
    >
      <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
        <StatusBadge status={sideStatus(normalizedSide)}>
          {normalizedSide.toUpperCase()}
        </StatusBadge>
        <span className='text-sm font-medium'>{signal.instrument}</span>
        {signal.strategyName && (
          <span className='max-w-40 truncate rounded-md bg-info-50 px-2 py-1 text-xs text-info-600'>
            {signal.strategyName}
          </span>
        )}
        {signal.price != null && (
          <span className='font-mono text-xs text-alpine-900'>
            {formatQuoted(signal.price, quoteCurrency(signal.instrument))}
          </span>
        )}
        <span className='text-xs text-muted-500'>{(signal.strength * 100).toFixed(0)}%</span>
      </div>
      <div className='shrink-0 text-xs text-muted-500'>
        {signal.firedAt ? formatTime(signal.firedAt, i18n.language) : t('signals.noTime')}
      </div>
    </div>
  )
}

const ExecutionRow: React.FC<Readonly<{ execution: Execution }>> = ({ execution }) => {
  const { t, i18n } = useTranslation('overview')

  return (
    <div className='flex items-center justify-between gap-3 p-2 bg-dark-700 rounded-sm'>
      <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
        <StatusBadge status={execution.side === 'sell' ? 'falling' : 'rising'}>
          {execution.side.toUpperCase()}
        </StatusBadge>
        <span className='text-sm font-medium'>{execution.instrument}</span>
        <span className='font-mono text-xs text-alpine-900'>
          {formatNumber(execution.size, { maximumFractionDigits: 20 })} @{' '}
          {formatQuoted(execution.price, quoteCurrency(execution.instrument))}
        </span>
      </div>
      <div className='shrink-0 text-xs text-muted-500'>
        {execution.executedAt
          ? formatTime(execution.executedAt, i18n.language)
          : t('executions.noTime')}
      </div>
    </div>
  )
}

const PortfolioCardContent: React.FC<
  Readonly<{
    loading: boolean
    summary: PortfolioContentProps | null
  }>
> = ({ loading, summary }) => {
  const { t } = useTranslation('overview')

  if (loading) return <CardSkeleton showTitle={false} contentLines={4} className='border-0 p-0' />
  if (summary) return <PortfolioContent {...summary} />

  return <div className='text-center py-8 text-muted-500'>{t('portfolio.empty')}</div>
}

const SignalsCardContent: React.FC<
  Readonly<{
    loading: boolean
    signals: readonly Signal[] | undefined
  }>
> = ({ loading, signals }) => {
  const { t } = useTranslation('overview')

  if (loading) return <CardSkeleton showTitle={false} contentLines={5} className='border-0 p-0' />
  if (signals && signals.length > 0)
    return (
      <div className='space-y-2'>
        {signals.map((signal, index) => (
          <SignalRow key={signalKey(signal, index)} signal={signal} index={index} />
        ))}
      </div>
    )

  return <div className='text-center py-8 text-muted-500'>{t('signals.empty')}</div>
}

const zeroCounts = { running: 0, total: 0 }

/**
 * Map a REST process-summary item onto the store's WS-shaped item.
 *
 * The REST and WS generated types differ only in optional/`undefined`
 * tolerance under `exactOptionalPropertyTypes`; the nullable fields are
 * collapsed to `null` here so the seed matches the store contract and
 * stays value-comparable with later WS frames.
 */
const toMetricItem = (
  item: NonNullable<ProcessSummaryData['processes']>[number]
): ProcessSummaryItem => ({
  name: item.name,
  running: item.running,
  enabled: item.enabled,
  owned: item.owned,
  role: item.role,
  lifecycle: item.lifecycle,
  active_public_id: item.active_public_id ?? null,
  rss_bytes: item.rss_bytes ?? null,
  cpu_percent: item.cpu_percent ?? null,
})

export const Overview: React.FC = () => {
  const { t, i18n } = useTranslation('overview')
  const asOf = useAppStore(s => s.asOf)
  const { data: processSummary, isLoading: processLoading } = useProcessSummary()
  const { data: positionsSummary, isLoading: positionsLoading } = usePositionsSummary()
  const { data: latestSignals, isLoading: signalsLoading } = useLatestSignals(5)
  const { data: ordersGrouped } = useOrdersGrouped({ limit: 50 })
  const { data: executions = [] } = useExecutions()
  const feeds = processSummary?.payload?.feeds ?? zeroCounts
  const strategies = processSummary?.payload?.strategies ?? zeroCounts
  const executors = processSummary?.payload?.executors ?? zeroCounts
  const brokers = processSummary?.payload?.brokers ?? zeroCounts
  const summaryPayload = processSummary?.payload

  React.useEffect(() => {
    if (summaryPayload?.processes === undefined) return

    useProcessMetricsStore
      .getState()
      .setSnapshot(
        summaryPayload.coordinator,
        summaryPayload.coordinator_label ?? null,
        summaryPayload.processes.map(toMetricItem),
        summaryPayload.timestamp
      )
  }, [summaryPayload])

  const recentExecutions = executions.slice(0, 5)
  const openOrdersCount = ordersGrouped?.open?.length || 0
  const referenceDate = asOf ? new Date(asOf) : new Date()
  const referenceDayStr = referenceDate.toDateString()
  const todayExecutionsCount = executions.filter(
    e => e.executedAt?.toDateString() === referenceDayStr
  ).length

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
      {}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <MetricCard
          label={t('metrics.feedsRunning')}
          value={`${feeds.running}/${feeds.total}`}
          changeType={countChangeType(feeds.running)}
        />
        <MetricCard
          label={t('metrics.strategiesActive')}
          value={`${strategies.running}/${strategies.total}`}
          changeType={countChangeType(strategies.running)}
        />
        <MetricCard label={t('metrics.openOrders')} value={openOrdersCount} changeType='neutral' />
        <MetricCard
          label={
            asOf
              ? t('metrics.executionsOn', {
                  date: formatDate(referenceDate, i18n.language),
                })
              : t('metrics.todaysExecutions')
          }
          value={todayExecutionsCount}
          changeType='positive'
        />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {}
        <Card title={t('processStatus.title')}>
          {processLoading ? (
            <CardSkeleton showTitle={false} contentLines={4} className='border-0 p-0' />
          ) : (
            <div className='space-y-3'>
              <ProcessStatusRow
                label={t('processStatus.feeds')}
                running={feeds.running}
                activeLabel={t('labels.running')}
              />
              <ProcessStatusRow
                label={t('processStatus.strategies')}
                running={strategies.running}
                activeLabel={t('labels.active')}
              />
              <ProcessStatusRow
                label={t('processStatus.executors')}
                running={executors.running}
                total={executors.total}
                activeLabel={t('labels.running')}
              />
              <ProcessStatusRow
                label={t('processStatus.brokers')}
                running={brokers.running}
                total={brokers.total}
                activeLabel={t('labels.running')}
              />
            </div>
          )}
        </Card>
        {}
        <Card title={t('portfolio.title')}>
          <PortfolioCardContent loading={positionsLoading} summary={positionsSummary ?? null} />
        </Card>
      </div>
      <ProcessResourceTable />
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {}
        <Card title={t('signals.title')}>
          <SignalsCardContent loading={signalsLoading} signals={latestSignals} />
        </Card>
        {}
        <Card title={t('executions.title')}>
          {recentExecutions.length > 0 ? (
            <div className='space-y-2'>
              {recentExecutions.map(execution => (
                <ExecutionRow key={execution.clientOrderId} execution={execution} />
              ))}
            </div>
          ) : (
            <div className='text-center py-8 text-muted-500'>{t('executions.empty')}</div>
          )}
        </Card>
      </div>
    </div>
  )
}
