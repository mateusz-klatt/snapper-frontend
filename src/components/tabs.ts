import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  BellRing,
  ChartCandlestick,
  ClipboardList,
  Gauge,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react'

type TabType =
  | 'overview'
  | 'market'
  | 'processes'
  | 'strategies'
  | 'orders'
  | 'positions'
  | 'signals'
  | 'backtests'
  | 'health'
  | 'notifications'
  | 'admin'
  | 'ai-integration'
  | 'ai-reviews'
  | 'settings'
type NavLabelKey =
  | 'nav.overview'
  | 'nav.market'
  | 'nav.processes'
  | 'nav.strategies'
  | 'nav.orders'
  | 'nav.positions'
  | 'nav.signals'
  | 'nav.backtests'
  | 'nav.health'
  | 'nav.alerts'
  | 'nav.admin'
  | 'nav.aiIntegration'
  | 'nav.aiReviews'
  | 'nav.settings'

interface TabConfig {
  id: TabType
  label: string
  labelKey: NavLabelKey
  icon: LucideIcon
}

export const ALL_TABS: readonly TabConfig[] = [
  { id: 'overview', label: 'Overview', labelKey: 'nav.overview', icon: LayoutDashboard },
  { id: 'market', label: 'Market Data', labelKey: 'nav.market', icon: ChartCandlestick },
  { id: 'processes', label: 'Processes', labelKey: 'nav.processes', icon: Workflow },
  { id: 'strategies', label: 'Strategies', labelKey: 'nav.strategies', icon: Gauge },
  {
    id: 'orders',
    label: 'Orders & Executions',
    labelKey: 'nav.orders',
    icon: ClipboardList,
  },
  { id: 'positions', label: 'Positions', labelKey: 'nav.positions', icon: TrendingUp },
  { id: 'signals', label: 'Signals', labelKey: 'nav.signals', icon: Bell },
  { id: 'backtests', label: 'Backtests', labelKey: 'nav.backtests', icon: BarChart3 },
  { id: 'health', label: 'Health', labelKey: 'nav.health', icon: HeartPulse },
  { id: 'notifications', label: 'Alerts', labelKey: 'nav.alerts', icon: BellRing },
  { id: 'admin', label: 'Administration', labelKey: 'nav.admin', icon: Shield },
  { id: 'ai-integration', label: 'AI Integration', labelKey: 'nav.aiIntegration', icon: Zap },
  { id: 'ai-reviews', label: 'AI Reviews', labelKey: 'nav.aiReviews', icon: Inbox },
  { id: 'settings', label: 'Settings', labelKey: 'nav.settings', icon: Settings },
] as const
