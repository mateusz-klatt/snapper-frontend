import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { PnlEquityCoverageData, PnlTimelinePointData } from '../../types/api'
import { latestSampledPoint, maxDrawdown } from './equityOverlay'

interface Props {
  coverage: PnlEquityCoverageData
  points: readonly PnlTimelinePointData[]
}

const formatDrawdown = (value: number | null, noValue: string, locale: string): string =>
  value === null
    ? noValue
    : new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)

export const EquityCoverageSummary: React.FC<Readonly<Props>> = ({ coverage, points }) => {
  const { t, i18n } = useTranslation('positions')
  const titleId = useId()

  if (!coverage.sampled) return null

  const noValue = t('timeline.equity.drawdown.noValue')
  const currentDrawdown = latestSampledPoint(points)?.drawdown ?? null
  const worstDrawdown = maxDrawdown(points)
  const showSpotOnly = coverage.venue_scope === 'spot_only'
  const showFlows = coverage.external_flows_adjusted === false

  return (
    <section
      className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'
      aria-labelledby={titleId}
      data-testid='pnl-equity-coverage'
    >
      <h3 id={titleId} className='font-semibold text-alpine-900'>
        {t('timeline.equity.title')}
      </h3>
      <div className='mt-4 flex flex-wrap gap-3'>
        <div className='rounded-xl border border-dark-600 bg-alpine-100 px-4 py-3'>
          <div className='text-xs text-muted-500'>{t('timeline.equity.drawdown.current')}</div>
          <div className='font-mono text-lg text-alpine-900' data-testid='pnl-drawdown-current'>
            {formatDrawdown(currentDrawdown, noValue, i18n.language)}
          </div>
        </div>
        <div className='rounded-xl border border-dark-600 bg-alpine-100 px-4 py-3'>
          <div className='text-xs text-muted-500'>{t('timeline.equity.drawdown.max')}</div>
          <div className='font-mono text-lg text-alpine-900' data-testid='pnl-drawdown-max'>
            {formatDrawdown(worstDrawdown, noValue, i18n.language)}
          </div>
        </div>
      </div>
      <p className='mt-2 text-xs text-muted-500' data-testid='pnl-drawdown-definition'>
        {t('timeline.equity.drawdown.definition')}
        {showFlows && (
          <span data-testid='pnl-drawdown-flows-caveat'>
            {' '}
            {t('timeline.equity.drawdown.flowsCaveat')}
          </span>
        )}
      </p>
      {(showSpotOnly || showFlows) && (
        <div
          className='mt-4 space-y-1 rounded-xl border border-info-200 bg-info-50 px-4 py-3 text-xs text-info-700'
          data-testid='pnl-equity-honesty'
        >
          <div className='font-medium'>{t('timeline.equity.honesty.title')}</div>
          {showSpotOnly && (
            <div data-testid='pnl-equity-honesty-spot'>{t('timeline.equity.honesty.spotOnly')}</div>
          )}
          {showFlows && (
            <div data-testid='pnl-equity-honesty-flows'>
              {t('timeline.equity.honesty.flowsUnadjusted')}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
