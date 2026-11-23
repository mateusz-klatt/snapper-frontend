import React, { useState } from 'react'
import clsx from 'clsx'
import { Shield, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePositions, useTrailingStopForCycle } from '../../hooks/queries/positions'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { InstrumentIcon } from '../../components/InstrumentIcon'
import { OrderCardSkeleton } from '../../components/Skeleton'
import { EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/dateFormat'
import { AttachBracketModal } from './AttachBracketModal'
import { AttachTrailingStopModal } from './AttachTrailingStopModal'
import { PortfolioTimeline } from './PortfolioTimeline'
import { NumericValue } from '../../components/NumericValue'
import { readDisplayFields } from '../../lib/displayFields'
import {
  formatMoney,
  formatPrice,
  formatQuantity,
  intlLocaleFromLanguage,
  isDustPosition,
  maxFractionDigits,
  priceFractionDigits,
  quantityFractionDigits,
  signedTone,
  type FormattedNumber,
} from '../../lib/numberFormat'
import { quoteCurrency } from './instrumentQuote'
import type { Position } from '../../types/entities'
import type { TrailingStopByCycleResult } from '../../types/api'
import { Permission } from '../../types/permissions.generated'

type PositionSide = 'LONG' | 'SHORT' | 'FLAT'

const getPositionSide = (quantity: number): PositionSide => {
  if (quantity > 0) return 'LONG'
  if (quantity < 0) return 'SHORT'

  return 'FLAT'
}

const getSideBadgeClass = (side: PositionSide): string => {
  switch (side) {
    case 'LONG':
      return 'text-rising-400 bg-rising-900/20'
    case 'SHORT':
      return 'text-falling-400 bg-falling-900/20'
    case 'FLAT':
    default:
      return 'text-muted-400 bg-muted-900/20'
  }
}

const POSITION_TONE = {
  up: 'text-rising-400',
  down: 'text-falling-400',
  flat: 'text-muted-400',
} as const

const toneClass = (formatted: FormattedNumber | null): string =>
  POSITION_TONE[signedTone(formatted)]

const withUnit = (text: string, unit: string): string => (unit === '' ? text : `${text} ${unit}`)

const sectionQuantityDigits = (rows: readonly Position[]): number =>
  maxFractionDigits(
    rows.map(position =>
      quantityFractionDigits(
        Math.abs(position.quantity),
        readDisplayFields(position).quantityDecimals
      )
    )
  )

const sectionPriceDigits = (rows: readonly Position[]): number =>
  maxFractionDigits(
    rows.flatMap(position => {
      const display = readDisplayFields(position)

      return [position.averagePrice, position.markPrice].flatMap(price =>
        typeof price === 'number' && Number.isFinite(price)
          ? [
              priceFractionDigits(price, {
                priceDecimals: display.priceDecimals,
                exchange: position.exchange,
              }),
            ]
          : []
      )
    })
  )

const positionIdSuffix = (position: Position): string =>
  `${position.instrument}-${position.exchange}-${position.mode ?? 'live'}`

interface PositionRowProps {
  position: Position
  quantityDigits: number
  priceDigits: number
  onAttachBracket: (position: Position) => void
  onAttachTrailingStop: (position: Position) => void
  isTimeTraveling: boolean
  canCreateOrders: boolean
}

const TrailingStopBadge: React.FC<{
  cyclePublicId: string | undefined
  quote: string
  exchange: Position['exchange']
  priceDecimals: number | null
}> = ({ cyclePublicId, quote, exchange, priceDecimals }) => {
  const { t, i18n } = useTranslation('positions')
  const { data } = useTrailingStopForCycle(cyclePublicId)

  if (!data) return null
  const result = data as TrailingStopByCycleResult

  if (result.type === 'message') return null
  const currentStop = result.payload.current_stop ?? 0

  return (
    <span
      className='rounded-full bg-brand-900/20 px-2 py-1 text-xs font-medium tabular-nums text-brand-400'
      data-testid='trailing-stop-badge'
    >
      {currentStop > 0
        ? t('row.trailingStopBadge', {
            stop: withUnit(
              formatPrice(currentStop, {
                locale: intlLocaleFromLanguage(i18n.language),
                exchange,
                priceDecimals,
              }).text,
              quote
            ),
          })
        : t('row.trailingStopPending')}
    </span>
  )
}

const PositionRow: React.FC<PositionRowProps> = ({
  position,
  quantityDigits,
  priceDigits,
  onAttachBracket,
  onAttachTrailingStop,
  isTimeTraveling,
  canCreateOrders,
}) => {
  const { t, i18n } = useTranslation('positions')
  const side = getPositionSide(position.quantity)
  const absQuantity = Math.abs(position.quantity)
  const noValue = t('row.noValue')
  const suffix = positionIdSuffix(position)
  const quote = quoteCurrency(position.instrument)
  const locale = intlLocaleFromLanguage(i18n.language)
  const display = readDisplayFields(position)
  const quantity = formatQuantity(absQuantity, {
    locale,
    quantityDecimals: display.quantityDecimals,
    fractionDigits: quantityDigits,
  })

  const priceOf = (value: number | null | undefined): FormattedNumber | null => {
    if (value == null) return null

    return formatPrice(value, {
      locale,
      fractionDigits: priceDigits,
      priceDecimals: display.priceDecimals,
      exchange: position.exchange,
    })
  }

  const moneyOf = (value: number | null | undefined): FormattedNumber | null => {
    if (value == null || !Number.isFinite(value)) return null

    return formatMoney(value, { locale, currency: quote, signDisplay: 'exceptZero' })
  }

  const average = priceOf(position.averagePrice)
  const mark = priceOf(position.markPrice)
  const unrealized = moneyOf(position.unrealizedPnl)
  const realized = moneyOf(position.realizedPnl)
  const hasCycle = !!position.positionCyclePublicId
  const showLiveProtectiveState = hasCycle && side !== 'FLAT' && !isTimeTraveling
  const canAttach = showLiveProtectiveState && canCreateOrders
  const attachable = position.averagePrice != null

  return (
    <div
      className='rounded-2xl border border-dark-600 bg-alpine-50 p-5 transition-colors hover:border-muted-400'
      data-testid={`position-${suffix}`}
    >
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <InstrumentIcon symbol={position.instrument} exchange={position.exchange} size={28} />
          <span className='font-semibold text-alpine-900'>{position.instrument}</span>
          <span className='text-sm text-muted-500'>{position.exchange}</span>
          <span
            className={clsx('rounded-full px-2 py-1 text-xs font-medium', getSideBadgeClass(side))}
            data-testid={`position-side-${suffix}`}
          >
            {side}
          </span>
          {showLiveProtectiveState && (
            <TrailingStopBadge
              cyclePublicId={position.positionCyclePublicId as string}
              quote={quote}
              exchange={position.exchange}
              priceDecimals={display.priceDecimals}
            />
          )}
        </div>
        <div className='flex items-center gap-2'>
          {canAttach && (
            <button
              type='button'
              onClick={() => onAttachBracket(position)}
              aria-disabled={!attachable}
              className={clsx(
                'flex items-center gap-1 rounded-lg border border-brand-500 px-2 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-900/20',
                !attachable && 'cursor-not-allowed opacity-40'
              )}
              data-testid={`attach-bracket-${suffix}`}
            >
              <Shield size={12} />
              {t('row.slTpButton')}
            </button>
          )}
          {canAttach && (
            <button
              type='button'
              onClick={() => onAttachTrailingStop(position)}
              aria-disabled={!attachable}
              className={clsx(
                'flex items-center gap-1 rounded-lg border border-brand-500 px-2 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-900/20',
                !attachable && 'cursor-not-allowed opacity-40'
              )}
              data-testid={`attach-trailing-stop-${suffix}`}
            >
              <TrendingDown size={12} />
              {t('row.trailButton')}
            </button>
          )}
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-5'>
        <div>
          <div className='text-muted-500'>{t('row.quantity')}</div>
          <div className='font-mono text-alpine-900'>
            <NumericValue formatted={quantity} />
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('row.averageEntry')}</div>
          <div className='font-mono text-alpine-900'>
            {average === null ? (
              noValue
            ) : (
              <>
                <NumericValue formatted={average} />
                {quote === '' ? null : ` ${quote}`}
              </>
            )}
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('row.mark')}</div>
          <div className='font-mono text-alpine-900' data-testid={`position-mark-${suffix}`}>
            {mark === null ? (
              noValue
            ) : (
              <>
                <NumericValue formatted={mark} />
                {quote === '' ? null : ` ${quote}`}
              </>
            )}
          </div>
          {position.markedAt && (
            <div className='text-xs text-muted-500' data-testid={`position-marked-at-${suffix}`}>
              {formatDateTime(position.markedAt, i18n.language)}
            </div>
          )}
        </div>
        <div>
          <div className='text-muted-500'>{t('row.unrealizedPnl')}</div>
          <div
            className={clsx('font-mono', toneClass(unrealized))}
            data-testid={`position-unrealized-${suffix}`}
          >
            {unrealized === null ? (
              noValue
            ) : (
              <>
                <NumericValue formatted={unrealized} />
                {quote === '' ? null : ` ${quote}`}
              </>
            )}
          </div>
        </div>
        <div>
          <div className='text-muted-500'>{t('row.realizedPnl')}</div>
          <div
            className={clsx('font-mono', toneClass(realized))}
            data-testid={`position-realized-${suffix}`}
          >
            {realized === null ? (
              noValue
            ) : (
              <>
                <NumericValue formatted={realized} />
                {quote === '' ? null : ` ${quote}`}
              </>
            )}
          </div>
        </div>
      </div>
      {position.timestamp && (
        <div className='mt-3 text-xs text-muted-500'>
          {t('row.updated', {
            timestamp: formatDateTime(position.timestamp, i18n.language),
          })}
        </div>
      )}
    </div>
  )
}

