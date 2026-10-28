import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui'
import { formatDateTime } from '../../lib/dateFormat'
import { InstrumentIcon } from '../../components/InstrumentIcon'
import { MarketDataOnlyBadge } from '../../components/MarketDataOnlyBadge'
import { MarketChart } from './MarketChart'
import type { WindowCandle } from './chartNavigation'
import { PairStatsRow } from './PairStatsRow'
import { RelatedInstrumentsRow } from './RelatedInstrumentsRow'
import { CacheWarmingBanner } from './CacheWarmingBanner'
import { InstrumentDescriptionBanner } from './InstrumentDescriptionBanner'
import {
  useCachedCandles,
  useExchanges,
  useExchangeInstrumentsDetail,
  useMarketStats,
} from '../../hooks/queries/market'
import { MarketTimeScrubber } from './MarketTimeScrubber'
import { useAppStore } from '../../stores/app'
import { useMarketStore } from '../../stores/market'
import { useMarketSubscription } from '../../hooks/useMarketSubscription'
import { useWebSocketStore } from '../../stores/websocket'
import { useWSDispatcher } from '../../hooks/useWSDispatcher'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon } from 'lucide-react'
import {
  assetClassForExchange,
  formatAtPrecision,
  priceDisplayPrecision,
} from '../../lib/formatPrice'

const TIMEFRAME_VALUES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const

type TimeframeValue = (typeof TIMEFRAME_VALUES)[number]

const TIMEFRAME_SET: ReadonlySet<string> = new Set(TIMEFRAME_VALUES)

const isTimeframeValue = (value: string): value is TimeframeValue => TIMEFRAME_SET.has(value)

