import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCw, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '../../../components/ui'
import { Modal } from '../../../components/ui/Modal'
import { useRotateCredential } from '../../../hooks/queries/credentials'
import { credentialFieldsFor, type CredentialField } from './credentialTypes'
import type { CredentialSummary } from '../../../types/api'

interface RotateDialogProps {
  credential: CredentialSummary | null
  open: boolean
  onClose: () => void
  readOnly?: boolean | undefined
}

const RotateDialog: React.FC<Readonly<RotateDialogProps>> = ({
  credential,
  open,
  onClose,
  readOnly,
}) => {
  const { t } = useTranslation('admin')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [label, setLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const rotateMutation = useRotateCredential()

  const requiredFields = credentialFieldsFor(credential?.credential_type)

  const fieldLabel = (field: CredentialField): string => t(`credentials.form.fieldLabels.${field}`)

  const handleClose = () => {
    setFields({})
    setLabel('')
    setErrors({})
    onClose()
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

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

  const handleRotate = () => {
    if (!credential) return
    if (!validateForm()) return

    const payload: Record<string, string> = {}

    for (const field of requiredFields) {
      payload[field] = (fields[field] as string).trim()
    }

    const trimmedLabel = label.trim()

    rotateMutation.mutate(
      {
        walletPublicId: credential.wallet_public_id,
        credentialPublicId: credential.public_id,
        data: {
          credential_payload: payload,
          ...(trimmedLabel ? { label: trimmedLabel } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('credentials.rotate.toast.rotated'))
          handleClose()
        },
        onError: (err: Error) => {
          toast.error(err.message || t('credentials.rotate.toast.rotateError'))
        },
      }
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('credentials.rotate.title')} size='md'>
      <div className='space-y-6'>
        {credential && (
          <div className='bg-dark-700 rounded-lg p-4 space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-500'>{t('credentials.rotate.fields.exchange')}</span>
              <span className='text-alpine-900 font-medium'>{credential.exchange}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-500'>{t('credentials.rotate.fields.type')}</span>
              <span className='text-alpine-900'>
                {t(`credentials.form.credentialTypes.${credential.credential_type}`, {
                  defaultValue: credential.credential_type,
                })}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-500'>{t('credentials.rotate.fields.label')}</span>
              <span className='text-alpine-900'>{credential.label ?? t('common.dash')}</span>
            </div>
          </div>
        )}
        {requiredFields.map(field => (
          <div key={field}>
            <label
              htmlFor={`rotate-field-${field}`}
              className='block text-sm font-medium text-alpine-900 mb-2'
            >
              {fieldLabel(field)}
            </label>
            {field === 'private_key_pem' ? (
              <textarea
                id={`rotate-field-${field}`}
                value={fields[field] ?? ''}
                onChange={e => {
                  setFields(prev => ({ ...prev, [field]: e.target.value }))

                  if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
                }}
                rows={4}
                className={`w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs ${
                  errors[field] ? 'border-loss-500' : 'border-dark-600'
                }`}
                placeholder={t('credentials.rotate.fields.pemPlaceholder')}
              />
            ) : (
              <input
                type={
                  field.includes('secret') || field.includes('key') || field.includes('token')
                    ? 'password'
                    : 'text'
                }
                id={`rotate-field-${field}`}
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
          <label htmlFor='rotate-label' className='block text-sm font-medium text-alpine-900 mb-2'>
            {t('credentials.rotate.fields.newLabel')}
          </label>
          <input
            type='text'
            id='rotate-label'
            value={label}
            onChange={e => setLabel(e.target.value)}
            className='w-full rounded-md border border-dark-600 bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
            placeholder={t('credentials.rotate.fields.newLabelPlaceholder')}
          />
        </div>
        <div className='flex justify-end space-x-3 pt-4 border-t border-dark-600'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={handleClose}
            disabled={rotateMutation.isPending}
          >
            <X className='w-3.5 h-3.5' />
            {t('common.cancel')}
          </Button>
          <Button
            type='button'
            variant='primary'
            size='sm'
            loading={rotateMutation.isPending}
            disabled={readOnly}
            onClick={handleRotate}
          >
            <RotateCw className='w-3.5 h-3.5' />
            {t('credentials.rotate.actions.rotate')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default RotateDialog
