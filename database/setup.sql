-- Arbitrage Gods Database Setup Script
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_metadata JSONB DEFAULT '{"role": "viewer"}'::jsonb,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- Create ad_accounts table for Facebook ad account management
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  account_id VARCHAR(50) PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  business_manager_id VARCHAR(50),
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  archived_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account_metrics table for storing Facebook ad performance data
CREATE TABLE IF NOT EXISTS public.account_metrics (
  id BIGSERIAL PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL REFERENCES public.ad_accounts(account_id) ON DELETE CASCADE,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
  daily_spend_limit BIGINT, -- in cents
  spend_cap BIGINT, -- in cents
  amount_spent BIGINT DEFAULT 0, -- in cents
  spend_today DECIMAL(10,2), -- in dollars
  daily_limit_display DECIMAL(10,2), -- in dollars
  spend_progress_percent VARCHAR(10),
  cpc DECIMAL(10,4), -- cost per click
  outbound_clicks INTEGER,
  active_ads_count INTEGER,
  total_ads_count INTEGER,
  account_balance DECIMAL(10,2), -- in dollars
  account_status INTEGER NOT NULL, -- 1 = active, 100 = suspended
  cap_source VARCHAR(20) DEFAULT 'API' CHECK (cap_source IN ('API', 'UNAVAILABLE', 'SIMULATION')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mock_ad_accounts table for simulation mode
CREATE TABLE IF NOT EXISTS public.mock_ad_accounts (
  account_id VARCHAR(50) PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  initial_cap_cents INTEGER NOT NULL,
  cap_growth_rate VARCHAR(20) NOT NULL CHECK (cap_growth_rate IN ('fast', 'normal', 'slow', 'declining')),
  base_cpc DECIMAL(10,4) NOT NULL,
  suspension_probability DECIMAL(3,2) DEFAULT 0.05 CHECK (suspension_probability >= 0 AND suspension_probability <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mock_account_metrics table for simulation data
CREATE TABLE IF NOT EXISTS public.mock_account_metrics (
  id BIGSERIAL PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL REFERENCES public.mock_ad_accounts(account_id) ON DELETE CASCADE,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
  daily_spend_limit BIGINT, -- in cents
  spend_cap BIGINT, -- in cents
  amount_spent BIGINT DEFAULT 0, -- in cents
  spend_today DECIMAL(10,2), -- in dollars
  daily_limit_display DECIMAL(10,2), -- in dollars
  spend_progress_percent VARCHAR(10),
  cpc DECIMAL(10,4), -- cost per click
  outbound_clicks INTEGER,
  active_ads_count INTEGER,
  total_ads_count INTEGER,
  account_balance DECIMAL(10,2), -- in dollars
  account_status INTEGER NOT NULL, -- 1 = active, 100 = suspended
  cap_source VARCHAR(20) DEFAULT 'SIMULATION' CHECK (cap_source IN ('API', 'UNAVAILABLE', 'SIMULATION')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simulation_config table for managing simulation settings
CREATE TABLE IF NOT EXISTS public.simulation_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  simulation_mode BOOLEAN DEFAULT true,
  update_interval INTEGER DEFAULT 300, -- seconds (5 minutes)
  last_update TIMESTAMP WITH TIME ZONE,
  accounts_count INTEGER DEFAULT 0,
  suspension_rate DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create error_logs table for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id BIGSERIAL PRIMARY KEY,
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  user_id UUID REFERENCES public.users(id),
  account_id VARCHAR(50),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Create audit_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_account_metrics_account_time ON public.account_metrics(account_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_mock_account_metrics_account_time ON public.mock_account_metrics(account_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_status ON public.ad_accounts(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON public.ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_ad_accounts_updated_at BEFORE UPDATE ON public.mock_ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_config_updated_at BEFORE UPDATE ON public.simulation_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default simulation config
INSERT INTO public.simulation_config (id, simulation_mode, update_interval, accounts_count, suspension_rate)
VALUES (1, true, 300, 0, 0.00)
ON CONFLICT (id) DO UPDATE SET
  simulation_mode = EXCLUDED.simulation_mode,
  update_interval = EXCLUDED.update_interval,
  updated_at = NOW();

-- Insert sample mock accounts for testing
INSERT INTO public.mock_ad_accounts (account_id, vendor_name, initial_cap_cents, cap_growth_rate, base_cpc, suspension_probability)
VALUES 
  ('act_1234567890', 'Agency Alpha', 25000, 'fast', 0.34, 0.05),
  ('act_2345678901', 'Agency Beta', 20000, 'normal', 0.28, 0.03),
  ('act_3456789012', 'Agency Gamma', 15000, 'slow', 0.25, 0.10),
  ('act_4567890123', 'Agency Delta', 30000, 'declining', 0.31, 0.15)
ON CONFLICT (account_id) DO NOTHING;

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Ad accounts visibility based on user role
CREATE POLICY "Ad accounts view based on role" ON public.ad_accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (user_metadata->>'role' = 'admin' OR created_by = auth.uid())
        )
    );

CREATE POLICY "Admins can manage ad accounts" ON public.ad_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_metadata->>'role' = 'admin'
        )
    );

-- Account metrics visibility
CREATE POLICY "Account metrics view based on ad account access" ON public.account_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ad_accounts aa
            WHERE aa.account_id = account_metrics.account_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND (user_metadata->>'role' = 'admin' OR aa.created_by = auth.uid())
                )
            )
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.ad_accounts TO authenticated;
GRANT SELECT ON public.account_metrics TO authenticated;
GRANT SELECT ON public.mock_ad_accounts TO authenticated;
GRANT SELECT ON public.mock_account_metrics TO authenticated;
GRANT SELECT ON public.simulation_config TO authenticated;

-- Admin permissions
GRANT ALL ON public.ad_accounts TO authenticated;
GRANT ALL ON public.account_metrics TO authenticated;
GRANT ALL ON public.mock_ad_accounts TO authenticated;
GRANT ALL ON public.mock_account_metrics TO authenticated;
GRANT ALL ON public.simulation_config TO authenticated;
GRANT ALL ON public.error_logs TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;