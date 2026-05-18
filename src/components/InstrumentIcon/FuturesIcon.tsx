import type { CSSProperties } from 'react'
import { PairIcon } from './PairIcon'
import { SingleAssetIcon } from './SingleAssetIcon'
import type { FuturesQuarter, IconSpec } from './types'

type FuturesIconProps = {
  readonly base: IconSpec
  readonly quote?: IconSpec | undefined
  readonly quarter: FuturesQuarter
  readonly monthInQuarter: 1 | 2 | 3
  readonly size?: number | undefined
  readonly borderColor?: string | undefined
}

const SEASON_GLYPH_BY_QUARTER: Record<FuturesQuarter, string> = {
  1: '🌸',
  2: '☀️',
  3: '🍂',
  4: '❄️',
}

export function FuturesIcon({
  base,
  quote,
  quarter,
  monthInQuarter,
  size = 28,
  borderColor,
}: Readonly<FuturesIconProps>): React.ReactElement {
  const overlayFontSize = Math.max(8, Math.round(size * 0.42))
  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    flexShrink: 0,
    lineHeight: 0,
  }
  const overlayStyle: CSSProperties = {
    position: 'absolute',
    right: -2,
    bottom: -2,
    zIndex: 3,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    padding: '0 2px',
    background: 'var(--background, #fff)',
    borderRadius: 4,
    fontSize: overlayFontSize,
    lineHeight: 1,
    fontWeight: 600,
  }
  const seasonGlyph = SEASON_GLYPH_BY_QUARTER[quarter]

  return (
    <span style={containerStyle} data-testid='futures-icon'>
      {quote === undefined ? (
        <SingleAssetIcon spec={base} size={size} />
      ) : (
        <PairIcon base={base} quote={quote} size={size} borderColor={borderColor} />
      )}
      <span style={overlayStyle} aria-hidden='true' data-testid='futures-expiry-overlay'>
        <span>{seasonGlyph}</span>
        <span>{monthInQuarter}</span>
      </span>
    </span>
  )
}
