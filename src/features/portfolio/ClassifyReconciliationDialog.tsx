import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import {
  useCredentials,
  useSetCredentialReconciliationMethod,
} from '../../hooks/queries/credentials'
import { queryKeys } from '../../hooks/queries/keys'
import { classifiableMethodsForExchange, reconciliationMethod } from '../../lib/reconciliation'
import type { PortfolioAccountState, RealPortfolioReconciliationMethod } from '../../types/api'

interface ClassifyReconciliationDialogProps {
  account: PortfolioAccountState
  open: boolean
  onClose: () => void
  onClassified?: (() => void) | undefined
}

/** Locale-key suffixes of the classifiable (real) reconciliation methods. */
type ClassifiableMethodSuffix = 'futuresPosition' | 'spotExecutionReplay' | 'marginLedgerReplay'

/**
 * One-way reconciliation-method classification dialog for a venue account.
 *
 * Classification is an immutable operator statement of fact (the server 409s
 * on re-set), so the dialog fails closed at every step: it resolves exactly
 * one live credential for the account (never guessing between several),
 * offers only the venue-allowed methods, and requires an explicit method
 * selection plus an acknowledgment of permanence before Confirm enables.
 */
export const ClassifyReconciliationDialog: React.FC<
  Readonly<ClassifyReconciliationDialogProps>
> = ({ account, open, onClose, onClassified }) => {
  const { t } = useTranslation('accounts')
  const readOnly = useIsReadOnly()
  const [selectedMethod, setSelectedMethod] = useState<RealPortfolioReconciliationMethod | null>(
    null
  )
  const [acknowledged, setAcknowledged] = useState(false)
  const { data, fetchStatus, error, refetch } = useCredentials(account.wallet_public_id)
  const mutation = useSetCredentialReconciliationMethod()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setSelectedMethod(null)
      setAcknowledged(false)
      void refetch()
    }
  }, [open, refetch])

  const methods = classifiableMethodsForExchange(account.exchange)
  const resolving = fetchStatus !== 'idle'
  const payload = !resolving && error === null && data !== undefined ? data.payload : null
  const matches = (payload ?? []).filter(
    credential => credential.credential_type !== 'paper' && credential.exchange === account.exchange
  )
  const target = matches.length === 1 ? matches[0] : undefined

  const methodSuffix = (method: RealPortfolioReconciliationMethod): ClassifiableMethodSuffix =>
    reconciliationMethod(method) as ClassifiableMethodSuffix

  const methodLabel = (method: RealPortfolioReconciliationMethod): string =>
    t(`reconciliation.method.${methodSuffix(method)}`)

  const submit =
    target !== undefined && selectedMethod !== null
      ? () => {
          mutation
            .mutateAsync({
              walletPublicId: account.wallet_public_id,
              credentialPublicId: target.public_id,
              data: { reconciliation_method: selectedMethod },
            })
            .then(() => {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.credentialsForWallet(account.wallet_public_id),
              })
              void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAccountsAll })
              toast.success(
                t('reconciliation.classify.success', { method: methodLabel(selectedMethod) })
              )
              onClassified?.()
              onClose()
            })
            .catch((mutationError: Error) => {
              toast.error(t('reconciliation.classify.error', { message: mutationError.message }))
            })
        }
      : undefined

  const canConfirm = submit !== undefined && acknowledged && !readOnly && !mutation.isPending

  return (
    <Modal open={open} onClose={onClose} title={t('reconciliation.classify.title')} size='md'>
      <div className='space-y-6' data-testid='classify-dialog'>
        <p className='text-sm text-muted-600'>{t('reconciliation.classify.intro')}</p>

        {resolving && (
          <div className='text-sm text-muted-500' data-testid='classify-credential-loading'>
            {t('reconciliation.classify.credentialLoading')}
          </div>
        )}
        {!resolving && error !== null && (
          <div
            className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-sm text-warning-600'
            data-testid='classify-load-error'
          >
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <span>{t('meta.error', { message: error.message })}</span>
          </div>
        )}
        {payload !== null && matches.length === 0 && (
          <div
            className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-sm text-warning-600'
            data-testid='classify-no-credential'
          >
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <span>{t('reconciliation.classify.noCredential')}</span>
          </div>
        )}
        {payload !== null && matches.length > 1 && (
          <div
            className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-sm text-warning-600'
            data-testid='classify-ambiguous-credential'
          >
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <span>{t('reconciliation.classify.ambiguousCredential')}</span>
          </div>
        )}

        <p className='text-sm text-muted-500'>{t('reconciliation.classify.guidance')}</p>

        <div className='space-y-3'>
          {methods.map(method => (
            <label
              key={method}
              htmlFor={`classify-method-${method}`}
              aria-label={methodLabel(method)}
              className='flex items-start cursor-pointer p-3 rounded border border-dark-600 hover:border-muted-400'
            >
              <input
                id={`classify-method-${method}`}
                data-testid={`classify-method-${method}`}
                type='radio'
                name='classify-method'
                value={method}
                checked={selectedMethod === method}
                onChange={() => setSelectedMethod(method)}
                className='mr-3 mt-1'
              />
              <div>
                <div className='text-alpine-900 font-medium'>{methodLabel(method)}</div>
                <div className='text-sm text-muted-500'>
                  {t(`reconciliation.classify.methodDescription.${methodSuffix(method)}`)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-sm text-warning-600'>
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
          <span>{t('reconciliation.classify.immutabilityWarning')}</span>
        </div>

        <label
          htmlFor='classify-acknowledge'
          className='flex items-start gap-2 cursor-pointer text-sm text-alpine-900'
        >
          <input
            id='classify-acknowledge'
            data-testid='classify-acknowledge'
            type='checkbox'
            checked={acknowledged}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setAcknowledged(event.target.checked)
            }
            className='mt-0.5'
          />
          <span>{t('reconciliation.classify.acknowledge')}</span>
        </label>

        <div className='flex justify-end space-x-3 pt-4 border-t border-dark-600'>
          <button
            type='button'
            data-testid='classify-cancel'
            onClick={onClose}
            className='px-4 py-2 text-muted-600 hover:text-alpine-900 transition-colors'
          >
            {t('reconciliation.classify.cancel')}
          </button>
          <button
            type='button'
            data-testid='classify-confirm'
            onClick={submit}
            disabled={!canConfirm}
            className='px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {t('reconciliation.classify.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
