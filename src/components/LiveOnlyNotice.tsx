import React from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { useAppStore } from '../stores/app'

export const LiveOnlyNotice: React.FC = () => {
  const { t } = useTranslation('common')
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)

  if (!isTimeTraveling) return null

  return (
    <div className='flex items-center gap-2 px-4 py-2 mb-4 rounded-lg bg-info-50 border border-info-200 text-info-700 text-sm'>
      <Info className='w-4 h-4 shrink-0' />
      <span>{t('chrome.liveOnly.notice')}</span>
    </div>
  )
}
