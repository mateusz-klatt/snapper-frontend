import React from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { useAlert } from '../../hooks/queries/alerts'
import { resolveAlertBody, resolveAlertTitle } from './formatAlert'

interface AlertDetailModalProps {
  publicId: string | null
  onClose: () => void
}

const formatDateTime = (iso: string, locale: string): string => {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return iso

  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

/**
 * Detail overlay for one alert. Mounts when `publicId !== null`.
 *
 * Uses the shared `Modal` primitive (focus trap, escape, backdrop,
 * scroll lock built-in). On Phase E we explicitly do NOT introduce a
 * new drawer primitive — the modal covers the use case and avoids
 * the focus/scroll/portal edge cases a drawer would add. See
 * `proprietary/plans/plan_2026_05_18_phase_e_web_alerts_tab.md` D4.
 *
 * Loads the alert by id via `useAlert` so deep-linking (`#notifications/
 * <pid>` for an alert that is NOT in the currently-loaded history
 * pages) still works.
 */
export const AlertDetailModal: React.FC<Readonly<AlertDetailModalProps>> = ({
  publicId,
  onClose,
}) => {
  const { t, i18n } = useTranslation('alerts')
  const { t: tCommon } = useTranslation('common')
  const { data, isLoading, isError, error } = useAlert(publicId ?? undefined)
  const open = publicId !== null
  const alert = data?.payload ?? null
  const title = alert === null ? '' : resolveAlertTitle(alert, t)

  return (
    <Modal open={open} onClose={onClose} title={title || tCommon('loading')} size='lg'>
      {isLoading && (
        <div className='py-8 text-center text-sm text-muted-600' role='status' aria-live='polite'>
          {tCommon('loading')}
        </div>
      )}
      {isError && (
        <div className='py-8 text-center text-sm text-loss-500' role='alert'>
          {t('detail.error', { defaultValue: 'Could not load this alert.' })}
          {error instanceof Error && (
            <div className='mt-2 text-xs text-muted-500'>{error.message}</div>
          )}
        </div>
      )}
      {alert !== null && (
        <div className='space-y-4 text-sm'>
          <p className='whitespace-pre-wrap text-alpine-900'>{resolveAlertBody(alert, t)}</p>
          <dl className='grid grid-cols-1 gap-3 text-xs sm:grid-cols-2'>
            <div>
              <dt className='font-medium text-muted-500'>
                {t('detail.alertType', { defaultValue: 'Type' })}
              </dt>
              <dd className='mt-1 text-alpine-900'>
                {t(`alertType.${alert.alert_type}`, {
                  defaultValue: alert.alert_type,
                })}
              </dd>
            </div>
            <div>
              <dt className='font-medium text-muted-500'>
                {t('detail.priority', { defaultValue: 'Priority' })}
              </dt>
              <dd className='mt-1 text-alpine-900'>{alert.priority}</dd>
            </div>
            <div>
              <dt className='font-medium text-muted-500'>
                {t('detail.safetyCritical', { defaultValue: 'Safety-critical' })}
              </dt>
              <dd className='mt-1 text-alpine-900'>
                {alert.is_safety_critical
                  ? tCommon('boolean.yes', { defaultValue: 'Yes' })
                  : tCommon('boolean.no', { defaultValue: 'No' })}
              </dd>
            </div>
            <div>
              <dt className='font-medium text-muted-500'>{t('detail.timestamp')}</dt>
              <dd className='mt-1 text-alpine-900'>
                {formatDateTime(alert.timestamp, i18n.language)}
              </dd>
            </div>
            {alert.thread_key !== null && alert.thread_key !== undefined && (
              <div>
                <dt className='font-medium text-muted-500'>{t('detail.thread')}</dt>
                <dd className='mt-1 break-all text-alpine-900'>{alert.thread_key}</dd>
              </div>
            )}
            {alert.source_topic !== null && alert.source_topic !== undefined && (
              <div>
                <dt className='font-medium text-muted-500'>{t('detail.sourceTopic')}</dt>
                <dd className='mt-1 break-all text-alpine-900'>{alert.source_topic}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Modal>
  )
}