interface PositionListProps {
  positions: Position[]
  onAttachBracket: (position: Position) => void
  onAttachTrailingStop: (position: Position) => void
  isTimeTraveling: boolean
  canCreateOrders: boolean
}

const PositionList: React.FC<PositionListProps> = ({
  positions,
  onAttachBracket,
  onAttachTrailingStop,
  isTimeTraveling,
  canCreateOrders,
}) => {
  const quantityDigits = sectionQuantityDigits(positions)
  const priceDigits = sectionPriceDigits(positions)

  return (
    <div className='grid gap-4'>
      {positions.map(position => (
        <PositionRow
          key={positionIdSuffix(position)}
          position={position}
          quantityDigits={quantityDigits}
          priceDigits={priceDigits}
          onAttachBracket={onAttachBracket}
          onAttachTrailingStop={onAttachTrailingStop}
          isTimeTraveling={isTimeTraveling}
          canCreateOrders={canCreateOrders}
        />
      ))}
    </div>
  )
}

const DustPositions: React.FC<PositionListProps> = props => {
  const { t } = useTranslation('positions')
  const [open, setOpen] = useState(false)

  return (
    <section data-testid='dust-positions'>
      <button
        type='button'
        aria-expanded={open}
        aria-controls='dust-position-list'
        title={open ? t('dust.hide') : t('dust.show')}
        onClick={() => setOpen(current => !current)}
        data-testid='dust-toggle'
        className='rounded-xl border border-dark-600 bg-alpine-50 px-4 py-3 text-sm font-medium text-alpine-900'
      >
        {t('dust.title', { count: props.positions.length })}
      </button>
      <div id='dust-position-list' hidden={!open} data-testid='dust-position-list' className='mt-4'>
        {open ? <PositionList {...props} /> : null}
      </div>
    </section>
  )
}

