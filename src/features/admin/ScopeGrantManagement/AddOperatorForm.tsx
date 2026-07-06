import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '../../../components/ui'
import { Modal } from '../../../components/ui/Modal'
import { useCreateOperator } from '../../../hooks/queries/wallets'

interface AddOperatorFormProps {
  open: boolean
  onClose: () => void
  readOnly?: boolean | undefined
}

const AddOperatorForm: React.FC<Readonly<AddOperatorFormProps>> = ({ open, onClose, readOnly }) => {
  const { t } = useTranslation('admin')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const createMutation = useCreateOperator()

  const resetForm = () => {
    setLabel('')
    setDescription('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!label.trim()) {
      setError(t('operators.form.validation.labelRequired'))

      return
    }

    const trimmedDescription = description.trim()

    createMutation.mutate(
      {
        label: label.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('operators.form.toast.created'))
          handleClose()
        },
        onError: (err: Error) => {
          if (
            err.message.includes('409') ||
            err.message.toLowerCase().includes('conflict') ||
            err.message.toLowerCase().includes('already')
          ) {
            toast.error(t('operators.form.toast.conflictError'))
          } else {
            toast.error(err.message || t('operators.form.toast.createError'))
          }
        },
      }
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('operators.form.title')} size='md'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <fieldset disabled={readOnly} className='space-y-6'>
          <div>
            <label htmlFor='op-label' className='block text-sm font-medium text-alpine-900 mb-2'>
              {t('operators.form.fields.label')}
            </label>
            <input
              type='text'
              id='op-label'
              value={label}
              onChange={e => {
                setLabel(e.target.value)

                if (error) setError('')
              }}
              className={`w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                error ? 'border-loss-500' : 'border-dark-600'
              }`}
              placeholder={t('operators.form.fields.labelPlaceholder')}
            />
            {error && <p className='mt-1 text-sm text-loss-600'>{error}</p>}
          </div>
          <div>
            <label
              htmlFor='op-description'
              className='block text-sm font-medium text-alpine-900 mb-2'
            >
              {t('operators.form.fields.description')}
            </label>
            <input
              type='text'
              id='op-description'
              value={description}
              onChange={e => setDescription(e.target.value)}
              className='w-full rounded-md border border-dark-600 bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
              placeholder={t('operators.form.fields.descriptionPlaceholder')}
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
            {t('operators.form.actions.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddOperatorForm
