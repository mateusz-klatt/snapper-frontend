import { useQuery } from '@tanstack/react-query'
import {
  getAllConfiguredPairStats,
  getCachedCandles,
  getCachedPairStats,
  getCacheHealth,
  getCandles,
  getExchanges,
  getExchangeInstruments,
  getExchangeInstrumentsDetail,
  getRelatedInstruments,
} from '../../lib/api/market'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

export const useCandles = (
  instrument: string,
  exchange: string,
  timeframe: string = '1m',
  limit: number = 100,
  enabled: boolean = true
) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.candles(instrument, exchange, timeframe, limit, asOf),
    queryFn: () => getCandles(instrument, exchange, timeframe, limit),
    enabled: enabled && !!instrument && !!exchange && isAuthenticated,
    staleTime: 2000,
    throwOnError: false,
    retry: 2,
  })
}

export const useExchanges = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.exchanges(asOf),
    queryFn: () => getExchanges(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  })
}

export const useExchangeInstruments = (exchange: string | null) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const exchangeKey = exchange ?? ''

  return useQuery({
    queryKey: queryKeys.exchangeInstruments(exchangeKey, asOf),
    queryFn: () => getExchangeInstruments(exchangeKey),
    enabled: isAuthenticated && !!exchange,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  })
}

export const useExchangeInstrumentsDetail = (exchange: string | null) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const exchangeKey = exchange ?? ''

  return useQuery({
    queryKey: queryKeys.exchangeInstrumentsDetail(exchangeKey, asOf),
    queryFn: () => getExchangeInstrumentsDetail(exchangeKey),
    enabled: isAuthenticated && !!exchange,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  })
}

export const useRelatedInstruments = (exchange: string | null, nativeSymbol: string | null) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const exchangeKey = exchange ?? ''
  const symbolKey = nativeSymbol ?? ''

  return useQuery({
    queryKey: queryKeys.relatedInstruments(exchangeKey, symbolKey, asOf),
    queryFn: () => getRelatedInstruments(exchangeKey, symbolKey),
    enabled: isAuthenticated && !!exchange && !!nativeSymbol,
    staleTime: 60 * 1000,
    throwOnError: false,
  })
}

export const useCachedCandles = (
  exchange: string | null,
  nativeSymbol: string | null,
  timeframe: string = '1m',
  limit: number = 100,
  enabled: boolean = true
) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const exchangeKey = exchange ?? ''
  const symbolKey = nativeSymbol ?? ''

  return useQuery({
    queryKey: queryKeys.cachedCandles(exchangeKey, symbolKey, timeframe, limit, asOf),
    queryFn: () => getCachedCandles(exchangeKey, symbolKey, timeframe, limit),
    enabled: enabled && isAuthenticated && !!exchange && !!nativeSymbol,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
    retry: 1,
  })
}

export const useCachedPairStats = (
  exchangeA: string | null,
  symbolA: string | null,
  exchangeB: string | null,
  symbolB: string | null,
  enabled: boolean = true
) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)
  const left = exchangeA ?? ''
  const symbolLeft = symbolA ?? ''
  const right = exchangeB ?? ''
  const symbolRight = symbolB ?? ''

  return useQuery({
    queryKey: queryKeys.cachedPairStats(left, symbolLeft, right, symbolRight, asOf),
    queryFn: () => getCachedPairStats(left, symbolLeft, right, symbolRight),
    enabled: enabled && isAuthenticated && !!exchangeA && !!symbolA && !!exchangeB && !!symbolB,
    staleTime: 30 * 1000,
    throwOnError: false,
    retry: 1,
  })
}

export const useAllConfiguredPairStats = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.allConfiguredPairStats(asOf),
    queryFn: getAllConfiguredPairStats,
    enabled: enabled && isAuthenticated,
    staleTime: 30 * 1000,
    throwOnError: false,
    retry: 1,
  })
}

export const useCacheHealth = (enabled: boolean = true) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.cacheHealth(asOf),
    queryFn: () => getCacheHealth(),
    enabled: enabled && isAuthenticated,
    staleTime: 10 * 1000,
    throwOnError: false,
  })
}
