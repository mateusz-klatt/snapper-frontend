import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAvailableProcesses,
  useConfiguredProcesses,
  useProcessSummary,
  useProcessSchema,
  useProcessRuns,
  useStartProcessByName,
  useStopProcessByName,
  usePatchProcessDesiredState,
  useCreateProcessConfig,
} from './processes'
import {
  createProcessConfig,
  getProcessRuns,
  startProcessByName,
  stopProcessByName,
  patchProcessDesiredState,
} from '../../lib/api/processes'

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

vi.mock('../../lib/api/processes', () => ({
  createProcessConfig: vi.fn(() =>
    Promise.resolve(
      envelope('process_create_response', {
        payload: envelope('process_create', {
          status: 'created',
          process: { name: 'test', template: 'test-template' },
        }),
      })
    )
  ),
  getAvailableProcesses: vi.fn(() =>
    Promise.resolve(envelope('available_processes', { payload: [], count: 0 }))
  ),
  getConfiguredProcesses: vi.fn(() =>
    Promise.resolve(envelope('configured_processes', { payload: [], count: 0 }))
  ),
  getProcessRuns: vi.fn(() => Promise.resolve(envelope('process_runs', { payload: [], count: 0 }))),
  getProcessSchema: vi.fn(() =>
    Promise.resolve(
      envelope('process_schema_response', {
        payload: envelope('process_schema', {
          name: 'collector',
          description: '',
          class_path: '',
          method: '',
          default_enabled: true,
          default_mode: 'thread',
          reference_identity_params: {},
          seeded_identity_params: [],
          lifecycle: 'long_running',
        }),
      })
    )
  ),
  getProcessSummary: vi.fn(() =>
    Promise.resolve(
      envelope('process_summary_response', {
        payload: envelope('process_summary', {
          feeds: { running: 0, total: 0 },
          strategies: { running: 0, total: 0 },
          executors: { running: 0, total: 0 },
          brokers: { running: 0, total: 0 },
        }),
      })
    )
  ),
  startProcessByName: vi.fn(() =>
    Promise.resolve(
      envelope('process_start_response', {
        payload: envelope('process_start', {
          status: 'success',
          name: 'collector',
          message: 'started',
        }),
      })
    )
  ),
  stopProcessByName: vi.fn(() =>
    Promise.resolve(
      envelope('process_stop_response', {
        payload: envelope('process_stop', {
          status: 'success',
          name: 'collector',
          message: 'stopped',
        }),
      })
    )
  ),
  patchProcessDesiredState: vi.fn(() =>
    Promise.resolve(
      envelope('process_desired_state_response', {
        payload: envelope('process_desired_state', {
          status: 'success',
          name: 'collector',
          action: 'restart',
          managed_remotely: true,
        }),
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

const createWrapperWithClient = () => {
  const queryClient = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

describe('processes queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAvailableProcesses', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useAvailableProcesses(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useConfiguredProcesses', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useProcessSummary', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useProcessSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.payload?.feeds).toEqual({ running: 0, total: 0 })
    })
  })
  describe('useProcessSchema', () => {
    it('returns data when name is provided', async () => {
      const { result } = renderHook(() => useProcessSchema('collector'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useProcessRuns', () => {
    it('returns data with default options', async () => {
      const { result } = renderHook(() => useProcessRuns(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('passes options correctly', async () => {
      const options = { name: 'collector', limit: 100 }
      const { result } = renderHook(() => useProcessRuns(options), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('respects enabled option', async () => {
      const options = { enabled: false }
      const { result } = renderHook(() => useProcessRuns(options), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getProcessRuns)).not.toHaveBeenCalled()
    })
  })
  describe('useStartProcessByName', () => {
    it('starts process and invalidates queries', async () => {
      const { result } = renderHook(() => useStartProcessByName(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          name: 'collector',
          mode: 'thread',
          parameters: { key: 'value' },
        })
      })
      expect(vi.mocked(startProcessByName)).toHaveBeenCalledWith('collector', {
        mode: 'thread',
        parameters: { key: 'value' },
      })
    })
    it('uses exponential retryDelay', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useStartProcessByName(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      const mutation = queryClient.getMutationCache().getAll()[0]

      expect(mutation).toBeDefined()
      const retryDelay = mutation?.options.retryDelay

      expect(retryDelay).toEqual(expect.any(Function))

      if (typeof retryDelay === 'function') {
        expect(retryDelay(0, new Error('test'))).toBe(1000)
        expect(retryDelay(5, new Error('test'))).toBe(30000)
      }
    })
  })
  describe('useStopProcessByName', () => {
    it('stops process and invalidates queries', async () => {
      const { result } = renderHook(() => useStopProcessByName(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      expect(vi.mocked(stopProcessByName)).toHaveBeenCalledWith('collector')
    })
    it('uses exponential retryDelay', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useStopProcessByName(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      const mutation = queryClient.getMutationCache().getAll()[0]

      expect(mutation).toBeDefined()
      const retryDelay = mutation?.options.retryDelay

      expect(retryDelay).toEqual(expect.any(Function))

      if (typeof retryDelay === 'function') {
        expect(retryDelay(0, new Error('test'))).toBe(1000)
        expect(retryDelay(5, new Error('test'))).toBe(30000)
      }
    })
  })
  describe('usePatchProcessDesiredState', () => {
    it('patches desired state and invalidates queries', async () => {
      const { result } = renderHook(() => usePatchProcessDesiredState(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          name: 'collector',
          body: { action: 'restart', restart_nonce: 'n1' },
        })
      })
      expect(vi.mocked(patchProcessDesiredState)).toHaveBeenCalledWith('collector', {
        action: 'restart',
        restart_nonce: 'n1',
      })
    })
    it('uses exponential retryDelay', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => usePatchProcessDesiredState(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector', body: { action: 'enable' } })
      })
      const mutation = queryClient.getMutationCache().getAll()[0]

      expect(mutation).toBeDefined()
      const retryDelay = mutation?.options.retryDelay

      expect(retryDelay).toEqual(expect.any(Function))

      if (typeof retryDelay === 'function') {
        expect(retryDelay(0, new Error('test'))).toBe(1000)
        expect(retryDelay(5, new Error('test'))).toBe(30000)
      }
    })
  })
  describe('useCreateProcessConfig', () => {
    it('creates process config and invalidates queries', async () => {
      const { result } = renderHook(() => useCreateProcessConfig(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ name: 'new-process', template: 'test-template' })
      })
      expect(vi.mocked(createProcessConfig)).toHaveBeenCalledWith({
        name: 'new-process',
        template: 'test-template',
      })
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
    it('useConfiguredProcesses has refetchInterval when live', async () => {
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useConfiguredProcesses disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useProcessSummary disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useProcessSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useProcessRuns disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useProcessRuns(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })
})
