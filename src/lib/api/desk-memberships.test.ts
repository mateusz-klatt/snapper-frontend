import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../apiClient'
import { makeUserProfile } from '../../test/factories'
import { attachViewerToDesk, detachViewerFromDesk, getDeskMembers } from './desk-memberships'

const provenance = {
  sequence_id: 1,
  public_id: 'response-1',
  timestamp: '2026-08-01T10:00:00Z',
  session_id: 'session-1',
}

const messageResponse = {
  type: 'message' as const,
  ...provenance,
  payload: 'ok',
}

describe('desk membership API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists and validates members with the explicit as-of horizon', async () => {
    const response = {
      type: 'user_list' as const,
      ...provenance,
      payload: [
        makeUserProfile({
          username: 'viewer',
          public_id: 'user-1',
          operator_public_ids: ['desk/one'],
          primary_operator_public_id: 'desk/one',
        }),
      ],
      count: 1,
    }
    const request = vi.spyOn(apiClient, 'requestJSON').mockResolvedValue(response)

    const result = await getDeskMembers('desk/one', '2026-07-31T10:00:00Z')

    expect(result.payload[0]?.username).toBe('viewer')
    expect(request).toHaveBeenCalledWith(
      '/api/auth/desks/desk%2Fone/members?as_of=2026-07-31T10%3A00%3A00Z',
      { method: 'GET' }
    )
  })

  it('attaches a viewer by an encoded exact username', async () => {
    const request = vi.spyOn(apiClient, 'requestJSON').mockResolvedValue(messageResponse)

    await expect(attachViewerToDesk('desk one', 'viewer/name')).resolves.toEqual(messageResponse)
    expect(request).toHaveBeenCalledWith('/api/auth/desks/desk%20one/members/viewer%2Fname', {
      method: 'POST',
    })
  })

  it('detaches a viewer with a CSRF-aware DELETE request', async () => {
    const request = vi.spyOn(apiClient, 'requestJSON').mockResolvedValue(messageResponse)

    await expect(detachViewerFromDesk('desk-1', 'viewer name')).resolves.toEqual(messageResponse)
    expect(request).toHaveBeenCalledWith('/api/auth/desks/desk-1/members/viewer%20name', {
      method: 'DELETE',
    })
  })

  it('redacts dynamic identifiers from malformed-response diagnostics', async () => {
    vi.spyOn(apiClient, 'requestJSON').mockResolvedValue({ payload: [] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(getDeskMembers('private/desk')).rejects.toMatchObject({
      endpoint: '/api/auth/desks/:operator_public_id/members',
    })
    await expect(getDeskMembers('private/desk', '2026-07-31T10:00:00Z')).rejects.toMatchObject({
      endpoint: '/api/auth/desks/:operator_public_id/members',
    })
    await expect(attachViewerToDesk('private/desk', 'private/viewer')).rejects.toMatchObject({
      endpoint: '/api/auth/desks/:operator_public_id/members/:username POST',
    })
    await expect(detachViewerFromDesk('private/desk', 'private/viewer')).rejects.toMatchObject({
      endpoint: '/api/auth/desks/:operator_public_id/members/:username DELETE',
    })

    const diagnostics = consoleError.mock.calls.flat().join(' ')

    expect(diagnostics).not.toContain('private')
    expect(diagnostics).not.toContain('2026-07-31')
  })
})
