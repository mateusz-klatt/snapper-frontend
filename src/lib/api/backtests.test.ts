import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient, APIError as SharedAPIError } from '../apiClient'
import {
  getBacktests,
  getBacktest,
  createBacktest,
  cancelBacktest,
  rerunBacktest,
  getBacktestTrades,
  getBacktestSignals,
  createBacktestComparison,
  getBacktestComparison,
  getBacktestComparisons,
} from './backtests'
import { getExchangeInstrumentsDetail } from './market'

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

describe('backtests API methods', () => {
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

  describe('backtests', () => {
    const baseEnv = {
      sequence_id: 0,
      public_id: 'test-pid',
      timestamp: '2026-05-04T00:00:00Z',
      session_id: 'test-sid',
    }

    const baseRun = {
      type: 'backtest_run',
      ...baseEnv,
      wallet_public_id: 'wallet-1',
      strategy_name: 'sma',
      strategy_params: {},
      instrument_public_id: 'BTC-USD',
      exchange: 'kraken',
      timeframe: '1h',
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-06-01T00:00:00Z',
      initial_cash: 10000,
      status: 'pending',
      execution_mode: 'sim',
      fill_model: 'next_open',
      slippage_bps: 0,
      commission_bps: 0,
    }

    const runListEnv = (
      payload: Array<typeof baseRun> = [],
      count = 0
    ): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_run_list',
      payload,
      count,
    })

    const runEnv = (overrides?: Partial<typeof baseRun>): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_run_response',
      payload: { ...baseRun, ...overrides },
    })

    const tradeListEnv = (): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_trade_list',
      payload: [],
      count: 0,
    })

    const signalListEnv = (): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_signal_list',
      payload: [],
      count: 0,
    })

    const baseComparison = {
      ...baseEnv,
      type: 'backtest_comparison',
      wallet_public_id: 'wallet-1',
      run_a_public_id: 'r1',
      run_b_public_id: 'r2',
      pairing_mode: 'auto',
    }

    const compEnv = (publicId = 'cmp-1'): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_comparison_response',
      payload: { ...baseComparison, public_id: publicId },
    })

    const compDetailEnv = (publicId = 'cmp-1'): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_comparison_detail_response',
      payload: {
        ...baseEnv,
        type: 'backtest_comparison_detail',
        comparison: { ...baseComparison, public_id: publicId },
        run_a: { ...baseRun, public_id: 'r1' },
        run_b: { ...baseRun, public_id: 'r2' },
        metrics_diff: [],
        equity_overlay: [],
        trades_diff: [],
        signals_diff: [],
      },
    })

    const compListEnv = (): Record<string, unknown> => ({
      ...baseEnv,
      type: 'backtest_comparison_list',
      payload: [],
      count: 0,
    })

    it('getBacktests sends GET without optional filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runListEnv(),
      })
      await getBacktests()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests?limit=20&offset=0'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktests sends GET with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runListEnv(),
      })
      const result = await getBacktests(10, 5, 'sma', 'completed')

      expect(result.count).toBe(0)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests?limit=10&offset=5&strategy=sma&status=completed'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktests appends config_hash when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runListEnv(),
      })
      await getBacktests(20, 0, undefined, undefined, 'cfg-hash-abc')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('config_hash=cfg-hash-abc'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktest sends GET by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runEnv({ public_id: 'r1' }),
      })
      await getBacktest('r1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('createBacktest sends POST with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runEnv({ public_id: 'r2' }),
      })
      await createBacktest({
        strategy_class: 'sma',
        instrument_public_id: 'BTC-USD',
        exchange: 'kraken',
        start_date: '2026-01-01',
        end_date: '2026-06-01',
      } as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('cancelBacktest sends POST cancel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runEnv({ public_id: 'r1', status: 'cancelled' }),
      })
      await cancelBacktest('r1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/cancel'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('rerunBacktest sends POST rerun', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runEnv({ public_id: 'r1', status: 'pending' }),
      })
      await rerunBacktest('r1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/rerun'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('getBacktestTrades sends GET with default limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => tradeListEnv(),
      })
      await getBacktestTrades('r1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/trades?limit=100'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktestTrades sends GET with limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => tradeListEnv(),
      })
      await getBacktestTrades('r1', 50)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/trades?limit=50'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktestSignals sends GET with default limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => signalListEnv(),
      })
      await getBacktestSignals('r1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/signals?limit=100'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktestSignals sends GET with limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => signalListEnv(),
      })
      await getBacktestSignals('r1', 50)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/r1/signals?limit=50'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('createBacktestComparison sends POST with auto-mode body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => compEnv('cmp-1'),
      })
      await createBacktestComparison({
        mode: 'auto',
        config_hash: 'cfg-hash-abc',
        anchor_run_public_id: 'r1',
      })

      const [url, init] = mockFetch.mock.calls[0] ?? []

      expect(url).toContain('/api/backtests/compare')
      expect(init?.method).toBe('POST')
      const sentBody = JSON.parse(init?.body as string)

      expect(sentBody.payload).toEqual({
        mode: 'auto',
        config_hash: 'cfg-hash-abc',
        anchor_run_public_id: 'r1',
      })
      expect(sentBody.public_id).toBeTruthy()
      expect(sentBody.session_id).toBeTruthy()
    })

    it('getBacktestComparison sends GET by id (URL-encoded)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => compDetailEnv('cmp 1'),
      })
      await getBacktestComparison('cmp 1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/backtests/compare/cmp%201'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('getBacktestComparisons sends GET with default + custom paging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => compListEnv(),
      })
      await getBacktestComparisons()
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/backtests/compare?limit=20&offset=0'),
        expect.objectContaining({ method: 'GET' })
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => compListEnv(),
      })
      await getBacktestComparisons(50, 100)
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/backtests/compare?limit=50&offset=100'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('APIError preserves status + statusText on getJSON 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ detail: 'Comparison not found' }),
      })
      await expect(getBacktestComparison('missing')).rejects.toMatchObject({
        name: 'APIError',
        message: 'Comparison not found',
        status: 404,
        statusText: 'Not Found',
      })
    })

    it('APIError preserves status + statusText on postJSON 422', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({ detail: 'cannot compare a run with itself' }),
      })
      await expect(
        createBacktestComparison({
          mode: 'manual',
          run_a_public_id: 'r1',
          run_b_public_id: 'r1',
        })
      ).rejects.toMatchObject({
        name: 'APIError',
        message: 'cannot compare a run with itself',
        status: 422,
        statusText: 'Unprocessable Entity',
      })
    })

    it('APIError serialises non-string primitive detail via JSON.stringify', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ detail: 42 }),
      })
      await expect(getBacktestComparison('numeric-detail')).rejects.toMatchObject({
        name: 'APIError',
        message: '42',
        status: 400,
        statusText: 'Bad Request',
      })
    })

    it('APIError preserves structured detail object with error_code + reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({
          detail: {
            error_code: 'instrument_market_data_only',
            symbol: 'MNQM6-CME',
            exchange: 'kraken_equities',
            reason: 'SymbolExchangeCapability.can_trade is False for this (symbol, exchange)',
          },
        }),
      })

      try {
        await getExchangeInstrumentsDetail('kraken_equities')
        throw new Error('expected request to fail')
      } catch (err) {
        expect(err).toBeInstanceOf(SharedAPIError)

        const typed = err as InstanceType<typeof SharedAPIError>

        expect(typed.status).toBe(422)
        expect(typed.message).toMatch(/can_trade is False/)
        expect(typed.details).toMatchObject({
          error_code: 'instrument_market_data_only',
          symbol: 'MNQM6-CME',
        })
      }
    })

    it('APIError falls back to error_code when reason is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({
          detail: { error_code: 'unknown_instrument', symbol: 'X', exchange: 'y' },
        }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string; details?: unknown }

        expect(typed.message).toBe('unknown_instrument')
        expect(typed.details).toBeDefined()
      }
    })

    it('APIError falls back to status + statusText when detail object is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({ detail: {} }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('HTTP 422: Unprocessable Entity')
      }
    })

    it('APIError uses message key from body when neither detail nor reason is set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: 'server exploded' }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('server exploded')
      }
    })

    it('APIError serialises object message values without default object stringification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({
          message: { code: 'server_error', retryable: false },
        }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('{"code":"server_error","retryable":false}')
      }
    })

    it('APIError falls back to HTTP status text when message key is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: undefined }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('HTTP 500: Internal Server Error')
      }
    })

    it('APIError falls back when message object cannot be serialised', async () => {
      const circular: { self?: unknown } = {}

      circular.self = circular
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: circular }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('HTTP 500: Internal Server Error')
      }
    })

    it('APIError falls back when message object serialises to undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({
          message: { toJSON: () => undefined },
        }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('HTTP 500: Internal Server Error')
      }
    })

    it('APIError falls back when message value is an unsupported primitive', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: Symbol('server_error') }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string }

        expect(typed.message).toBe('HTTP 500: Internal Server Error')
      }
    })

    it('APIError falls back to HTTP status text when detail is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ detail: null }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string; details?: unknown }

        expect(typed.message).toBe('HTTP 500: Internal Server Error')
        expect(typed.details).toBeUndefined()
      }
    })

    it('APIError preserves FastAPI validation-error arrays as details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({
          detail: [{ loc: ['body', 'instrument'], msg: 'field required', type: 'missing' }],
        }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string; details?: unknown }

        expect(typed.message).toBe('field required')
        expect(Array.isArray(typed.details)).toBe(true)
      }
    })

    it('APIError falls back gracefully for array details without msg', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({ detail: ['a', 'b'] }),
      })

      try {
        await getExchangeInstrumentsDetail('y')
        throw new Error('expected request to fail')
      } catch (err) {
        const typed = err as { message: string; details?: unknown }

        expect(typed.message).toBe('HTTP 422: Unprocessable Entity')
        expect(Array.isArray(typed.details)).toBe(true)
      }
    })
  })
})
