import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../lib/dateFormat'
import { Badge } from './ui'

interface StaleMarkBadgeProps {
  markAsOf: Date | null | undefined
}

export function StaleMarkBadge({ markAsOf }: Readonly<StaleMarkBadgeProps>) {
  const { t, i18n } = useTranslation('positions')
  const label = t('markStatus.stale')
  const markTime =
    markAsOf && Number.isFinite(markAsOf.getTime())
      ? t('markStatus.asOf', { time: formatDateTime(markAsOf, i18n.language) })
      : null

  return (
    <span className='ms-2 inline-flex align-middle' title={markTime ?? label}>
      <Badge variant='secondary' className='whitespace-nowrap font-sans'>
        {label}
        {markTime && <span className='sr-only'>{` ${markTime}`}</span>}
      </Badge>
    </span>
  )
}
