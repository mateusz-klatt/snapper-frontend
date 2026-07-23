import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { PnlInstrumentContributionData, PnlTimelinePointData } from '../../types/api'
import { formatPnlInstrumentIdentity } from './pnlInstrumentIdentity'

type IncompletenessReasonData = PnlTimelinePointData['incompleteness_reasons'][number]
type IncompletenessReason = IncompletenessReasonData['reason']
type WithholdingScope = IncompletenessReasonData['withholding_scope']
type WithholdingTier = IncompletenessReasonData['withholding_tier']

interface Props {
  points: readonly PnlTimelinePointData[]
}

interface ReasonGroup {
  reason: IncompletenessReasonData
  affectedPointCount: number
  triggerContribution: PnlInstrumentContributionData | null
}

const REASON_LABEL_KEYS = {
  scope_order_regression: 'timeline.incompleteness.reasons.scope_order_regression',
  before_activation: 'timeline.incompleteness.reasons.before_activation',
  activation_baseline_non_finite: 'timeline.incompleteness.reasons.activation_baseline_non_finite',
  fill_evidence_gap: 'timeline.incompleteness.reasons.fill_evidence_gap',
  seed_quantity_non_finite: 'timeline.incompleteness.reasons.seed_quantity_non_finite',
  cost_basis_unavailable: 'timeline.incompleteness.reasons.cost_basis_unavailable',
  execution_price_provenance_unproven:
    'timeline.incompleteness.reasons.execution_price_provenance_unproven',
  execution_size_invalid: 'timeline.incompleteness.reasons.execution_size_invalid',
  execution_price_invalid: 'timeline.incompleteness.reasons.execution_price_invalid',
  fx_conversion_unproven: 'timeline.incompleteness.reasons.fx_conversion_unproven',
  mark_unavailable: 'timeline.incompleteness.reasons.mark_unavailable',
  cumulative_non_finite: 'timeline.incompleteness.reasons.cumulative_non_finite',
  unrealized_non_finite: 'timeline.incompleteness.reasons.unrealized_non_finite',
  net_non_finite: 'timeline.incompleteness.reasons.net_non_finite',
  attribution_value_non_finite: 'timeline.incompleteness.reasons.attribution_value_non_finite',
  attribution_reconciliation_failed:
    'timeline.incompleteness.reasons.attribution_reconciliation_failed',
  instrument_reconciliation_failed:
    'timeline.incompleteness.reasons.instrument_reconciliation_failed',
  late_pre_activation_execution: 'timeline.incompleteness.reasons.late_pre_activation_execution',
} as const satisfies Record<IncompletenessReason, string>

const SCOPE_LABEL_KEYS = {
  global: 'timeline.incompleteness.scope.global',
  instrument: 'timeline.incompleteness.scope.instrument',
} as const satisfies Record<WithholdingScope, string>

const TIER_LABEL_KEYS = {
  mark_incomplete: 'timeline.incompleteness.tier.mark_incomplete',
  untrusted: 'timeline.incompleteness.tier.untrusted',
} as const satisfies Record<WithholdingTier, string>

const TIER_CLASSES = {
  mark_incomplete: 'border-warning-500/40 bg-warning-500/10 text-warning-600',
  untrusted: 'border-loss-500/40 bg-loss-500/10 text-loss-600',
} as const satisfies Record<WithholdingTier, string>

const SCOPE_SORT_KEYS = {
  global: '0',
  instrument: '1',
} as const satisfies Record<WithholdingScope, string>

const TIER_SORT_KEYS = {
  mark_incomplete: '0',
  untrusted: '1',
} as const satisfies Record<WithholdingTier, string>

const sameReasonIdentity = (
  left: IncompletenessReasonData,
  right: IncompletenessReasonData
): boolean =>
  left.withholding_scope === right.withholding_scope &&
  left.trigger_instrument_public_id === right.trigger_instrument_public_id &&
  left.withholding_tier === right.withholding_tier &&
  left.reason === right.reason

const reasonSortKey = (reason: IncompletenessReasonData): string =>
  [
    SCOPE_SORT_KEYS[reason.withholding_scope],
    reason.trigger_instrument_public_id ?? '',
    TIER_SORT_KEYS[reason.withholding_tier],
    reason.reason,
  ].join('\u0000')

