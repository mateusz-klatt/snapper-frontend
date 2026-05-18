import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHashSubpath } from '../../hooks/useHashRouting'
import { AlertDetailModal } from './AlertDetailModal'
import { NotificationsList } from './NotificationsList'

const HASH_PREFIX = 'notifications'

/**
 * Extract the `?param=value` suffix of the current hash, if any.
 *
 * The app's hash routing carries scope query params (`?wallet=X`,
 * `?operator=Y`, `?as_of=Z`) appended to the tab segment. When the
 * Alerts tab rewrites the hash to open / close the detail modal we
 * preserve that suffix; otherwise the next render of the
 * `WalletPicker` / `OperatorPicker` would see them dropped and
 * silently reset scope.
 */
function currentHashQuery(): string {
  const hash = globalThis.location.hash
  const qIdx = hash.indexOf('?')

  return qIdx === -1 ? '' : hash.slice(qIdx)
}

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
        <p className='mt-1 text-sm text-muted-600'>
          {t('page.subtitle', {
            defaultValue: 'Recent alert history for your account.',
          })}
        </p>
      </header>
      <NotificationsList onOpenAlert={handleOpen} />
      <AlertDetailModal publicId={openPid} onClose={handleClose} />
    </div>
  )
}
