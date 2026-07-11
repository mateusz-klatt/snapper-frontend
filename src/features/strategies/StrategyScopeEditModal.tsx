import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import type { OperatorInfo, UserProfile, WalletInfo } from '../../types/api'
import { useProcessSchema, useUpdateProcessConfig } from '../../hooks/queries/processes'
import { useOperators, useWallets } from '../../hooks/queries/wallets'
import { useUsers } from '../../hooks/queries/users'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { ScopeFields } from './ScopeFields'

const LABEL_PREFIX = 'label:'

export interface StrategyScopeEditTarget {
  processName: string
  template: string | null
  parameters: Readonly<Record<string, unknown>>
}

interface StrategyScopeEditModalProps {
  open: boolean
  onClose: () => void
  target: StrategyScopeEditTarget | null
}

const readString = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Resolve a persisted scope value to the matching select option value.
 *
 * Configs store operator / wallet scope as ``label:<name>`` references; the
 * operator / wallet `<select>`s carry `public_id` option values, so a label is
 * mapped to the public_id of the entity whose ``label`` matches. A concrete
 * public_id (or an empty clear) passes through unchanged. This keeps the picker
 * pre-filled with the current scope; on save the concrete public_id is stored.
 */
const resolveScopeOptionValue = (
  rawValue: unknown,
  byLabel: ReadonlyMap<string, string>
): string => {
  const value = readString(rawValue)

  if (value.startsWith(LABEL_PREFIX)) {
    return byLabel.get(value.slice(LABEL_PREFIX.length)) ?? ''
  }

  return value
}

export const StrategyScopeEditModal: React.FC<Readonly<StrategyScopeEditModalProps>> = ({
  open,
  onClose,
  target,
}) => {
  const { t } = useTranslation('strategies')
  const readOnly = useIsReadOnly()
  const { data: operatorsData } = useOperators()
  const { data: walletsData } = useWallets()
  const { data: usersData } = useUsers(false)
  const operators = useMemo<OperatorInfo[]>(
    () => operatorsData?.payload ?? [],
    [operatorsData?.payload]
  )
  const wallets = useMemo<WalletInfo[]>(() => walletsData?.payload ?? [], [walletsData?.payload])
  const users = useMemo<UserProfile[]>(() => usersData?.payload ?? [], [usersData?.payload])
  const template = target?.template ?? ''
  const processSchema = useProcessSchema(template, { enabled: open && template.length > 0 })
  const referenceParams = useMemo<Record<string, string>>(() => {
    const raw = processSchema.data?.payload.reference_identity_params

    return raw && typeof raw === 'object' ? raw : {}
  }, [processSchema.data?.payload.reference_identity_params])
  const referenceEntries = useMemo(() => Object.entries(referenceParams), [referenceParams])
  const operatorByLabel = useMemo(
    () => new Map(operators.map(operator => [operator.label, operator.public_id])),
    [operators]
  )
  const walletByLabel = useMemo(
    () => new Map(wallets.map(wallet => [wallet.label, wallet.public_id])),
    [wallets]
  )

  const [operatorId, setOperatorId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [referenceValues, setReferenceValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const update = useUpdateProcessConfig()

  useEffect(() => {
    if (!open || target === null) {
      return
    }

    const parameters = target.parameters

    setOperatorId(resolveScopeOptionValue(parameters['operator_public_id'], operatorByLabel))
    setWalletId(resolveScopeOptionValue(parameters['wallet_public_id'], walletByLabel))
    const nested = parameters['params']
    const nestedRecord: Record<string, unknown> =
      nested !== null && typeof nested === 'object' ? (nested as Record<string, unknown>) : {}
    const prefill: Record<string, string> = {}

    for (const [name] of referenceEntries) {
      prefill[name] = readString(nestedRecord[name])
    }

    setReferenceValues(prefill)
    setSaved(false)
  }, [open, target, operatorByLabel, walletByLabel, referenceEntries])

  const scopeBlocked = operators.length === 0
  const referenceComplete = referenceEntries.every(([name]) => Boolean(referenceValues[name]))
  const scopeComplete = Boolean(operatorId) && Boolean(walletId) && referenceComplete

  return (
    <Modal
      open={open && target !== null}
      onClose={onClose}
      title={t('editScopeModal.title')}
      size='lg'
    >
      {target !== null && (
        <div className='space-y-5'>
          <p className='text-sm text-muted-600'>
            {t('editScopeModal.subtitle', { name: target.processName })}
          </p>
          {saved ? (
            <output className='flex items-start gap-2 rounded-md border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800'>
              <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
              <span>{t('editScopeModal.restartRequiredBanner')}</span>
            </output>
          ) : (
            <>
              <div className='space-y-4 rounded-md border border-dark-600 p-4'>
                <p className='text-sm font-medium text-muted-700'>
                  {t('launchModal.scopeSectionLabel')}
                </p>
                <ScopeFields
                  referenceEntries={referenceEntries}
                  operators={operators}
                  wallets={wallets}
                  users={users}
                  operatorId={operatorId}
                  walletId={walletId}
                  referenceValues={referenceValues}
                  onOperatorChange={setOperatorId}
                  onWalletChange={setWalletId}
                  onReferenceChange={(name, value) =>
                    setReferenceValues(prev => ({ ...prev, [name]: value }))
                  }
                  scopeBlocked={scopeBlocked}
                />
              </div>
              <p className='text-xs text-muted-400'>{t('editScopeModal.help')}</p>
              {update.isError && (
                <p role='alert' className='text-xs text-loss-700'>
                  {t('editScopeModal.saveError', { message: update.error.message })}
                </p>
              )}
            </>
          )}
          <div className='flex justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900'
            >
              {saved ? t('editScopeModal.close') : t('editScopeModal.cancel')}
            </button>
            {!saved && (
              <button
                type='button'
                onClick={() =>
                  update.mutate(
                    {
                      name: target.processName,
                      body: {
                        operator_public_id: operatorId,
                        wallet_public_id: walletId,
                        reference_identity_params: referenceValues,
                      },
                    },
                    { onSuccess: () => setSaved(true) }
                  )
                }
                disabled={readOnly || update.isPending || scopeBlocked || !scopeComplete}
                className='px-4 py-2 bg-info-600 text-info-50 text-sm font-medium rounded-md hover:bg-info-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {update.isPending ? t('editScopeModal.saving') : t('editScopeModal.save')}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
