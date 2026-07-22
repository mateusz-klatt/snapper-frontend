import React from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { PnlInstrumentContributionData } from '../../types/api'
import { formatPnlInstrumentIdentity } from './pnlInstrumentIdentity'

interface Props {
  contributions: PnlInstrumentContributionData[]
  valuationCcy: string
}

const isPresent = (value: number | null): value is number => value !== null

const getNetContribution = (contribution: PnlInstrumentContributionData): number | null => {
  const values = [
    contribution.realized_pnl,
    contribution.fee_pnl,
    contribution.accrual_pnl,
    contribution.unrealized_pnl,
  ]

  if (!values.every(isPresent)) return null

  return values.reduce((total, value) => total + value, 0)
}

const getPnlClass = (value: number | null): string => {
  if (value === null || value === 0) return 'text-muted-500'
  if (value > 0) return 'text-rising-600'

  return 'text-falling-600'
}

const formatPnl = (value: number | null, noValue: string, locale: string): string =>
  value === null
    ? noValue
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
        signDisplay: 'exceptZero',
      }).format(value)

export const ContributionTable: React.FC<Readonly<Props>> = ({ contributions, valuationCcy }) => {
  const { t, i18n } = useTranslation('positions')
  const noValue = t('timeline.contributions.noValue')

  return (
    <section className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'>
      <div className='mb-3 flex items-center gap-2'>
        <h3 className='font-semibold text-alpine-900'>{t('timeline.contributions.title')}</h3>
        <span className='rounded-full bg-muted-500/20 px-2 py-1 text-xs font-medium text-muted-600'>
          {valuationCcy}
        </span>
      </div>
      {contributions.length === 0 ? (
        <div className='text-sm text-muted-500' data-testid='contributions-empty'>
          {t('timeline.contributions.empty')}
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm' data-testid='contributions-table'>
            <thead>
              <tr className='text-muted-500'>
                <th className='py-1 pr-4 font-medium'>{t('timeline.contributions.instrument')}</th>
                <th className='py-1 pr-4 font-medium'>{t('timeline.contributions.realized')}</th>
                <th className='py-1 pr-4 font-medium'>{t('timeline.contributions.fees')}</th>
                <th className='py-1 pr-4 font-medium'>{t('timeline.contributions.accrual')}</th>
                <th className='py-1 pr-4 font-medium'>{t('timeline.contributions.unrealized')}</th>
                <th className='py-1 font-medium'>{t('timeline.contributions.net')}</th>
              </tr>
            </thead>
            <tbody className='font-mono text-alpine-900'>
              {contributions.map(contribution => {
                const net = getNetContribution(contribution)
                const values = [
                  ['realized', contribution.realized_pnl],
                  ['fees', contribution.fee_pnl],
                  ['accrual', contribution.accrual_pnl],
                  ['unrealized', contribution.unrealized_pnl],
                  ['net', net],
                ] as const

                return (
                  <tr
                    key={contribution.instrument_public_id}
                    data-testid={`contribution-${contribution.instrument_public_id}`}
                  >
                    <td className='py-1 pr-4'>{formatPnlInstrumentIdentity(contribution)}</td>
                    {values.map(([name, value], index) => (
                      <td
                        key={name}
                        className={clsx(
                          'py-1',
                          index < values.length - 1 && 'pr-4',
                          getPnlClass(value)
                        )}
                        data-testid={`contribution-${contribution.instrument_public_id}-${name}`}
                      >
                        {formatPnl(value, noValue, i18n.language)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
