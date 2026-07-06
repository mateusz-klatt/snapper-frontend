import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { ProcessControlCard } from './ProcessControlCard'

const renderWithMocks = (ui: ReactNode) => {
  return render(ui)
}

describe('ProcessControlCard', () => {
  const mockOnStart = vi.fn()
  const mockOnStop = vi.fn()
  const mockOnRestart = vi.fn()

  it('renders card with title and description', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='stopped'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText('Test Process')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })
  it('omits description element when description is empty', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description=''
        status='stopped'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })
  it.each([
    { name: 'shows start button when stopped', status: 'stopped', expectedText: 'Start' },
    { name: 'shows stop button when running', status: 'running', expectedText: 'Stop' },
    { name: 'displays status badge', status: 'running', expectedText: 'running' },
    { name: 'shows restart button when running', status: 'running', expectedText: 'Restart' },
  ] satisfies {
    name: string
    status: 'stopped' | 'running'
    expectedText: string
  }[])('$name', ({ status, expectedText }) => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status={status}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })
  it('calls onStart when start button clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='stopped'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    await user.click(screen.getByText('Start'))
    expect(mockOnStart).toHaveBeenCalled()
  })
  it('calls onStop when stop button clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    await user.click(screen.getByText('Stop'))
    expect(mockOnStop).toHaveBeenCalled()
  })
  it('shows restart for a remote-managed enabled process even when stopped', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='stopped'
        managedRemotely={true}
        enabled={true}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText('Restart')).toBeInTheDocument()
  })
  it('hides restart for a remote-managed disabled stopped process', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='stopped'
        managedRemotely={true}
        enabled={false}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.queryByText('Restart')).not.toBeInTheDocument()
  })
  it('displays loading state when starting', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='stopped'
        isStarting={true}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/starting/i)).toBeInTheDocument()
  })
  it('displays loading state when stopping', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        isStopping={true}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/stopping/i)).toBeInTheDocument()
  })
  it('displays status badge when provided', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        statusBadge='v1.0.0'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })
  it('displays details when provided', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        details={{ memory: '100MB', cpu: '5%' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/memory:/i)).toBeInTheDocument()
    expect(screen.getByText(/cpu:/i)).toBeInTheDocument()
  })
  it('stringifies object values in details', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        details={{ meta: { version: '1.0.0' } }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/meta:/i)).toBeInTheDocument()
    expect(screen.getByText(/\{"version":"1.0.0"\}/)).toBeInTheDocument()
  })
  it('displays heartbeat as healthy with lag', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        heartbeat={{ status: 'healthy', lag_ms: 50, timestamp: Date.now(), healthy: true }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/healthy/i)).toBeInTheDocument()
    expect(screen.getByText(/50ms/)).toBeInTheDocument()
  })
  it('displays heartbeat as error when unhealthy', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        heartbeat={{ status: 'error', timestamp: Date.now(), healthy: false }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
  it('displays heartbeat as unknown when status is unknown', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        heartbeat={{
          status: 'unknown' as 'healthy',
          timestamp: 0,
          healthy: false,
        }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText(/unknown/i)).toBeInTheDocument()
  })
  it('omits heartbeat section when heartbeat is not provided', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.queryByText(/waiting/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/healthy/i)).not.toBeInTheDocument()
  })
  it('displays error status correctly', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='error'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    expect(screen.getByText('error')).toBeInTheDocument()
  })
  it('calls onRestart when restart clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
      />
    )
    await user.click(screen.getByText('Restart'))
    expect(mockOnRestart).toHaveBeenCalled()
  })
  it('uses default noop when onRestart is not provided and restart is clicked', async () => {
    const user = userEvent.setup()

    renderWithMocks(
      <ProcessControlCard
        title='Test Process'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    )
    const restartButton = screen.getByText('Restart')

    await expect(user.click(restartButton)).resolves.not.toThrow()
    expect(restartButton).toBeInTheDocument()
  })
  it('shows the managed-remotely notice AND live control buttons when managed remotely', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Kraken Feed'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        managedRemotely
        coordinator='coord-1'
      />
    )
    expect(screen.getByTestId('managed-remotely-notice')).toBeInTheDocument()
    expect(screen.getByText('Managed by coord-1')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('Restart')).toBeInTheDocument()
    expect(screen.queryByText('Start')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Stop'))
    expect(mockOnStop).toHaveBeenCalled()
  })
  it('falls back to a generic owner label when coordinator is null', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Kraken Feed'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
        managedRemotely
        coordinator={null}
      />
    )
    expect(screen.getByText('Managed by another container')).toBeInTheDocument()
  })
  it('prefers the coordinator label over the raw slug', () => {
    renderWithMocks(
      <ProcessControlCard
        title='Kraken Feed'
        description='Test description'
        status='running'
        onStart={mockOnStart}
        onStop={mockOnStop}
        managedRemotely
        coordinator='coord-1'
        coordinatorLabel='Feed'
      />
    )
    expect(screen.getByText('Managed by Feed')).toBeInTheDocument()
    expect(screen.queryByText('Managed by coord-1')).not.toBeInTheDocument()
  })
})
