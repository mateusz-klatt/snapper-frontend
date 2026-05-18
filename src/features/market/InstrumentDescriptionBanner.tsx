import { useTranslation } from 'react-i18next'
import { useRelatedInstruments } from '../../hooks/queries/market'

interface Props {
  selectedExchange: string | null
  selectedInstrument: string | null
}

const ASSET_CLASS_KEYS = ['crypto', 'commodity', 'forex', 'index', 'yield', 'unknown'] as const

type AssetClassKey = (typeof ASSET_CLASS_KEYS)[number]

const isAssetClassKey = (value: string): value is AssetClassKey =>
  (ASSET_CLASS_KEYS as readonly string[]).includes(value)

const normalizeAssetClass = (value: string): AssetClassKey =>
  isAssetClassKey(value) ? value : 'unknown'

/** Maps related-underlying asset classes to the MarketData badge palette. */
const assetClassColor = (assetClass: AssetClassKey): string => {
  switch (assetClass) {
    case 'crypto':
      return 'border-orange-300 bg-orange-50 text-orange-700'
    case 'commodity':
      return 'border-amber-300 bg-amber-50 text-amber-700'
    case 'forex':
      return 'border-blue-300 bg-blue-50 text-blue-700'
    case 'index':
      return 'border-violet-300 bg-violet-50 text-violet-700'
    case 'yield':
      return 'border-teal-300 bg-teal-50 text-teal-700'
    case 'unknown':
      return 'border-gray-300 bg-gray-50 text-gray-700'
  }
}

export function InstrumentDescriptionBanner({
  selectedExchange,
  selectedInstrument,
}: Readonly<Props>) {
  const { t } = useTranslation('market')
  const { data, isFetching, isError } = useRelatedInstruments(selectedExchange, selectedInstrument)

  if (selectedExchange === null || selectedInstrument === null) {
    return null
  }

  if (isFetching && data === undefined) {
    return (
      <section
        aria-label={t('description.label')}
        className='flex min-h-16 flex-col gap-2 rounded-sm border border-dark-600 bg-alpine-50 px-3 py-3 sm:flex-row sm:items-center'
        data-testid='instrument-description-banner-skeleton'
      >
        <div className='h-6 w-28 rounded-sm bg-dark-700 animate-pulse' />
        <div className='h-4 w-full max-w-2xl rounded-sm bg-dark-700 animate-pulse' />
      </section>
    )
  }

  const underlying = data?.payload.underlying ?? null

  if (underlying === null) {
    return null
  }

  const assetClass = normalizeAssetClass(underlying.asset_class)
  const assetClassLabel = t(`assetClass.${assetClass}`)
  const fallback = t('description.fallback', {
    name: underlying.name,
    assetClass: assetClassLabel,
  })
  const description = isError ? fallback : (underlying.description ?? fallback)
  const chipLabel = underlying.sector ?? assetClassLabel

  return (
    <section
      aria-label={t('description.label')}
      className='flex min-h-16 flex-col gap-2 rounded-sm border border-dark-600 bg-alpine-50 px-3 py-3 sm:flex-row sm:items-start'
      data-testid='instrument-description-banner'
    >
      {!isError && (
        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-sm border px-2 py-1 text-xs font-medium ${assetClassColor(assetClass)}`}
        >
          {chipLabel}
        </span>
      )}
      <p className='text-sm leading-6 text-alpine-900'>{description}</p>
    </section>
  )
}
