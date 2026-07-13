import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortfolioTruthBanner } from './PortfolioTruthBanner'

describe('PortfolioTruthBanner', () => {
  it('renders the warning when at least one row is not live truth', () => {
    render(<PortfolioTruthBanner visible={true} />)

    expect(screen.getByTestId('portfolio-truth-banner')).toBeInTheDocument()
    expect(screen.getByTestId('portfolio-truth-banner')).toHaveTextContent(
      'Some account data is not live truth'
    )
  })

  it('renders nothing when every row is authoritative', () => {
    render(<PortfolioTruthBanner visible={false} />)

    expect(screen.queryByTestId('portfolio-truth-banner')).not.toBeInTheDocument()
  })
})
