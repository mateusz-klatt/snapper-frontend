import React, { useId, useState } from 'react'
import { PencilLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../../lib/dateFormat'
import { useAppStore } from '../../stores/app'
import type { PnlExecutionCorrectionData, PnlExecutionHistoryData } from '../../types/api'

type CorrectionReason = PnlExecutionCorrectionData['reason']

interface Props {
  history: PnlExecutionHistoryData
}

const REASON_LABEL_KEYS = {
  unwitnessed_phantom: 'timeline.executionHistory.reasons.unwitnessed_phantom',
  unwitnessed_legacy_lineage: 'timeline.executionHistory.reasons.unwitnessed_legacy_lineage',
} as const satisfies Record<CorrectionReason, string>

export const ExecutionHistoryBanner: React.FC<Readonly<Props>> = ({ history }) => {
  const { t } = useTranslation('positions')
  const locale = useAppStore(state => state.locale)
  const titleId = useId()
  const detailsId = useId()
  const [showDetails, setShowDetails] = useState(false)

  if (history.status !== 'operator_corrected') return null

  return (
    <section
      className='rounded-2xl border border-warning-500/40 bg-warning-500/10 p-5'
      aria-labelledby={titleId}
      data-testid='pnl-execution-history-banner'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex min-w-0 items-start gap-2'>
          <PencilLine className='mt-0.5 h-4 w-4 shrink-0 text-warning-600' aria-hidden='true' />
          <div className='min-w-0'>
            <h3 id={titleId} className='font-semibold text-alpine-900'>
              {t('timeline.executionHistory.title')}
            </h3>
            <p className='mt-1 text-xs text-muted-500'>{t('timeline.executionHistory.summary')}</p>
          </div>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <span
            className='rounded-full border border-warning-500/40 bg-alpine-50 px-2 py-1 text-xs font-medium text-warning-600'
            data-testid='pnl-execution-history-count'
          >
            {t('timeline.executionHistory.correctionCount', {
              count: history.corrections.length,
            })}
          </span>
          <button
            type='button'
            className='rounded-lg border border-warning-500/40 px-3 py-1.5 text-xs font-medium text-warning-600 transition-colors hover:bg-warning-500/20'
            aria-expanded={showDetails}
            aria-controls={detailsId}
            onClick={() => setShowDetails(current => !current)}
            data-testid='pnl-execution-history-toggle'
          >
            {showDetails
              ? t('timeline.executionHistory.hideDetails')
              : t('timeline.executionHistory.showDetails')}
          </button>
        </div>
      </div>
      {showDetails && (
        <ul id={detailsId} className='mt-4 space-y-2'>
          {history.corrections.map(correction => (
            <li
              key={correction.correction_public_id}
              className='space-y-2 rounded-xl border border-dark-600 bg-alpine-50 px-4 py-3 text-sm'
              data-testid='pnl-execution-history-correction'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-medium text-alpine-900'>
                  {t(REASON_LABEL_KEYS[correction.reason])}
                </span>
                <span className='rounded-full border border-warning-500/40 bg-warning-500/10 px-2 py-0.5 text-xs font-medium text-warning-600'>
                  {t('timeline.executionHistory.scopeSequence', {
                    exchange: correction.exchange,
                    sequence: correction.scope_sequence,
                  })}
                </span>
              </div>
              <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-500'>
                <span data-testid='pnl-execution-history-correction-time'>
                  {t('timeline.executionHistory.correctionTime', {
                    time: formatDateTime(new Date(correction.correction_time), locale),
                  })}
                </span>
              </div>
              <dl className='grid gap-1 text-xs text-muted-500'>
                <div className='flex flex-wrap gap-x-2'>
                  <dt>{t('timeline.executionHistory.targetExecutionId')}</dt>
                  <dd
                    className='break-all font-mono text-muted-600'
                    data-testid='pnl-execution-history-target-id'
                  >
                    {correction.target_execution_public_id}
                  </dd>
                </div>
                <div className='flex flex-wrap gap-x-2'>
                  <dt>{t('timeline.executionHistory.correctionId')}</dt>
                  <dd
                    className='break-all font-mono text-muted-600'
                    data-testid='pnl-execution-history-correction-id'
                  >
                    {correction.correction_public_id}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
