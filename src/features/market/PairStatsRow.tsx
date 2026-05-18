import { useTranslation } from 'react-i18next'
import { InstrumentIcon } from '../../components/InstrumentIcon'
import { useAllConfiguredPairStats } from '../../hooks/queries/market'
import type { CachedStatsPayload } from '../../types/api'

interface Props {
  selectedExchange: string | null
  selectedInstrument: string | null
  onSelect: (selection: { exchange: string; symbol: string }) => void
}

interface PairChip {
  readonly otherExchange: string
  readonly otherSymbol: string
  readonly stats: CachedStatsPayload
}

const COINTEGRATION_P_THRESHOLD = 0.05

const splitPairKey = (key: string): { exchange: string; symbol: string } | null => {
  const idx = key.indexOf(':')

  if (idx <= 0) return null

  return { exchange: key.slice(0, idx), symbol: key.slice(idx + 1) }
}

const formatPearson = (r: number | null): string => {
  if (r === null) return '—'

  const sign = r >= 0 ? '+' : '−'
  const abs = Math.abs(r).toFixed(2)

  return `${sign}${abs}`
}

const formatPValue = (p: number | null): string => {
  if (p === null) return '—'
  if (p < 0.001) return '<0.001'

  return p.toFixed(3)
}

const isCointegrated = (p: number | null): boolean => p !== null && p < COINTEGRATION_P_THRESHOLD

const pearsonMagnitude = (r: number | null): number => {
  if (r === null) return 0

  return Math.abs(r)
}

const pvalueForSort = (p: number | null): number => {
  if (p === null) return Number.POSITIVE_INFINITY

  return p
}

const comparePairChips = (a: PairChip, b: PairChip): number => {
  const aP = pvalueForSort(a.stats.coint_pvalue)
  const bP = pvalueForSort(b.stats.coint_pvalue)

  if (aP !== bP) return aP - bP

  return pearsonMagnitude(b.stats.pearson_r) - pearsonMagnitude(a.stats.pearson_r)
}

const resolveBorderClass = (cointegrated: boolean, isWarm: boolean): string => {
  if (cointegrated) return 'border-accent-500 hover:bg-accent-50'
  if (isWarm) return 'border-dark-600 hover:bg-dark-700'

  return 'border-dark-700 opacity-60'
}

const buildChips = (pairs: readonly CachedStatsPayload[], selfKey: string): PairChip[] => {
  const chips: PairChip[] = []

  for (const stats of pairs) {
    let otherKey: string | null = null

    if (stats.left === selfKey) {
      otherKey = stats.right
    } else if (stats.right === selfKey) {
      otherKey = stats.left
    }

    if (otherKey === null) continue

    const parsed = splitPairKey(otherKey)

    if (parsed === null) continue

    chips.push({
      otherExchange: parsed.exchange,
      otherSymbol: parsed.symbol,
      stats,
    })
  }

  chips.sort(comparePairChips)

  return chips
}

export function PairStatsRow({ selectedExchange, selectedInstrument, onSelect }: Readonly<Props>) {
  const { t } = useTranslation('market')
  const { data } = useAllConfiguredPairStats()

  if (selectedExchange === null || selectedInstrument === null) {
    return null
  }

  if (data === undefined) {
    return null
  }

  const selfKey = `${selectedExchange}:${selectedInstrument}`
  const chips = buildChips(data.payload.pairs, selfKey)

  if (chips.length === 0) {
    return null
  }

  return (
    <div
      className='flex flex-wrap items-center gap-2 overflow-x-auto px-3 py-2'
      data-testid='pair-stats-row'
    >
      <span className='text-xs text-muted-500 mr-1'>{t('pairStats.label')}</span>
      {chips.map(chip => {
        const cointegrated = isCointegrated(chip.stats.coint_pvalue)
        const baseClass =
          'inline-flex items-center gap-1 bg-alpine-50 border rounded-sm px-2 py-1 text-xs text-alpine-900'
        const borderClass = resolveBorderClass(cointegrated, chip.stats.is_warm)
        const ariaLabel = t('pairStats.chipAriaLabel', {
          symbol: chip.otherSymbol,
          exchange: chip.otherExchange,
          pearson: formatPearson(chip.stats.pearson_r),
          pvalue: formatPValue(chip.stats.coint_pvalue),
        })

        return (
          <button
            key={`${chip.otherExchange}:${chip.otherSymbol}`}
            type='button'
            onClick={() => onSelect({ exchange: chip.otherExchange, symbol: chip.otherSymbol })}
            aria-label={ariaLabel}
            className={`${baseClass} ${borderClass}`}
          >
            <InstrumentIcon symbol={chip.otherSymbol} exchange={chip.otherExchange} size={14} />
            <span>{chip.otherSymbol}</span>
            <span className='text-muted-500'>
              {t('pairStats.metric', {
                pearson: formatPearson(chip.stats.pearson_r),
                pvalue: formatPValue(chip.stats.coint_pvalue),
              })}
            </span>
            {cointegrated && (
              <span className='text-accent-700' aria-hidden='true'>
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
