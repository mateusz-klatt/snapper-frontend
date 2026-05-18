import React from 'react'
import { BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ALERT_HISTORY_DISPLAY_CAP, useAlertHistory } from '../../hooks/queries/alerts'
import { EmptyState } from '../../components/ui'
import type { AlertEventInfo } from '../../types/api'
import { AlertRow } from './AlertRow'

interface NotificationsListProps {
  onOpenAlert: (publicId: string) => void
}

/**
 * Cursor-paginated list of the caller's alert history.
 *
 * Wraps `useAlertHistory` (a `useInfiniteQuery`); flattens
 * `data.pages[*].payload` into a single list capped at
 * `ALERT_HISTORY_DISPLAY_CAP` (500 rows = 10 pages × 50). Beyond the
 * cap, the "Load more" button is disabled and a footer note tells
 * the user how to access older alerts.
 *
 * Loading / error / empty states are surfaced inline so the list
 * doesn't unmount and remount as pages load.
 */
export const NotificationsList: React.FC<Readonly<NotificationsListProps>> = ({ onOpenAlert }) => {
  const { t } = useTranslation('alerts')
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAlertHistory()
  const allAlerts: AlertEventInfo[] = data?.pages.flatMap(p => p.payload) ?? []
  const reachedCap = allAlerts.length >= ALERT_HISTORY_DISPLAY_CAP
  const canLoadMore = hasNextPage && !reachedCap
  const visibleAlerts = allAlerts.slice(0, ALERT_HISTORY_DISPLAY_CAP)

  if (isLoading) {
    return (
      <div className='py-8 text-center text-sm text-muted-600' role='status' aria-live='polite'>
        {t('loading')}
      </div>
    )
  }

  if (isError) {
    return (
      <div className='py-8 text-center text-sm text-loss-500' role='alert'>
        {t('error.loadFailed')}
        {error instanceof Error && (
          <div className='mt-2 text-xs text-muted-500'>{error.message}</div>
        )}
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <EmptyState
        icon={<BellOff size={20} className='text-muted-500' aria-hidden='true' />}
        title={t('empty.title')}
        message={t('empty.message')}
      />
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <ul className='flex flex-col gap-2'>
        {visibleAlerts.map(alert => (
          <li key={alert.public_id}>
            <AlertRow alert={alert} onOpen={onOpenAlert} />
          </li>
        ))}
      </ul>
      {canLoadMore && (
        <button
          type='button'
          onClick={() => {
            void fetchNextPage()
          }}
          disabled={isFetchingNextPage}
          className='self-center rounded-xl border border-dark-600 bg-alpine-50 px-4 py-2 text-sm font-medium text-alpine-900 hover:border-brand-400 disabled:opacity-60'
        >
          {isFetchingNextPage ? t('loading') : t('loadMore', { defaultValue: 'Load more' })}
        </button>
      )}
      {reachedCap && (
        <p className='py-2 text-center text-xs text-muted-500' role='note'>
          {t('cap.reached', {
            count: ALERT_HISTORY_DISPLAY_CAP,
            defaultValue: 'Showing the most recent {{count}} alerts.',
          })}
        </p>
      )}
    </div>
  )
}
