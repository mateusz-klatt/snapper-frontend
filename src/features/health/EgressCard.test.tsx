import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

const getRouteRow = (routeId: string): HTMLElement => {
  const routeIdCell = within(screen.getByRole('table')).getByText(routeId)
  const row = routeIdCell.closest('tr')

  expect(row).not.toBeNull()
  if (row === null) throw new Error(`Route row not found for ${routeId}`)

  return row
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
    containers: [
      {
        container: 'api:orders@snapper',
        last_seen_age_seconds: 4,
        stale: false,
        route_count: 1,
      },
      {
        container: 'publisher:kraken@snapper-feed',
        last_seen_age_seconds: 91,
        stale: true,
        route_count: 1,
      },
      {
        container: 'publisher:coinbase@snapper-feed',
        last_seen_age_seconds: 0,
        stale: false,
        route_count: 0,
      },
      {
        container: 'publisher:binance@snapper-feed',
        last_seen_age_seconds: 7200,
        stale: false,
        route_count: 2,
      },
      {
        container: 'publisher:okx@snapper-feed',
        last_seen_age_seconds: 90000,
        stale: false,
        route_count: 3,
      },
    ],
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
        transfer: null,
        active_reservations: [
          { exchange: 'kraken', traffic_class: 'private', container: 'api:orders@snapper' },
        ],
        connections: [
          {
            host: 'ws.kraken.com',
            kind: 'ws',
            exchange: 'kraken',
            traffic_class: 'public',
            container: 'publisher:kraken@snapper-feed',
            count: 1,
            last_seen_at: null,
          },
          {
            host: 'api.kraken.com',
            kind: 'rest',
            exchange: 'kraken',
            traffic_class: 'private',
            container: 'api:orders@snapper',
            count: 0,
            last_seen_at: '2026-06-21T17:59:57Z',
          },
        ],
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
        transfer: {
          interface: 'wg-pl',
          socks5_listen_port: 1080,
          rx_bytes: 42_572_186,
          tx_bytes: 2_621_440,
          rx_rate_bytes_per_second: 128 * 1024,
          tx_rate_bytes_per_second: 64 * 1024,
          latest_handshake_at: '2026-06-21T17:59:30Z',
          counter_reset: false,
          sampled_at: '2026-06-21T17:59:58Z',
          sample_age_seconds: 2,
          stale: false,
        },
        connections: [],
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
        connections: [],
      },
    ],
  },
}

