interface Props {
  /** True when the cache has served the full requested limit (no banner shown). */
  isWarm: boolean
  /** Number of candles the cache returned. */
  sampleCount: number
  /** Number of candles the user requested. */
  expected: number
  /** Path the response took — surfaced in a small caption when not "cache". */
  source: 'cache' | 'derived' | 'db'
}

/**
 * Renders a thin "warming up" banner when the cache has fewer candles
 * than the chart requested. Hidden when ``isWarm === true`` so the
 * chart canvas does not see a layout shift once the cache catches up.
 */
export function CacheWarmingBanner({ isWarm, sampleCount, expected, source }: Readonly<Props>) {
  if (isWarm) {
    return null
  }

  const sourceLabel =
    source === 'derived' ? '(derived from 1m)' : source === 'db' ? '(from DB)' : ''

  return (
    <div
      role='status'
      aria-live='polite'
      className='flex items-center justify-between px-3 py-1 text-xs text-amber-700 bg-amber-50 border-b border-amber-200'
    >
      <span>
        Cache warming up: {sampleCount} / {expected} candles available {sourceLabel}
      </span>
      <span className='font-mono text-[10px] opacity-70'>{source}</span>
    </div>
  )
}
