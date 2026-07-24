import React from 'react'
import { useTranslation } from 'react-i18next'
import type { PnlEquityCoverageData, PnlTimelinePointData } from '../../types/api'
import { latestSampledPoint } from './equityOverlay'

interface Props {
  coverage: PnlEquityCoverageData
  points: readonly PnlTimelinePointData[]
  valuationCcy: string
}

const formatAmount = (value: number | null, noValue: string, locale: string): string =>
  value === null
    ? noValue
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }).format(value)

export const CashPositionSplit: React.FC<Readonly<Props>> = ({
  coverage,
  points,
  valuationCcy,
}) => {
  const { t, i18n } = useTranslation('positions')

  if (!coverage.sampled) return null

  const noValue = t('timeline.equity.cashPosition.noValue')
  const latest = latestSampledPoint(points)
  const positionValue = latest?.position_value ?? null
  const cash = latest?.cash ?? null

  return (
    <section
      className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'
      data-testid='pnl-cash-position-split'
    >
      <div className='mb-3 flex items-center gap-2'>
        <h3 className='font-semibold text-alpine-900'>{t('timeline.equity.cashPosition.title')}</h3>
        <span className='rounded-full bg-muted-500/20 px-2 py-1 text-xs font-medium text-muted-600'>
          {valuationCcy}
        </span>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-xl border border-dark-600 bg-alpine-100 px-4 py-3'>
          <div className='text-xs text-muted-500'>{t('timeline.equity.cashPosition.position')}</div>
          <div className='font-mono text-alpine-900' data-testid='pnl-position-value'>
            {formatAmount(positionValue, noValue, i18n.language)}
          </div>
          <div className='mt-1 text-xs text-muted-500'>
            {t('timeline.equity.cashPosition.positionHint')}
          </div>
        </div>
        <div className='rounded-xl border border-dark-600 bg-alpine-100 px-4 py-3'>
          <div className='text-xs text-muted-500'>{t('timeline.equity.cashPosition.cash')}</div>
          <div className='font-mono text-alpine-900' data-testid='pnl-cash-value'>
            {formatAmount(cash, noValue, i18n.language)}
          </div>
          <div className='mt-1 text-xs text-muted-500'>
            {t('timeline.equity.cashPosition.cashHint')}
          </div>
        </div>
      </div>
    </section>
  )
}