const reasonRenderKey = (reason: IncompletenessReasonData): string =>
  [
    reason.withholding_scope,
    reason.trigger_instrument_public_id,
    reason.withholding_tier,
    reason.reason,
  ]
    .map(value => (value === null ? 'N' : `S${value.length}:${value}`))
    .join('')

const groupReasons = (points: readonly PnlTimelinePointData[]): ReasonGroup[] => {
  const groups: ReasonGroup[] = []

  for (const point of points) {
    const reasonsAtPoint: IncompletenessReasonData[] = []

    for (const reason of point.incompleteness_reasons) {
      if (reasonsAtPoint.some(candidate => sameReasonIdentity(candidate, reason))) continue
      reasonsAtPoint.push(reason)

      const triggerContribution =
        reason.trigger_instrument_public_id === null
          ? null
          : (point.per_instrument.find(
              contribution =>
                contribution.instrument_public_id === reason.trigger_instrument_public_id
            ) ?? null)
      const group = groups.find(candidate => sameReasonIdentity(candidate.reason, reason))

      if (group === undefined) {
        groups.push({ reason, affectedPointCount: 1, triggerContribution })
      } else {
        group.affectedPointCount += 1

        if (group.triggerContribution === null && triggerContribution !== null) {
          group.triggerContribution = triggerContribution
        }
      }
    }
  }

  return groups.sort((left, right) =>
    reasonSortKey(left.reason).localeCompare(reasonSortKey(right.reason), 'en')
  )
}

export const IncompletenessSummary: React.FC<Readonly<Props>> = ({ points }) => {
  const { t } = useTranslation('positions')
  const titleId = useId()
  const incompletePointCount = points.filter(
    point => point.valuation_status === 'incomplete'
  ).length

  if (incompletePointCount === 0) return null

  const groups = groupReasons(points)

  return (
    <section
      className='rounded-2xl border border-warning-500/40 bg-warning-500/10 p-5'
      aria-labelledby={titleId}
      data-testid='pnl-incompleteness-summary'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 id={titleId} className='font-semibold text-alpine-900'>
            {t('timeline.incompleteness.title')}
          </h3>
          <p className='mt-1 text-xs text-muted-500'>{t('timeline.incompleteness.description')}</p>
        </div>
        <span
          className='rounded-full border border-warning-500/40 bg-alpine-50 px-2 py-1 text-xs font-medium text-warning-600'
          data-testid='pnl-incomplete-badge'
        >
          {t('timeline.incompleteBadge', { count: incompletePointCount })}
        </span>
      </div>
      <ul className='mt-4 space-y-2'>
        {groups.map(group => {
          const triggerInstrumentPublicId = group.reason.trigger_instrument_public_id
          const triggerInstrument =
            group.triggerContribution === null
              ? triggerInstrumentPublicId
              : formatPnlInstrumentIdentity(group.triggerContribution)

          return (
            <li
              key={reasonRenderKey(group.reason)}
              className='flex flex-wrap items-start justify-between gap-3 rounded-xl border border-dark-600 bg-alpine-50 px-4 py-3 text-sm'
              data-testid='pnl-incompleteness-group'
            >
              <div className='min-w-0 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium text-alpine-900'>
                    {t(REASON_LABEL_KEYS[group.reason.reason])}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_CLASSES[group.reason.withholding_tier]}`}
                  >
                    {t(TIER_LABEL_KEYS[group.reason.withholding_tier])}
                  </span>
                </div>
                <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-500'>
                  <span>{t(SCOPE_LABEL_KEYS[group.reason.withholding_scope])}</span>
                  {triggerInstrumentPublicId !== null && (
                    <span className='break-all font-mono'>
                      {t('timeline.incompleteness.triggerInstrument', {
                        instrument: triggerInstrument,
                      })}
                    </span>
                  )}
                </div>
              </div>
              <span className='shrink-0 text-xs font-medium text-muted-600'>
                {t('timeline.incompleteness.affectedPoints', {
                  count: group.affectedPointCount,
                })}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
