import { z } from 'zod'
import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  ExchangeListResponseSchema,
  InstrumentDetailListResponseSchema,
  InstrumentListResponseSchema,
  RelatedInstrumentsResponseSchema,
} from '../schemas/api.generated.zod'
import { CandleDataSchema } from '../schemas/ws.generated.zod'
import type {
  ExchangeListResponse,
  InstrumentDetailListResponse,
  InstrumentListResponse,
  RelatedInstrumentsResponse,
  CandleData,
} from '../../types/api'

const CandleListResponseSchema = z
  .object({
    type: z.literal('candle_list'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.array(CandleDataSchema).optional(),
    count: z.number().int().optional(),
  })
  .strict()

export async function getCandles(
  instrument: string,
  exchange: string,
  timeframe: string = '1m',
  limit: number = 100
): Promise<CandleData[]> {
  const params = new URLSearchParams({ instrument, exchange, timeframe, limit: String(limit) })
  const response = await apiClient.get(`/api/candles?${params}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  const validated = validateResponse(data, CandleListResponseSchema, '/candles')

  return (validated.payload as CandleData[] | undefined) ?? []
}

export async function getExchanges(): Promise<ExchangeListResponse> {
  const data = await apiClient.getJSON('/api/exchanges')

  return validateResponse(data, ExchangeListResponseSchema, '/exchanges')
}

export async function getExchangeInstruments(exchange: string): Promise<InstrumentListResponse> {
  const data = await apiClient.getJSON(`/api/exchanges/${encodeURIComponent(exchange)}/instruments`)

  return validateResponse(data, InstrumentListResponseSchema, `/exchanges/${exchange}/instruments`)
}

export async function getExchangeInstrumentsDetail(
  exchange: string
): Promise<InstrumentDetailListResponse> {
  const data = await apiClient.getJSON(
    `/api/exchanges/${encodeURIComponent(exchange)}/instruments/detail`
  )

  return validateResponse(
    data,
    InstrumentDetailListResponseSchema,
    `/exchanges/${exchange}/instruments/detail`
  )
}

export async function getRelatedInstruments(
  exchange: string,
  nativeSymbol: string
): Promise<RelatedInstrumentsResponse> {
  const path = `/api/instruments/${encodeURIComponent(exchange)}/${encodeURIComponent(
    nativeSymbol
  )}/related`
  const data = await apiClient.getJSON(path)

  return validateResponse(
    data,
    RelatedInstrumentsResponseSchema,
    '/instruments/:exchange/:native_symbol/related'
  )
}

const CachedCandleSchema = z
  .object({
    open_at_ms: z.number().int(),
    timeframe: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })
  .strict()

const CachedCandlesResponseSchema = z
  .object({
    type: z.literal('cached_candles'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.object({
      candles: z.array(CachedCandleSchema),
      sample_count: z.number().int(),
      is_warm: z.boolean(),
      source: z.union([z.literal('cache'), z.literal('derived'), z.literal('db')]),
    }),
  })
  .strict()

const CachedStatsResponseSchema = z
  .object({
    type: z.literal('cached_stats'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.object({
      left: z.string(),
      right: z.string(),
      pearson_r: z.number().nullable(),
      pearson_n: z.number().int(),
      coint_t: z.number().nullable(),
      coint_pvalue: z.number().nullable(),
      coint_critical_values: z.tuple([z.number(), z.number(), z.number()]).nullable(),
      computed_at: z.iso.datetime().nullable(),
      sample_count: z.number().int(),
      is_warm: z.boolean(),
    }),
  })
  .strict()

const CacheHealthResponseSchema = z
  .object({
    type: z.literal('cache_health'),
    sequence_id: z.number().int(),
    public_id: z.string(),
    timestamp: z.iso.datetime(),
    session_id: z.string(),
    topic: z.string().nullable().optional(),
    payload: z.object({
      instruments_cached: z.number().int(),
      pairs_cached: z.number().int(),
      persist_universe_size: z.number().int(),
    }),
  })
  .strict()

export type CachedCandle = z.infer<typeof CachedCandleSchema>
export type CachedCandlesResponse = z.infer<typeof CachedCandlesResponseSchema>
export type CachedStatsResponse = z.infer<typeof CachedStatsResponseSchema>
export type CacheHealthResponse = z.infer<typeof CacheHealthResponseSchema>

export async function getCachedCandles(
  exchange: string,
  nativeSymbol: string,
  timeframe: string = '1m',
  limit: number = 100
): Promise<CachedCandlesResponse> {
  const params = new URLSearchParams({ timeframe, limit: String(limit) })
  const path = `/api/market/cache/candles/${encodeURIComponent(exchange)}/${encodeURIComponent(
    nativeSymbol
  )}?${params}`
  const data = await apiClient.getJSON(path)

  return validateResponse(
    data,
    CachedCandlesResponseSchema,
    '/market/cache/candles/:exchange/:native_symbol'
  )
}

export async function getCachedPairStats(
  exchangeA: string,
  symbolA: string,
  exchangeB: string,
  symbolB: string
): Promise<CachedStatsResponse> {
  const path =
    `/api/market/cache/stats/${encodeURIComponent(exchangeA)}/${encodeURIComponent(symbolA)}` +
    `/${encodeURIComponent(exchangeB)}/${encodeURIComponent(symbolB)}`
  const data = await apiClient.getJSON(path)

  return validateResponse(
    data,
    CachedStatsResponseSchema,
    '/market/cache/stats/:exchange_a/:symbol_a/:exchange_b/:symbol_b'
  )
}

export async function getCacheHealth(): Promise<CacheHealthResponse> {
  const data = await apiClient.getJSON('/api/market/cache/health')

  return validateResponse(data, CacheHealthResponseSchema, '/market/cache/health')
}
