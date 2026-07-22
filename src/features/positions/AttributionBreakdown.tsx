import React, { useId } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { PnlTimelinePointData } from '../../types/api'

type Attribution = PnlTimelinePointData['attribution']
type AttributionContribution = Attribution[number]
type AttributionOrigin = AttributionContribution['origin']
type MonetaryField = 'realized_pnl' | 'fee_pnl' | 'accrual_pnl' | 'unrealized_pnl'

interface Props {
  attribution: Attribution
  valuationCcy: string
}

const ORIGIN_ORDER: Record<AttributionOrigin, number> = {
  manual: 0,
  plan: 1,
  system: 2,
  unattributed: 3,
}

const ORIGIN_LABEL_KEYS = {
  manual: 'timeline.attribution.origins.manual',
  plan: 'timeline.attribution.origins.plan',
  system: 'timeline.attribution.origins.system',
  unattributed: 'timeline.attribution.origins.unattributed',
} as const

const MONETARY_COLUMNS: readonly {
  field: MonetaryField
  labelKey:
    | 'timeline.contributions.realized'
    | 'timeline.contributions.fees'
    | 'timeline.contributions.accrual'
    | 'timeline.contributions.unrealized'
}[] = [
  { field: 'realized_pnl', labelKey: 'timeline.contributions.realized' },
  { field: 'fee_pnl', labelKey: 'timeline.contributions.fees' },
  { field: 'accrual_pnl', labelKey: 'timeline.contributions.accrual' },
  { field: 'unrealized_pnl', labelKey: 'timeline.contributions.unrealized' },
]

const getPnlClass = (value: number | null): string => {
  if (value === null || value === 0) return 'text-muted-500'
  if (value > 0) return 'text-rising-600'

  return 'text-falling-600'
}

const formatPnl = (value: number | null, withheld: string, locale: string): string =>
  value === null
    ? withheld
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
        signDisplay: 'exceptZero',
      }).format(value)

export const AttributionBreakdown: React.FC<Readonly<Props>> = ({ attribution, valuationCcy }) => {
  const { t, i18n } = useTranslation('positions')
  const titleId = useId()
  const withheld = t('timeline.attribution.withheld')
  const sortedAttribution = [...attribution].sort(
    (left, right) => ORIGIN_ORDER[left.origin] - ORIGIN_ORDER[right.origin]
  )

  return (
    <section
      className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'
      aria-labelledby={titleId}
      data-testid='pnl-attribution'
    >
      <div className='mb-2 flex flex-wrap items-center gap-2'>
        <h3 id={titleId} className='font-semibold text-alpine-900'>
          {t('timeline.attribution.title')}
        </h3>
        <span className='rounded-full bg-muted-500/20 px-2 py-1 text-xs font-medium text-muted-600'>
          {valuationCcy}
        </span>
      </div>
      <p className='mb-3 text-xs text-muted-500' data-testid='attribution-value-semantics'>
        {t('timeline.attribution.valueSemantics')}
      </p>
      {sortedAttribution.length === 0 ? (
        <div className='text-sm text-muted-500' data-testid='attribution-empty'>
          {t('timeline.attribution.empty')}
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table
            className='w-full text-left text-sm'
            aria-label={t('timeline.attribution.ariaLabel')}
            data-testid='attribution-table'
          >
            <thead>
              <tr className='text-muted-500'>
                <th scope='col' className='py-1 pr-4 font-medium'>
                  {t('timeline.attribution.origin')}
                </th>
                <th scope='col' className='py-1 pr-4 font-medium'>
                  {t('timeline.markers.detail.strategyName')}
                </th>
                {MONETARY_COLUMNS.map(column => (
                  <th key={column.field} scope='col' className='py-1 pr-4 font-medium last:pr-0'>
                    {t(column.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='text-alpine-900'>
              {sortedAttribution.map((contribution, index) => (
                <tr
                  key={`${contribution.origin}:${index}`}
                  data-testid={`attribution-${contribution.origin}-${index}`}
                >
                  <th
                    scope='row'
                    className='py-1 pr-4 font-medium'
                    data-testid={`attribution-${contribution.origin}-${index}-origin`}
                  >
                    {t(ORIGIN_LABEL_KEYS[contribution.origin])}
                  </th>
                  <th
                    scope='row'
                    className='py-1 pr-4 font-normal'
                    data-testid={`attribution-${contribution.origin}-${index}-strategy`}
                  >
                    {contribution.strategy_name ?? t('timeline.attribution.noStrategy')}
                  </th>
                  {MONETARY_COLUMNS.map(column => {
                    const value = contribution[column.field]

                    return (
                      <td
                        key={column.field}
                        className={clsx('py-1 pr-4 font-mono last:pr-0', getPnlClass(value))}
                        data-testid={`attribution-${contribution.origin}-${index}-${column.field}`}
                      >
                        {formatPnl(value, withheld, i18n.language)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
