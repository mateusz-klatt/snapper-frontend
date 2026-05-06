import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOperators, useWallets } from './wallets'
import { getOperators, getWallets } from '../../lib/api/wallets'

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
