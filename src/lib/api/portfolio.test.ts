import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getPortfolioAccounts } from './portfolio'

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

describe('portfolio account API', () => {
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

  it('getPortfolioAccounts fetches /api/portfolio/accounts and returns the payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'portfolio_account_state_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2026-07-13T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'portfolio_account_state',
            sequence_id: 0,
            public_id: 'acct-1',
            timestamp: '2026-07-13T00:00:00Z',
            session_id: 'test-sid',
            wallet_public_id: 'w-1',
            exchange: 'kraken',
            mode: 'live',
            sync_status: 'observed',
            effective_status: 'observed',
            is_authoritative: true,
            balance_status: 'observed',
            position_status: 'not_applicable',
            valuation_status: 'native_only',
            balances: [{ currency: 'USD', total: 100, free: 100, used: 0 }],
            open_positions: null,
            balance_observed_at: '2026-07-13T00:00:00Z',
            position_observed_at: null,
            authoritative_until: '2026-07-13T00:05:00Z',
            current_attempt_observation_id: 1,
            balance_payload_source_observation_id: 1,
            position_payload_source_observation_id: null,
            error: null,
          },
        ],
        count: 1,
      }),
    })

    const result = await getPortfolioAccounts()

    expect(result.payload).toHaveLength(1)
    expect(result.payload[0]?.exchange).toBe('kraken')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/portfolio/accounts'),
      expect.objectContaining({ method: 'GET' })
    )
  })
})
