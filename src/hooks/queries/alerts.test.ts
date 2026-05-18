import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAlert, useAlertHistory, ALERT_HISTORY_DISPLAY_CAP } from './alerts'
import { getAlert, getAlertHistory } from '../../lib/api/alerts'

vi.mock('../../lib/api/alerts', () => ({
  getAlertHistory: vi.fn(),
  getAlert: vi.fn(),
}))

const authMock = vi.fn(() => ({
  isAuthenticated: true,
  user: { public_id: 'user-default', role: 'admin' },
}))

vi.mock('../../stores/auth', () => ({
  useAuth: () => authMock(),
}))

const _row = (publicId: string = 'alert-1') => ({
  type: 'alert_event_info',
  sequence_id: 0,
  public_id: publicId,
  timestamp: '2024-01-01T00:00:00Z',
  session_id: 'test-sid',
  user_public_id: 'user-1',
  operator_public_id: null,
  wallet_public_id: null,
  alert_type: 'order_fill_full',
  priority: 'medium',
  is_safety_critical: false,
  title: 'Order filled',
  body: 'BUY 100 BTCUSD',
  payload: null,
  title_loc_key: null,
  title_loc_args: [],
  body_loc_key: null,
  body_loc_args: [],
  dedup_key: null,
  thread_key: null,
  source_topic: null,
})

const _historyEnvelope = (payload: ReturnType<typeof _row>[], next_cursor: string | null) => ({
  type: 'alert_history_response',
  sequence_id: 0,
  public_id: 'envelope-1',
  timestamp: '2024-01-01T00:00:00Z',
  session_id: 'test-sid',
  payload,
  count: payload.length,
  next_cursor,
})

const _singletonEnvelope = (publicId: string) => ({
  type: 'alert_event_response',
  sequence_id: 0,
  public_id: 'envelope-2',
  timestamp: '2024-01-01T00:00:00Z',
  session_id: 'test-sid',
  payload: _row(publicId),
})

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('alerts queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockReturnValue({
      isAuthenticated: true,
      user: { public_id: 'user-default', role: 'admin' },
    })
  })

  describe('useAlertHistory', () => {
    it('fetches the first page with no cursor when authenticated', async () => {
      vi.mocked(getAlertHistory).mockResolvedValueOnce(
        _historyEnvelope([_row('a1')], null) as never
      )
      const { result } = renderHook(() => useAlertHistory(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(getAlertHistory).toHaveBeenCalledWith(undefined, 50)
      expect(result.current.data?.pages[0]?.payload).toHaveLength(1)
    })

    it('threads next_cursor into fetchNextPage', async () => {
      vi.mocked(getAlertHistory)
        .mockResolvedValueOnce(_historyEnvelope([_row('a1')], 'CURSOR_1') as never)
        .mockResolvedValueOnce(_historyEnvelope([_row('a2')], null) as never)
      const { result } = renderHook(() => useAlertHistory(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.hasNextPage).toBe(true)
      await result.current.fetchNextPage()
      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2)
      })
      expect(getAlertHistory).toHaveBeenNthCalledWith(2, 'CURSOR_1', 50)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('signals "no more pages" when next_cursor is null on the first page', async () => {
      vi.mocked(getAlertHistory).mockResolvedValueOnce(
        _historyEnvelope([_row('only')], null) as never
      )
      const { result } = renderHook(() => useAlertHistory(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.hasNextPage).toBe(false)
    })

    it('does not fetch when the user is unauthenticated', async () => {
      authMock.mockReturnValueOnce({
        isAuthenticated: false,
        user: { public_id: 'anon', role: 'viewer' },
      })
      const { result } = renderHook(() => useAlertHistory(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })
      expect(getAlertHistory).not.toHaveBeenCalled()
    })

    it('exposes the 500-row display cap constant for the consuming component', () => {
      expect(ALERT_HISTORY_DISPLAY_CAP).toBe(500)
    })
  })

  describe('useAlert', () => {
    it('fetches when publicId is defined and user is authenticated', async () => {
      vi.mocked(getAlert).mockResolvedValueOnce(_singletonEnvelope('pid-1') as never)
      const { result } = renderHook(() => useAlert('pid-1'), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(getAlert).toHaveBeenCalledWith('pid-1')
      expect(result.current.data?.payload.public_id).toBe('pid-1')
    })

    it('skips the fetch when publicId is undefined', async () => {
      const { result } = renderHook(() => useAlert(undefined), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })
      expect(getAlert).not.toHaveBeenCalled()
    })

    it('skips the fetch when the user is unauthenticated', async () => {
      authMock.mockReturnValueOnce({
        isAuthenticated: false,
        user: { public_id: 'anon', role: 'viewer' },
      })
      const { result } = renderHook(() => useAlert('pid-1'), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })
      expect(getAlert).not.toHaveBeenCalled()
    })
  })
})
