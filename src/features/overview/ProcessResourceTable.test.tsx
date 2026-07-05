import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within, fireEvent } from '@testing-library/react'
import { ProcessResourceTable, ProcessMetricRow } from './ProcessResourceTable'
import { renderWithI18n } from '../../test/renderWithI18n'
import { useProcessMetricsStore } from '../../stores/processMetrics'
import { makeProcessSummaryItem } from '../../test/factories'

const MB = 1024 * 1024
const GB = MB * 1024

describe('ProcessResourceTable', () => {
  beforeEach((): void => {
    useProcessMetricsStore.getState().reset()
  })

  it('renders the empty state when no coordinators are present', (): void => {
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('No process resource data available')).toBeInTheDocument()
  })

  it('renders a single coordinator group with its processes', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', role: 'core', rss_bytes: 100 * MB })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('feed-1')).toBeInTheDocument()
    expect(screen.getByText('core')).toBeInTheDocument()
  })

  it('renders multiple coordinator groups sorted by slug', (): void => {
    const store = useProcessMetricsStore.getState()

    store.setSnapshot('beta', null, [makeProcessSummaryItem({ name: 'broker-1' })], 't1')
    store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'feed-1' })], 't2')
    renderWithI18n(<ProcessResourceTable />)
    const headers = screen.getAllByRole('heading', { level: 4 })

    expect(headers.map(h => h.textContent)).toEqual(['alpha', 'beta'])
    expect(screen.getByText('feed-1')).toBeInTheDocument()
    expect(screen.getByText('broker-1')).toBeInTheDocument()
  })

  it('derives the Running status for a running process', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', running: true, enabled: true })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders the coordinator label in the header when present', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot('coord-1', 'Feed', [makeProcessSummaryItem({ name: 'feed-1' })], 't1')
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByRole('heading', { level: 4 }).textContent).toBe('Feed')
    expect(screen.queryByText('coord-1')).not.toBeInTheDocument()
  })

  it('falls back to the coordinator slug when no label is present', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot('coord-1', null, [makeProcessSummaryItem({ name: 'feed-1' })], 't1')
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByRole('heading', { level: 4 }).textContent).toBe('coord-1')
  })

  it('hides processes this container does not manage even when reported running', (): void => {
    useProcessMetricsStore.getState().setSnapshot(
      'alpha',
      null,
      [
        makeProcessSummaryItem({ name: 'managed-here', owned: true }),
        makeProcessSummaryItem({
          name: 'runs-elsewhere',
          owned: false,
          running: true,
          enabled: true,
        }),
      ],
      't1'
    )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('managed-here')).toBeInTheDocument()
    expect(screen.queryByText('runs-elsewhere')).not.toBeInTheDocument()
  })

  it('titles the em-dash for a process with no per-process metrics', (): void => {
    useProcessMetricsStore.getState().setSnapshot(
      'alpha',
      null,
      [
        makeProcessSummaryItem({
          name: 'strat-1',
          running: true,
          rss_bytes: null,
          cpu_percent: null,
        }),
      ],
      't1'
    )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getAllByTitle(/no separate per-process/i)).toHaveLength(2)
  })

  it('derives the Stopped status for an enabled non-running process', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', running: false, enabled: true })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  it('shows an owned process with the Disabled badge (managed but dormant)', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', owned: true, running: false, enabled: false })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('reveals other containers processes when the managed-only toggle is unchecked', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'runs-elsewhere', owned: false, running: true })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.queryByText('runs-elsewhere')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/only this container/i))
    expect(screen.getByText('runs-elsewhere')).toBeInTheDocument()
  })

  it('shows an em-dash when rss_bytes is null', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', rss_bytes: null, cpu_percent: 5 })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    const row = screen.getByText('feed-1').closest('tr')

    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('—')).toBeInTheDocument()
  })

  it('formats rss_bytes below 1 GB in MB', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', rss_bytes: 256 * MB })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('256.0 MB')).toBeInTheDocument()
  })

  it('formats rss_bytes at or above 1 GB in GB', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', rss_bytes: 2 * GB })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('2.00 GB')).toBeInTheDocument()
  })

  it('shows an em-dash when cpu_percent is null', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', rss_bytes: 100 * MB, cpu_percent: null })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    const row = screen.getByText('feed-1').closest('tr')

    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('—')).toBeInTheDocument()
  })

  it('formats a non-null cpu_percent with one decimal and a percent sign', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed-1', cpu_percent: 137.25 })],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('137.3%')).toBeInTheDocument()
  })

  it('sums non-null rss_bytes for the container total', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [
          makeProcessSummaryItem({ name: 'feed-1', rss_bytes: 100 * MB }),
          makeProcessSummaryItem({ name: 'feed-2', rss_bytes: 156 * MB }),
          makeProcessSummaryItem({ name: 'feed-3', rss_bytes: null }),
        ],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('Total MEM 256.0 MB')).toBeInTheDocument()
  })

  it('renders nothing for a row whose name is absent from the store', (): void => {
    const { container } = renderWithI18n(
      <table>
        <tbody>
          <ProcessMetricRow coordinator='alpha' name='missing' />
        </tbody>
      </table>
    )

    expect(container.querySelector('tr')).toBeNull()
  })

  it('shows an em-dash container total when every rss_bytes is null', (): void => {
    useProcessMetricsStore
      .getState()
      .setSnapshot(
        'alpha',
        null,
        [
          makeProcessSummaryItem({ name: 'feed-1', rss_bytes: null }),
          makeProcessSummaryItem({ name: 'feed-2', rss_bytes: null }),
        ],
        't1'
      )
    renderWithI18n(<ProcessResourceTable />)
    expect(screen.getByText('Total MEM —')).toBeInTheDocument()
  })
})
