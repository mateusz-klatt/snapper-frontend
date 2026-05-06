import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getScopeGrants, createScopeGrant, handoverScopeGrant } from './scope-grants'

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

describe('scope-grants API methods', () => {
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

  describe('getScopeGrants', () => {
    it('fetches and validates scope grants for a wallet', async () => {
      const payload = {
        type: 'scope_grant_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 1,
        payload: [
          {
            type: 'scope_grant_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'sg-1',
            timestamp: '2026-01-01T00:00:00Z',
            operator_public_id: 'op-1',
            wallet_public_id: 'w-1',
            granted_by_user_public_id: 'u-1',
            scope_kind: 'underlying',
            underlying_public_id: 'BTC',
            instrument_public_id: null,
            note: null,
            known_to: '9999-12-31T23:59:59.999999Z',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      const result = await getScopeGrants('w-1')

      expect(result.payload).toHaveLength(1)
      expect(result.payload[0]?.scope_kind).toBe('underlying')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('wallet_public_id=w-1')
    })
    it('throws on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'Wallet not found' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(getScopeGrants('w-missing')).rejects.toThrow('Wallet not found')
    })
    it('appends as_of when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      const payload = {
        type: 'scope_grant_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 0,
        payload: [],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      await getScopeGrants('w-1')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('as_of=')
      expect(url).toContain('wallet_public_id=w-1')
      apiClient.setTimeTravelAsOf(null)
    })
    it('does not append global scope params', async () => {
      apiClient.setOperatorScope('op-global')
      apiClient.setWalletScope('w-global')
      const payload = {
        type: 'scope_grant_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 0,
        payload: [],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      await getScopeGrants('w-admin')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('wallet_public_id=w-admin')
      expect(url).not.toContain('w-global')
      expect(url).not.toContain('op-global')
      apiClient.setOperatorScope(null)
      apiClient.setWalletScope(null)
    })
  })
  describe('createScopeGrant', () => {
    it('posts create scope grant command', async () => {
      const grantInfo = {
        type: 'scope_grant_info',
        session_id: 's',
        sequence_id: 1,
        public_id: 'sg-new',
        timestamp: '2026-01-01T00:00:00Z',
        operator_public_id: 'op-1',
        wallet_public_id: 'w-1',
        granted_by_user_public_id: 'u-1',
        scope_kind: 'underlying',
        underlying_public_id: 'ETH',
        instrument_public_id: null,
        note: null,
        known_to: '9999-12-31T23:59:59.999999Z',
      }
      const response = {
        type: 'scope_grant_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        payload: grantInfo,
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => response })
      const result = await createScopeGrant({
        operator_public_id: 'op-1',
        wallet_public_id: 'w-1',
        scope_kind: 'underlying',
        underlying_public_id: 'ETH',
      })

      expect(result.payload.public_id).toBe('sg-new')
    })
  })
  describe('handoverScopeGrant', () => {
    it('posts handover command and returns both grants', async () => {
      const closedGrant = {
        type: 'scope_grant_info',
        session_id: 's',
        sequence_id: 1,
        public_id: 'sg-old',
        timestamp: '2026-01-01T00:00:00Z',
        operator_public_id: 'op-1',
        wallet_public_id: 'w-1',
        granted_by_user_public_id: 'u-1',
        scope_kind: 'underlying',
        underlying_public_id: 'BTC',
        instrument_public_id: null,
        note: null,
        known_to: '2026-01-02T00:00:00Z',
      }
      const newGrant = {
        ...closedGrant,
        public_id: 'sg-new',
        operator_public_id: 'op-2',
        known_to: '9999-12-31T23:59:59.999999Z',
      }
      const response = {
        type: 'handover_scope_grant_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        payload: { closed_grant: closedGrant, new_grant: newGrant },
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => response })
      const result = await handoverScopeGrant({
        from_grant_public_id: 'sg-old',
        to_operator_public_id: 'op-2',
        reason: 'shift change',
      })

      expect(result.payload.closed_grant.public_id).toBe('sg-old')
      expect(result.payload.new_grant.operator_public_id).toBe('op-2')
    })
  })
})
