import React, { useState } from 'react'
import { ChevronRight, Info, Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import { Button, EmptyState } from '../../components/ui'
import { CreateDelegateWizard } from './CreateDelegateWizard'
import { DelegateDetailView } from './DelegateDetailView'
import { useAiDelegates } from '../../hooks/queries/ai-delegates'
import { useFeatureFlags } from '../../hooks/queries/feature-flags'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import type { DelegateRead } from '../../types/api'

export function AIIntegration(): React.ReactElement {
  const { isEnabled, isLoading } = useFeatureFlags()

  if (isLoading) return <LoadingShell />

  if (!isEnabled) return <DisabledPanel />

  return <EnabledShell />
}

function LoadingShell(): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div className='flex items-center justify-center p-8 text-muted-500'>
      <Loader2 className='w-5 h-5 mr-2 animate-spin' />
      <span>{t('page.loading')}</span>
    </div>
  )
}

function DisabledPanel(): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div className='p-6'>
      <div className='flex items-start gap-3 p-4 rounded-lg bg-warning-50 border border-warning-200 text-warning-800'>
        <ShieldAlert className='w-5 h-5 shrink-0 mt-0.5' />
        <div>
          <h2 className='font-semibold mb-1'>{t('disabled.title')}</h2>
          <p className='text-sm'>{t('disabled.message')}</p>
        </div>
      </div>
    </div>
  )
}

function EnabledShell(): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const delegatesQuery = useAiDelegates()
  const readOnly = useIsReadOnly()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [detailPublicId, setDetailPublicId] = useState<string | null>(null)

  if (detailPublicId !== null) {
    return <DelegateDetailView publicId={detailPublicId} onBack={() => setDetailPublicId(null)} />
  }

  return (
    <div className='p-6 space-y-4'>
      <LiveOnlyNotice />
      <header className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>{t('page.title')}</h1>
          <p className='text-sm text-muted-500'>{t('page.subtitle')}</p>
        </div>
        <Button variant='primary' onClick={() => setWizardOpen(true)} disabled={readOnly}>
          {t('page.createDelegate')}
        </Button>
      </header>

      <DelegateList
        delegates={delegatesQuery.data?.payload ?? []}
        isLoading={delegatesQuery.isLoading}
        onSelect={setDetailPublicId}
      />

      <CreateDelegateWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}

function DelegateList({
  delegates,
  isLoading,
  onSelect,
}: Readonly<{
  delegates: readonly DelegateRead[]
  isLoading: boolean
  onSelect: (publicId: string) => void
}>): React.ReactElement {
  const { t, i18n } = useTranslation('aiIntegration')

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8 text-muted-500'>
        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
        <span>{t('list.loadingDelegates')}</span>
      </div>
    )
  }

  if (delegates.length === 0) {
    return (
      <EmptyState
        icon={<Info className='w-5 h-5' />}
        title={t('list.emptyTitle')}
        message={t('list.emptyMessage')}
      />
    )
  }

  return (
    <div className='overflow-x-auto border border-dark-600 rounded-lg'>
      <table className='min-w-full text-sm'>
        <thead className='bg-dark-700 text-muted-700 text-left'>
          <tr>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.label')}</th>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.username')}</th>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.created')}</th>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.maxOpenOrders')}</th>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.maxDailyUsd')}</th>
            <th className='px-4 py-2 font-semibold'>{t('list.columns.status')}</th>
            <th className='px-4 py-2 font-semibold text-right'>{t('list.columns.actions')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-dark-600'>
          {delegates.map(d => (
            <tr key={d.public_id} data-testid={`delegate-row-${d.public_id}`}>
              <td className='px-4 py-2'>{d.label}</td>
              <td className='px-4 py-2 font-mono text-xs'>{d.username}</td>
              <td className='px-4 py-2 text-muted-600'>
                {formatDateTime(new Date(d.created_at), i18n.language as AppLocale)}
              </td>
              <td className='px-4 py-2'>{d.caps.max_open_orders ?? t('list.default')}</td>
              <td className='px-4 py-2'>{d.caps.max_daily_notional_usd ?? t('list.default')}</td>
              <td className='px-4 py-2'>
                <span
                  className={
                    d.is_active
                      ? 'inline-flex px-2 py-0.5 rounded-full text-xs bg-gain-50 text-gain-700'
                      : 'inline-flex px-2 py-0.5 rounded-full text-xs bg-dark-700 text-muted-600'
                  }
                >
                  {d.is_active ? t('list.status.active') : t('list.status.revoked')}
                </span>
              </td>
              <td className='px-4 py-2 text-right'>
                <button
                  type='button'
                  onClick={() => onSelect(d.public_id)}
                  className='text-brand-600 hover:text-brand-700 text-sm font-medium inline-flex items-center'
                  aria-label={t('list.viewAriaLabel', { label: d.label })}
                >
                  {t('list.details')}
                  <ChevronRight className='w-4 h-4' />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
