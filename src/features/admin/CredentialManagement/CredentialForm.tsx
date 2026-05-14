import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '../../../components/ui'
import { Modal } from '../../../components/ui/Modal'
import { ThemeSelect } from '../../../components/ThemeSelect'
import { useCreateCredential } from '../../../hooks/queries/credentials'
import { useWallets } from '../../../hooks/queries/wallets'
import type { WalletInfo } from '../../../types/api'

const CREDENTIAL_TYPE_VALUES = ['api_key_secret', 'rsa_pem', 'oauth', 'paper'] as const

const REQUIRED_FIELDS: Record<string, string[]> = {
  api_key_secret: ['api_key', 'api_secret'],
  rsa_pem: ['api_key', 'private_key_pem'],
  oauth: ['client_id', 'client_secret', 'refresh_token'],
  paper: ['initial_balance'],
}

interface CredentialFormProps {
  open: boolean
  onClose: () => void
  readOnly?: boolean | undefined
}

const CredentialForm: React.FC<Readonly<CredentialFormProps>> = ({ open, onClose, readOnly }) => {
  const { t } = useTranslation('admin')
  const [walletId, setWalletId] = useState('')
  const [exchange, setExchange] = useState('')
  const [credentialType, setCredentialType] = useState('api_key_secret')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [label, setLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: walletsData } = useWallets()
  const createMutation = useCreateCredential()

  const wallets: WalletInfo[] = walletsData?.payload ?? []
  const requiredFields = REQUIRED_FIELDS[credentialType] ?? []

  const fieldLabel = (field: string): string =>
    t(`credentials.form.fieldLabels.${field}` as 'credentials.form.fieldLabels.api_key')

  const credentialTypeOptions = CREDENTIAL_TYPE_VALUES.map(value => ({
    value,
    label: t(
      `credentials.form.credentialTypes.${value}` as 'credentials.form.credentialTypes.api_key_secret'
    ),
  }))

  const resetForm = () => {
    setWalletId('')
    setExchange('')
    setCredentialType('api_key_secret')
    setFields({})
    setLabel('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleTypeChange = (newType: string) => {
    setCredentialType(newType)
    setFields({})
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!walletId) newErrors.wallet = t('credentials.form.validation.walletRequired')
    if (!exchange.trim()) newErrors.exchange = t('credentials.form.validation.exchangeRequired')

    for (const field of requiredFields) {
      if (!fields[field]?.trim()) {
        newErrors[field] = t('credentials.form.validation.fieldRequired', {
          field: fieldLabel(field),
        })
      }
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    const payload: Record<string, string> = {}

    for (const field of requiredFields) {
      payload[field] = (fields[field] as string).trim()
    }

    const trimmedLabel = label.trim()

    createMutation.mutate(
      {
        walletPublicId: walletId,
        data: {
          exchange: exchange.trim(),
          credential_type: credentialType as 'api_key_secret' | 'rsa_pem' | 'oauth' | 'paper',
          credential_payload: payload,
          ...(trimmedLabel ? { label: trimmedLabel } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('credentials.form.toast.created'))
          handleClose()
        },
        onError: (err: Error) => {
          if (err.message.includes('409') || err.message.toLowerCase().includes('already exists')) {
            toast.error(t('credentials.form.toast.conflictError'))
          } else {
            toast.error(err.message || t('credentials.form.toast.createError'))
          }
        },
      }
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('credentials.form.title')} size='md'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <fieldset disabled={readOnly} className='space-y-6'>
          <div>
            <label htmlFor='cred-wallet' className='block text-sm font-medium text-alpine-900 mb-2'>
              {t('credentials.form.fields.wallet')}
            </label>
            <ThemeSelect
              id='cred-wallet'
              value={walletId}
              onChange={setWalletId}
              options={wallets.map(w => ({
                value: w.public_id,
                label: `${w.label}${w.is_paper ? t('common.paperAnnotation') : ''}`,
              }))}
              placeholder={t('common.selectWalletPlaceholder')}
            />
            {errors.wallet && <p className='mt-1 text-sm text-loss-600'>{errors.wallet}</p>}
          </div>
          <div>
            <label
              htmlFor='cred-exchange'
              className='block text-sm font-medium text-alpine-900 mb-2'
            >
              {t('credentials.form.fields.exchange')}
            </label>
            <input
              type='text'
              id='cred-exchange'
              value={exchange}
              onChange={e => {
                setExchange(e.target.value)

                if (errors.exchange) setErrors(prev => ({ ...prev, exchange: '' }))
              }}
              className={`w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors.exchange ? 'border-loss-500' : 'border-dark-600'
              }`}
              placeholder={t('credentials.form.fields.exchangePlaceholder')}
            />
            {errors.exchange && <p className='mt-1 text-sm text-loss-600'>{errors.exchange}</p>}
          </div>
          <div>
            <label htmlFor='cred-type' className='block text-sm font-medium text-alpine-900 mb-2'>
              {t('credentials.form.fields.credentialType')}
            </label>
            <ThemeSelect
              id='cred-type'
              value={credentialType}
              onChange={handleTypeChange}
              options={credentialTypeOptions}
            />
          </div>
          {requiredFields.map(field => (
            <div key={field}>
              <label
                htmlFor={`cred-field-${field}`}
                className='block text-sm font-medium text-alpine-900 mb-2'
              >
                {fieldLabel(field)}
              </label>
              {field === 'private_key_pem' ? (
                <textarea
                  id={`cred-field-${field}`}
                  value={fields[field] ?? ''}
                  onChange={e => {
                    setFields(prev => ({ ...prev, [field]: e.target.value }))

                    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
                  }}
                  rows={4}
                  className={`w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs ${
                    errors[field] ? 'border-loss-500' : 'border-dark-600'
                  }`}
                  placeholder={t('credentials.form.fields.pemPlaceholder')}
                />
              ) : (
                <input
                  type={
                    field.includes('secret') || field.includes('key') || field.includes('token')
                      ? 'password'
                      : 'text'
                  }
                  id={`cred-field-${field}`}
                  value={fields[field] ?? ''}
                  onChange={e => {
                    setFields(prev => ({ ...prev, [field]: e.target.value }))

                    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
                  }}
                  className={`w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    errors[field] ? 'border-loss-500' : 'border-dark-600'
                  }`}
                />
              )}
              {errors[field] && <p className='mt-1 text-sm text-loss-600'>{errors[field]}</p>}
            </div>
          ))}
          <div>
            <label htmlFor='cred-label' className='block text-sm font-medium text-alpine-900 mb-2'>
              {t('credentials.form.fields.label')}
            </label>
            <input
              type='text'
              id='cred-label'
              value={label}
              onChange={e => setLabel(e.target.value)}
              className='w-full rounded-md border border-dark-600 bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
              placeholder={t('credentials.form.fields.labelPlaceholder')}
            />
          </div>
        </fieldset>
        <div className='flex justify-end space-x-3 pt-4 border-t border-dark-600'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            <X className='w-3.5 h-3.5' />
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            variant='primary'
            size='sm'
            loading={createMutation.isPending}
            disabled={readOnly}
          >
            <Save className='w-3.5 h-3.5' />
            {t('credentials.form.actions.addCredential')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CredentialForm
