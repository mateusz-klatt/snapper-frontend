import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowRightLeft, Link2 } from 'lucide-react'
import { Button, Badge } from '../../../components/ui'
import { useScopeGrants } from '../../../hooks/queries/scope-grants'
import { useWallets, useOperators } from '../../../hooks/queries/wallets'
import { ThemeSelect } from '../../../components/ThemeSelect'
import { formatDateTime } from '../../../lib/dateFormat'
import AddOperatorForm from './AddOperatorForm'
import type { AppLocale } from '../../../i18n/types'
import type { ScopeGrantInfo, WalletInfo, OperatorInfo } from '../../../types/api'

interface ScopeGrantListProps {
  onCreateGrant: () => void
  onHandover: (grant: ScopeGrantInfo) => void
  readOnly?: boolean | undefined
}

const ScopeGrantList: React.FC<Readonly<ScopeGrantListProps>> = ({
  onCreateGrant,
  onHandover,
  readOnly,
}) => {
  const { t, i18n } = useTranslation('admin')
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [showAddOperator, setShowAddOperator] = useState(false)
  const { data: walletsData } = useWallets()
  const { data: operatorsData } = useOperators()
  const { data: grantsData, isLoading, error } = useScopeGrants(selectedWallet)

  const wallets: WalletInfo[] = walletsData?.payload ?? []
  const operators: OperatorInfo[] = operatorsData?.payload ?? []
  const grants: ScopeGrantInfo[] = grantsData?.payload ?? []

  const operatorLabel = (publicId: string): string => {
    const op = operators.find(o => o.public_id === publicId)

    return op?.label ?? publicId
  }

  const formatDate = (dateString: string): string =>
    formatDateTime(new Date(dateString), i18n.language as AppLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center space-x-4'>
          <h2 className='text-2xl font-bold text-alpine-900'>{t('scopeGrants.list.title')}</h2>
          {selectedWallet && (
            <Badge variant='outline' className='text-sm'>
              {t('scopeGrants.list.countLabel', { count: grants.length })}
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='secondary'
            onClick={() => setShowAddOperator(true)}
            disabled={readOnly}
            className='flex items-center space-x-2'
          >
            <Plus className='w-4 h-4' />
            <span>{t('operators.list.addOperator')}</span>
          </Button>
          <Button
            onClick={onCreateGrant}
            disabled={readOnly}
            className='flex items-center space-x-2'
          >
            <Plus className='w-4 h-4' />
            <span>{t('scopeGrants.list.createGrant')}</span>
          </Button>
        </div>
      </div>
      <div className='max-w-xs'>
        <label htmlFor='wallet-filter' className='block text-sm font-medium text-alpine-900 mb-1'>
          {t('common.selectWallet')}
        </label>
        <ThemeSelect
          id='wallet-filter'
          value={selectedWallet}
          onChange={val => setSelectedWallet(val)}
          options={wallets.map(w => ({
            value: w.public_id,
            label: `${w.label}${w.is_paper ? t('common.paperAnnotation') : ''}`,
          }))}
          placeholder={t('common.chooseWalletPlaceholder')}
        />
      </div>
      {!selectedWallet && (
        <div className='text-center py-12'>
          <Link2 className='mx-auto h-12 w-12 text-muted-400' />
          <h3 className='mt-2 text-sm font-medium text-alpine-900'>{t('common.selectAWallet')}</h3>
          <p className='mt-1 text-sm text-muted-500'>{t('scopeGrants.list.selectWalletPrompt')}</p>
        </div>
      )}
      {selectedWallet && isLoading && (
        <div className='flex items-center justify-center p-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
        </div>
      )}
      {selectedWallet && error && (
        <div className='p-4 text-loss-600 bg-loss-50 rounded-lg'>
          {t('scopeGrants.list.errorLoading', {
            message: error instanceof Error ? error.message : t('common.unknownError'),
          })}
        </div>
      )}
      {selectedWallet && !isLoading && !error && grants.length === 0 && (
        <div className='text-center py-12'>
          <Link2 className='mx-auto h-12 w-12 text-muted-400' />
          <h3 className='mt-2 text-sm font-medium text-alpine-900'>
            {t('scopeGrants.list.empty.noGrants')}
          </h3>
          <p className='mt-1 text-sm text-muted-500'>{t('scopeGrants.list.empty.noGrantsHint')}</p>
        </div>
      )}
      {selectedWallet && !isLoading && !error && grants.length > 0 && (
        <div className='bg-alpine-50 shadow-sm rounded-lg border border-dark-600 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-dark-600'>
              <thead className='bg-dark-700'>
                <tr>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('scopeGrants.list.columns.operator')}
                  </th>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('scopeGrants.list.columns.scope')}
                  </th>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('scopeGrants.list.columns.target')}
                  </th>
                  <th className='hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('scopeGrants.list.columns.grantedAt')}
                  </th>
                  <th className='px-3 py-3 text-right text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('scopeGrants.list.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className='bg-alpine-50 divide-y divide-dark-600'>
                {grants.map(grant => (
                  <tr key={grant.public_id} className='hover:bg-dark-700'>
                    <td className='px-3 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-alpine-900'>
                        {operatorLabel(grant.operator_public_id)}
                      </div>
                      <div className='text-xs text-muted-500'>{grant.operator_public_id}</div>
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap'>
                      <span className='inline-flex items-center rounded-full border border-brand-200 bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800'>
                        {t(`scopeGrants.form.scopeKinds.${grant.scope_kind}`, {
                          defaultValue: grant.scope_kind,
                        })}
                      </span>
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap text-sm text-alpine-900'>
                      {grant.scope_kind === 'underlying'
                        ? grant.underlying_public_id
                        : grant.instrument_public_id}
                    </td>
                    <td className='hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-muted-500'>
                      {formatDate(grant.timestamp)}
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <Button
                        variant='secondary'
                        size='sm'
                        onClick={() => onHandover(grant)}
                        disabled={readOnly}
                        className='text-brand-600 hover:text-brand-900'
                      >
                        <ArrowRightLeft className='w-4 h-4' />
                        <span className='ml-1'>{t('scopeGrants.list.handover')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AddOperatorForm
        open={showAddOperator}
        onClose={() => setShowAddOperator(false)}
        readOnly={readOnly}
      />
    </div>
  )
}

export default ScopeGrantList
