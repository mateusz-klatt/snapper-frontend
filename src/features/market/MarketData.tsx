import { useMemo, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, LoadingSpinner } from '../../components/ui'
import { InstrumentIcon } from '../../components/InstrumentIcon'
import { MarketDataOnlyBadge } from '../../components/MarketDataOnlyBadge'
import { LightweightChart } from '../../components/LightweightChart'
import { PairStatsRow } from './PairStatsRow'
import { RelatedInstrumentsRow } from './RelatedInstrumentsRow'
import { CacheWarmingBanner } from './CacheWarmingBanner'
import {
  useCachedCandles,
  useExchanges,
  useExchangeInstrumentsDetail,
} from '../../hooks/queries/market'
import { useAppStore } from '../../stores/app'
import { useMarketStore } from '../../stores/market'
import { useMarketSubscription } from '../../hooks/useMarketSubscription'
import { useWebSocketStore } from '../../stores/websocket'
import { useWSDispatcher } from '../../hooks/useWSDispatcher'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon } from 'lucide-react'
import { Time } from 'lightweight-charts'

interface FormattedCandle {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

const TIMEFRAME_VALUES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const

type TimeframeValue = (typeof TIMEFRAME_VALUES)[number]

const TIMEFRAME_SET: ReadonlySet<string> = new Set(TIMEFRAME_VALUES)

const isTimeframeValue = (value: string): value is TimeframeValue => TIMEFRAME_SET.has(value)

export function MarketData() {
  const { t } = useTranslation('market')
  const {
    selectedExchange,
    selectedInstrument,
    selectedTimeframe,
    setSelectedExchange,
    setSelectedInstrument,
    setSelectedMarket,
    setSelectedTimeframe,
  } = useMarketStore()

  const timeframes = useMemo(
    () => TIMEFRAME_VALUES.map(value => ({ value, label: t(`timeframes.${value}`) })),
    [t]
  )
  const selectedTimeframeLabel = isTimeframeValue(selectedTimeframe)
    ? t(`timeframes.${selectedTimeframe}`)
    : selectedTimeframe

  const { isConnected } = useWebSocketStore()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const dispatcher = useWSDispatcher({ enabled: !isTimeTraveling })
  const subscribed = useMarketSubscription({
    instrument: selectedInstrument,
    exchange: selectedExchange,
    timeframe: selectedTimeframe,
    dispatcher,
  })
  const snapshotEnabled = subscribed || !isConnected || isTimeTraveling
  const { data: exchanges } = useExchanges()
  const { data: instruments } = useExchangeInstrumentsDetail(selectedExchange)
  const capabilityMap = useMemo(() => {
    const map = new Map<string, boolean>()

    for (const row of instruments?.payload ?? []) {
      map.set(row.symbol, row.can_trade)
    }

    return map
  }, [instruments])
  const isSelectedMarketDataOnly =
    selectedInstrument !== null && capabilityMap.get(selectedInstrument) === false
  const {
    data: cachedResponse,
    isLoading,
    error,
    isFetching,
  } = useCachedCandles(
    selectedExchange,
    selectedInstrument,
    selectedTimeframe,
    100,
    snapshotEnabled
  )
  const candles = cachedResponse?.payload.candles
  const isWarm = cachedResponse?.payload.is_warm ?? true
  const sampleCount = cachedResponse?.payload.sample_count ?? 0
  const cacheSource = cachedResponse?.payload.source ?? 'cache'
  const flushedRef = useRef(false)

  useEffect(() => {
    flushedRef.current = false
  }, [selectedInstrument, selectedExchange, selectedTimeframe])
  useEffect(() => {
    if (subscribed) {
      flushedRef.current = false
    }
  }, [subscribed])
  useEffect(() => {
    if (
      candles &&
      !isFetching &&
      dispatcher &&
      selectedInstrument &&
      selectedExchange &&
      !flushedRef.current
    ) {
      dispatcher.flushBuffer(selectedInstrument, selectedExchange, selectedTimeframe)
      flushedRef.current = true
    }
  }, [candles, isFetching, dispatcher, selectedInstrument, selectedExchange, selectedTimeframe])
  const allInstrumentSymbols = useMemo(
    () => (instruments?.payload ?? []).map(row => row.symbol),
    [instruments]
  )
  const allInstrumentSymbolsSet = useMemo(
    () => new Set(allInstrumentSymbols),
    [allInstrumentSymbols]
  )
  const [instrumentInput, setInstrumentInput] = useState(selectedInstrument ?? '')

  useEffect(() => {
    setInstrumentInput(selectedInstrument ?? '')
  }, [selectedInstrument])

  const handleInstrumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    setInstrumentInput(value)

    if (allInstrumentSymbolsSet.has(value)) {
      setSelectedInstrument(value)
    }
  }

