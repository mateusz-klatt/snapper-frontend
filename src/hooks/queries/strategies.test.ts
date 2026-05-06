import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStrategies } from './strategies'

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

vi.mock('../../lib/api/strategies', () => ({
  getStrategies: vi.fn(() =>
    Promise.resolve(
      envelope('strategy_list', {
        payload: [
          envelope('strategy_process', {
            name: 'strategy_test',
            running: false,
            enabled: true,
            mode: 'thread',
          }),
        ],
        count: 1,
      })
    )
  ),
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

describe('strategies queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useStrategies', () => {
    it('returns strategy list when authenticated', async () => {
      const { result } = renderHook(() => useStrategies(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.payload).toHaveLength(1)
      expect(result.current.data?.payload[0]?.name).toBe('strategy_test')
    })
  })
  describe('time-travel polling suppression', () => {
    let appStoreModule: typeof import('../../stores/app')

    beforeEach(async () => {
      appStoreModule = await import('../../stores/app')
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    afterEach(() => {
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    it('useStrategies disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useStrategies(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })
})
