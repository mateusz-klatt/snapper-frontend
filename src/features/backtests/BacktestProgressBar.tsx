import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BacktestProgressSnapshot } from './hooks/useBacktestProgressSubscription'

interface Props {
  snapshot: BacktestProgressSnapshot | null
}

/**
 * Progress bar — renders a 0..100 % bar plus milestone chips and
 * current candle / equity counts. Falls back to "no progress yet"
 * when no event has arrived.
 */
export const BacktestProgressBar: React.FC<Props> = ({ snapshot }) => {
  const { t } = useTranslation('backtests')

  if (!snapshot) {
    return <div className='text-sm opacity-60'>{t('progress.waiting')}</div>
  }

  const pct = Math.round((snapshot.progress_pct ?? 0) * 100)
  const milestoneLabel =
    snapshot.event === 'milestone' && snapshot.milestone
      ? t(`progress.milestone.${snapshot.milestone}`, { defaultValue: snapshot.milestone })
      : null
  const candlesLine = snapshot.total_candles
    ? t('progress.candles', { done: snapshot.candles_done, total: snapshot.total_candles })
    : t('progress.candlesNoTotal', { done: snapshot.candles_done })

  return (
    <div className='space-y-1'>
      <div className='w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden'>
        <div
          className='bg-indigo-500 h-2 transition-all'
          style={{ width: `${pct}%` }}
          data-testid='bt-progress-fill'
        />
      </div>
      <div className='text-xs flex justify-between'>
        <span>{candlesLine}</span>
        <span>{t('progress.equity', { value: snapshot.equity?.toFixed(2) ?? '' })}</span>
        <span>
          {t('progress.signalsTrades', {
            signals: snapshot.signals_count,
            trades: snapshot.trades_count,
          })}
        </span>
      </div>
      {milestoneLabel ? (
        <div className='text-xs italic opacity-80'>
          {t('progress.milestoneLine', { label: milestoneLabel })}
        </div>
      ) : null}
    </div>
  )
}