export function MarketData() {
  const { t } = useTranslation('market')
  const { t: tCommon } = useTranslation('common')
  const {
    selectedExchange,
    selectedInstrument,
    selectedTimeframe,
    setSelectedExchange,
    setSelectedInstrument,
    setSelectedMarket,
    setSelectedTimeframe,
  } = useMarketStore()

  const [replayAt, setReplayAt] = useState<number | null>(null)
  const isReplay = replayAt !== null

  /**
   * Auto level-of-detail (zoom switches the timeframe). On by default; a manual
   * timeframe selection turns it off so it does not fight the user, and it
   * re-enables when the instrument/exchange changes.
   */
  const [autoLodEnabled, setAutoLodEnabled] = useState(true)

  useEffect(() => {
    setReplayAt(null)
  }, [selectedInstrument, selectedExchange])

  useEffect(() => {
    setAutoLodEnabled(true)
  }, [selectedInstrument, selectedExchange])

  const handleTimeframeSelect = useCallback(
    (value: string) => {
      setAutoLodEnabled(false)
      setSelectedTimeframe(value)
    },
    [setSelectedTimeframe]
  )

  const handleLodTimeframe = useCallback(
    (next: string) => {
      setSelectedTimeframe(next)
    },
    [setSelectedTimeframe]
  )

  const timeframes = useMemo(
    () => TIMEFRAME_VALUES.map(value => ({ value, label: t(`timeframes.${value}`) })),
    [t]
  )
  const selectedTimeframeLabel = isTimeframeValue(selectedTimeframe)
    ? t(`timeframes.${selectedTimeframe}`)
    : selectedTimeframe

  const { isConnected } = useWebSocketStore()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const locale = useAppStore(s => s.locale)
  const dispatcher = useWSDispatcher({ enabled: !isTimeTraveling })
  const subscribed = useMarketSubscription({
    instrument: isReplay || isTimeTraveling ? null : selectedInstrument,
    exchange: selectedExchange,
    timeframe: selectedTimeframe,
    dispatcher,
  })
  const snapshotEnabled = subscribed || !isConnected
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
  const { data: cachedResponse, isFetching } = useCachedCandles(
    selectedExchange,
    selectedInstrument,
    selectedTimeframe,
    100,
    snapshotEnabled && !isReplay && !isTimeTraveling
  )
  const candles = cachedResponse?.payload.candles
  const isWarm = cachedResponse?.payload.is_warm ?? true
  const sampleCount = cachedResponse?.payload.sample_count ?? 0
  const cacheSource = cachedResponse?.payload.source ?? 'cache'

  const liveCandle = useMemo<WindowCandle | null>(() => {
    if (isReplay || isTimeTraveling) {
      return null
    }

    const last = candles?.at(-1)

    if (!last) {
      return null
    }

    return {
      openAtMs: last.open_at_ms,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      complete: false,
    }
  }, [isReplay, isTimeTraveling, candles])

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useMarketStats(selectedExchange, selectedInstrument, replayAt)
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
      !isTimeTraveling &&
      !isReplay &&
      !isFetching &&
      dispatcher &&
      selectedInstrument &&
      selectedExchange &&
      !flushedRef.current
    ) {
      dispatcher.flushBuffer(selectedInstrument, selectedExchange, selectedTimeframe)
      flushedRef.current = true
    }
  }, [
    candles,
    isFetching,
    isTimeTraveling,
    isReplay,
    dispatcher,
    selectedInstrument,
    selectedExchange,
    selectedTimeframe,
  ])
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

  const instrumentKind = useMemo(
    () =>
      (instruments?.payload ?? []).find(row => row.symbol === selectedInstrument)
        ?.instrument_kind ?? null,
    [instruments, selectedInstrument]
  )
  const assetClass = useMemo(
    () => assetClassForExchange(selectedExchange ?? '', instrumentKind),
    [selectedExchange, instrumentKind]
  )
  const pricePrecision = useMemo(
    () => priceDisplayPrecision(stats?.price ?? 0, assetClass),
    [stats?.price, assetClass]
  )

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
      <InstrumentDescriptionBanner
        selectedExchange={selectedExchange}
        selectedInstrument={selectedInstrument}
      />
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
          <Select.Root value={selectedTimeframe} onValueChange={handleTimeframeSelect}>
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
      {selectedInstrument !== null && isTimeframeValue(selectedTimeframe) && (
        <MarketTimeScrubber value={replayAt} onChange={setReplayAt} />
      )}
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
      {statsLoading && <p role='status'>{tCommon('loading')}</p>}
      {statsError !== null && (
        <p role='alert' className='text-loss-600'>
          {tCommon('error')}: {statsError.message}
        </p>
      )}
      {stats && statsError === null && (
        <div className='space-y-2'>
          <p className='text-xs text-muted-500'>
            {t('scrubber.label')}{' '}
            <time dateTime={stats.windowEnd}>
              {formatDateTime(new Date(stats.windowEnd), locale, {
                dateStyle: 'medium',
                timeStyle: 'long',
              })}
            </time>
          </p>
          {stats.change === null && (
            <p role='status' className='text-sm text-muted-500'>
              {t('stats.incomplete')}
            </p>
          )}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <Card title={t('stats.currentPrice')} className='p-4'>
              <div>
                <p className='text-sm text-muted-500'>{t('stats.currentPrice')}</p>
                <p className='text-lg font-semibold'>
                  {stats.price === null ? '—' : formatAtPrecision(stats.price, pricePrecision)}
                </p>
              </div>
            </Card>
            <Card title={t('stats.change24h')} className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-muted-500'>{t('stats.change24h')}</p>
                  <p
                    className={`text-lg font-semibold ${stats.change === null ? '' : stats.change >= 0 ? 'text-rising-600' : 'text-falling-600'}`}
                  >
                    {stats.change === null ? (
                      '—'
                    ) : (
                      <>
                        {stats.change >= 0 ? '+' : ''}
                        {formatAtPrecision(stats.change, pricePrecision)}
                        {stats.changePercent === null
                          ? ''
                          : ` (${stats.changePercent.toFixed(2)}%)`}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </Card>
            <Card title={t('stats.high24h')} className='p-4'>
              <div>
                <p className='text-sm text-muted-500'>{t('stats.high24h')}</p>
                <p className='text-lg font-semibold text-rising-600'>
                  {stats.high24h === null ? '—' : formatAtPrecision(stats.high24h, pricePrecision)}
                </p>
              </div>
            </Card>
            <Card title={t('stats.low24h')} className='p-4'>
              <div>
                <p className='text-sm text-muted-500'>{t('stats.low24h')}</p>
                <p className='text-lg font-semibold text-falling-600'>
                  {stats.low24h === null ? '—' : formatAtPrecision(stats.low24h, pricePrecision)}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
      {}
      <Card title={t('chart.title')} className='flex-1 p-6'>
        {!isReplay && !isTimeTraveling && (
          <CacheWarmingBanner
            isWarm={isWarm}
            sampleCount={sampleCount}
            expected={100}
            source={cacheSource}
          />
        )}
        {selectedInstrument !== null && isTimeframeValue(selectedTimeframe) ? (
          <MarketChart
            exchange={selectedExchange}
            instrument={selectedInstrument}
            timeframe={selectedTimeframe}
            precision={pricePrecision}
            anchorMs={replayAt}
            enabled={selectedExchange !== null}
            liveCandle={liveCandle}
            autoLod={autoLodEnabled && replayAt === null}
            onLodTimeframe={handleLodTimeframe}
          />
        ) : (
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
