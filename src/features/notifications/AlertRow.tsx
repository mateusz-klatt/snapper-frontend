import React from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { AlertEventInfo } from '../../types/api'
import { resolveAlertBody, resolveAlertTitle } from './formatAlert'

interface AlertRowProps {
  alert: AlertEventInfo
  onOpen: (publicId: string) => void
}

const priorityDotColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-loss-500'
    case 'medium':
      return 'bg-warning-500'
    case 'low':
      return 'bg-info-500'
    default:
      return 'bg-muted-400'
  }
}

const formatTimestamp = (iso: string, locale: string): string => {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return iso

  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Single alert row in the history list. Click opens the detail modal.
 *
 * `title` / `body` go through `resolveAlertTitle` / `resolveAlertBody`
 * so the row re-renders in the user's in-app locale without a fetch.
 *
 * Safety-critical alerts get a red left border + a stronger visual
 * weight on the title (matches iOS `AlertRow` behavior).
 */
export const AlertRow: React.FC<Readonly<AlertRowProps>> = ({ alert, onOpen }) => {
  const { t, i18n } = useTranslation('alerts')
  const displayTitle = resolveAlertTitle(alert, t)
  const displayBody = resolveAlertBody(alert, t)

  const handleClick = (): void => {
    onOpen(alert.public_id)
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      className={clsx(
        'group flex w-full items-start gap-3 rounded-xl border border-dark-600 bg-alpine-50 p-4 text-left transition-colors hover:border-brand-400',
        alert.is_safety_critical && 'border-l-4 border-l-loss-500'
      )}
      aria-label={`${displayTitle}. ${displayBody}. ${alert.priority} priority.`}
    >
      <span
        className={clsx(
          'mt-1 inline-block h-2 w-2 shrink-0 rounded-full',
          priorityDotColor(alert.priority)
        )}
        aria-hidden='true'
      />
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
          <span
            className={clsx(
              'truncate text-sm text-alpine-900',
              alert.is_safety_critical ? 'font-semibold' : 'font-medium'
            )}
          >
            {displayTitle}
          </span>
          <span className='shrink-0 text-xs tabular-nums text-muted-500'>
            {formatTimestamp(alert.timestamp, i18n.language)}
          </span>
        </div>
        <p className='line-clamp-2 text-sm text-muted-600'>{displayBody}</p>
      </div>
    </button>
  )
}
