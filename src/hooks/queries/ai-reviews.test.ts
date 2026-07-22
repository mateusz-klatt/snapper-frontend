import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  usePendingAiReviews,
  useSubmitAiReviewDecision,
  useAiReviewActivity,
  useAiReviews,
} from './ai-reviews'
import { aiReviewActivityQueryKey, type AiReviewActivityFrame } from '../../stores/wsDispatcher'
import { useAuth } from '../../stores/auth'
import {
  listAiReviews,
  listPendingAiReviews,
  submitAiReviewDecision,
} from '../../lib/api/ai-reviews'

vi.mock('../../lib/api/ai-reviews', () => ({
  listAiReviews: vi.fn(() => Promise.resolve({ items: [], count: 0 })),
  listPendingAiReviews: vi.fn(() => Promise.resolve({ items: [], count: 0 })),
  submitAiReviewDecision: vi.fn(() =>
    Promise.resolve({ success: true, error_code: null, message: 'recorded', details: {} })
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'viewer', delegate_public_id: null },
    hasPermission: (permission: string) => permission === 'read:ai_reviews',
  })),
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const createWrapperWithClient = () => {
  const queryClient = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

const authFor = (
  permissions: readonly string[],
  delegatePublicId: string | null = null,
  role: string = 'viewer'
): ReturnType<typeof useAuth> =>
  ({
    isAuthenticated: true,
    user: {
      public_id: 'user-permission-test',
      role,
      delegate_public_id: delegatePublicId,
    },
    hasPermission: (permission: string) => permissions.includes(permission),
  }) as unknown as ReturnType<typeof useAuth>

describe('ai-reviews queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AI Reviews hooks', () => {
    it('usePendingAiReviews stays disabled without READ_SIGNALS or delegate state', () => {
      vi.mocked(useAuth).mockReturnValueOnce(authFor([], null, 'operator'))
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('usePendingAiReviews stays disabled when delegate state lacks READ_SIGNALS', () => {
      vi.mocked(useAuth).mockReturnValueOnce(authFor([], 'delegate-1', 'ai_delegate'))
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('usePendingAiReviews stays disabled when READ_SIGNALS lacks delegate state', () => {
      vi.mocked(useAuth).mockReturnValueOnce(authFor(['read:signals'], null, 'ai_delegate'))
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('useAiReviews stays disabled when READ_AI_REVIEWS is absent', () => {
      vi.mocked(useAuth).mockReturnValueOnce(
        authFor(['create:orders'], 'delegate-1', 'ai_delegate')
      )
      const { result } = renderHook(() => useAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listAiReviews)).not.toHaveBeenCalled()
    })
    it('useAiReviews fetches the decision list with READ_AI_REVIEWS', async () => {
      vi.mocked(useAuth).mockReturnValueOnce(authFor(['read:ai_reviews'], null, 'viewer'))
      const { result } = renderHook(() => useAiReviews(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(vi.mocked(listAiReviews)).toHaveBeenCalledWith({ limit: 100 })
    })

    it('useAiReviews has no implicit admin bypass', () => {
      vi.mocked(useAuth).mockReturnValueOnce(authFor([], null, 'admin'))
      const { result } = renderHook(() => useAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listAiReviews)).not.toHaveBeenCalled()
    })

    it('usePendingAiReviews stays disabled when no user is authenticated', () => {
      vi.mocked(useAuth).mockReturnValueOnce({
        isAuthenticated: true,
        user: null,
        hasPermission: () => true,
      } as unknown as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('usePendingAiReviews fetches with READ_SIGNALS without CREATE_ORDERS', async () => {
      vi.mocked(useAuth).mockReturnValue(authFor(['read:signals'], 'delegate-1', 'ai_reviewer'))
      vi.mocked(listPendingAiReviews).mockResolvedValueOnce({
        items: [
          {
            review_public_id: 'r-1',
            selected_delegate_public_id: 'del-1',
            wallet_public_id: 'wal-1',
            dispatch_version: 0,
            status: 'pending',
            deadline: '2026-04-27T10:05:00Z',
            fanout_after: '2026-04-27T10:00:00Z',
          },
        ],
        count: 1,
      })
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(1)
      expect(vi.mocked(listPendingAiReviews)).toHaveBeenCalledWith({})
    })
    it('usePendingAiReviews threads walletPublicId + limit through to apiClient', async () => {
      vi.mocked(useAuth).mockReturnValue(authFor(['read:signals'], 'delegate-1', 'ai_delegate'))
      vi.mocked(listPendingAiReviews).mockResolvedValueOnce({ items: [], count: 0 })
      renderHook(() => usePendingAiReviews({ walletPublicId: 'wal-99', limit: 25 }), {
        wrapper: createWrapper(),
      })

      await waitFor(() =>
        expect(vi.mocked(listPendingAiReviews)).toHaveBeenCalledWith({
          wallet_public_id: 'wal-99',
          limit: 25,
        })
      )
    })
    it('useSubmitAiReviewDecision posts decision via apiClient + invalidates pending list on success', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      vi.mocked(submitAiReviewDecision).mockResolvedValueOnce({
        success: true,
        error_code: null,
        message: 'recorded',
        details: {},
      } as never)
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useSubmitAiReviewDecision(), { wrapper })

      result.current.mutate({
        reviewPublicId: 'rev-9',
        decision: 'approve',
        rationale: 'looks tight',
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(vi.mocked(submitAiReviewDecision)).toHaveBeenCalledWith(
        'rev-9',
        'approve',
        'looks tight'
      )
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-reviews', 'pending'] })
    })
    it('useAiReviewActivity returns empty array when cache is empty', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      expect(result.current).toEqual([])
    })
    it('useAiReviewActivity reflects buffer entries written by the dispatcher', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const frame = {
        type: 'ai_review.request',
        sequence_id: 1,
        public_id: 'p-1',
        timestamp: '2026-04-27T10:00:00Z',
        session_id: 's-1',
        review_public_id: 'r-1',
        user_public_id: 'u-1',
        strategy_public_id: 'st-1',
        wallet_public_id: 'w-1',
        instrument_public_id: 'i-1',
        selected_delegate_public_id: 'd-1',
        deadline: '2026-04-27T10:05:00Z',
        signal_envelope: {},
        instrument_metadata: {},
        dispatch_version: 0,
      } as unknown as AiReviewActivityFrame
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey('user-del-1') as unknown as string[], [
          frame,
        ])
      })
      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect(result.current[0]?.review_public_id).toBe('r-1')
    })
    it('useAiReviewActivity ignores unrelated query cache events', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(['some-other-queue'], [{ irrelevant: true }])
      })
      expect(result.current).toEqual([])
    })
    it('useAiReviewActivity falls back to the null user-key when no user is authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as unknown as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const frame = {
        type: 'ai_review.request',
        review_public_id: 'r-orphan',
        dispatch_version: 0,
      } as unknown as AiReviewActivityFrame
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey(null) as unknown as string[], [frame])
      })
      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect(result.current[0]?.review_public_id).toBe('r-orphan')
    })
    it('useAiReviewActivity ignores cache events for a different user public_id', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey('user-other') as unknown as string[], [
          { type: 'ai_review.request', review_public_id: 'r-other', dispatch_version: 0 },
        ])
      })
      expect(result.current).toEqual([])
    })
  })
})
