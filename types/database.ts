export interface Database {
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          account_id: string
          vendor_name: string
          business_manager_id: string | null
          date_added: string
          status: string
          archived_at: string | null
        }
        Insert: {
          account_id: string
          vendor_name: string
          business_manager_id?: string | null
          date_added?: string
          status?: string
          archived_at?: string | null
        }
        Update: {
          account_id?: string
          vendor_name?: string
          business_manager_id?: string | null
          date_added?: string
          status?: string
          archived_at?: string | null
        }
      }
      account_metrics: {
        Row: {
          id: number
          account_id: string
          snapshot_time: string
          daily_spend_limit: number | null
          spend_cap: number | null
          amount_spent: number | null
          spend_today: number | null
          daily_limit_display: number | null
          spend_progress_percent: string | null
          cpc: number | null
          outbound_clicks: number | null
          active_ads_count: number | null
          total_ads_count: number | null
          account_balance: number | null
          account_status: number
          cap_source: string | null
        }
        Insert: {
          id?: number
          account_id: string
          snapshot_time: string
          daily_spend_limit?: number | null
          spend_cap?: number | null
          amount_spent?: number | null
          spend_today?: number | null
          daily_limit_display?: number | null
          spend_progress_percent?: string | null
          cpc?: number | null
          outbound_clicks?: number | null
          active_ads_count?: number | null
          total_ads_count?: number | null
          account_balance?: number | null
          account_status: number
          cap_source?: string | null
        }
        Update: {
          id?: number
          account_id?: string
          snapshot_time?: string
          daily_spend_limit?: number | null
          spend_cap?: number | null
          amount_spent?: number | null
          spend_today?: number | null
          daily_limit_display?: number | null
          spend_progress_percent?: string | null
          cpc?: number | null
          outbound_clicks?: number | null
          active_ads_count?: number | null
          total_ads_count?: number | null
          account_balance?: number | null
          account_status?: number
          cap_source?: string | null
        }
      }
      mock_ad_accounts: {
        Row: {
          account_id: string
          vendor_name: string
          initial_cap_cents: number
          cap_growth_rate: 'fast' | 'normal' | 'slow' | 'declining'
          base_cpc: number
          suspension_probability: number
          created_at: string
        }
        Insert: {
          account_id: string
          vendor_name: string
          initial_cap_cents: number
          cap_growth_rate: 'fast' | 'normal' | 'slow' | 'declining'
          base_cpc: number
          suspension_probability: number
          created_at?: string
        }
        Update: {
          account_id?: string
          vendor_name?: string
          initial_cap_cents?: number
          cap_growth_rate?: 'fast' | 'normal' | 'slow' | 'declining'
          base_cpc?: number
          suspension_probability?: number
          created_at?: string
        }
      }
      mock_account_metrics: {
        Row: {
          id: number
          account_id: string
          snapshot_time: string
          daily_spend_limit: number | null
          spend_cap: number | null
          amount_spent: number | null
          spend_today: number | null
          daily_limit_display: number | null
          spend_progress_percent: string | null
          cpc: number | null
          outbound_clicks: number | null
          active_ads_count: number | null
          total_ads_count: number | null
          account_balance: number | null
          account_status: number
          cap_source: string | null
        }
        Insert: {
          id?: number
          account_id: string
          snapshot_time: string
          daily_spend_limit?: number | null
          spend_cap?: number | null
          amount_spent?: number | null
          spend_today?: number | null
          daily_limit_display?: number | null
          spend_progress_percent?: string | null
          cpc?: number | null
          outbound_clicks?: number | null
          active_ads_count?: number | null
          total_ads_count?: number | null
          account_balance?: number | null
          account_status: number
          cap_source?: string | null
        }
        Update: {
          id?: number
          account_id?: string
          snapshot_time?: string
          daily_spend_limit?: number | null
          spend_cap?: number | null
          amount_spent?: number | null
          spend_today?: number | null
          daily_limit_display?: number | null
          spend_progress_percent?: string | null
          cpc?: number | null
          outbound_clicks?: number | null
          active_ads_count?: number | null
          total_ads_count?: number | null
          account_balance?: number | null
          account_status?: number
          cap_source?: string | null
        }
      }
      simulation_config: {
        Row: {
          id: number
          simulation_mode: boolean
          update_interval: number
          last_update: string | null
          accounts_count: number
          suspension_rate: number
        }
        Insert: {
          id?: number
          simulation_mode?: boolean
          update_interval?: number
          last_update?: string | null
          accounts_count?: number
          suspension_rate?: number
        }
        Update: {
          id?: number
          simulation_mode?: boolean
          update_interval?: number
          last_update?: string | null
          accounts_count?: number
          suspension_rate?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}