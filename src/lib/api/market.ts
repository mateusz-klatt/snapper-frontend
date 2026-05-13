import { z } from 'zod'
import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  CacheHealthResponseSchema,
  CachedCandlesResponseSchema,
  CachedStatsResponseSchema,
  ExchangeListResponseSchema,
  InstrumentDetailListResponseSchema,
  InstrumentListResponseSchema,
  RelatedInstrumentsResponseSchema,
} from '../schemas/api.generated.zod'
import { CandleDataSchema } from '../schemas/ws.generated.zod'
import type {
  CacheHealthResponse,
  CachedCandlesResponse,
  CachedStatsResponse,
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
