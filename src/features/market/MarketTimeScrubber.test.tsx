import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MarketTimeScrubber } from './MarketTimeScrubber'
import { useAppStore } from '../../stores/app'

describe('MarketTimeScrubber', () => {
  beforeEach(() => {
    useAppStore.setState({ locale: 'us' })
    vi.clearAllMocks()
  })

  it('marks the live preset active when value is null', () => {
    render(<MarketTimeScrubber value={null} onChange={vi.fn()} />)
    const liveButton = screen.getByRole('button', { name: 'Live' })

    expect(liveButton).toBeInTheDocument()
    expect(liveButton.className).toContain('bg-brand-500')
  })

  it('shows a formatted timestamp and deactivates the live preset when replaying', () => {
    render(<MarketTimeScrubber value={Date.parse('2026-03-15T10:00:00Z')} onChange={vi.fn()} />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Live' }).className).not.toContain('bg-brand-500')
  })

  it('rewinds to a past midpoint when a relative preset is clicked', () => {
    const onChange = vi.fn()

    render(<MarketTimeScrubber value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '-1d' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const arg = onChange.mock.calls[0]?.[0] as number | null

    expect(typeof arg).toBe('number')
    expect(arg).toBeLessThan(Date.now())
  })

  it('returns to live when the live preset is clicked', () => {
    const onChange = vi.fn()

    render(<MarketTimeScrubber value={Date.parse('2026-03-15T10:00:00Z')} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('sets a replay instant when the slider is dragged into the past', () => {
    const onChange = vi.fn()

    render(<MarketTimeScrubber value={null} onChange={onChange} />)
    const slider = screen.getByRole('slider') as HTMLInputElement
    const past = String(Number(slider.max) - 5 * 24 * 60 * 60 * 1000)

    fireEvent.change(slider, { target: { value: past } })
    expect(onChange).toHaveBeenCalledWith(Number(past))
  })

  it('snaps back to live when the slider reaches the right edge', () => {
    const onChange = vi.fn()

    render(<MarketTimeScrubber value={Date.parse('2026-03-15T10:00:00Z')} onChange={onChange} />)
    const slider = screen.getByRole('slider') as HTMLInputElement

    fireEvent.change(slider, { target: { value: slider.max } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('disables the slider and presets when disabled', () => {
    render(<MarketTimeScrubber value={null} onChange={vi.fn()} disabled />)
    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByRole('button', { name: '-1h' })).toBeDisabled()
  })

  it('advances its now reference on the refresh interval', () => {
    vi.useFakeTimers()

    try {
      render(<MarketTimeScrubber value={null} onChange={vi.fn()} />)
      const maxBefore = Number((screen.getByRole('slider') as HTMLInputElement).max)

      act(() => {
        vi.advanceTimersByTime(30_000)
      })
      const maxAfter = Number((screen.getByRole('slider') as HTMLInputElement).max)

      expect(maxAfter).toBeGreaterThan(maxBefore)
    } finally {
      vi.useRealTimers()
    }
  })
})
