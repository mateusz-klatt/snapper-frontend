/**
 * Generated permission types from backend source of truth.
 * DO NOT EDIT - regenerate with: make ui-gen-permissions
 */

export const Permission = {
  READ_MARKET_DATA: 'read:market_data',
  READ_MARKET_VIEWS: 'read:market_views',
  SUBMIT_MARKET_VIEW: 'submit:market_view',
  SUBMIT_AI_REVIEW_DECISION: 'submit:ai_review_decision',
  READ_ORDERS: 'read:orders',
  CREATE_ORDERS: 'create:orders',
  CANCEL_ORDERS: 'cancel:orders',
  READ_POSITIONS: 'read:positions',
  MANAGE_POSITIONS: 'manage:positions',
  READ_ACCOUNT_STATE: 'read:account_state',
  READ_STRATEGIES: 'read:strategies',
  READ_SIGNALS: 'read:signals',
  START_STRATEGIES: 'start:strategies',
  STOP_STRATEGIES: 'stop:strategies',
  CONFIGURE_STRATEGIES: 'configure:strategies',
  READ_SYSTEM_STATUS: 'read:system_status',
  MANAGE_RUNTIME_DIAGNOSTICS: 'manage:runtime_diagnostics',
  READ_PROCESSES: 'read:processes',
  MANAGE_PROCESSES: 'manage:processes',
  READ_AI_REVIEWS: 'read:ai_reviews',
  READ_AI_INTEGRATION: 'read:ai_integration',
  MANAGE_AI_INTEGRATION: 'manage:ai_integration',
  CONFIGURE_SYSTEM: 'configure:system',
  MANAGE_USERS: 'manage:users',
  READ_WALLET_CREDENTIALS: 'read:wallet_credentials',
  MANAGE_WALLET_CREDENTIALS: 'manage:wallet_credentials',
  MANAGE_SCOPE_GRANTS: 'manage:scope_grants',
  IMPERSONATE_OPERATOR: 'impersonate:operator',
  READ_BACKTESTS: 'read:backtests',
  CREATE_BACKTEST_COMPARISONS: 'create:backtest_comparisons',
  MANAGE_BACKTESTS: 'manage:backtests',
  READ_NOTIFICATIONS: 'read:notifications',
  MANAGE_NOTIFICATION_DEVICES: 'manage:notification_devices',
  MANAGE_PAIRED_EXECUTION: 'manage:paired_execution',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

type UserRole = 'ai_researcher' | 'ai_reviewer' | 'ai_delegate' | 'viewer' | 'operator' | 'admin'

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ai_researcher: ['read:market_data', 'read:market_views', 'submit:market_view'],
  ai_reviewer: ['create:backtest_comparisons', 'manage:runtime_diagnostics', 'read:backtests', 'read:market_data', 'read:market_views', 'read:orders', 'read:positions', 'read:signals', 'read:strategies', 'read:system_status', 'submit:ai_review_decision'],
  ai_delegate: ['cancel:orders', 'create:backtest_comparisons', 'create:orders', 'manage:positions', 'manage:runtime_diagnostics', 'read:backtests', 'read:market_data', 'read:market_views', 'read:orders', 'read:positions', 'read:signals', 'read:strategies', 'read:system_status', 'submit:ai_review_decision'],
  viewer: ['manage:notification_devices', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:backtests', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:positions', 'read:processes', 'read:signals', 'read:strategies', 'read:system_status'],
  operator: ['cancel:orders', 'configure:strategies', 'create:backtest_comparisons', 'create:orders', 'manage:ai_integration', 'manage:backtests', 'manage:notification_devices', 'manage:paired_execution', 'manage:positions', 'manage:processes', 'manage:runtime_diagnostics', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:backtests', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:positions', 'read:processes', 'read:signals', 'read:strategies', 'read:system_status', 'start:strategies', 'stop:strategies'],
  admin: ['cancel:orders', 'configure:strategies', 'configure:system', 'create:backtest_comparisons', 'create:orders', 'impersonate:operator', 'manage:ai_integration', 'manage:backtests', 'manage:notification_devices', 'manage:paired_execution', 'manage:positions', 'manage:processes', 'manage:runtime_diagnostics', 'manage:scope_grants', 'manage:users', 'manage:wallet_credentials', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:backtests', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:positions', 'read:processes', 'read:signals', 'read:strategies', 'read:system_status', 'read:wallet_credentials', 'start:strategies', 'stop:strategies', 'submit:ai_review_decision', 'submit:market_view'],
} as const

export const RESOURCE_PERMISSIONS: Record<string, readonly Permission[]> = {
  'overview': [],
  'market': ['read:market_data'],
  'processes': ['read:processes'],
  'strategies': ['read:strategies'],
  'orders': ['read:orders'],
  'positions': ['read:positions'],
  'accounts': ['read:account_state'],
  'signals': ['read:signals'],
  'health': ['read:system_status'],
  'admin': ['manage:users'],
  'settings': ['configure:system'],
  'backtests': ['read:backtests'],
  'ai-integration': ['read:ai_integration'],
  'ai-reviews': ['read:ai_reviews', 'submit:ai_review_decision'],
  'notifications': ['read:notifications'],
} as const
