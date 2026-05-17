import React from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeSelect } from './ThemeSelect'
import { useAppStore } from '../stores/app'
import { useOperators } from '../hooks/queries/wallets'
import type { OperatorInfo } from '../types/api'

export const OperatorPicker: React.FC = () => {
  const { t } = useTranslation('common')
  const currentId = useAppStore(s => s.currentOperatorPublicId)
  const setId = useAppStore(s => s.setCurrentOperatorPublicId)
  const { data } = useOperators()
  const operators: OperatorInfo[] = data?.payload ?? []
  const options = [
    { value: '__all__', label: t('chrome.operatorPicker.allOperators') },
    ...operators.map(op => ({ value: op.public_id, label: op.label })),
  ]

  return (
    <ThemeSelect
      id='operator-picker'
      ariaLabel={t('chrome.operatorPicker.ariaLabel')}
      value={currentId ?? '__all__'}
      onChange={v => setId(v === '__all__' ? null : v)}
      options={options}
      placeholder={t('chrome.operatorPicker.placeholder')}
      className='w-56'
    />
  )
}
