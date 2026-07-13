import React from 'react'
import clsx from 'clsx'
import { AlertTriangle, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePortfolioAccounts } from '../../hooks/queries/portfolio'
import { useAppStore } from '../../stores/app'
import { useNow } from '../../hooks/useNow'
import { deriveAccountTruth } from '../../lib/accountTruth'
import { OrderCardSkeleton } from '../../components/Skeleton'
import { EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import { AccountTruthBadge } from './AccountTruthBadge'
import { PortfolioTruthBanner } from './PortfolioTruthBanner'
import type {
  AccountBalanceEntry,
  AccountPositionEntry,
  PortfolioAccountState,
} from '../../types/api'

/** How often the client re-derives authority as wall-clock time advances. */
const CLOCK_TICK_MS = 1_000

const accountKey = (account: PortfolioAccountState): string =>
  `${account.wallet_public_id}-${account.exchange}-${account.mode}`

/**
 * Format an ISO timestamp string, falling back to the raw value if it is not a
 * parseable date (defensive — a malformed timestamp must never crash the row).
 */
const formatTimestamp = (value: string, locale: AppLocale): string => {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? value : formatDateTime(date, locale)
}

const formatNumber = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(
    value
  )

const formatNullable = (
  value: number | null | undefined,
  noValue: string,
  locale: string
): string => (value == null ? noValue : formatNumber(value, locale))

const formatPnl = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
    signDisplay: 'exceptZero',
  }).format(value)

const getPnlClass = (value: number): string => {
  if (value > 0) return 'text-rising-600'
  if (value < 0) return 'text-falling-600'

  return 'text-muted-500'
}

interface BalancesTableProps {
  balances: AccountBalanceEntry[] | null | undefined
  suffix: string
}

