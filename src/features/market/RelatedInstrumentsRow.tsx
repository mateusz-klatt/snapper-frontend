import { InstrumentIcon } from '../../components/InstrumentIcon'
import { useRelatedInstruments } from '../../hooks/queries/market'

interface Props {
  selectedExchange: string | null
  selectedInstrument: string | null
  onSelect: (selection: { exchange: string; symbol: string }) => void
}

export function RelatedInstrumentsRow({ selectedExchange, selectedInstrument, onSelect }: Props) {
  const { data, isFetching } = useRelatedInstruments(selectedExchange, selectedInstrument)

  if (selectedExchange === null || selectedInstrument === null) {
    return null
  }

  if (isFetching && data === undefined) {
    return null
  }

  if (data === undefined) {
    return null
  }

  const { groups, underlying } = data.payload

  if (groups.length === 0 && underlying === null) {
    return (
      <div className='flex items-center px-3 py-2 text-xs text-muted-500'>
        No related instruments configured for {selectedInstrument} on {selectedExchange}.
      </div>
    )
  }

  return (
    <div
      className='flex flex-wrap items-center gap-3 overflow-x-auto px-3 py-2'
      data-testid='related-instruments-row'
    >
      {groups.map(group => (
        <div key={group.relationship_type} className='flex items-center gap-2'>
          <span className='text-xs text-muted-500 mr-1'>{group.label}:</span>
          {group.items.map(item => {
            const baseClass =
              'inline-flex items-center gap-1 bg-alpine-50 border rounded-sm px-2 py-1 text-xs text-alpine-900'
            const borderClass = item.is_selected
              ? 'border-primary-500'
              : 'border-dark-600 hover:bg-dark-700'

            return (
              <button
                key={item.instrument_public_id}
                type='button'
                aria-current={item.is_selected ? 'true' : undefined}
                onClick={() => onSelect({ exchange: item.exchange, symbol: item.native_symbol })}
                className={`${baseClass} ${borderClass}`}
              >
                <InstrumentIcon symbol={item.native_symbol} exchange={item.exchange} size={14} />
                <span>{item.native_symbol}</span>
                <span className='text-muted-500'>· {item.exchange}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
