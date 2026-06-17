import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Radio } from 'lucide-react'
import { useAppStore } from '../../stores/app'
import { formatDateTime } from '../../lib/dateFormat'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const SLIDER_LOOKBACK_MS = 30 * DAY_MS
const NOW_REFRESH_MS = 30_000
const LIVE_EDGE_MS = MINUTE_MS

type PresetKey = 'live' | 'h1' | 'd1' | 'w1' | 'mo1'

interface ScrubberPreset {
  key: PresetKey
  deltaMs: number | null
}

const PRESETS: readonly ScrubberPreset[] = [
  { key: 'live', deltaMs: null },
  { key: 'h1', deltaMs: HOUR_MS },
  { key: 'd1', deltaMs: DAY_MS },
  { key: 'w1', deltaMs: 7 * DAY_MS },
  { key: 'mo1', deltaMs: 30 * DAY_MS },
]

interface MarketTimeScrubberProps {
  value: number | null
  onChange: (replayAt: number | null) => void
  disabled?: boolean
}

/**
 * Timeline scrubber for the market view.
 *
 * Drag the handle (or pick a preset) to rewind the chart to a market-time
 * midpoint; the chart then loads a window centered on that instant. Snapping
 * the handle to the right edge — or the Live preset — returns to the live
 * cache + websocket stream (``value === null``). It is market-LOCAL: it never
 * engages the app-wide time-travel mode, so order placement stays enabled
 * while you scrub history.
 */
export function MarketTimeScrubber({
  value,
  onChange,
  disabled = false,
}: Readonly<MarketTimeScrubberProps>) {
  const { t } = useTranslation('market')
  const locale = useAppStore(s => s.locale)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_REFRESH_MS)

    return () => clearInterval(id)
  }, [])

  const isReplay = value !== null
  const sliderMin = Math.min(now - SLIDER_LOOKBACK_MS, value ?? now)
  const sliderValue = value ?? now

  const handleSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)

    onChange(next >= now - LIVE_EDGE_MS ? null : next)
  }

  return (
    <div className='flex flex-col gap-2 rounded-md border border-dark-600 bg-alpine-50 p-3'>
      <div className='flex items-center gap-2 text-sm'>
        {isReplay ? (
          <History size={16} className='text-brand-500' />
        ) : (
          <Radio size={16} className='text-rising-600' />
        )}
        <span className='font-medium text-muted-600'>{t('scrubber.label')}</span>
        <span
          className={`font-semibold ${isReplay ? 'text-brand-600' : 'text-rising-600'}`}
          aria-live='polite'
        >
          {value !== null ? formatDateTime(new Date(value), locale) : t('scrubber.live')}
        </span>
      </div>
      <input
        type='range'
        min={sliderMin}
        max={now}
        step={MINUTE_MS}
        value={sliderValue}
        onChange={handleSlider}
        disabled={disabled}
        aria-label={t('scrubber.sliderAriaLabel')}
        className='w-full cursor-pointer accent-brand-500 disabled:cursor-not-allowed disabled:opacity-50'
      />
      <div className='flex flex-wrap gap-1'>
        {PRESETS.map(preset => {
          const active = preset.deltaMs === null && !isReplay

          return (
            <button
              key={preset.key}
              type='button'
              disabled={disabled}
              onClick={() => onChange(preset.deltaMs === null ? null : now - preset.deltaMs)}
              className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                active
                  ? 'bg-brand-500 text-white'
                  : 'border border-dark-600 text-muted-600 hover:bg-dark-700'
              }`}
            >
              {t(`scrubber.presets.${preset.key}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