const BalancesTable: React.FC<Readonly<BalancesTableProps>> = ({ balances, suffix }) => {
  const { t, i18n } = useTranslation('accounts')
  const locale = i18n.language as AppLocale
  const noValue = t('noValue')

  if (balances == null || balances.length === 0) {
    return (
      <div className='text-sm text-muted-500' data-testid={`account-balances-empty-${suffix}`}>
        {t('sectionEmpty.balances')}
      </div>
    )
  }

  return (
    <table className='w-full text-left text-sm' data-testid={`account-balances-${suffix}`}>
      <thead>
        <tr className='text-muted-500'>
          <th className='py-1 pr-4 font-medium'>{t('balance.currency')}</th>
          <th className='py-1 pr-4 font-medium'>{t('balance.total')}</th>
          <th className='py-1 pr-4 font-medium'>{t('balance.free')}</th>
          <th className='py-1 font-medium'>{t('balance.used')}</th>
        </tr>
      </thead>
      <tbody className='font-mono text-alpine-900'>
        {balances.map(entry => (
          <tr key={entry.currency} data-testid={`account-balance-${suffix}-${entry.currency}`}>
            <td className='py-1 pr-4'>{entry.currency}</td>
            <td className='py-1 pr-4'>{formatNumber(entry.total, locale)}</td>
            <td className='py-1 pr-4'>{formatNullable(entry.free, noValue, locale)}</td>
            <td className='py-1'>{formatNullable(entry.used, noValue, locale)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface PositionsTableProps {
  positions: AccountPositionEntry[] | null | undefined
  suffix: string
}

const PositionsTable: React.FC<Readonly<PositionsTableProps>> = ({ positions, suffix }) => {
  const { t, i18n } = useTranslation('accounts')
  const locale = i18n.language as AppLocale

  if (positions == null || positions.length === 0) {
    return (
      <div className='text-sm text-muted-500' data-testid={`account-positions-empty-${suffix}`}>
        {t('sectionEmpty.positions')}
      </div>
    )
  }

  return (
    <table className='w-full text-left text-sm' data-testid={`account-positions-${suffix}`}>
      <thead>
        <tr className='text-muted-500'>
          <th className='py-1 pr-4 font-medium'>{t('position.symbol')}</th>
          <th className='py-1 pr-4 font-medium'>{t('position.side')}</th>
          <th className='py-1 pr-4 font-medium'>{t('position.size')}</th>
          <th className='py-1 pr-4 font-medium'>{t('position.entryPrice')}</th>
          <th className='py-1 pr-4 font-medium'>{t('position.markPrice')}</th>
          <th className='py-1 pr-4 font-medium'>{t('position.unrealizedPnl')}</th>
          <th className='py-1 font-medium'>{t('position.unrealizedFunding')}</th>
        </tr>
      </thead>
      <tbody className='font-mono text-alpine-900'>
        {positions.map(entry => (
          <tr key={entry.symbol} data-testid={`account-position-${suffix}-${entry.symbol}`}>
            <td className='py-1 pr-4'>{entry.symbol}</td>
            <td className='py-1 pr-4'>{t(`side.${entry.side}`, { defaultValue: entry.side })}</td>
            <td className='py-1 pr-4'>{formatNumber(entry.size, locale)}</td>
            <td className='py-1 pr-4'>{formatNumber(entry.entry_price, locale)}</td>
            <td className='py-1 pr-4'>{formatNumber(entry.mark_price, locale)}</td>
            <td className={clsx('py-1 pr-4', getPnlClass(entry.unrealized_pnl))}>
              {formatPnl(entry.unrealized_pnl, locale)}
            </td>
            <td className={clsx('py-1', getPnlClass(entry.unrealized_funding))}>
              {formatPnl(entry.unrealized_funding, locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface AccountCardProps {
  account: PortfolioAccountState
  clientEffectiveStatus: string
}

const AccountCard: React.FC<Readonly<AccountCardProps>> = ({ account, clientEffectiveStatus }) => {
  const { t, i18n } = useTranslation('accounts')
  const locale = i18n.language as AppLocale
  const suffix = accountKey(account)

  return (
    <div
      className='rounded-2xl border border-dark-600 bg-alpine-50 p-5'
      data-testid={`account-${suffix}`}
    >
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-3'>
          <span className='font-semibold text-alpine-900'>{account.exchange}</span>
          <span className='rounded-full bg-muted-500/20 px-2 py-1 text-xs font-medium text-muted-600'>
            {t(`mode.${account.mode}`, { defaultValue: account.mode })}
          </span>
          <span className='text-sm text-muted-500'>{account.wallet_public_id}</span>
        </div>
        <AccountTruthBadge status={clientEffectiveStatus} />
      </div>

      <div className='space-y-4'>
        <div>
          <div className='mb-1 text-xs font-semibold uppercase tracking-wide text-muted-500'>
            {t('section.balances')}
          </div>
          <BalancesTable balances={account.balances} suffix={suffix} />
          {account.balance_observed_at != null && (
            <div
              className='mt-1 text-xs text-muted-500'
              data-testid={`account-balances-observed-${suffix}`}
            >
              {t('meta.balancesObserved', {
                timestamp: formatTimestamp(account.balance_observed_at, locale),
              })}
            </div>
          )}
        </div>

        <div>
          <div className='mb-1 text-xs font-semibold uppercase tracking-wide text-muted-500'>
            {t('section.positions')}
          </div>
          <PositionsTable positions={account.open_positions} suffix={suffix} />
          {account.position_observed_at != null && (
            <div
              className='mt-1 text-xs text-muted-500'
              data-testid={`account-positions-observed-${suffix}`}
            >
              {t('meta.positionsObserved', {
                timestamp: formatTimestamp(account.position_observed_at, locale),
              })}
            </div>
          )}
        </div>
      </div>

      {account.authoritative_until != null && (
        <div
          className='mt-3 text-xs text-muted-500'
          data-testid={`account-authoritative-until-${suffix}`}
        >
          {t('meta.authoritativeUntil', {
            timestamp: formatTimestamp(account.authoritative_until, locale),
          })}
        </div>
      )}
      {account.error != null && account.error !== '' && (
        <div className='mt-3 text-xs text-loss-600' data-testid={`account-error-${suffix}`}>
          {t('meta.error', { message: account.error })}
        </div>
      )}
    </div>
  )
}

/**
 * Venue-account truth page: exchange cash balances + open positions, each row
 * labeled by its CLIENT-effective status (server truth demoted for authority
 * expiry / polling failure), fronted by a banner whenever any row is not live
 * authoritative truth.
 */
export const Accounts: React.FC = () => {
  const { t } = useTranslation('accounts')
  const { t: tCommon } = useTranslation('common')
  const asOf = useAppStore(s => s.asOf)
  const liveNow = useNow(CLOCK_TICK_MS)
  const { data: accounts = [], isLoading, isError, dataUpdatedAt } = usePortfolioAccounts()

  const header = (
    <div>
      <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
      <p className='mt-1 text-sm text-muted-500'>{t('page.subtitle')}</p>
    </div>
  )

  if (asOf != null) {
    return (
      <div className='space-y-6'>
        {header}
        <div
          role='status'
          data-testid='accounts-live-only'
          className='flex items-center gap-2 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm text-info-700'
        >
          <Info className='h-4 w-4 shrink-0' />
          <span>{tCommon('chrome.liveOnly.notice')}</span>
        </div>
      </div>
    )
  }

  const rows = accounts.map(account => ({
    account,
    truth: deriveAccountTruth(account, liveNow, dataUpdatedAt),
  }))
  const anyNonAuthoritative = rows.some(row => !row.truth.isAuthoritative)

  return (
    <div className='space-y-6'>
      {header}

      <PortfolioTruthBanner visible={anyNonAuthoritative} />

      <div className='space-y-4'>
        {isLoading && (
          <div className='space-y-3'>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        )}
        {!isLoading && isError && rows.length === 0 && (
          <div
            role='status'
            data-testid='accounts-unavailable'
            className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-warning-600'
          >
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <div>
              <div className='text-sm font-medium'>{t('unavailable.title')}</div>
              <div className='text-xs'>{t('unavailable.message')}</div>
            </div>
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={
              <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 10h18M3 6h18M3 14h18M3 18h18'
                />
              </svg>
            }
            title={t('empty.title')}
            message={t('empty.message')}
          />
        )}
        {!isLoading && rows.length > 0 && (
          <div className='grid gap-4'>
            {rows.map(({ account, truth }) => (
              <AccountCard
                key={accountKey(account)}
                account={account}
                clientEffectiveStatus={truth.clientEffectiveStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
