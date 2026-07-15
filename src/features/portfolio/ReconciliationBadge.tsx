import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  deriveReconciliation,
  reconciliationTone,
  type ReconciliationTone,
} from '../../lib/reconciliation'
import type { PortfolioAccountState } from '../../types/api'

interface ReconciliationBadgeProps {
  reconciliation: PortfolioAccountState['reconciliation']
  isClientAuthoritative: boolean
}

const TONE_CLASSES: Readonly<Record<ReconciliationTone, string>> = {
  success: 'bg-rising-500/20 text-rising-600 border-rising-500/40',
  danger: 'bg-loss-500/20 text-loss-600 border-loss-500/40',
  warning: 'bg-warning-500/20 text-warning-600 border-warning-500/40',
  neutral: 'bg-muted-500/20 text-muted-600 border-muted-500/40',
}

/** Compact, fail-closed reconciliation status for a venue-account row. */
export const ReconciliationBadge: React.FC<Readonly<ReconciliationBadgeProps>> = ({
  reconciliation,
  isClientAuthoritative,
}) => {
  const { t } = useTranslation('accounts')
  const presentation = deriveReconciliation(reconciliation, isClientAuthoritative)
  const tone = reconciliationTone(presentation.displayStatus)
  const count = presentation.openDriftMismatchCount ?? 0
  const method = t(`reconciliation.method.${presentation.method}`)
  const label = t(`reconciliation.status.${presentation.displayStatus}`, { count })
  const tooltip = t(`reconciliation.statusTooltip.${presentation.displayStatus}`, {
    method,
    count,
  })

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      data-testid={`reconciliation-badge-${presentation.displayStatus}`}
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  )
}
