import React, { useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useDeactivateAiDelegate } from '../../hooks/queries/ai-delegates'
import type { DelegateRead } from '../../types/api'

export function RevokeConfirmDialog({
  delegate,
  open,
  onClose,
}: Readonly<{
  delegate: DelegateRead
  open: boolean
  onClose: () => void
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const deactivate = useDeactivateAiDelegate()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleConfirm = async (): Promise<void> => {
    try {
      await deactivate.mutateAsync(delegate.public_id)

      if (!mountedRef.current) return
      toast.success(t('revokeDialog.toast.delegateRevoked'))
      onClose()
    } catch (err) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : t('revokeDialog.toast.failedToRevoke')

      toast.error(msg)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={t('revokeDialog.title', { label: delegate.label })}
      message={t('revokeDialog.message')}
      confirmText={t('revokeDialog.confirm')}
      cancelText={t('revokeDialog.cancel')}
      variant='danger'
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  )
}
