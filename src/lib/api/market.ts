import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  CacheHealthResponseSchema,
  CachedCandlesResponseSchema,
  CachedStatsResponseSchema,
  CandleListResponseSchema,
  ExchangeListResponseSchema,
  InstrumentDetailListResponseSchema,
  InstrumentListResponseSchema,
  ListedCachedStatsResponseSchema,
  RelatedInstrumentsResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  CacheHealthResponse,
  CachedCandlesResponse,
  CachedStatsResponse,
  ExchangeListResponse,
  InstrumentDetailListResponse,
  InstrumentListResponse,
  ListedCachedStatsResponse,
  RelatedInstrumentsResponse,
  CandleData,
} from '../../types/api'

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

  return validated.payload
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
  const params = new URLSearchParams({
    instrument: nativeSymbol,
    exchange,
    timeframe,
    limit: String(limit),
  })
  const data = await apiClient.getJSON(`/api/candles/cache?${params}`)

  return validateResponse(data, CachedCandlesResponseSchema, '/candles/cache')
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

export async function getAllConfiguredPairStats(): Promise<ListedCachedStatsResponse> {
  const data = await apiClient.getJSON('/api/market/cache/stats/configured')

  return validateResponse(
    data,
    ListedCachedStatsResponseSchema,
    '/market/cache/stats/configured'
  )
}

export async function getCacheHealth(): Promise<CacheHealthResponse> {
  const data = await apiClient.getJSON('/api/market/cache/health')

  return validateResponse(data, CacheHealthResponseSchema, '/market/cache/health')
}
