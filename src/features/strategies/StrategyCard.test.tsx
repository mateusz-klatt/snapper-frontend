import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { StrategyCard } from './StrategyCard'

const renderWithMocks = (ui: ReactNode) => {
  return render(ui)
}

describe('StrategyCard', () => {
  const mockOnStart = vi.fn()
  const mockOnStop = vi.fn()
  const mockOnRestart = vi.fn()

  const freshHealth = () => ({
    status: 'healthy' as const,
    lag_ms: 100,
    seq: 7,
    timestamp: Date.now(),
  })

  it('shows the managed-remotely notice AND live controls (Stop + Restart) when running', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_remote'
        running={true}
        autoStartEnabled={true}
        mode='thread'
        coordinator='coord-2'
        managedRemotely={true}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
      />
    )
    expect(screen.getByTestId('managed-remotely-notice')).toHaveTextContent('coord-2')
    expect(screen.getByRole('button', { name: /stop remote strategy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restart remote strategy/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^start remote strategy$/i })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /restart remote strategy/i }))
    expect(mockOnRestart).toHaveBeenCalledTimes(1)
  })

  it('falls back to the unknown-coordinator copy', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_remote'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        managedRemotely={true}
      />
    )
    expect(screen.getByTestId('managed-remotely-notice')).toHaveTextContent(/another container/i)
  })

  it('renders health metrics for a fresh remote heartbeat without local running', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_remote'
        running={true}
        autoStartEnabled={true}
        mode='thread'
        managedRemotely={true}
        coordinator='coord-2'
        health={freshHealth()}
      />
    )
    expect(screen.getByText(/data lag/i)).toBeInTheDocument()
  })

  it('re-evaluates freshness when the stale timer fires', () => {
    vi.useFakeTimers()

    try {
      renderWithMocks(
        <StrategyCard
          name='strategy_remote'
          running={true}
          autoStartEnabled={true}
          mode='thread'
          managedRemotely={true}
          health={{ status: 'healthy', lag_ms: 100, seq: 7, timestamp: Date.now() }}
        />
      )
      expect(screen.getByText(/data lag/i)).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(11_000)
      })
      expect(screen.queryByText(/data lag/i)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('hides health metrics once the heartbeat is stale', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_remote'
        running={true}
        autoStartEnabled={true}
        mode='thread'
        managedRemotely={true}
        health={{ status: 'healthy', lag_ms: 100, seq: 7, timestamp: Date.now() - 60_000 }}
      />
    )
    expect(screen.queryByText(/data lag/i)).not.toBeInTheDocument()
  })

  it('renders strategy card', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/TEST/i)).toBeInTheDocument()
  })
  it('displays strategy name', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_macd_btc'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/MACD BTC/i)).toBeInTheDocument()
  })
  it('shows running status', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/running/i)).toBeInTheDocument()
  })
  it('shows stopped status when not running', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/stopped/i)).toBeInTheDocument()
  })
  it('renders a Backtest button and calls onBacktest when clicked', async () => {
    const onBacktest = vi.fn()

    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onBacktest={onBacktest}
      />
    )
    await userEvent.click(screen.getByText('Backtest'))
    expect(onBacktest).toHaveBeenCalledTimes(1)
  })
  it('omits the Backtest button when onBacktest is not provided', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
      />
    )
    expect(screen.queryByText('Backtest')).toBeNull()
  })
  it('shows starting status while starting', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        isStarting={true}
      />
    )
    expect(screen.getByLabelText(/status: starting/i)).toBeInTheDocument()
  })
  it('renders starting label on start button', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        isStarting={true}
      />
    )
    expect(screen.getByText('Starting...')).toBeInTheDocument()
  })
  it('shows stopping status while stopping', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        isStopping={true}
      />
    )
    expect(screen.getByLabelText(/status: stopping/i)).toBeInTheDocument()
  })
  it('renders stopping label on stop button', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        isStopping={true}
      />
    )
    expect(screen.getByText('Stopping...')).toBeInTheDocument()
  })
  it('displays mode', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='process'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/Mode: process/i)).toBeInTheDocument()
  })
  it('displays autostart enabled', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={true}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/Autostart: enabled/i)).toBeInTheDocument()
  })
  it('displays autostart disabled', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/Autostart: disabled/i)).toBeInTheDocument()
  })
  it('shows health metrics when running with health data', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'healthy',
          lag_ms: 500,
          timestamp: Date.now(),
          seq: 42,
        }}
      />
    )
    expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    expect(screen.getByText('500ms')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
  })
  it('shows warning health status', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'warning',
          lag_ms: 5000,
          timestamp: Date.now(),
          seq: 100,
        }}
      />
    )
    expect(screen.getByText('WARNING')).toBeInTheDocument()
    expect(screen.getByText('lag: 5s')).toBeInTheDocument()
  })
  it('shows error health status', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'error',
          lag_ms: 15000,
          timestamp: Date.now(),
          seq: 50,
        }}
      />
    )
    expect(screen.getByText('ERROR')).toBeInTheDocument()
    expect(screen.getByText('lag: 15s')).toBeInTheDocument()
  })
  it('expands details when Show Details button is clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'healthy',
          lag_ms: 500,
          timestamp: Date.now(),
          seq: 10,
          inputs: ['feed.btc', 'feed.eth'],
          outputs: ['signals'],
        }}
      />
    )
    const showButton = screen.getByText('Show Details')

    await user.click(showButton)
    expect(screen.getByText('Hide Details')).toBeInTheDocument()
    expect(screen.getByText('Inputs (2)')).toBeInTheDocument()
    expect(screen.getByText('feed.btc')).toBeInTheDocument()
    expect(screen.getByText('feed.eth')).toBeInTheDocument()
    expect(screen.getByText('Outputs (1)')).toBeInTheDocument()
    expect(screen.getByText('signals')).toBeInTheDocument()
  })
  it('shows feed health when available', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'healthy',
          lag_ms: 500,
          timestamp: Date.now(),
          seq: 10,
          feed_health: {
            'kraken.BTC-USD': {
              status: 'healthy',
              lag_ms: 100,
              heartbeat_age_ms: 1000,
              healthy: true,
            },
            'binance.ETH-USD': {
              status: 'stale' as 'error',
              lag_ms: 6000,
              heartbeat_age_ms: 10000,
              healthy: false,
            },
          },
        }}
      />
    )
    const showButton = screen.getByText('Show Details')

    await user.click(showButton)
    expect(screen.getByText('Feed Publishers (2)')).toBeInTheDocument()
    expect(screen.getByText('kraken.BTC-USD')).toBeInTheDocument()
    expect(screen.getByText('binance.ETH-USD')).toBeInTheDocument()
  })
  it('calls onStart when start button is clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={false}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    const startButton = screen.getByRole('button', { name: /Start/i })

    await user.click(startButton)
    expect(mockOnStart).toHaveBeenCalled()
  })
  it('calls onStop when stop button is clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    const stopButton = screen.getByRole('button', { name: /Stop/i })

    await user.click(stopButton)
    expect(mockOnStop).toHaveBeenCalled()
  })
  it('displays no heartbeat seq when missing', () => {
    renderWithMocks(
      <StrategyCard
        name='strategy_test'
        running={true}
        autoStartEnabled={false}
        mode='thread'
        onStart={mockOnStart}
        onStop={mockOnStop}
        health={{
          status: 'healthy',
          lag_ms: 500,
          timestamp: Date.now(),
        }}
      />
    )
    expect(screen.getByText('#?')).toBeInTheDocument()
  })
})