export const Positions: React.FC = () => {
  const { t } = useTranslation('positions')
  const { hasPermission } = useAuth()
  const { data: positions = [], isLoading } = usePositions()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const canCreateOrders = hasPermission(Permission.CREATE_ORDERS) && !isTimeTraveling
  const [bracketTarget, setBracketTarget] = useState<Position | null>(null)
  const [trailingStopTarget, setTrailingStopTarget] = useState<Position | null>(null)
  const [activeView, setActiveView] = useState<'current' | 'timeline'>('current')
  const activePositions: Position[] = []
  const dustPositions: Position[] = []

  for (const position of positions) {
    const display = readDisplayFields(position)
    const dust = isDustPosition({
      quantity: position.quantity,
      quantityDecimals: display.quantityDecimals,
      isDust: display.isDust,
    })

    if (dust) dustPositions.push(position)
    else activePositions.push(position)
  }

  const handleAttachBracket = (position: Position) => {
    if (
      !hasPermission(Permission.CREATE_ORDERS) ||
      isTimeTraveling ||
      position.positionCyclePublicId == null ||
      position.averagePrice == null ||
      getPositionSide(position.quantity) === 'FLAT'
    ) {
      return
    }

    setBracketTarget(position)
  }

  const handleAttachTrailingStop = (position: Position) => {
    if (
      !hasPermission(Permission.CREATE_ORDERS) ||
      isTimeTraveling ||
      position.positionCyclePublicId == null ||
      position.averagePrice == null ||
      getPositionSide(position.quantity) === 'FLAT'
    ) {
      return
    }

    setTrailingStopTarget(position)
  }

  const bracketSide =
    bracketTarget && bracketTarget.quantity > 0 ? ('LONG' as const) : ('SHORT' as const)
  const trailingStopSide =
    trailingStopTarget && trailingStopTarget.quantity > 0 ? ('LONG' as const) : ('SHORT' as const)

  return (
    <div className='space-y-6'>
      {canCreateOrders &&
        bracketTarget?.positionCyclePublicId &&
        bracketTarget.averagePrice != null && (
          <AttachBracketModal
            open={true}
            onClose={() => setBracketTarget(null)}
            positionCyclePublicId={bracketTarget.positionCyclePublicId}
            instrument={bracketTarget.instrument}
            side={bracketSide}
            averagePrice={bracketTarget.averagePrice}
          />
        )}
      {canCreateOrders &&
        trailingStopTarget?.positionCyclePublicId &&
        trailingStopTarget.averagePrice != null && (
          <AttachTrailingStopModal
            open={true}
            onClose={() => setTrailingStopTarget(null)}
            positionCyclePublicId={trailingStopTarget.positionCyclePublicId}
            instrument={trailingStopTarget.instrument}
            side={trailingStopSide}
            averagePrice={trailingStopTarget.averagePrice}
          />
        )}
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-alpine-900'>{t('page.title')}</h2>
        <fieldset className='inline-flex rounded-xl border border-dark-600 bg-alpine-50 p-1'>
          <legend className='sr-only'>{t('view.ariaLabel')}</legend>
          {(['current', 'timeline'] as const).map(view => (
            <button
              key={view}
              type='button'
              onClick={() => setActiveView(view)}
              aria-pressed={activeView === view}
              className={clsx(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                activeView === view
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-transparent text-muted-700 hover:border-dark-600 hover:bg-dark-700 hover:text-alpine-900'
              )}
            >
              {t(`view.${view}`)}
            </button>
          ))}
        </fieldset>
      </div>
      {activeView === 'current' ? (
        <div className='space-y-4'>
          {isLoading && (
            <div className='space-y-3'>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </div>
          )}
          {!isLoading && positions.length === 0 && (
            <EmptyState
              icon={
                <svg
                  aria-hidden='true'
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 12l3-3 4 4 5-5 4 4'
                  />
                </svg>
              }
              title={t('empty.title')}
              message={t('empty.message')}
            />
          )}
          {!isLoading && activePositions.length > 0 && (
            <PositionList
              positions={activePositions}
              onAttachBracket={handleAttachBracket}
              onAttachTrailingStop={handleAttachTrailingStop}
              isTimeTraveling={isTimeTraveling}
              canCreateOrders={canCreateOrders}
            />
          )}
          {!isLoading && dustPositions.length > 0 && (
            <DustPositions
              positions={dustPositions}
              onAttachBracket={handleAttachBracket}
              onAttachTrailingStop={handleAttachTrailingStop}
              isTimeTraveling={isTimeTraveling}
              canCreateOrders={canCreateOrders}
            />
          )}
        </div>
      ) : (
        <PortfolioTimeline />
      )}
    </div>
  )
}