  const handleInstrumentBlur = () => {
    if (!allInstrumentSymbolsSet.has(instrumentInput)) {
      setInstrumentInput(selectedInstrument ?? '')
    }
  }

  const chartData: FormattedCandle[] = useMemo(() => {
    if (!candles || isFetching) return []
    const sortedCandles = [...candles].sort((a, b) => a.open_at_ms - b.open_at_ms)
    const deduped: FormattedCandle[] = []

    for (const candle of sortedCandles) {
      const unixTime = Math.floor(candle.open_at_ms / 1000)
      const previous = deduped.at(-1)

      if (previous?.time === unixTime) {
        deduped[deduped.length - 1] = {
          time: unixTime as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }
      } else {
        deduped.push({
          time: unixTime as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        })
      }
    }

    return deduped
  }, [candles, isFetching])

  const stats = useMemo(() => {
    if (!chartData.length) return null
    const latest = chartData.at(-1) as FormattedCandle
    const previous = chartData.length > 1 ? (chartData.at(-2) as FormattedCandle) : null
    const change = previous ? latest.close - previous.close : 0
    const changePercent = previous ? (change / previous.close) * 100 : 0
    const prices = chartData.map(c => c.close)
    const high24h = Math.max(...prices)
    const low24h = Math.min(...prices)

    return {
      price: latest.close,
      change,
      changePercent,
      high24h,
      low24h,
    }
  }, [chartData])

