import type { PnlInstrumentContributionData } from '../../types/api'

type PnlInstrumentIdentity = Pick<
  PnlInstrumentContributionData,
  'instrument_public_id' | 'native_symbol' | 'exchange'
>

export const formatPnlInstrumentIdentity = (identity: PnlInstrumentIdentity): string => {
  if (identity.native_symbol === null) return identity.instrument_public_id
  if (identity.exchange === null) return identity.native_symbol

  return `${identity.native_symbol} · ${identity.exchange}`
}
