import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  useBacktestRunsByConfigHash,
  useCreateBacktestComparison,
} from '../../hooks/queries/backtests'
import { useAllTerminalRuns } from './hooks/useAllTerminalRuns'
import { currentHashQuery } from '../../lib/hash/currentHashQuery'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { useAuth } from '../../stores/auth'
import { Permission } from '../../types/permissions.generated'
import type { BacktestCompareBody, BacktestRunData } from '../../types/api'

interface Props {
  currentRun: BacktestRunData
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const SAME_CONFIG_LIMIT = 20

const formatOptionLabel = (t: TFunction<'backtests'>, run: BacktestRunData): string => {
  const statusText = t(`status.${run.status}`, { defaultValue: run.status })

  return t('compare.launcher.optionLabel', {
    id: run.public_id.slice(0, 8),
    strategy: run.strategy_name,
    status: statusText,
  })
}

/**
 * CompareLauncher.
 *
 * Two source modes for the manual combobox: same-config (default) and
 * "all runs" (toggle). Auto-pair fires when at least one same-config
 * sibling exists. Self-compare is blocked client-side. Sources never
 * mix — chip shows which is active.
 */
export const CompareLauncher: React.FC<Props> = ({ currentRun }) => {
  const { t } = useTranslation('backtests')
  const { hasPermission } = useAuth()
  const readOnly = useIsReadOnly()
  const canCreateComparison = hasPermission(Permission.CREATE_BACKTEST_COMPARISONS) && !readOnly
  const isTerminal = TERMINAL_STATUSES.has(currentRun.status)
  const configHash = currentRun.config_hash ?? null
  const sameConfigQuery = useBacktestRunsByConfigHash(
    isTerminal && canCreateComparison ? configHash : null,
    SAME_CONFIG_LIMIT
  )
  const [showAllToggled, setShowAllToggled] = useState(false)
  const showAll = configHash === null ? true : showAllToggled
  const allRunsQuery = useAllTerminalRuns({
    enabled: isTerminal && showAll && canCreateComparison,
  })
  const createCompare = useCreateBacktestComparison()
  const [pickedOther, setPickedOther] = useState<string>('')
  const [clientError, setClientError] = useState<string | null>(null)

  const sameConfigCandidates = useMemo<BacktestRunData[]>(() => {
    const raw = sameConfigQuery.data?.payload ?? []

    return raw.filter(r => TERMINAL_STATUSES.has(r.status) && r.public_id !== currentRun.public_id)
  }, [sameConfigQuery.data, currentRun.public_id])
  const allRunsCandidates = useMemo<BacktestRunData[]>(() => {
    const raw = allRunsQuery.data ?? []

    return raw.filter(r => r.public_id !== currentRun.public_id)
  }, [allRunsQuery.data, currentRun.public_id])
  const comboboxSource = showAll ? allRunsCandidates : sameConfigCandidates
  const comboboxLabel = showAll
    ? t('compare.launcher.source.allRuns')
    : t('compare.launcher.source.sameConfig')
  const autoPairCandidate = sameConfigCandidates[0]

  if (!canCreateComparison) return null

  if (!isTerminal) {
    return (
      <div className='rounded-lg border border-dark-600 bg-alpine-50 p-3 text-sm text-muted-500'>
        {t('compare.launcher.terminalGate')}
      </div>
    )
  }

  const submit = (mode: 'auto' | 'manual', other: BacktestRunData) => {
    if (!hasPermission(Permission.CREATE_BACKTEST_COMPARISONS) || readOnly) return

    setClientError(null)
    const body: BacktestCompareBody =
      mode === 'auto'
        ? {
            mode: 'auto',
            config_hash: configHash,
            anchor_run_public_id: currentRun.public_id,
          }
        : {
            mode: 'manual',
            run_a_public_id: currentRun.public_id,
            run_b_public_id: other.public_id,
          }

    createCompare.mutate(body, {
      onSuccess: response => {
        globalThis.location.hash = `#backtests/compare/${response.payload.public_id}${currentHashQuery()}`
      },
    })
  }

  const handleManual = () => {
    const picked = comboboxSource.find(r => r.public_id === pickedOther)

    if (!picked) {
      setClientError(t('compare.launcher.errors.pickRequired'))

      return
    }

    submit('manual', picked)
  }

  return (
    <div className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-3 text-sm'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold text-alpine-900'>{t('compare.launcher.title')}</h3>
        <span
          className='rounded bg-dark-600 px-2 py-0.5 text-xs text-muted-400'
          data-testid='compare-source-chip'
        >
          {comboboxLabel}
        </span>
      </div>
      {configHash !== null && autoPairCandidate !== undefined && (
        <button
          type='button'
          onClick={() => submit('auto', autoPairCandidate)}
          className='rounded-lg border border-brand-500 px-3 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-900/20'
          data-testid='compare-auto-pair'
        >
          {t('compare.launcher.autoPair')}
        </button>
      )}
      {configHash !== null && sameConfigCandidates.length === 0 && (
        <div className='text-xs text-muted-500' data-testid='compare-no-siblings'>
          {t('compare.launcher.noSiblings')}
        </div>
      )}
      {sameConfigCandidates.length >= SAME_CONFIG_LIMIT && (
        <div className='text-xs text-muted-500'>
          {t('compare.launcher.limitNotice', { count: SAME_CONFIG_LIMIT })}
        </div>
      )}
      <div className='flex items-center gap-2'>
        <select
          className='flex-1 rounded-lg border border-dark-600 bg-alpine-50 px-2 py-1 text-xs text-alpine-900'
          value={pickedOther}
          onChange={e => setPickedOther(e.target.value)}
          data-testid='compare-combobox'
        >
          <option value=''>{t('compare.launcher.pickPlaceholder')}</option>
          {comboboxSource.map(r => (
            <option key={r.public_id} value={r.public_id}>
              {formatOptionLabel(t, r)}
            </option>
          ))}
        </select>
        <button
          type='button'
          onClick={handleManual}
          className='rounded-lg border border-brand-500 px-3 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-900/20'
          data-testid='compare-manual-submit'
        >
          {t('compare.launcher.submit')}
        </button>
      </div>
      {configHash !== null && (
        <label className='flex items-center gap-2 text-xs text-muted-500'>
          <input
            type='checkbox'
            checked={showAllToggled}
            onChange={e => {
              setShowAllToggled(e.target.checked)
              setPickedOther('')
            }}
            data-testid='compare-show-all'
          />
          <span>{t('compare.launcher.showAllLabel')}</span>
        </label>
      )}
      {clientError && (
        <div className='text-xs text-loss-400' data-testid='compare-client-error'>
          {clientError}
        </div>
      )}
    </div>
  )
}
