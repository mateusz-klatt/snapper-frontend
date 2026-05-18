import 'i18next'
import type enCommon from '../locales/en/common.json'
import type enAuth from '../locales/en/auth.json'
import type enOverview from '../locales/en/overview.json'
import type enOrders from '../locales/en/orders.json'
import type enPositions from '../locales/en/positions.json'
import type enStrategies from '../locales/en/strategies.json'
import type enSignals from '../locales/en/signals.json'
import type enBacktests from '../locales/en/backtests.json'
import type enMarket from '../locales/en/market.json'
import type enProcesses from '../locales/en/processes.json'
import type enHealth from '../locales/en/health.json'
import type enAiIntegration from '../locales/en/aiIntegration.json'
import type enAiReviews from '../locales/en/aiReviews.json'
import type enAdmin from '../locales/en/admin.json'
import type enSettings from '../locales/en/settings.json'
import type enAlerts from '../locales/en/alerts.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof enCommon
      auth: typeof enAuth
      overview: typeof enOverview
      orders: typeof enOrders
      positions: typeof enPositions
      strategies: typeof enStrategies
      signals: typeof enSignals
      backtests: typeof enBacktests
      market: typeof enMarket
      processes: typeof enProcesses
      health: typeof enHealth
      aiIntegration: typeof enAiIntegration
      aiReviews: typeof enAiReviews
      admin: typeof enAdmin
      settings: typeof enSettings
      alerts: typeof enAlerts
    }
    keySeparator: '.'
    pluralSeparator: '_'
    nsSeparator: ':'
  }
}
