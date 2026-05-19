import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHashSubpath } from '../../hooks/useHashRouting'
import { currentHashQuery } from '../../lib/hash/currentHashQuery'
import { AlertDetailModal } from './AlertDetailModal'
import { NotificationsList } from './NotificationsList'
import { useAlertsLiveSubscription } from './hooks/useAlertsLiveSubscription'

const HASH_PREFIX = 'notifications'

/**
 * Top-level Alerts feature.
 *
 * Layout: page header + list. A detail modal mounts when the hash
 * matches `#notifications/<public_id>`. Closing the modal restores
 * the bare `#notifications` hash so the back button works as the
 * user expects.
 *
 * Deep-link contract (used by APNs notification taps that route into
 * the web build): `#notifications/<public_id>` opens the modal
 * directly; the list still loads behind it.
 */
export const Notifications: React.FC = () => {
  const { t } = useTranslation('alerts')
  const subpath = useHashSubpath(HASH_PREFIX)

  useAlertsLiveSubscription()
  const deepLinkedPid = subpath[0] ?? null
  const [openPid, setOpenPid] = useState<string | null>(deepLinkedPid)

  useEffect(() => {
    setOpenPid(deepLinkedPid)
  }, [deepLinkedPid])

  const handleOpen = useCallback((publicId: string) => {
    setOpenPid(publicId)
    globalThis.location.hash = `#${HASH_PREFIX}/${encodeURIComponent(publicId)}${currentHashQuery()}`
  }, [])

  const handleClose = useCallback(() => {
    setOpenPid(null)
    globalThis.location.hash = `#${HASH_PREFIX}${currentHashQuery()}`
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold text-alpine-900'>
          {t('navTitle', { defaultValue: 'Alerts' })}
        </h1>
        <p className='mt-1 text-sm text-muted-600'>{t('page.subtitle')}</p>
      </header>
      <NotificationsList onOpenAlert={handleOpen} />
      <AlertDetailModal publicId={openPid} onClose={handleClose} />
    </div>
  )
}
