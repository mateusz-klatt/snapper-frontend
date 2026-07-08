import React from 'react'
import { useTranslation } from 'react-i18next'
import type { OperatorInfo, UserProfile, WalletInfo } from '../../types/api'

const SCOPE_SELECT_CLASS =
  'w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'

const buildReferenceOptions = (
  kind: string,
  operators: readonly OperatorInfo[],
  wallets: readonly WalletInfo[],
  users: readonly UserProfile[],
  paperAnnotation: string
): { value: string; label: string }[] => {
  if (kind === 'user') {
    return users.map(user => ({ value: `label:${user.username}`, label: user.username }))
  }

  if (kind === 'operator') {
    return operators.map(operator => ({ value: operator.public_id, label: operator.label }))
  }

  if (kind === 'wallet') {
    return wallets.map(wallet => ({
      value: wallet.public_id,
      label: `${wallet.label}${wallet.is_paper ? paperAnnotation : ''}`,
    }))
  }

  return []
}

interface ScopeFieldsProps {
  referenceEntries: ReadonlyArray<readonly [string, string]>
  operators: readonly OperatorInfo[]
  wallets: readonly WalletInfo[]
  users: readonly UserProfile[]
  operatorId: string
  walletId: string
  referenceValues: Readonly<Record<string, string>>
  onOperatorChange: (value: string) => void
  onWalletChange: (value: string) => void
  onReferenceChange: (name: string, value: string) => void
  scopeBlocked: boolean
}

/**
 * Shared operator / wallet / reference-identity scope pickers.
 *
 * Native `<select>`s (unaffected by the Radix-in-modal portal issue) reused by
 * both the strategy launch modal (register) and the scope-edit modal (retarget
 * an existing config). User reference values are `label:<username>` strings so
 * they resolve at (re)start; operator / wallet options carry their public_id.
 * When the operator catalogue is empty the section renders a warning instead of
 * unusable pickers.
 */
export const ScopeFields: React.FC<Readonly<ScopeFieldsProps>> = ({
  referenceEntries,
  operators,
  wallets,
  users,
  operatorId,
  walletId,
  referenceValues,
  onOperatorChange,
  onWalletChange,
  onReferenceChange,
  scopeBlocked,
}) => {
  const { t } = useTranslation('strategies')

  const referenceLabel = (kind: string): string => {
    if (kind === 'user') return t('launchModal.refUserLabel')
    if (kind === 'operator') return t('launchModal.refOperatorLabel')
    if (kind === 'wallet') return t('launchModal.refWalletLabel')

    return kind
  }

  if (scopeBlocked) {
    return <p className='text-xs text-warning-400'>{t('launchModal.noOperatorsWarning')}</p>
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div>
          <label htmlFor='scope-operator' className='block text-sm font-medium text-muted-700 mb-2'>
            {t('launchModal.operatorLabel')}
          </label>
          <select
            id='scope-operator'
            value={operatorId}
            onChange={e => onOperatorChange(e.target.value)}
            className={SCOPE_SELECT_CLASS}
          >
            <option value=''>{t('launchModal.operatorPlaceholder')}</option>
            {operators.map(operator => (
              <option key={operator.public_id} value={operator.public_id}>
                {operator.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor='scope-wallet' className='block text-sm font-medium text-muted-700 mb-2'>
            {t('launchModal.walletLabel')}
          </label>
          <select
            id='scope-wallet'
            value={walletId}
            onChange={e => onWalletChange(e.target.value)}
            className={SCOPE_SELECT_CLASS}
          >
            <option value=''>{t('launchModal.walletPlaceholder')}</option>
            {wallets.map(wallet => (
              <option key={wallet.public_id} value={wallet.public_id}>
                {`${wallet.label}${wallet.is_paper ? t('launchModal.paperAnnotation') : ''}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {referenceEntries.map(([name, kind]) => (
        <div key={name}>
          <label
            htmlFor={`scope-ref-${name}`}
            className='block text-sm font-medium text-muted-700 mb-2'
          >
            {referenceLabel(kind)}
          </label>
          <select
            id={`scope-ref-${name}`}
            value={referenceValues[name] ?? ''}
            onChange={e => onReferenceChange(name, e.target.value)}
            className={SCOPE_SELECT_CLASS}
          >
            <option value=''>{t('launchModal.referencePlaceholder')}</option>
            {buildReferenceOptions(
              kind,
              operators,
              wallets,
              users,
              t('launchModal.paperAnnotation')
            ).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <p className='text-xs text-muted-400'>{t('launchModal.scopeHelp')}</p>
    </div>
  )
}
