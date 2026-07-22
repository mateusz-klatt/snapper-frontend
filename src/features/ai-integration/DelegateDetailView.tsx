import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { ChevronLeft, Edit3, PowerOff, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'
import { useAiDelegate, useUpdateAiDelegateCaps } from '../../hooks/queries/ai-delegates'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { RevokeConfirmDialog } from './RevokeConfirmDialog'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import type { DelegateCapsBody } from '../../types/api'
import { useAuth } from '../../stores/auth'
import { Permission } from '../../types/permissions.generated'

export function DelegateDetailView({
  publicId,
  onBack,
}: Readonly<{ publicId: string; onBack: () => void }>): React.ReactElement {
  const { t, i18n } = useTranslation('aiIntegration')
  const detailQuery = useAiDelegate(publicId)
  const readOnly = useIsReadOnly()
  const { hasPermission } = useAuth()
  const hasManagePermission = hasPermission(Permission.MANAGE_AI_INTEGRATION)
  const canManage = hasManagePermission && !readOnly
  const updateMutation = useUpdateAiDelegateCaps()
  const [editing, setEditing] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [draft, setDraft] = useState<{
    maxOpenOrders: string
    maxDailyNotionalUsd: string
    maxCancelsPerMinute: string
  } | null>(null)

  const delegate = detailQuery.data?.payload

  if (detailQuery.isLoading) {
    return <div className='p-6 text-muted-500'>{t('detail.loading')}</div>
  }

  if (delegate === undefined) {
    return (
      <div className='p-6 space-y-3'>
        <Button variant='secondary' onClick={onBack}>
          <ChevronLeft className='w-4 h-4 mr-1 inline' />
          {t('detail.back')}
        </Button>
        <p className='text-sm text-muted-600'>{t('detail.notFound')}</p>
      </div>
    )
  }

  const startEditing = (): void => {
    setDraft({
      maxOpenOrders: delegate.caps.max_open_orders?.toString() ?? '',
      maxDailyNotionalUsd: delegate.caps.max_daily_notional_usd?.toString() ?? '',
      maxCancelsPerMinute: delegate.caps.max_cancels_per_minute?.toString() ?? '',
    })
    setEditing(true)
  }

  const cancelEditing = (): void => {
    setDraft(null)
    setEditing(false)
  }

  const submitCapsUpdate = async (activeDraft: NonNullable<typeof draft>): Promise<void> => {
    if (!hasPermission(Permission.MANAGE_AI_INTEGRATION) || readOnly) return

    const parsedOpen = parseNullableInt(activeDraft.maxOpenOrders)
    const parsedDaily = parseNullableInt(activeDraft.maxDailyNotionalUsd)
    const parsedCancels = parseNullableInt(activeDraft.maxCancelsPerMinute)

    if (parsedOpen === 'error' || parsedDaily === 'error' || parsedCancels === 'error') {
      toast.error(t('detail.toast.negativeIntegersError'))

      return
    }

    const body: { caps: DelegateCapsBody } = {
      caps: {
        max_open_orders: parsedOpen,
        max_daily_notional_usd: parsedDaily,
        max_cancels_per_minute: parsedCancels,
        max_order_quantity_per_instrument: delegate.caps.max_order_quantity_per_instrument ?? null,
      },
    }

    try {
      await updateMutation.mutateAsync({ publicId, body })
      toast.success(t('detail.toast.capsUpdated'))
      setEditing(false)
      setDraft(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('detail.toast.failedToUpdateCaps'))
    }
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-center justify-between'>
        <Button variant='secondary' onClick={onBack}>
          <ChevronLeft className='w-4 h-4 mr-1 inline' />
          {t('detail.backToList')}
        </Button>
        <div className='flex items-center gap-2'>
          {!editing && hasManagePermission && (
            <Button
              variant='secondary'
              onClick={startEditing}
              disabled={!delegate.is_active || !canManage}
            >
              <Edit3 className='w-4 h-4 mr-1 inline' />
              {t('detail.updateCaps')}
            </Button>
          )}
          {delegate.is_active && hasManagePermission && (
            <Button variant='danger' onClick={() => setRevokeOpen(true)} disabled={!canManage}>
              <PowerOff className='w-4 h-4 mr-1 inline' />
              {t('detail.revoke')}
            </Button>
          )}
        </div>
      </div>

      <section>
        <h1 className='text-2xl font-bold'>{delegate.label}</h1>
        <p className='text-sm text-muted-500 font-mono'>{delegate.username}</p>
      </section>

      <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm'>
        <div>
          <dt className='text-muted-500'>{t('detail.status')}</dt>
          <dd className={delegate.is_active ? 'text-gain-700' : 'text-muted-600'}>
            {delegate.is_active ? t('detail.active') : t('detail.revoked')}
          </dd>
        </div>
        <div>
          <dt className='text-muted-500'>{t('detail.createdAt')}</dt>
          <dd>{formatDateTime(new Date(delegate.created_at), i18n.language as AppLocale)}</dd>
        </div>
        <div>
          <dt className='text-muted-500'>{t('detail.createdBy')}</dt>
          <dd className='font-mono text-xs'>{delegate.created_by_user_public_id}</dd>
        </div>
        <div>
          <dt className='text-muted-500'>{t('detail.publicId')}</dt>
          <dd className='font-mono text-xs'>{delegate.public_id}</dd>
        </div>
      </dl>

      <section className='border-t border-dark-600 pt-4'>
        <h2 className='text-sm font-semibold text-muted-800 mb-2'>{t('detail.tradingCaps')}</h2>
        {editing ? (
          draft !== null && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <CapEditor
                id='edit-max-open'
                label={t('detail.maxOpenOrders')}
                value={draft.maxOpenOrders}
                onChange={v => setDraft({ ...draft, maxOpenOrders: v })}
              />
              <CapEditor
                id='edit-max-daily'
                label={t('detail.maxDailyNotionalUsd')}
                value={draft.maxDailyNotionalUsd}
                onChange={v => setDraft({ ...draft, maxDailyNotionalUsd: v })}
              />
              <CapEditor
                id='edit-max-cancels'
                label={t('detail.maxCancelsPerMinute')}
                value={draft.maxCancelsPerMinute}
                onChange={v => setDraft({ ...draft, maxCancelsPerMinute: v })}
              />
              <div className='col-span-full flex justify-end gap-2'>
                <Button
                  variant='secondary'
                  onClick={cancelEditing}
                  disabled={updateMutation.isPending}
                >
                  {t('detail.cancel')}
                </Button>
                <Button
                  variant='primary'
                  onClick={() => submitCapsUpdate(draft)}
                  disabled={!canManage || updateMutation.isPending}
                  loading={updateMutation.isPending}
                >
                  <Save className='w-4 h-4 mr-1 inline' />
                  {t('detail.save')}
                </Button>
              </div>
            </div>
          )
        ) : (
          <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm'>
            <div>
              <dt className='text-muted-500'>{t('detail.maxOpenOrders')}</dt>
              <dd>{delegate.caps.max_open_orders ?? t('detail.defaultValue')}</dd>
            </div>
            <div>
              <dt className='text-muted-500'>{t('detail.maxDailyNotionalUsd')}</dt>
              <dd>{delegate.caps.max_daily_notional_usd ?? t('detail.defaultValue')}</dd>
            </div>
            <div>
              <dt className='text-muted-500'>{t('detail.maxCancelsPerMinute')}</dt>
              <dd>{delegate.caps.max_cancels_per_minute ?? t('detail.defaultValue')}</dd>
            </div>
            <div>
              <dt className='text-muted-500'>{t('detail.perInstrument')}</dt>
              <dd className='font-mono text-xs'>
                {delegate.caps.max_order_quantity_per_instrument
                  ? JSON.stringify(delegate.caps.max_order_quantity_per_instrument)
                  : t('detail.defaultValue')}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <RevokeConfirmDialog
        delegate={delegate}
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
      />
    </div>
  )
}

function CapEditor({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div>
      <label htmlFor={id} className='block text-sm mb-1'>
        {label}
      </label>
      <input
        id={id}
        type='number'
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('detail.editorPlaceholder')}
        className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50'
      />
    </div>
  )
}

function parseNullableInt(raw: string): number | null | 'error' {
  const trimmed = raw.trim()

  if (trimmed === '') return null

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return 'error'

  return parsed
}
