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
  READ_SYSTEM_SETTINGS: 'read:system_settings',
  CONFIGURE_SYSTEM: 'configure:system',
  READ_USERS: 'read:users',
  MANAGE_USERS: 'manage:users',
  MANAGE_SELF_ACCOUNT: 'manage:self_account',
  READ_DESK_MEMBERSHIPS: 'read:desk_memberships',
  MANAGE_DESK_MEMBERSHIPS: 'manage:desk_memberships',
  READ_WALLET_CREDENTIALS: 'read:wallet_credentials',
  MANAGE_WALLET_CREDENTIALS: 'manage:wallet_credentials',
  READ_SCOPE_GRANTS: 'read:scope_grants',
  MANAGE_SCOPE_GRANTS: 'manage:scope_grants',
  READ_ALL_SCOPES: 'read:all_scopes',
  READ_POSITION_CYCLES: 'read:position_cycles',
  INITIALIZE_PNL_ANCHORS: 'initialize:pnl_anchors',
  IMPERSONATE_OPERATOR: 'impersonate:operator',
  READ_BACKTESTS: 'read:backtests',
  CREATE_BACKTEST_COMPARISONS: 'create:backtest_comparisons',
  MANAGE_BACKTESTS: 'manage:backtests',
  READ_NOTIFICATIONS: 'read:notifications',
  MANAGE_NOTIFICATION_DEVICES: 'manage:notification_devices',
  MANAGE_PAIRED_EXECUTION: 'manage:paired_execution',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

type UserRole = 'ai_researcher' | 'ai_reviewer' | 'ai_delegate' | 'viewer' | 'auditor' | 'operator' | 'admin'

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ai_researcher: ['manage:self_account', 'read:market_data', 'read:market_views', 'read:scope_grants', 'submit:market_view'],
  ai_reviewer: ['create:backtest_comparisons', 'initialize:pnl_anchors', 'manage:runtime_diagnostics', 'manage:self_account', 'read:backtests', 'read:market_data', 'read:market_views', 'read:orders', 'read:positions', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_status', 'submit:ai_review_decision'],
  ai_delegate: ['cancel:orders', 'create:backtest_comparisons', 'create:orders', 'initialize:pnl_anchors', 'manage:positions', 'manage:runtime_diagnostics', 'manage:self_account', 'read:backtests', 'read:market_data', 'read:market_views', 'read:orders', 'read:positions', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_status', 'submit:ai_review_decision'],
  viewer: ['initialize:pnl_anchors', 'manage:notification_devices', 'manage:self_account', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:backtests', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:positions', 'read:processes', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_status'],
  auditor: ['read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:all_scopes', 'read:backtests', 'read:desk_memberships', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:position_cycles', 'read:positions', 'read:processes', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_settings', 'read:system_status', 'read:users', 'read:wallet_credentials'],
  operator: ['cancel:orders', 'configure:strategies', 'create:backtest_comparisons', 'create:orders', 'initialize:pnl_anchors', 'manage:ai_integration', 'manage:backtests', 'manage:desk_memberships', 'manage:notification_devices', 'manage:paired_execution', 'manage:positions', 'manage:processes', 'manage:runtime_diagnostics', 'manage:self_account', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:backtests', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:positions', 'read:processes', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_status', 'start:strategies', 'stop:strategies'],
  admin: ['cancel:orders', 'configure:strategies', 'configure:system', 'create:backtest_comparisons', 'create:orders', 'impersonate:operator', 'initialize:pnl_anchors', 'manage:ai_integration', 'manage:backtests', 'manage:desk_memberships', 'manage:notification_devices', 'manage:paired_execution', 'manage:positions', 'manage:processes', 'manage:runtime_diagnostics', 'manage:scope_grants', 'manage:self_account', 'manage:users', 'manage:wallet_credentials', 'read:account_state', 'read:ai_integration', 'read:ai_reviews', 'read:all_scopes', 'read:backtests', 'read:desk_memberships', 'read:market_data', 'read:market_views', 'read:notifications', 'read:orders', 'read:position_cycles', 'read:positions', 'read:processes', 'read:scope_grants', 'read:signals', 'read:strategies', 'read:system_settings', 'read:system_status', 'read:users', 'read:wallet_credentials', 'start:strategies', 'stop:strategies', 'submit:ai_review_decision', 'submit:market_view'],
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
  'admin': ['manage:desk_memberships', 'manage:users', 'read:desk_memberships', 'read:users', 'read:wallet_credentials'],
  'settings': ['configure:system', 'read:system_settings'],
  'backtests': ['read:backtests'],
  'ai-integration': ['read:ai_integration'],
  'ai-reviews': ['read:ai_reviews', 'submit:ai_review_decision'],
  'notifications': ['read:notifications'],
} as const
