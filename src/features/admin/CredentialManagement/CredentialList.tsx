import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RotateCw, KeyRound } from 'lucide-react'
import { Button, Badge } from '../../../components/ui'
import { useCredentials } from '../../../hooks/queries/credentials'
import { useWallets } from '../../../hooks/queries/wallets'
import { ThemeSelect } from '../../../components/ThemeSelect'
import { isCredentialType } from './credentialTypes'
import type { CredentialSummary, WalletInfo } from '../../../types/api'

interface CredentialListProps {
  onCreateCredential: () => void
  onRotate: (credential: CredentialSummary) => void
  readOnly?: boolean | undefined
}

const CredentialList: React.FC<Readonly<CredentialListProps>> = ({
  onCreateCredential,
  onRotate,
  readOnly,
}) => {
  const { t } = useTranslation('admin')
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const { data: walletsData } = useWallets()
  const { data: credentialsData, isLoading, error } = useCredentials(selectedWallet)

  const wallets: WalletInfo[] = walletsData?.payload ?? []
  const credentials: CredentialSummary[] = credentialsData?.payload ?? []

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const credentialTypeLabel = (type: string): string => {
    if (isCredentialType(type)) {
      return t(`credentials.form.credentialTypes.${type}`)
    }

    return type
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center space-x-4'>
          <h2 className='text-2xl font-bold text-alpine-900'>{t('credentials.list.title')}</h2>
          {selectedWallet && (
            <Badge variant='outline' className='text-sm'>
              {t('credentials.list.countLabel', { count: credentials.length })}
            </Badge>
          )}
        </div>
        <Button
          onClick={onCreateCredential}
          disabled={readOnly}
          className='flex items-center space-x-2'
        >
          <Plus className='w-4 h-4' />
          <span>{t('credentials.list.addCredential')}</span>
        </Button>
      </div>
      <div className='max-w-xs'>
        <label
          htmlFor='cred-wallet-filter'
          className='block text-sm font-medium text-alpine-900 mb-1'
        >
          {t('common.selectWallet')}
        </label>
        <ThemeSelect
          id='cred-wallet-filter'
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
          <KeyRound className='mx-auto h-12 w-12 text-muted-400' />
          <h3 className='mt-2 text-sm font-medium text-alpine-900'>{t('common.selectAWallet')}</h3>
          <p className='mt-1 text-sm text-muted-500'>{t('credentials.list.selectWalletPrompt')}</p>
        </div>
      )}
      {selectedWallet && isLoading && (
        <div className='flex items-center justify-center p-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
        </div>
      )}
      {selectedWallet && error && (
        <div className='p-4 text-loss-600 bg-loss-50 rounded-lg'>
          {t('credentials.list.errorLoading', {
            message: error instanceof Error ? error.message : t('common.unknownError'),
          })}
        </div>
      )}
      {selectedWallet && !isLoading && !error && credentials.length === 0 && (
        <div className='text-center py-12'>
          <KeyRound className='mx-auto h-12 w-12 text-muted-400' />
          <h3 className='mt-2 text-sm font-medium text-alpine-900'>
            {t('credentials.list.empty.noCredentials')}
          </h3>
          <p className='mt-1 text-sm text-muted-500'>
            {t('credentials.list.empty.noCredentialsHint')}
          </p>
        </div>
      )}
      {selectedWallet && !isLoading && !error && credentials.length > 0 && (
        <div className='bg-alpine-50 shadow-sm rounded-lg border border-dark-600 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-dark-600'>
              <thead className='bg-dark-700'>
                <tr>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('credentials.list.columns.exchange')}
                  </th>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('credentials.list.columns.type')}
                  </th>
                  <th className='px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('credentials.list.columns.label')}
                  </th>
                  <th className='hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('credentials.list.columns.createdAt')}
                  </th>
                  <th className='px-3 py-3 text-right text-xs font-medium text-muted-600 uppercase tracking-wider'>
                    {t('credentials.list.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className='bg-alpine-50 divide-y divide-dark-600'>
                {credentials.map(cred => (
                  <tr key={cred.public_id} className='hover:bg-dark-700'>
                    <td className='px-3 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-alpine-900'>{cred.exchange}</div>
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap'>
                      <span className='inline-flex items-center rounded-full border border-brand-200 bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800'>
                        {credentialTypeLabel(cred.credential_type)}
                      </span>
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap text-sm text-alpine-900'>
                      {cred.label ?? t('common.dash')}
                    </td>
                    <td className='hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-muted-500'>
                      {formatDate(cred.timestamp)}
                    </td>
                    <td className='px-3 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <Button
                        variant='secondary'
                        size='sm'
                        onClick={() => onRotate(cred)}
                        disabled={readOnly}
                        className='text-brand-600 hover:text-brand-900'
                      >
                        <RotateCw className='w-4 h-4' />
                        <span className='ml-1'>{t('credentials.list.rotate')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CredentialList
