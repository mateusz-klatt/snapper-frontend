import type { CSSProperties } from 'react'
import { RemoteSvg } from './RemoteSvg'
import { CIRCLE_FLAGS_CDN, CRYPTO_ICONS_CDN, isVendored } from './iconLookup'
import { SingleAssetIcon } from './SingleAssetIcon'
import type { IconSpec } from './types'

type PairIconProps = {
  base: IconSpec
  quote: IconSpec
  size?: number | undefined
  borderColor?: string | undefined
}

const SIDE_BY_SIDE_GAP_PX = 2

export function PairIcon({
  base,
  quote,
  size = 28,
  borderColor = 'var(--background, #fff)',
}: Readonly<PairIconProps>): React.ReactElement {
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SIDE_BY_SIDE_GAP_PX,
    flexShrink: 0,
    lineHeight: 0,
    height: size,
  }
  const cellStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `2px solid ${borderColor}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <span
      style={containerStyle}
      aria-label={`${describeIcon(base)} / ${describeIcon(quote)}`}
      role='img'
    >
      <span style={cellStyle}>{renderCircle(base, size - 4)}</span>
      <span style={cellStyle}>{renderCircle(quote, size - 4)}</span>
    </span>
  )
}

function renderCircle(spec: IconSpec, innerSize: number): React.ReactElement {
  if (spec.kind === 'crypto') {
    return (
      <RemoteSvg
        src={`${CRYPTO_ICONS_CDN}/${spec.symbol}.svg`}
        label={spec.symbol.toUpperCase()}
        size={innerSize}
        vendored={isVendored('crypto', spec.symbol)}
      />
    )
  }

  if (spec.kind === 'flag') {
    return (
      <RemoteSvg
        src={`${CIRCLE_FLAGS_CDN}/${spec.country}.svg`}
        label={spec.country.toUpperCase()}
        size={innerSize}
        vendored={isVendored('flag', spec.country)}
      />
    )
  }

  return <SingleAssetIcon spec={spec} size={innerSize} />
}

function describeIcon(spec: IconSpec): string {
  if (spec.kind === 'crypto') {
    return spec.symbol.toUpperCase()
  }

  if (spec.kind === 'flag') {
    return spec.country.toUpperCase()
  }

  if (spec.kind === 'lucide') {
    return spec.name
  }

  return spec.label
}