  return (
    <div className='flex flex-col space-y-6'>
      {}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          {selectedInstrument !== null && selectedExchange !== null && (
            <InstrumentIcon symbol={selectedInstrument} exchange={selectedExchange} size={32} />
          )}
          <h2 className='text-xl font-bold'>{t('page.title')}</h2>
          {isSelectedMarketDataOnly && <MarketDataOnlyBadge size='md' />}
        </div>
      </div>
      {}
      <div className='flex flex-wrap items-center gap-4'>
        <div className='flex items-center gap-2'>
          <label htmlFor='exchange-select' className='text-sm font-medium text-muted-600'>
            {t('controls.exchange')}
          </label>
          <Select.Root
            {...(selectedExchange === null ? {} : { value: selectedExchange })}
            onValueChange={setSelectedExchange}
          >
            <Select.Trigger
              id='exchange-select'
              className='inline-flex items-center justify-center rounded-sm px-3 py-2 text-sm bg-alpine-50 border border-dark-600 text-alpine-900 hover:bg-dark-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            >
              <Select.Value placeholder={t('controls.selectExchange')} />
              <Select.Icon className='ml-2'>
                <ChevronDownIcon size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className='z-50 overflow-hidden bg-alpine-50 rounded-md shadow-lg border border-dark-600'>
                <Select.Viewport className='p-1'>
                  {(exchanges?.payload ?? []).map(ex => (
                    <Select.Item
                      key={ex}
                      value={ex}
                      className='flex select-none items-center px-3 py-2 text-sm text-alpine-900 rounded-sm hover:bg-dark-700 focus:bg-dark-700 cursor-pointer'
                    >
                      <Select.ItemText>{ex}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div className='flex items-center gap-2'>
          <label htmlFor='instrument-search' className='text-sm font-medium text-muted-600'>
            {t('controls.instrument')}
          </label>
          <input
            id='instrument-search'
            type='text'
            list='instrument-options'
            value={instrumentInput}
            onChange={handleInstrumentChange}
            onBlur={handleInstrumentBlur}
            placeholder={t('controls.searchInstrument')}
            disabled={!selectedExchange}
            className='inline-flex items-center justify-center rounded-sm px-3 py-2 text-sm bg-alpine-50 border border-dark-600 text-alpine-900 hover:bg-dark-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50'
          />
          <datalist id='instrument-options'>
            {allInstrumentSymbols.map(sym => (
              <option key={sym} value={sym} />
            ))}
          </datalist>
        </div>
        <div className='flex items-center gap-2'>
          <label htmlFor='timeframe-select' className='text-sm font-medium text-muted-600'>
            {t('controls.timeframe')}
          </label>
          <Select.Root value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <Select.Trigger
              id='timeframe-select'
              className='inline-flex items-center justify-center rounded-sm px-3 py-2 text-sm bg-alpine-50 border border-dark-600 text-alpine-900 hover:bg-dark-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            >
              <Select.Value />
              <Select.Icon className='ml-2'>
                <ChevronDownIcon size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className='z-50 overflow-hidden bg-alpine-50 rounded-md shadow-lg border border-dark-600'>
                <Select.Viewport className='p-1'>
                  {timeframes.map(timeframe => (
                    <Select.Item
                      key={timeframe.value}
                      value={timeframe.value}
                      className='flex select-none items-center px-3 py-2 text-sm text-alpine-900 rounded-sm hover:bg-dark-700 focus:bg-dark-700 cursor-pointer'
                    >
                      <Select.ItemText>{timeframe.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
      <RelatedInstrumentsRow
        selectedExchange={selectedExchange}
        selectedInstrument={selectedInstrument}
        onSelect={({ exchange, symbol }) => setSelectedMarket({ exchange, instrument: symbol })}
      />
      <PairStatsRow
        selectedExchange={selectedExchange}
        selectedInstrument={selectedInstrument}
        onSelect={({ exchange, symbol }) => setSelectedMarket({ exchange, instrument: symbol })}
      />
      {}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card title={t('stats.currentPrice')} className='p-4'>
            <div>
              <p className='text-sm text-muted-500'>{t('stats.currentPrice')}</p>
              <p className='text-lg font-semibold'>{stats.price.toFixed(5)}</p>
            </div>
          </Card>
          <Card title={t('stats.change24h')} className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-500'>{t('stats.change24h')}</p>
                <p
                  className={`text-lg font-semibold ${stats.change >= 0 ? 'text-gain-600' : 'text-loss-600'}`}
                >
                  {stats.change >= 0 ? '+' : ''}
                  {stats.change.toFixed(5)} ({stats.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </Card>
          <Card title={t('stats.high24h')} className='p-4'>
            <div>
              <p className='text-sm text-muted-500'>{t('stats.high24h')}</p>
              <p className='text-lg font-semibold text-gain-600'>{stats.high24h.toFixed(5)}</p>
            </div>
          </Card>
          <Card title={t('stats.low24h')} className='p-4'>
            <div>
              <p className='text-sm text-muted-500'>{t('stats.low24h')}</p>
              <p className='text-lg font-semibold text-loss-600'>{stats.low24h.toFixed(5)}</p>
            </div>
          </Card>
        </div>
      )}
      {}
      <Card title={t('chart.title')} className='flex-1 p-6'>
        <CacheWarmingBanner
          isWarm={isWarm}
          sampleCount={sampleCount}
          expected={100}
          source={cacheSource}
        />
        {isLoading && (
          <div className='flex items-center justify-center h-full'>
            <LoadingSpinner />
          </div>
        )}
        {!isLoading && error && (
          <div className='flex items-center justify-center h-full'>
            <p className='text-loss-600'>
              {t('chart.errorPrefix')} {error?.message || t('chart.unknownError')}
            </p>
          </div>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <LightweightChart data={chartData} height={400} />
        )}
        {!isLoading && !error && chartData.length === 0 && (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center'>
              <p className='text-muted-500 mb-2'>
                {t('chart.noDataTitle', { instrument: selectedInstrument ?? '' })}
              </p>
              <p className='text-sm text-muted-500'>
                {t('chart.noDataHint', {
                  timeframe: selectedTimeframeLabel.toLowerCase(),
                })}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
