import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app'
import { SignalCardSkeleton } from '../../components/Skeleton'
import { ThemeSelect } from '../../components/ThemeSelect'
import { exportToCSV } from '../../lib/csvExport'
import { EmptyState } from '../../components/ui'
import { useSignals } from '../../hooks/queries/signals'
import type { Signal } from '../../types/entities'
import clsx from 'clsx'
import {
  SIGNAL_STRENGTH_STRONG,
  SIGNAL_STRENGTH_MEDIUM,
  SIGNAL_STRENGTH_WEAK,
} from '../../lib/constants'

const SignalCard: React.FC<{ signal: Signal }> = ({ signal }) => {
  const { t } = useTranslation('signals')
  const asOf = useAppStore(s => s.asOf)

  const getSideColor = (side: string) => {
    return side === 'buy'
      ? 'text-rising-400 bg-rising-900/20'
      : 'text-falling-400 bg-falling-900/20'
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= SIGNAL_STRENGTH_STRONG) return 'text-gain-400'
    if (strength >= SIGNAL_STRENGTH_MEDIUM) return 'text-warning-400'
    if (strength >= SIGNAL_STRENGTH_WEAK) return 'text-warning-400'

    return 'text-loss-400'
  }

  const getStrengthLabel = (strength: number) => {
    if (strength >= SIGNAL_STRENGTH_STRONG) return t('strength.strong')
    if (strength >= SIGNAL_STRENGTH_MEDIUM) return t('strength.medium')
    if (strength >= SIGNAL_STRENGTH_WEAK) return t('strength.weak')

    return t('strength.veryWeak')
  }

  const formatTime = (date: Date) => {
    const now = asOf ? new Date(asOf) : new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return t('time.justNow')
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins })
    if (diffMins < 1440) return t('time.hoursAgo', { count: Math.floor(diffMins / 60) })

    return date.toLocaleDateString()
  }

  return (
    <div className='rounded-2xl border border-dark-600 bg-alpine-50 p-5 transition-colors hover:border-muted-400'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <span className='font-semibold text-alpine-900'>{signal.instrument}</span>
          <span
            className={clsx(
              'px-2 py-1 text-xs font-medium rounded-full',
              getSideColor(signal.side)
            )}
          >
            {signal.side.toUpperCase()}
          </span>
          {signal.strategyName && (
            <span className='rounded-md bg-info-50 px-2 py-1 text-xs text-info-600'>
              {signal.strategyName}
            </span>
          )}
        </div>
        <div className='text-xs text-muted-500'>{formatTime(signal.firedAt)}</div>
      </div>
      <div className='grid grid-cols-3 gap-4 text-sm mb-3'>
        <div>
          <div className='text-muted-500'>{t('card.strength')}</div>
          <div className={clsx('font-medium', getStrengthColor(signal.strength))}>
            {getStrengthLabel(signal.strength)} ({(signal.strength * 100).toFixed(0)}%)
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('card.price')}</div>
          <div className='font-mono text-alpine-900'>
            {signal.price ? `$${signal.price.toFixed(2)}` : t('card.noPrice')}
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('card.exchange')}</div>
          <div className='text-xs font-mono text-alpine-900'>{signal.exchange}</div>
        </div>
      </div>
      {signal.reason && (
        <div className='rounded-lg border border-dark-600 bg-dark-700 p-2 text-xs text-muted-700'>
          <div className='mb-1 text-muted-500'>{t('card.reason')}</div>
          {signal.reason}
        </div>
      )}
    </div>
  )
}

export const Signals: React.FC = () => {
  const { t } = useTranslation('signals')
  const [strategyFilter, setStrategyFilter] = useState<string>('all')
  const { data: signals = [], isLoading } = useSignals(
    strategyFilter === 'all' ? undefined : strategyFilter,
    50
  )
  const availableStrategies = Array.from(
    new Set(signals.map(signal => signal.strategyName).filter(Boolean))
  )
  const filteredSignals = signals.filter(
    signal => strategyFilter === 'all' || signal.strategyName === strategyFilter
  )
  const totalSignals = filteredSignals.length
  const buySignals = filteredSignals.filter(s => s.side === 'buy').length
  const sellSignals = filteredSignals.filter(s => s.side === 'sell').length
  const avgStrength =
    totalSignals > 0 ? filteredSignals.reduce((sum, s) => sum + s.strength, 0) / totalSignals : 0

  const handleExport = () => {
    const headers = [
      'instrument',
      'exchange',
      'side',
      'strength',
      'strategy',
      'price',
      'reason',
      'fired_at',
    ]
    const rows = filteredSignals.map(s => [
      s.instrument,
      s.exchange,
      s.side,
      String(s.strength),
      s.strategyName ?? '',
      s.price == null ? '' : String(s.price),
      s.reason,
      s.firedAt.toISOString(),
    ])

    exportToCSV('signals.csv', headers, rows)
  }

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {Array.from({ length: 4 }, (_, i) => (
            <SignalCardSkeleton key={`signal-skeleton-${i}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
        <div className='flex items-center gap-3'>
          <ThemeSelect
            value={strategyFilter}
            onChange={setStrategyFilter}
            options={[
              { value: 'all', label: t('filters.allStrategies') },
              ...availableStrategies.map(s => ({
                value: String(s),
                label: String(s),
              })),
            ]}
          />
          <button
            onClick={handleExport}
            className='flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-dark-600 text-muted-700 hover:bg-dark-700 transition-colors'
            disabled={filteredSignals.length === 0}
          >
            <Download className='w-4 h-4' />
            {t('actions.export')}
          </button>
        </div>
      </div>
      {}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-dark-600 bg-alpine-50 p-4 text-center'>
          <div className='text-2xl font-bold text-alpine-900'>{totalSignals}</div>
          <div className='text-xs text-muted-500'>{t('stats.total')}</div>
        </div>
        <div className='rounded-xl border border-dark-600 bg-alpine-50 p-4 text-center'>
          <div className='text-2xl font-bold text-rising-400'>{buySignals}</div>
          <div className='text-xs text-muted-500'>{t('stats.buy')}</div>
        </div>
        <div className='rounded-xl border border-dark-600 bg-alpine-50 p-4 text-center'>
          <div className='text-2xl font-bold text-falling-400'>{sellSignals}</div>
          <div className='text-xs text-muted-500'>{t('stats.sell')}</div>
        </div>
        <div className='rounded-xl border border-dark-600 bg-alpine-50 p-4 text-center'>
          <div className='text-2xl font-bold text-alpine-900'>
            {(avgStrength * 100).toFixed(0)}%
          </div>
          <div className='text-xs text-muted-500'>{t('stats.avgStrength')}</div>
        </div>
      </div>
      {}
      {filteredSignals.length === 0 ? (
        <EmptyState
          icon={<span className='text-4xl'>📡</span>}
          title={t('empty.title')}
          message={t('empty.message')}
        />
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {filteredSignals.map((signal, index) => (
            <SignalCard key={signal.publicId ?? `signal-${index}`} signal={signal} />
          ))}
        </div>
      )}
    </div>
  )
}