describe('EgressCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
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

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T18:00:00Z'))
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
    expect(screen.getByText('Traffic')).toBeInTheDocument()
    expect(screen.getByText('kraken · private · api:orders@snapper')).toBeInTheDocument()
    expect(screen.getByText('Reporting containers')).toBeInTheDocument()
    expect(screen.getByText('api:orders@snapper · 4s ago · routes: 1')).toBeInTheDocument()
    expect(
      screen.getByText('publisher:kraken@snapper-feed · 1.5min ago · routes: 1')
    ).toBeInTheDocument()
    expect(
      screen.getByText('publisher:coinbase@snapper-feed · just now · routes: 0')
    ).toBeInTheDocument()
    expect(
      screen.getByText('publisher:binance@snapper-feed · 2.0h ago · routes: 2')
    ).toBeInTheDocument()
    expect(
      screen.getByText('publisher:okx@snapper-feed · 1.0d ago · routes: 3')
    ).toBeInTheDocument()
    expect(screen.getByText('· stale')).toBeInTheDocument()
    expect(
      screen.getByText('ws.kraken.com · ws · kraken/public · ×1 · publisher:kraken@snapper-feed')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'api.kraken.com · rest · kraken/private · last seen 3s ago · api:orders@snapper'
      )
    ).toBeInTheDocument()
    expect(screen.getAllByText('None').length).toBeGreaterThan(0)
  })

  it('renders transfer traffic bytes, backend rates, and latest handshake age', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T18:00:00Z'))
    vi.mocked(useEgressHealth).mockReturnValue({
      data: sampleSnapshot,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    const row = getRouteRow('pl-vpn')

    expect(within(row).getByText('↓ 40.6 MiB · 128.0 KiB/s')).toBeInTheDocument()
    expect(within(row).getByText('↑ 2.5 MiB · 64.0 KiB/s')).toBeInTheDocument()
    expect(within(row).getByText('hs 30s ago')).toBeInTheDocument()
    expect(within(row).queryByText('· stale')).not.toBeInTheDocument()
  })

  it('omits traffic rates when the backend reports a reset sample', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const route = sampleSnapshot.payload.routes?.[1]

    expect(route).toBeDefined()
    if (route === undefined) return

    const transfer = route.transfer

    expect(transfer).toBeDefined()
    if (transfer === null || transfer === undefined) return

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          routes: [
            {
              ...route,
              id: 'reset-route',
              transfer: {
                ...transfer,
                rx_rate_bytes_per_second: null,
                tx_rate_bytes_per_second: null,
                latest_handshake_at: null,
                counter_reset: true,
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    const row = getRouteRow('reset-route')

    expect(within(row).getByText('↓ 40.6 MiB')).toBeInTheDocument()
    expect(within(row).getByText('↑ 2.5 MiB')).toBeInTheDocument()
    expect(within(row).queryByText(/KiB\/s/)).not.toBeInTheDocument()
    expect(within(row).queryByText(/hs /)).not.toBeInTheDocument()
  })

  it('renders an empty traffic cell when a route has no transfer snapshot', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const route = sampleSnapshot.payload.routes?.[0]

    expect(route).toBeDefined()
    if (route === undefined) return

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          routes: [route],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    expect(within(getRouteRow('direct-host')).getByText('—')).toBeInTheDocument()
  })

  it('renders stale transfer snapshots with the existing stale affordance', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const route = sampleSnapshot.payload.routes?.[1]

    expect(route).toBeDefined()
    if (route === undefined) return

    const transfer = route.transfer

    expect(transfer).toBeDefined()
    if (transfer === null || transfer === undefined) return

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          routes: [
            {
              ...route,
              id: 'stale-transfer',
              transfer: {
                ...transfer,
                latest_handshake_at: null,
                stale: true,
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    const row = getRouteRow('stale-transfer')

    expect(within(row).getByText('· stale')).toBeInTheDocument()
    expect(within(row).queryByText(/hs /)).not.toBeInTheDocument()
  })

  it('renders an empty connections list for a route', async () => {
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
              id: 'no-live-connections',
              connections: [],
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    const row = screen.getByText('no-live-connections').closest('tr')

    expect(row).not.toBeNull()
    if (row === null) return

    expect(within(row).getByText('None')).toBeInTheDocument()
    expect(within(row).getByText('kraken · private · api:orders@snapper')).toBeInTheDocument()
  })

  it('renders an omitted connections list for a route', async () => {
    const { useEgressHealth } = await import('../../hooks/queries/system')
    const directRoute = sampleSnapshot.payload.routes?.[0]

    expect(directRoute).toBeDefined()
    if (directRoute === undefined) return

    const routeWithoutConnections = { ...directRoute, id: 'omitted-connections' }

    delete routeWithoutConnections.connections

    vi.mocked(useEgressHealth).mockReturnValue({
      data: {
        ...sampleSnapshot,
        payload: {
          ...sampleSnapshot.payload,
          routes: [routeWithoutConnections],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    const row = screen.getByText('omitted-connections').closest('tr')

    expect(row).not.toBeNull()
    if (row === null) return

    expect(within(row).getByText('None')).toBeInTheDocument()
    expect(within(row).getByText('kraken · private · api:orders@snapper')).toBeInTheDocument()
  })

  it('renders unknown last-seen text for REST connections without timestamps', async () => {
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
              connections: [
                {
                  host: 'api.null-kraken.com',
                  kind: 'rest',
                  exchange: 'kraken',
                  traffic_class: 'private',
                  container: 'api:orders@snapper',
                  count: 0,
                  last_seen_at: null,
                },
                {
                  host: 'api.unknown-kraken.com',
                  kind: 'rest',
                  exchange: 'kraken',
                  traffic_class: 'private',
                  container: 'api:orders@snapper',
                  count: 0,
                },
              ],
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEgressHealth>)
    renderWithProviders(<EgressCard />)

    expect(
      screen.getByText(
        'api.null-kraken.com · rest · kraken/private · last seen unknown · api:orders@snapper'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'api.unknown-kraken.com · rest · kraken/private · last seen unknown · api:orders@snapper'
      )
    ).toBeInTheDocument()
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
