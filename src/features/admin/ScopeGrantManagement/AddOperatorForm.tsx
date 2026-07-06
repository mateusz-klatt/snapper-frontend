import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { AdminTextField } from '../components/AdminFormFields'
import { AdminFormModal } from '../components/AdminFormModal'
import { showConflictAwareErrorToast } from '../formFeedback'
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
          showConflictAwareErrorToast(
            err,
            t('operators.form.toast.conflictError'),
            t('operators.form.toast.createError')
          )
        },
      }
    )
  }

  return (
    <AdminFormModal
      open={open}
      onClose={handleClose}
      title={t('operators.form.title')}
      size='md'
      onSubmit={handleSubmit}
      readOnly={readOnly}
      isPending={createMutation.isPending}
      cancelLabel={t('common.cancel')}
      submitLabel={t('operators.form.actions.create')}
    >
      <AdminTextField
        id='op-label'
        type='text'
        label={t('operators.form.fields.label')}
        value={label}
        onChange={value => {
          setLabel(value)

          if (error) setError('')
        }}
        placeholder={t('operators.form.fields.labelPlaceholder')}
        error={error}
      />
      <AdminTextField
        id='op-description'
        type='text'
        label={t('operators.form.fields.description')}
        value={description}
        onChange={setDescription}
        placeholder={t('operators.form.fields.descriptionPlaceholder')}
      />
    </AdminFormModal>
  )
}

export default AddOperatorForm
