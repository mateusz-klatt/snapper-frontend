import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { EgressCard } from './EgressCard'

import type { EgressHealthData, EgressHealthResponse } from '../../types/api'

vi.mock('../../hooks/queries/system', () => ({
  useEgressHealth: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}))

const renderWithProviders = (ui: ReactNode): ReturnType<typeof render> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const sampleSnapshot: EgressHealthResponse = {
  type: 'egress_health_response',
  sequence_id: 1,
  public_id: 'env-egress',
  timestamp: '2026-06-21T18:00:00Z',
  session_id: 's',
  payload: {
    type: 'egress_health',
    sequence_id: 2,
    public_id: 'payload-egress',
    timestamp: '2026-06-21T18:00:00Z',
    session_id: 's',
    enabled: true,
    on_all_quarantined: 'wait',
    private_fallback_route_id: 'pl-vpn',
    private_on_fallback: false,
    routes: [
      {
        id: 'direct-host',
        kind: 'direct',
        region: 'host',
        exit_ip: '198.51.100.11',
        provider: 'isp',
        priority: 0,
        allowed_exchanges: [],
        enabled: true,
        quarantined: false,
        quarantine_seconds_remaining: null,
        in_use_count: 1,
        active_reservations: [{ exchange: 'kraken', traffic_class: 'private' }],
      },
      {
        id: 'pl-vpn',
        kind: 'socks5',
        region: 'pl-waw',
        exit_ip: '203.0.113.10',
        provider: 'wireguard-pl',
        priority: 10,
        allowed_exchanges: ['walutomat'],
        enabled: true,
        quarantined: true,
        quarantine_seconds_remaining: 42.2,
        in_use_count: 0,
      },
      {
        id: 'disabled-route',
        kind: 'socks5',
        region: null,
        exit_ip: null,
        provider: '',
        priority: 20,
        enabled: false,
        quarantined: false,
        quarantine_seconds_remaining: null,
        in_use_count: 1000,
        active_reservations: [],
      },
    ],
  },
}

describe('EgressCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the card title without data during loading', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getByText('Egress Health')).toBeInTheDocument()
    expect(screen.getByText(/Loading egress health/)).toBeInTheDocument()
  })

  it('renders an error fallback when the query fails', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('pool unavailable'),
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getByText(/Egress health unavailable: pool unavailable/)).toBeInTheDocument()
  })

  it('falls back to a generic error message for non-Error throwables', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { reason: 'unknown' } as unknown as Error,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(
      screen.getByText(/Egress health unavailable: Failed to load egress health/)
    ).toBeInTheDocument()
  })

  it('renders route status, metadata, and active reservations', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: sampleSnapshot,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0)
    expect(screen.getByText('Wait')).toBeInTheDocument()
    expect(screen.getAllByText('pl-vpn').length).toBeGreaterThan(0)
    expect(screen.getByText('direct-host')).toBeInTheDocument()
    expect(screen.getAllByText('direct').length).toBeGreaterThan(0)
    expect(screen.getAllByText('socks5').length).toBeGreaterThan(0)
    expect(screen.getByText('host')).toBeInTheDocument()
    expect(screen.getByText('198.51.100.11')).toBeInTheDocument()
    expect(screen.getByText('wireguard-pl')).toBeInTheDocument()
    expect(screen.getAllByText('All').length).toBeGreaterThan(0)
    expect(screen.getByText('walutomat')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Quarantined (43s)')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('kraken · private')).toBeInTheDocument()
    expect(screen.getAllByText('None').length).toBeGreaterThan(0)
  })

  it('renders the explicit disabled-pool state', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          enabled: false,
          on_all_quarantined: null,
          private_fallback_route_id: null,
          routes: [],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getAllByText('Disabled').length).toBeGreaterThan(0)
    expect(screen.getByText(/Egress pool is disabled/)).toBeInTheDocument()
    expect(screen.queryByText('direct-host')).not.toBeInTheDocument()
  })

  it('shows a warning when private traffic is on fallback', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: { ...sampleSnapshot.payload, private_on_fallback: true },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(
      screen.getByText('Warning: private traffic is on the VPN fallback, not direct egress.')
    ).toBeInTheDocument()
  })

  it('renders an empty enabled pool without a route table', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const payload: EgressHealthData = {
      type: 'egress_health',
      sequence_id: 3,
      public_id: 'payload-empty-egress',
      timestamp: '2026-06-21T18:00:00Z',
      session_id: 's',
      enabled: true,
      private_on_fallback: false,
    }

    vi.mocked(useEgressHealth).mockReturnValue({
      data: { ...sampleSnapshot, payload },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getByText('No egress routes configured.')).toBeInTheDocument()
    expect(screen.queryByText('ID')).not.toBeInTheDocument()
  })

  it('renders quarantined routes without a remaining-seconds value', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const directRoute = sampleSnapshot.payload.routes?.[0]

    expect(directRoute).toBeDefined()
    if (directRoute === undefined) return

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          routes: [
            {
              ...directRoute,
              id: 'unknown-release',
              quarantined: true,
              quarantine_seconds_remaining: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)
    expect(screen.getByText('Quarantined')).toBeInTheDocument()
    expect(screen.queryByText(/Quarantined \(/)).not.toBeInTheDocument()
  })
})
