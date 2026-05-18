import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getAlert, getAlertHistory } from './alerts'

vi.mock('../utils', () => ({
  getCookie: vi.fn(() => 'test-csrf-token'),
}))
vi.mock('../wsTicketCache', () => ({
  storeWsTicket: vi.fn(),
}))

let mockSeqCounter = 0

vi.mock('uuid', () => ({
  v7: vi.fn(() => `00000000-0000-7000-8000-${String(++mockSeqCounter).padStart(12, '0')}`),
}))
vi.mock('../sequenceTracker', () => ({
  getTracker: vi.fn(() => ({
    sessionId: 'test-session-id',
    nextSequence: vi.fn(() => ++mockSeqCounter),
  })),
}))

const _historyRow = (
  override: Partial<{
    public_id: string
    title: string
    body: string
    title_loc_key: string | null
    body_loc_key: string | null
    body_loc_args: string[] | null
  }> = {}
) => ({
  type: 'alert_event_info',
  sequence_id: 0,
  public_id: override.public_id ?? 'alert-1',
  timestamp: '2024-01-01T00:00:00Z',
  session_id: 'test-sid',
  user_public_id: 'user-1',
  operator_public_id: null,
  wallet_public_id: null,
  alert_type: 'order_fill_full',
  priority: 'medium',
  is_safety_critical: false,
  title: override.title ?? 'Order filled',
  body: override.body ?? 'BUY 100 BTCUSD @ $50000 filled on Kraken',
  payload: null,
  title_loc_key: override.title_loc_key ?? null,
  title_loc_args: [],
  body_loc_key: override.body_loc_key ?? null,
  body_loc_args: override.body_loc_args ?? [],
  dedup_key: null,
  thread_key: null,
  source_topic: null,
})

describe('alerts API methods', () => {
  const apiClient = sharedApiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCookie).mockReturnValue('test-csrf')
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })

  it('getAlertHistory uses default limit when none provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'alert_history_response',
        sequence_id: 0,
        public_id: 'envelope-1',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [_historyRow()],
        count: 1,
        next_cursor: null,
      }),
    })

    await getAlertHistory()
    const url = mockFetch.mock.calls[0]?.[0] as string

    expect(url).toContain('/api/alerts/history')
    expect(url).toContain('limit=50')
    expect(url).not.toContain('before=')
  })

  it('getAlertHistory includes the before cursor on subsequent pages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'alert_history_response',
        sequence_id: 0,
        public_id: 'envelope-2',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
        next_cursor: null,
      }),
    })

    await getAlertHistory('OPAQUE_CURSOR_TOKEN', 25)
    const url = mockFetch.mock.calls[0]?.[0] as string

    expect(url).toContain('limit=25')
    expect(url).toContain('before=OPAQUE_CURSOR_TOKEN')
  })

  it('getAlertHistory omits the before parameter for an empty cursor string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'alert_history_response',
        sequence_id: 0,
        public_id: 'envelope-3',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
        next_cursor: null,
      }),
    })

    await getAlertHistory('')
    const url = mockFetch.mock.calls[0]?.[0] as string

    expect(url).not.toContain('before=')
  })

  it('getAlertHistory returns the parsed Phase D wire shape unchanged', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'alert_history_response',
        sequence_id: 0,
        public_id: 'envelope-4',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          _historyRow({
            public_id: 'pid-x',
            title_loc_key: 'alerts.title.order_fill_full',
            body_loc_key: 'alerts.body.order_fill_full',
            body_loc_args: ['BUY', '100', 'BTCUSD', '50000.00', 'Kraken'],
          }),
        ],
        count: 1,
        next_cursor: 'NEXT_CURSOR',
      }),
    })

    const result = await getAlertHistory()
    const row = result.payload[0] as ReturnType<typeof _historyRow>

    expect(row.title_loc_key).toBe('alerts.title.order_fill_full')
    expect(row.body_loc_args).toEqual(['BUY', '100', 'BTCUSD', '50000.00', 'Kraken'])
    expect(result.next_cursor).toBe('NEXT_CURSOR')
  })

  it('getAlert URL-encodes the public_id and returns the singleton envelope', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'alert_event_response',
        sequence_id: 0,
        public_id: 'envelope-5',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: _historyRow({ public_id: 'pid/with slash' }),
      }),
    })

    const result = await getAlert('pid/with slash')
    const url = mockFetch.mock.calls[0]?.[0] as string

    expect(url).toContain('/api/alerts/pid%2Fwith%20slash')
    expect(result.payload.public_id).toBe('pid/with slash')
  })
})
