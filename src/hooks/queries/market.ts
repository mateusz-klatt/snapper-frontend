import { useQuery } from '@tanstack/react-query'
import {
  getCandles,
  getExchanges,
  getExchangeInstruments,
  getExchangeInstrumentsDetail,
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
