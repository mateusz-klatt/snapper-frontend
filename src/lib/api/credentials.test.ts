import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getCredentials, createCredential, rotateCredential } from './credentials'

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

describe('credentials API methods', () => {
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

  describe('getCredentials', () => {
    it('fetches credential summaries for a wallet', async () => {
      const payload = {
        type: 'credential_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 1,
        payload: [
          {
            type: 'credential_summary',
            session_id: 's',
            sequence_id: 1,
            public_id: 'cred-1',
            timestamp: '2026-01-01T00:00:00Z',
            wallet_public_id: 'w-1',
            exchange: 'kraken',
            credential_type: 'api_key_secret',
            label: 'main',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      const result = await getCredentials('w-1')

      expect(result.payload).toHaveLength(1)
      expect(result.payload[0]?.exchange).toBe('kraken')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('/api/wallets/w-1/credentials')
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
      await expect(getCredentials('w-missing')).rejects.toThrow('Wallet not found')
    })
    it('appends as_of when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      const payload = {
        type: 'credential_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 0,
        payload: [],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      await getCredentials('w-1')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('as_of=')
      expect(url).toContain('/api/wallets/w-1/credentials')
      apiClient.setTimeTravelAsOf(null)
    })
    it('does not append global scope params', async () => {
      apiClient.setOperatorScope('op-global')
      apiClient.setWalletScope('w-global')
      const payload = {
        type: 'credential_list_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        count: 0,
        payload: [],
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
      await getCredentials('w-admin')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('/api/wallets/w-admin/credentials')
      expect(url).not.toContain('w-global')
      expect(url).not.toContain('op-global')
      apiClient.setOperatorScope(null)
      apiClient.setWalletScope(null)
    })
  })
  describe('createCredential', () => {
    it('posts create credential command', async () => {
      const credInfo = {
        type: 'credential_summary',
        session_id: 's',
        sequence_id: 1,
        public_id: 'cred-new',
        timestamp: '2026-01-01T00:00:00Z',
        wallet_public_id: 'w-1',
        exchange: 'kraken',
        credential_type: 'api_key_secret',
        label: 'new-key',
      }
      const response = {
        type: 'credential_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        payload: credInfo,
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => response })
      const result = await createCredential('w-1', {
        exchange: 'kraken',
        credential_type: 'api_key_secret',
        reconciliation_method: 'unclassified',
        credential_payload: { api_key: 'k', api_secret: 's' },
        label: 'new-key',
      })

      expect(result.payload.public_id).toBe('cred-new')
    })
  })
  describe('rotateCredential', () => {
    it('posts rotate command', async () => {
      const credInfo = {
        type: 'credential_summary',
        session_id: 's',
        sequence_id: 1,
        public_id: 'cred-rotated',
        timestamp: '2026-01-01T00:00:00Z',
        wallet_public_id: 'w-1',
        exchange: 'kraken',
        credential_type: 'api_key_secret',
        label: 'rotated-key',
      }
      const response = {
        type: 'credential_response',
        session_id: 's',
        sequence_id: 1,
        public_id: 'p',
        timestamp: '2026-01-01T00:00:00Z',
        payload: credInfo,
      }

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => response })
      const result = await rotateCredential('w-1', 'cred-1', {
        credential_payload: { api_key: 'new-k', api_secret: 'new-s' },
        label: 'rotated-key',
      })

      expect(result.payload.public_id).toBe('cred-rotated')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('/api/wallets/w-1/credentials/cred-1/rotate')
    })
  })
})
