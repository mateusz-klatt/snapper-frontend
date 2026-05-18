import type { AppLocale } from '../i18n/types'
import type { FinancialColorPreference } from '../theme/financialColorPreference'

export interface AppState {
  isDarkMode: boolean
  subscribedTopics: string[]
  lastUpdate: string | null
  isConnected: boolean
  connectionLag: number
  asOf: string | null
  isTimeTraveling: boolean
  currentOperatorPublicId: string | null
  currentWalletPublicId: string | null
  locale: AppLocale
  financialColorPreference: FinancialColorPreference
}
export interface MarketDataState {
  selectedExchange: string | null
  selectedInstrument: string | null
  selectedTimeframe: string
  lastPrice: number | null
  lastUpdate: number
}
