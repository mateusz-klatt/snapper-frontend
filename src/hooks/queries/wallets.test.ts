import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateOperator, useOperators, useWallets } from './wallets'
import { createOperator, getOperators, getWallets } from '../../lib/api/wallets'

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

vi.mock('../../lib/api/wallets', () => ({
  getOperators: vi.fn(() => Promise.resolve(envelope('operator_list', { payload: [], count: 0 }))),
  getWallets: vi.fn(() => Promise.resolve(envelope('wallet_list', { payload: [], count: 0 }))),
  createOperator: vi.fn(() =>
    Promise.resolve(envelope('operator_response', { payload: { public_id: 'op-new', label: 'x' } }))
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
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

describe('wallets queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useOperators', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getOperators).mockResolvedValueOnce(
        envelope('operator_list', {
          payload: [{ public_id: 'op-1', label: 'alice' }],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useOperators(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useCreateOperator', () => {
    it('creates an operator via the api and resolves', async () => {
      vi.mocked(createOperator).mockResolvedValueOnce(
        envelope('operator_response', {
          payload: { public_id: 'op-new', label: 'desk-alpha' },
        }) as never
      )
      const { result } = renderHook(() => useCreateOperator(), { wrapper: createWrapper() })

      await result.current.mutateAsync({ label: 'desk-alpha' })

      expect(createOperator).toHaveBeenCalledWith({ label: 'desk-alpha' })
    })
  })
  describe('useWallets', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getWallets).mockResolvedValueOnce(
        envelope('wallet_list', {
          payload: [{ public_id: 'w-1', label: 'default', is_paper: false }],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useWallets(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
})
