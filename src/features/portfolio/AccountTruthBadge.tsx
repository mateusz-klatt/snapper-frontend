import React from 'react'
import { useTranslation } from 'react-i18next'
import { statusTone, type StatusTone } from '../../lib/accountTruth'

interface AccountTruthBadgeProps {
  /** The client-effective status (already demoted for expiry/polling). */
  status: string
}

const TONE_CLASSES: Readonly<Record<StatusTone, string>> = {
  authoritative: 'bg-rising-500/20 text-rising-600 border-rising-500/40',
  simulated: 'bg-info-500/20 text-info-600 border-info-500/40',
  stale: 'bg-warning-500/20 text-warning-600 border-warning-500/40',
  corrupt: 'bg-loss-500/20 text-loss-600 border-loss-500/40',
  unsupported: 'bg-muted-500/20 text-muted-600 border-muted-500/40',
  unknown: 'bg-muted-500/20 text-muted-600 border-muted-500/40',
}

type StatusKeySuffix =
  | 'observed'
  | 'simulated'
  | 'stale'
  | 'clockError'
  | 'corrupt'
  | 'unsupported'
  | 'notApplicable'
  | 'unknown'

/**
 * i18n key suffix for each recognised status; anything else is ``unknown`` so
 * an unrecognised/forged status can never borrow an authoritative label.
 */
const STATUS_KEY: Readonly<Record<string, StatusKeySuffix>> = {
  observed: 'observed',
  simulated: 'simulated',
  stale: 'stale',
  clock_error: 'clockError',
  corrupt: 'corrupt',
  error: 'corrupt',
  unsupported: 'unsupported',
  not_applicable: 'notApplicable',
}

const keySuffixFor = (status: string): StatusKeySuffix => STATUS_KEY[status] ?? 'unknown'

/**
 * Status pill for a venue-account row.
 *
 * Colour tone and copy are both derived from the CLIENT-effective status, so a
 * row demoted by authority expiry or polling failure reads exactly as stale —
 * never as live truth.
 */
export const AccountTruthBadge: React.FC<Readonly<AccountTruthBadgeProps>> = ({ status }) => {
  const { t } = useTranslation('accounts')
  const suffix = keySuffixFor(status)
  const tone = statusTone(status)

  return (
    <span
      title={t(`statusTooltip.${suffix}`)}
      aria-label={t(`statusTooltip.${suffix}`)}
      data-testid={`account-truth-badge-${suffix}`}
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {t(`status.${suffix}`)}
    </span>
  )
}
