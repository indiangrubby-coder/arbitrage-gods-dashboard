export interface Account {
  account_id: string
  vendor_name: string
  spend_today: number | null
  daily_limit_display: number | null
  spend_progress_percent: string | null
  account_status: number
  cpc: number | null
  outbound_clicks: number | null
  active_ads_count: number | null
  total_ads_count: number | null
  account_balance: number | null
  snapshot_time: string
  cap_source?: string
  is_suspended?: boolean
}

export interface MockAccount {
  account_id: string
  vendor_name: string
  initial_cap_cents: number
  cap_growth_rate: 'fast' | 'normal' | 'slow' | 'declining'
  base_cpc: number
  suspension_probability: number
  created_at: string
}

export interface SimulationConfig {
  id: number
  simulation_mode: boolean
  update_interval: number
  last_update: string | null
  accounts_count: number
  suspension_rate: number
}

export interface User {
  id: string
  email: string
  user_metadata: {
    role: 'admin' | 'viewer'
    name?: string
  }
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role?: 'admin' | 'viewer') => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<boolean>
  updatePassword: (newPassword: string) => Promise<boolean>
  refreshSession: () => Promise<boolean>
  updateUserRole: (newRole: 'admin' | 'viewer') => Promise<boolean>
  hasPermission: (action: string) => boolean
  isAdmin: () => boolean
  canManageUsers: () => boolean
  canManageAccounts: () => boolean
  canExport: () => boolean
  canArchive: () => boolean
}

export interface WebSocketContextType {
  isConnected: boolean
  lastUpdate: string | null
  subscribe: (channel: string, callback: (payload: any) => void) => void
  unsubscribe: (channel: string) => void
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface HealthCheckResponse {
  status: string
  last_fb_sync: string
  accounts_monitored: number
  success_rate: number
  timestamp: string
}

export type Permission = 'view' | 'add' | 'remove' | 'export' | 'archive' | 'manage_users' | 'manage_accounts'
export type AccountStatus = 1 | 100 // 1 = active, 100 = suspended
export type CapGrowthRate = 'fast' | 'normal' | 'slow' | 'declining'