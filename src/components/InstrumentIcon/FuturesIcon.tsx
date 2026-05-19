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

const GLYPH_CELL_GAP_PX = 2

export function FuturesIcon({
  base,
  quote,
  quarter,
  monthInQuarter,
  size = 28,
  borderColor = 'var(--background, #fff)',
}: Readonly<FuturesIconProps>): React.ReactElement {
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: GLYPH_CELL_GAP_PX,
    flexShrink: 0,
    lineHeight: 0,
    height: size,
  }
  const glyphCellStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `2px solid ${borderColor}`,
    boxSizing: 'border-box',
    background: 'var(--background, #fff)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(size * 0.6),
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
      <span style={glyphCellStyle} aria-hidden='true' data-testid='futures-quarter-glyph'>
        {seasonGlyph}
      </span>
      <span style={glyphCellStyle} aria-hidden='true' data-testid='futures-month-glyph'>
        {monthInQuarter}
      </span>
    </span>
  )
}
