import React from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeSelect } from './ThemeSelect'
import { useAppStore } from '../stores/app'
import { useWallets } from '../hooks/queries/wallets'
import type { WalletInfo } from '../types/api'

export const WalletPicker: React.FC = () => {
  const { t } = useTranslation('common')
  const currentId = useAppStore(s => s.currentWalletPublicId)
  const selectWalletAndRefresh = useAppStore(s => s.selectWalletAndRefresh)
  const { data } = useWallets()
  const wallets: WalletInfo[] = data?.payload ?? []
  const options = [
    { value: '__all__', label: t('chrome.walletPicker.allWallets') },
    ...wallets.map(w => ({
      value: w.public_id,
      label: w.is_paper ? t('chrome.walletPicker.optionPaper', { label: w.label }) : w.label,
    })),
  ]

  return (
    <ThemeSelect
      id='wallet-picker'
      ariaLabel={t('chrome.walletPicker.ariaLabel')}
      value={currentId ?? '__all__'}
      onChange={v => {
        void selectWalletAndRefresh(v === '__all__' ? null : v)
      }}
      options={options}
      placeholder={t('chrome.walletPicker.placeholder')}
      className='w-44'
    />
  )
}
