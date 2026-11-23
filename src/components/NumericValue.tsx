import React from 'react'
import clsx from 'clsx'
import type { FormattedNumber } from '../lib/numberFormat'

interface Props {
  formatted: FormattedNumber
  className?: string
}

/** Fixed-width digits, with the exact magnitude available when rounding hides it. */
export const NumericValue: React.FC<Props> = ({ formatted, className }) => (
  <span className={clsx('tabular-nums', className)} title={formatted.title ?? undefined}>
    {formatted.text}
  </span>
)
