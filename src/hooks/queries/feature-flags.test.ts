import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFeatureFlags } from './feature-flags'
import { getFeatureFlags } from '../../lib/api/feature-flags'

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

vi.mock('../../lib/api/feature-flags', () => ({
  getFeatureFlags: vi.fn(() =>
    Promise.resolve(
      envelope('feature_flags_response', {
        payload: { ai_integration_enabled: true },
      })
    )
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

describe('feature-flags queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useFeatureFlags', () => {
    it('useFeatureFlags returns isEnabled=true when backend says ai_integration_enabled=true', async () => {
      vi.mocked(getFeatureFlags).mockResolvedValueOnce(
        envelope('feature_flags_response', {
          payload: { ai_integration_enabled: true },
        }) as never
      )
      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isEnabled).toBe(true)
    })
    it('useFeatureFlags returns isEnabled=false on fetch error (fail-closed)', async () => {
      vi.mocked(getFeatureFlags).mockRejectedValueOnce(new Error('server down'))
      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isEnabled).toBe(false)
    })
  })
})
