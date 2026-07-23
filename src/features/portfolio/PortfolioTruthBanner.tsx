import React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

interface PortfolioTruthBannerProps {
  /** Whether at least one rendered account row is NOT authoritative live truth. */
  visible: boolean
}

/**
 * Page-level warning shown whenever any venue-account row is not authoritative
 * live truth (simulated, stale, expired, corrupt, or unavailable).
 *
 * Fail-closed framing: it tells the operator up front that non-``Live`` rows
 * are last-known/simulated/unavailable data, so a demoted snapshot is never
 * silently mistaken for a real venue balance.
 */
export const PortfolioTruthBanner: React.FC<Readonly<PortfolioTruthBannerProps>> = ({
  visible,
}) => {
  const { t } = useTranslation('accounts')

  if (!visible) return null

  return (
    <output
      data-testid='portfolio-truth-banner'
      className='flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 px-4 py-3 text-warning-600'
    >
      <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
      <span>
        <span className='block text-sm font-medium'>{t('banner.title')}</span>
        <span className='block text-xs'>{t('banner.message')}</span>
      </span>
    </output>
  )
}
