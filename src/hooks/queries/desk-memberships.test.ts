import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachViewerToDesk,
  detachViewerFromDesk,
  getDeskMembers,
} from '../../lib/api/desk-memberships'
import { useAttachViewerToDesk, useDeskMembers, useDetachViewerFromDesk } from './desk-memberships'

const provenance = {
  sequence_id: 1,
  public_id: 'response-1',
  timestamp: '2026-08-01T10:00:00Z',
  session_id: 'session-1',
}

const userListResponse = {
  type: 'user_list' as const,
  ...provenance,
  payload: [],
  count: 0,
}

const messageResponse = {
  type: 'message' as const,
  ...provenance,
  payload: 'ok',
}

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  canManage: true,
}))

const appState = vi.hoisted(() => ({
  asOf: null as string | null,
}))

vi.mock('../../lib/api/desk-memberships', () => ({
  getDeskMembers: vi.fn(() => Promise.resolve(userListResponse)),
  attachViewerToDesk: vi.fn(() => Promise.resolve(messageResponse)),
  detachViewerFromDesk: vi.fn(() => Promise.resolve(messageResponse)),
}))

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    hasPermission: () => authState.canManage,
  }),
}))

vi.mock('../../stores/app', () => ({
  useAppStore: (selector: (state: { asOf: string | null }) => unknown) => selector(appState),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('desk membership queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.isAuthenticated = true
    authState.canManage = true
    appState.asOf = null
  })

  it('loads members under an as-of-specific cache key', async () => {
    appState.asOf = '2026-07-31T10:00:00Z'
    const { queryClient, wrapper } = createWrapper()
    const { result } = renderHook(() => useDeskMembers('desk-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getDeskMembers).toHaveBeenCalledWith('desk-1', '2026-07-31T10:00:00Z')
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['desk-memberships', 'desk-1', '2026-07-31T10:00:00Z'],
        exact: true,
      })
    ).toBeDefined()
  })

  it.each([
    { name: 'empty desk id', deskId: '', authenticated: true, canManage: true },
    { name: 'anonymous caller', deskId: 'desk-1', authenticated: false, canManage: true },
    { name: 'missing permission', deskId: 'desk-1', authenticated: true, canManage: false },
  ])('does not load members for $name', async ({ deskId, authenticated, canManage }) => {
    authState.isAuthenticated = authenticated
    authState.canManage = canManage
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeskMembers(deskId), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(getDeskMembers).not.toHaveBeenCalled()
  })

  it('attaches a viewer and invalidates live and time-travel lists for that desk', async () => {
    const { queryClient, wrapper } = createWrapper()
    const currentKey = ['desk-memberships', 'desk-1', null] as const
    const historicalKey = ['desk-memberships', 'desk-1', '2026-07-31T10:00:00Z'] as const
    const otherDeskKey = ['desk-memberships', 'desk-2', '2026-07-31T10:00:00Z'] as const
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAttachViewerToDesk(), { wrapper })

    queryClient.setQueryData(currentKey, userListResponse)
    queryClient.setQueryData(historicalKey, userListResponse)
    queryClient.setQueryData(otherDeskKey, userListResponse)

    await act(async () => {
      await result.current.mutateAsync({ operatorPublicId: 'desk-1', username: 'viewer' })
    })

    expect(attachViewerToDesk).toHaveBeenCalledWith('desk-1', 'viewer')
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['desk-memberships', 'desk-1'],
    })
    expect(queryClient.getQueryState(currentKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(historicalKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(otherDeskKey)?.isInvalidated).toBe(false)
  })

  it('detaches a viewer and invalidates every desk list after primary promotion', async () => {
    const { queryClient, wrapper } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDetachViewerFromDesk(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ operatorPublicId: 'desk-2', username: 'viewer' })
    })

    expect(detachViewerFromDesk).toHaveBeenCalledWith('desk-2', 'viewer')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['desk-memberships'] })
  })
})
