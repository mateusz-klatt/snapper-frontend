import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../../../lib/dateFormat'
import type { AppLocale } from '../../../i18n/types'
import type { SignalDiffEntry } from '../../../types/api'

interface Props {
  entries: SignalDiffEntry[]
}

const formatSignalTime = (iso: string, locale: AppLocale): string =>
  formatDateTime(new Date(iso), locale)

const SignalCard: React.FC<{ signal: SignalDiffEntry }> = ({ signal }) => {
  const { i18n } = useTranslation('backtests')

  return (
    <div className='rounded-lg border border-dark-600 bg-alpine-50 p-2 text-xs'>
      <div className='flex items-center justify-between'>
        <span className='font-mono text-alpine-900'>{signal.instrument}</span>
        <span className='text-muted-500'>
          {formatSignalTime(signal.signal_time, i18n.language as AppLocale)}
        </span>
      </div>
      <div className='mt-1 font-mono text-alpine-900'>{signal.signal_type}</div>
    </div>
  )
}

interface ColumnProps {
  title: string
  entries: SignalDiffEntry[]
  testId: string
}

const Column: React.FC<ColumnProps> = ({ title, entries, testId }) => (
  <div className='space-y-2' data-testid={testId}>
    <h4 className='text-sm font-semibold text-alpine-900'>
      {title} <span className='text-muted-500'>({entries.length})</span>
    </h4>
    {entries.length === 0 ? (
      <div className='text-xs text-muted-500'>—</div>
    ) : (
      entries.map(s => <SignalCard key={`${s.instrument}-${s.signal_time}-${s.leg}`} signal={s} />)
    )}
  </div>
)

/**
 * Signals diff list — three columns split by `entry.leg`
 * (`common`, `a` ↔ only_in_a, `b` ↔ only_in_b). Counts in headers.
 * Schema has only instrument / signal_time / signal_type / leg —
 * NO confidence field.
 */
export const SignalsDiffList: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation('backtests')
  const { common, onlyA, onlyB } = useMemo(() => {
    const c: SignalDiffEntry[] = []
    const a: SignalDiffEntry[] = []
    const b: SignalDiffEntry[] = []

    for (const entry of entries) {
      if (entry.leg === 'common') c.push(entry)
      else if (entry.leg === 'a') a.push(entry)
      else b.push(entry)
    }

    return { common: c, onlyA: a, onlyB: b }
  }, [entries])

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3' data-testid='signals-diff-list'>
      <Column
        title={t('compare.diffColumns.common')}
        entries={common}
        testId='signals-diff-common'
      />
      <Column title={t('compare.diffColumns.onlyA')} entries={onlyA} testId='signals-diff-only-a' />
      <Column title={t('compare.diffColumns.onlyB')} entries={onlyB} testId='signals-diff-only-b' />
    </div>
  )
}
