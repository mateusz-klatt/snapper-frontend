import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { ThemeSelect } from '../../../components/ThemeSelect'
import { AdminTextField } from '../components/AdminFormFields'
import { AdminFormModal } from '../components/AdminFormModal'
import { showConflictAwareErrorToast } from '../formFeedback'
import { useCreateScopeGrant } from '../../../hooks/queries/scope-grants'
import { useOperators, useWallets } from '../../../hooks/queries/wallets'
import type { OperatorInfo, WalletInfo } from '../../../types/api'

interface ScopeGrantFormProps {
  open: boolean
  onClose: () => void
  readOnly?: boolean | undefined
}

const ScopeGrantForm: React.FC<Readonly<ScopeGrantFormProps>> = ({ open, onClose, readOnly }) => {
  const { t } = useTranslation('admin')
  const [operatorId, setOperatorId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [scopeKind, setScopeKind] = useState<'underlying' | 'instrument'>('underlying')
  const [targetId, setTargetId] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: operatorsData } = useOperators()
  const { data: walletsData } = useWallets()
  const createMutation = useCreateScopeGrant()

  const operators: OperatorInfo[] = operatorsData?.payload ?? []
  const wallets: WalletInfo[] = walletsData?.payload ?? []

  const resetForm = () => {
    setOperatorId('')
    setWalletId('')
    setScopeKind('underlying')
    setTargetId('')
    setNote('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!operatorId) newErrors.operator = t('scopeGrants.form.validation.operatorRequired')
    if (!walletId) newErrors.wallet = t('scopeGrants.form.validation.walletRequired')
    if (!targetId.trim()) newErrors.target = t('scopeGrants.form.validation.targetRequired')
    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    const trimmedTarget = targetId.trim()
    const trimmedNote = note.trim()

    createMutation.mutate(
      {
        operator_public_id: operatorId,
        wallet_public_id: walletId,
        scope_kind: scopeKind,
        ...(scopeKind === 'underlying' ? { underlying_public_id: trimmedTarget } : {}),
        ...(scopeKind === 'instrument' ? { instrument_public_id: trimmedTarget } : {}),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('scopeGrants.form.toast.created'))
          handleClose()
        },
        onError: (err: Error) => {
          showConflictAwareErrorToast(
            err,
            t('scopeGrants.form.toast.conflictError'),
            t('scopeGrants.form.toast.createError')
          )
        },
      }
    )
  }

  return (
    <AdminFormModal
      open={open}
      onClose={handleClose}
      title={t('scopeGrants.form.title')}
      size='md'
      onSubmit={handleSubmit}
      readOnly={readOnly}
      isPending={createMutation.isPending}
      cancelLabel={t('common.cancel')}
      submitLabel={t('scopeGrants.form.actions.createGrant')}
    >
      <div>
        <label htmlFor='sg-operator' className='block text-sm font-medium text-alpine-900 mb-2'>
          {t('scopeGrants.form.fields.operator')}
        </label>
        <ThemeSelect
          id='sg-operator'
          value={operatorId}
          onChange={setOperatorId}
          options={operators.map(o => ({ value: o.public_id, label: o.label }))}
          placeholder={t('scopeGrants.form.fields.operatorPlaceholder')}
        />
        {errors.operator && <p className='mt-1 text-sm text-loss-600'>{errors.operator}</p>}
      </div>
      <div>
        <label htmlFor='sg-wallet' className='block text-sm font-medium text-alpine-900 mb-2'>
          {t('scopeGrants.form.fields.wallet')}
        </label>
        <ThemeSelect
          id='sg-wallet'
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
        <label htmlFor='sg-scope-kind' className='block text-sm font-medium text-alpine-900 mb-2'>
          {t('scopeGrants.form.fields.scopeKind')}
        </label>
        <ThemeSelect
          id='sg-scope-kind'
          value={scopeKind}
          onChange={val => setScopeKind(val as 'underlying' | 'instrument')}
          options={[
            { value: 'underlying', label: t('scopeGrants.form.scopeKinds.underlying') },
            { value: 'instrument', label: t('scopeGrants.form.scopeKinds.instrument') },
          ]}
        />
      </div>
      <AdminTextField
        id='sg-target'
        type='text'
        label={
          scopeKind === 'underlying'
            ? t('scopeGrants.form.fields.underlyingPublicId')
            : t('scopeGrants.form.fields.instrumentPublicId')
        }
        value={targetId}
        onChange={value => {
          setTargetId(value)

          if (errors.target) setErrors(prev => ({ ...prev, target: '' }))
        }}
        placeholder={
          scopeKind === 'underlying'
            ? t('scopeGrants.form.fields.underlyingPlaceholder')
            : t('scopeGrants.form.fields.instrumentPlaceholder')
        }
        error={errors.target}
      />
      <AdminTextField
        id='sg-note'
        type='text'
        label={t('scopeGrants.form.fields.note')}
        value={note}
        onChange={setNote}
        placeholder={t('scopeGrants.form.fields.notePlaceholder')}
      />
    </AdminFormModal>
  )
}

export default ScopeGrantForm
