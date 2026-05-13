import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CacheWarmingBanner } from './CacheWarmingBanner'

describe('CacheWarmingBanner', () => {
  it('renders nothing when the cache is warm', () => {
    const { container } = render(
      <CacheWarmingBanner isWarm={true} sampleCount={100} expected={100} source='cache' />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows sample count and expected total when cold', () => {
    render(<CacheWarmingBanner isWarm={false} sampleCount={40} expected={100} source='cache' />)
    expect(screen.getByRole('status')).toHaveTextContent('40 / 100 candles')
  })

  it('annotates derived source with the "derived from 1m" hint', () => {
    render(<CacheWarmingBanner isWarm={false} sampleCount={3} expected={20} source='derived' />)
    expect(screen.getByRole('status')).toHaveTextContent('(derived from 1m)')
  })

  it('annotates db fallback with the "from DB" hint', () => {
    render(<CacheWarmingBanner isWarm={false} sampleCount={5} expected={24} source='db' />)
    expect(screen.getByRole('status')).toHaveTextContent('(from DB)')
  })
})
