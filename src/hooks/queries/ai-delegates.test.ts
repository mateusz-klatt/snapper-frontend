import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAiDelegates,
  useAiDelegate,
  useCreateAiDelegate,
  useUpdateAiDelegateCaps,
  useDeactivateAiDelegate,
} from './ai-delegates'
import {
  createAiDelegate,
  deactivateAiDelegate,
  getAiDelegate,
  listAiDelegates,
  updateAiDelegateCaps,
} from '../../lib/api/ai-delegates'

const ENV = {
  seq: 0,
  pid: 'test-pid',
  ts: '2024-01-01T00:00:00Z',
  sid: 'test-sid',
}

function envelope<T extends string>(type: T, extra: Record<string, unknown> = {}) {
  return {
    type,
    sequence_id: ENV.seq,
    public_id: ENV.pid,
    timestamp: ENV.ts,
    session_id: ENV.sid,
    ...extra,
  }
}

vi.mock('../../lib/api/ai-delegates', () => ({
  createAiDelegate: vi.fn(() =>
    Promise.resolve(envelope('delegate_created_response', { payload: {} }))
  ),
  deactivateAiDelegate: vi.fn(() =>
    Promise.resolve(envelope('delegate_response', { payload: {} }))
  ),
  getAiDelegate: vi.fn(() => Promise.resolve(envelope('delegate_response', { payload: {} }))),
  listAiDelegates: vi.fn(() =>
    Promise.resolve(envelope('delegate_list', { payload: [], count: 0 }))
  ),
  updateAiDelegateCaps: vi.fn(() =>
    Promise.resolve(envelope('delegate_response', { payload: {} }))
  ),
}))
const mockHasPermission = vi.fn((_permission: string) => true)

vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
    hasPermission: mockHasPermission,
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

describe('ai-delegates queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
  })

  describe('AI integration hooks', () => {
    it('useAiDelegates returns delegate list', async () => {
      vi.mocked(listAiDelegates).mockResolvedValueOnce(
        envelope('delegate_list', {
          payload: [
            {
              public_id: 'd-1',
              username: 'ai-alpha',
              label: 'Alpha',
              created_by_user_public_id: 'u-1',
              created_at: '2026-04-21T00:00:00Z',
              is_active: true,
              caps: {
                max_open_orders: 10,
                max_daily_notional_usd: 1000,
                max_cancels_per_minute: null,
                max_order_quantity_per_instrument: null,
              },
            },
          ],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useAiDelegates(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(1)
      expect(result.current.data?.payload[0]?.label).toBe('Alpha')
    })
    it('useAiDelegate stays disabled when publicId is null', () => {
      const { result } = renderHook(() => useAiDelegate(null), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(getAiDelegate)).not.toHaveBeenCalled()
    })
    it('useAiDelegate fetches detail when publicId provided', async () => {
      vi.mocked(getAiDelegate).mockResolvedValueOnce(
        envelope('delegate_response', {
          payload: {
            public_id: 'd-1',
            username: 'ai-alpha',
            label: 'Alpha',
            created_by_user_public_id: 'u-1',
            created_at: '2026-04-21T00:00:00Z',
            is_active: true,
            caps: {
              max_open_orders: null,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        }) as never
      )
      const { result } = renderHook(() => useAiDelegate('d-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.payload.public_id).toBe('d-1')
      expect(vi.mocked(getAiDelegate)).toHaveBeenCalledWith('d-1')
    })
    it('read hooks stay disabled without read:ai_integration', () => {
      mockHasPermission.mockReturnValue(false)

      const list = renderHook(() => useAiDelegates(), { wrapper: createWrapper() })
      const detail = renderHook(() => useAiDelegate('d-1'), { wrapper: createWrapper() })

      expect(list.result.current.fetchStatus).toBe('idle')
      expect(detail.result.current.fetchStatus).toBe('idle')
      expect(vi.mocked(listAiDelegates)).not.toHaveBeenCalled()
      expect(vi.mocked(getAiDelegate)).not.toHaveBeenCalled()
    })
    it('useCreateAiDelegate invalidates ai-delegates list on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(createAiDelegate).mockResolvedValueOnce(
        envelope('delegate_created_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useCreateAiDelegate(), { wrapper })

      await act(async () => {
        result.current.mutate({
          label: 'Alpha',
          caps: {
            max_open_orders: null,
            max_daily_notional_usd: null,
            max_cancels_per_minute: null,
            max_order_quantity_per_instrument: null,
          },
          operator_public_id: null,
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
    })
    it('useUpdateAiDelegateCaps invalidates list + detail on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(updateAiDelegateCaps).mockResolvedValueOnce(
        envelope('delegate_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useUpdateAiDelegateCaps(), { wrapper })

      await act(async () => {
        result.current.mutate({
          publicId: 'd-1',
          body: {
            caps: {
              max_open_orders: 10,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates', 'd-1'] })
    })
    it('useDeactivateAiDelegate invalidates list + detail on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(deactivateAiDelegate).mockResolvedValueOnce(
        envelope('delegate_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useDeactivateAiDelegate(), { wrapper })

      await act(async () => {
        result.current.mutate('d-1')
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates', 'd-1'] })
    })
    it('all mutations reject locally without manage:ai_integration', async () => {
      mockHasPermission.mockReturnValue(false)
      const wrapper = createWrapper()
      const create = renderHook(() => useCreateAiDelegate(), { wrapper })
      const update = renderHook(() => useUpdateAiDelegateCaps(), { wrapper })
      const deactivate = renderHook(() => useDeactivateAiDelegate(), { wrapper })
      const caps = {
        max_open_orders: null,
        max_daily_notional_usd: null,
        max_cancels_per_minute: null,
        max_order_quantity_per_instrument: null,
      }

      await expect(
        create.result.current.mutateAsync({ label: 'Denied', caps, operator_public_id: null })
      ).rejects.toThrow('Permission denied: manage:ai_integration required')
      await expect(
        update.result.current.mutateAsync({ publicId: 'd-1', body: { caps } })
      ).rejects.toThrow('Permission denied: manage:ai_integration required')
      await expect(deactivate.result.current.mutateAsync('d-1')).rejects.toThrow(
        'Permission denied: manage:ai_integration required'
      )
      expect(vi.mocked(createAiDelegate)).not.toHaveBeenCalled()
      expect(vi.mocked(updateAiDelegateCaps)).not.toHaveBeenCalled()
      expect(vi.mocked(deactivateAiDelegate)).not.toHaveBeenCalled()
    })
  })
})
