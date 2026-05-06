import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  getProcessSchema,
  createProcessConfig,
  getConfiguredProcesses,
  getProcessSummary,
  getAvailableProcesses,
  getProcessRuns,
  startProcessByName,
  stopProcessByName,
} from './processes'

vi.mock('../utils', () => ({
  getCookie: vi.fn(() => 'test-csrf-token'),
}))
vi.mock('../wsTicketCache', () => ({
  storeWsTicket: vi.fn(),
}))

let mockSeqCounter = 0

vi.mock('uuid', () => ({
  v7: vi.fn(() => `00000000-0000-7000-8000-${String(++mockSeqCounter).padStart(12, '0')}`),
}))
vi.mock('../sequenceTracker', () => ({
  getTracker: vi.fn(() => ({
    sessionId: 'test-session-id',
    nextSequence: vi.fn(() => ++mockSeqCounter),
  })),
}))

describe('processes API methods', () => {
  const apiClient = sharedApiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCookie).mockReturnValue('test-csrf')
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })

  it('getProcessSchema returns process schema', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'process_schema_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'process_schema',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          name: 'test',
          description: 'Test process',
          class_path: 'snapper.processes.test',
          method: 'run',
          default_enabled: true,
          default_mode: 'thread',
          default_parameters: {},
          lifecycle: 'long_running',
        },
      }),
    })
    const result = await getProcessSchema('test-process')

    expect(result.payload.name).toBe('test')
    expect(result.payload.lifecycle).toBe('long_running')
  })
  it('createProcessConfig creates process config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'process_create_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'process_create',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          status: 'created',
          process: {
            name: 'new-process',
            template: 'test-template',
          },
        },
      }),
    })
    const result = await createProcessConfig({
      name: 'new-process',
      template: 'test-template',
    })

    expect(result.payload.status).toBe('created')
    expect(result.payload.process.name).toBe('new-process')
  })
  it('getConfiguredProcesses returns configured processes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'configured_processes',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    const result = await getConfiguredProcesses()

    expect(result).toEqual({
      type: 'configured_processes',
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: [],
      count: 0,
    })
  })
  it('getProcessSummary returns process category counts', async () => {
    const responseData = {
      type: 'process_summary_response' as const,
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: {
        type: 'process_summary' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        feeds: {
          running: 1,
          total: 2,
        },
        strategies: {
          running: 0,
          total: 1,
        },
        executors: {
          running: 0,
          total: 0,
        },
        brokers: {
          running: 1,
          total: 1,
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responseData,
    })
    const result = await getProcessSummary()

    expect(result).toEqual(responseData)
  })
  it('getAvailableProcesses returns available processes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'available_processes',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    const result = await getAvailableProcesses()

    expect(result).toEqual({
      type: 'available_processes',
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: [],
      count: 0,
    })
  })
  it('getProcessRuns returns process runs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'process_runs',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    const result = await getProcessRuns({ limit: 10, name: 'test' })

    expect(result).toEqual({
      type: 'process_runs',
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: [],
      count: 0,
    })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'), expect.any(Object))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('name=test'), expect.any(Object))
  })
  it('getProcessRuns works without options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'process_runs',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    await getProcessRuns()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/processes/runs'),
      expect.any(Object)
    )
  })
  it('startProcessByName starts a process', async () => {
    const responseData = {
      type: 'process_start_response' as const,
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: {
        type: 'process_start' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        status: 'success' as const,
        name: 'test-process',
        message: 'Process started',
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responseData,
    })
    const result = await startProcessByName('test-process', {
      mode: 'live' as 'thread',
      parameters: { param: 'value' },
    })

    expect(result).toEqual(responseData)
  })
  it('startProcessByName works without options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'process_start_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'process_start',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          status: 'success',
          name: 'test-process',
          message: 'Started',
        },
      }),
    })
    await startProcessByName('test-process')
    expect(mockFetch).toHaveBeenCalled()
  })
  it('stopProcessByName stops a process', async () => {
    const responseData = {
      type: 'process_stop_response' as const,
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'test-sid',
      payload: {
        type: 'process_stop' as const,
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        status: 'success' as const,
        name: 'test-process',
        message: 'Process stopped',
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responseData,
    })
    const result = await stopProcessByName('test-process')

    expect(result).toEqual(responseData)
  })
})
