import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  changePassword,
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  adminResetPassword,
} from './users'

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

describe('user auth API methods', () => {
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
  it('changePassword changes user password', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'message',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: 'Password changed successfully',
      }),
    })
    const result = await changePassword('testuser', 'oldPassword', 'newPassword')

    expect(result).toEqual({
      type: 'message',
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: 'Password changed successfully',
    })
    const call = mockFetch.mock.calls[0]

    expect(call?.[0]).toBe('/api/auth/users/testuser/change-password')
    expect(call?.[1]?.method).toBe('POST')
    const body = JSON.parse(call?.[1]?.body as string)

    expect(body.payload.current_password).toBe('oldPassword')
    expect(body.payload.new_password).toBe('newPassword')
    expect(body.public_id).toBeDefined()
    expect(body.session_id).toBe('test-session-id')
    expect(body.timestamp).toBeDefined()
  })
})

describe('user management API methods', () => {
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
  it('listUsers fetches users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'user_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'user_profile',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            username: 'admin',
            email: 'admin@test.com',
            role: 'admin',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            operator_public_ids: [],
            effective_permissions: [],
          },
        ],
        count: 1,
      }),
    })
    const result = await listUsers(true)

    expect(result.payload).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users?include_inactive=true',
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('listUsers appends as_of via get() when time-traveling', async () => {
    apiClient.setTimeTravelAsOf('2024-06-01T12:00:00Z')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'user_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    await listUsers(false)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users?include_inactive=false&as_of=2024-06-01T12%3A00%3A00Z',
      expect.objectContaining({ method: 'GET' })
    )
    apiClient.setTimeTravelAsOf(null)
  })
  it('createUser posts new user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'user_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'user_profile',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          username: 'new',
          email: 'e@e.com',
          role: 'viewer',
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          operator_public_ids: [],
          effective_permissions: [],
        },
      }),
    })
    const result = await createUser({
      username: 'new',
      password: 'pass',
      email: 'e@e.com',
      role: 'viewer',
      is_active: true,
    })

    expect(result.payload.username).toBe('new')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users',
      expect.objectContaining({ method: 'POST' })
    )
  })
  it('updateUser posts user data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'user_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'user_profile',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          username: 'admin',
          email: 'new@e.com',
          role: 'admin',
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          operator_public_ids: [],
          effective_permissions: [],
        },
      }),
    })
    const result = await updateUser('admin', {
      email: 'new@e.com',
      role: 'admin',
      is_active: true,
    })

    expect(result.payload.username).toBe('admin')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users/admin/update',
      expect.objectContaining({ method: 'POST' })
    )
  })
  it('deactivateUser deactivates user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'message',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: 'User deactivated',
      }),
    })
    const result = await deactivateUser('testuser')

    expect(result.payload).toBe('User deactivated')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users/testuser/deactivate',
      expect.objectContaining({ method: 'POST' })
    )
  })
  it('adminResetPassword resets password', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'message',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: 'Password reset',
      }),
    })
    const result = await adminResetPassword('admin', { new_password: 'newpass123' })

    expect(result.payload).toBe('Password reset')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/users/admin/admin-reset-password',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
