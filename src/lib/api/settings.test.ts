import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getSettings, getSettingCategories, updateSetting, removeSetting } from './settings'

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

describe('settings API methods', () => {
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

  it('getSettings returns settings with optional category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'setting_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'setting_read',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            key: 'setting1',
            value: 'value1',
            category: 'trading',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        count: 1,
      }),
    })
    const result = await getSettings('trading')

    expect(result.payload).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('category=trading'),
      expect.any(Object)
    )
  })
  it('getSettings works without category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'setting_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    await getSettings()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining('category='),
      expect.any(Object)
    )
  })
  it('getSettingCategories returns categories', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'setting_categories',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: ['trading', 'system'],
        count: 2,
      }),
    })
    const result = await getSettingCategories()

    expect(result).toEqual(['trading', 'system'])
  })
  it('updateSetting updates a setting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'setting_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'setting_read',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          key: 'setting1',
          value: 'new-value',
          category: 'general',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }),
    })
    const result = await updateSetting('setting1', {
      value: 'new-value',
      category: 'general',
    })

    expect(result.payload.key).toBe('setting1')
    expect(result.payload.value).toBe('new-value')
  })
  it('removeSetting removes a setting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'message',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: 'Setting deleted successfully',
      }),
    })
    const result = await removeSetting('setting1')

    expect(result).toEqual({
      type: 'message',
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: 'Setting deleted successfully',
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/setting1/remove'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
