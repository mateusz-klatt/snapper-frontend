import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { createOperator, getOperators, getWallets } from './wallets'

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

describe('wallets API methods', () => {
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

  describe('getOperators', () => {
    it('fetches and validates operators list', async () => {
      const payload = {
        type: 'operator_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 1,
        payload: [
          {
            type: 'operator_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'op-1',
            timestamp: '2026-01-01T00:00:00Z',
            label: 'alice',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      const result = await getOperators()

      expect(result.payload).toHaveLength(1)
      expect(result.payload[0]?.label).toBe('alice')
    })
  })
  describe('createOperator', () => {
    it('posts and validates the created operator', async () => {
      const payload = {
        type: 'operator_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        payload: {
          type: 'operator_info',
          session_id: 's',
          sequence_id: 1,
          public_id: 'op-new',
          timestamp: '2026-01-01T00:00:00Z',
          label: 'desk-alpha',
          description: null,
        },
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      const result = await createOperator({ label: 'desk-alpha' })

      expect(result.payload.public_id).toBe('op-new')
      expect(result.payload.label).toBe('desk-alpha')
    })
  })
  describe('getWallets', () => {
    it('fetches and validates wallets list', async () => {
      const payload = {
        type: 'wallet_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 1,
        payload: [
          {
            type: 'wallet_info',
            session_id: 's',
            sequence_id: 1,
            public_id: 'w-1',
            timestamp: '2026-01-01T00:00:00Z',
            label: 'default',
            is_paper: false,
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      const result = await getWallets()

      expect(result.payload).toHaveLength(1)
      expect(result.payload[0]?.is_paper).toBe(false)
    })
  })
})
