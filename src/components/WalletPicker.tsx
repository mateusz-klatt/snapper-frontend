import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeSelect } from './ThemeSelect'
import { useAppStore } from '../stores/app'
import { useWallets } from '../hooks/queries/wallets'
import type { WalletInfo } from '../types/api'
import { LoadingSpinner } from './ui'

export const WalletPicker: React.FC = () => {
  const { t } = useTranslation('common')
  const currentId = useAppStore(s => s.currentWalletPublicId)
  const selectWalletAndRefresh = useAppStore(s => s.selectWalletAndRefresh)
  const selectionVersion = useRef(0)
  const confirmedScopeVersion = useRef(0)
  const [pendingValue, setPendingValue] = useState<string | null>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const { data } = useWallets()
  const wallets: WalletInfo[] = data?.payload ?? []
  const options = [
    { value: '__all__', label: t('chrome.walletPicker.allWallets') },
    ...wallets.map(w => ({
      value: w.public_id,
      label: w.is_paper ? t('chrome.walletPicker.optionPaper', { label: w.label }) : w.label,
    })),
  ]

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (
        state.currentWalletPublicId !== previous.currentWalletPublicId ||
        state.currentOperatorPublicId !== previous.currentOperatorPublicId ||
        state.asOf !== previous.asOf
      ) {
        confirmedScopeVersion.current += 1
        setSelectionFailed(false)
      }
    })

    return () => {
      selectionVersion.current += 1
      unsubscribe()
    }
  }, [])

  const selectWallet = async (value: string): Promise<void> => {
    const version = ++selectionVersion.current
    const scopeVersion = confirmedScopeVersion.current

    setPendingValue(value)
    setSelectionFailed(false)

    try {
      await selectWalletAndRefresh(value === '__all__' ? null : value)
    } catch {
      if (version === selectionVersion.current && scopeVersion === confirmedScopeVersion.current) {
        setSelectionFailed(true)
      }
    } finally {
      if (version === selectionVersion.current) setPendingValue(null)
    }
  }

  return (
    <div className='flex items-center gap-2' aria-busy={pendingValue !== null}>
      <ThemeSelect
        id='wallet-picker'
        ariaLabel={t('chrome.walletPicker.ariaLabel')}
        value={pendingValue ?? currentId ?? '__all__'}
        onChange={value => {
          void selectWallet(value)
        }}
        options={options}
        placeholder={t('chrome.walletPicker.placeholder')}
        className='w-44'
      />
      {pendingValue !== null && <LoadingSpinner size='sm' />}
      {selectionFailed && <span role='alert'>{t('error')}</span>}
    </div>
  )
}
