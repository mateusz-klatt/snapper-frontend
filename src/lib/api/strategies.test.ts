import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getStrategies } from './strategies'

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

describe('strategies API methods', () => {
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

  it('getStrategies returns strategy list', async () => {
    const strategiesResponse = {
      type: 'strategy_list' as const,
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: [
        {
          type: 'strategy_process' as const,
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          name: 'strategy_test',
          running: true,
          enabled: true,
          mode: 'thread' as const,
          managed_remotely: false,
        },
      ],
      count: 1,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => strategiesResponse,
    })
    const result = await getStrategies()

    expect(result).toEqual(strategiesResponse)
  })
})
