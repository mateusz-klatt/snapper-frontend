import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountTruthBadge } from './AccountTruthBadge'

describe('AccountTruthBadge', () => {
  it.each([
    ['observed', 'observed', 'Live'],
    ['simulated', 'simulated', 'Simulated'],
    ['stale', 'stale', 'Stale'],
    ['clock_error', 'clockError', 'Clock error'],
    ['corrupt', 'corrupt', 'Unverified'],
    ['error', 'corrupt', 'Unverified'],
    ['unsupported', 'unsupported', 'Unavailable'],
    ['not_applicable', 'notApplicable', 'Not applicable'],
    ['something-forged', 'unknown', 'Unknown'],
  ])('renders %s as the %s badge', (status, suffix, label) => {
    render(<AccountTruthBadge status={status} />)
    const badge = screen.getByTestId(`account-truth-badge-${suffix}`)

    expect(badge).toHaveTextContent(label)
    expect(badge.getAttribute('aria-label')).not.toBe('')
  })

  it('paints the authoritative tone only for observed', () => {
    const { rerender } = render(<AccountTruthBadge status='observed' />)

    expect(screen.getByTestId('account-truth-badge-observed').className).toContain('rising')

    rerender(<AccountTruthBadge status='stale' />)

    expect(screen.getByTestId('account-truth-badge-stale').className).toContain('warning')
  })
})
