import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { Account, MockAccount, SimulationConfig } from '@/types'

// Helper function to generate realistic spend progression throughout the day
// Follows realistic market patterns: morning ramp, afternoon peak, evening decline
function generateSpendProgress(account: MockAccount, currentTime: Date): number {
  const hours = currentTime.getHours()
  const minutes = currentTime.getMinutes()
  const totalMinutes = hours * 60 + minutes
  
  // Realistic daily pattern curve:
  // - Slow start (midnight-6am): 5% of daily spend
  // - Morning ramp (6am-noon): 20% of daily spend
  // - Afternoon peak (noon-6pm): 50% of daily spend
  // - Evening decline (6pm-midnight): 25% of daily spend
  
  let progressMultiplier = 0
  
  if (totalMinutes < 360) { // Midnight to 6am
    progressMultiplier = 0.05 * (totalMinutes / 360)
  } else if (totalMinutes < 720) { // 6am to noon
    progressMultiplier = 0.05 + 0.20 * ((totalMinutes - 360) / 360)
  } else if (totalMinutes < 1080) { // Noon to 6pm
    progressMultiplier = 0.25 + 0.50 * ((totalMinutes - 720) / 360)
  } else { // 6pm to midnight
    progressMultiplier = 0.75 + 0.25 * ((totalMinutes - 1080) / 360)
  }
  
  // Apply growth rate multiplier for account type
  const growthMultiplier = {
    fast: 1.15,
    normal: 1.05,
    slow: 0.95,
    declining: 0.85
  }[account.cap_growth_rate]
  
  // Add slight randomness for realism (±5% variation)
  const randomFactor = 0.95 + Math.random() * 0.1
  
  const baseSpend = account.initial_cap_cents / 100 * progressMultiplier * growthMultiplier * randomFactor
  
  return Math.round(baseSpend)
}

// Helper function to simulate account status changes
function simulateAccountStatus(account: MockAccount): number {
  // Base suspension probability
  if (Math.random() < account.suspension_probability) {
    return 100 // Suspended
  }
  return 1 // Active
}

// Helper function to generate dynamic spend caps
function generateDynamicSpendCap(account: MockAccount, dayNumber: number): number {
  const growthRates = {
    fast: 1.02,    // 2% daily growth
    normal: 1.01,  // 1% daily growth
    slow: 1.005,    // 0.5% daily growth
    declining: 0.99  // 1% daily decline
  }
  
  const growthRate = growthRates[account.cap_growth_rate]
  const daysGrowth = Math.pow(growthRate, dayNumber - 1)
  
  return Math.round(account.initial_cap_cents * daysGrowth)
}

// Helper function to generate CPC and click metrics
function generatePerformanceMetrics(account: MockAccount, spend: number) {
  const baseCPC = account.base_cpc
  const cpcVariation = 0.8 + Math.random() * 0.4 // ±20% variation
  const actualCPC = baseCPC * cpcVariation
  
  const clicks = spend > 0 ? Math.round(spend / actualCPC) : 0
  
  return {
    cpc: Math.round(actualCPC * 100) / 100, // Round to 2 decimal places
    outbound_clicks: clicks
  }
}

// Helper function to generate ad counts
function generateAdCounts(account: MockAccount, isSuspended: boolean): { active: number; total: number } {
  if (isSuspended) {
    return { active: 0, total: Math.floor(5 + Math.random() * 15) }
  }
  
  const activeAds = Math.floor(3 + Math.random() * 20)
  const totalAds = activeAds + Math.floor(Math.random() * 10)
  
  return { active: activeAds, total: totalAds }
}

// Helper function to generate account balance
function generateAccountBalance(account: MockAccount): number {
  // Simulate varying account balances
  const minBalance = 100
  const maxBalance = 10000
  return Math.round(minBalance + Math.random() * (maxBalance - minBalance))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Starting Facebook data simulation...')
    
    // Get simulation configuration
    const { data: config } = await supabase
      .from('simulation_config')
      .select('*')
      .single()
    
    if (!config?.simulation_mode) {
      return res.status(200).json({ 
        success: false, 
        message: 'Simulation mode is disabled' 
      })
    }

    // Get mock accounts to simulate
    const { data: mockAccounts, error: accountsError } = await supabase
      .from('mock_ad_accounts')
      .select('*')
    
    if (accountsError) {
      console.error('Error fetching mock accounts:', accountsError)
      return res.status(500).json({ error: 'Failed to fetch mock accounts' })
    }

    if (!mockAccounts || mockAccounts.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: 'No mock accounts found to simulate' 
      })
    }

    const currentTime = new Date()
    const simulatedMetrics: any[] = []

    // Simulate metrics for each account
    for (const account of mockAccounts) {
      const dayNumber = Math.floor((Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      // Generate account status
      const accountStatus = simulateAccountStatus(account)
      
      // Generate spend metrics
      const dailySpendLimit = generateDynamicSpendCap(account, dayNumber)
      const spendToday = generateSpendProgress(account, currentTime)
      const spendProgressPercent = dailySpendLimit > 0 
        ? ((spendToday / (dailySpendLimit / 100)) * 100).toFixed(2)
        : null
      
      // Generate performance metrics
      const { cpc, outbound_clicks } = generatePerformanceMetrics(account, spendToday)
      
      // Generate ad counts
      const { active: activeAds, total: totalAds } = generateAdCounts(account, accountStatus === 100)
      
      // Generate account balance
      const accountBalance = generateAccountBalance(account)
      
      const metrics = {
        account_id: account.account_id,
        snapshot_time: currentTime.toISOString(),
        daily_spend_limit: dailySpendLimit,
        spend_cap: dailySpendLimit,
        amount_spent: spendToday * 100, // Convert to cents for storage
        spend_today: spendToday,
        daily_limit_display: dailySpendLimit / 100, // Convert to dollars for display
        spend_progress_percent: spendProgressPercent,
        cpc: cpc,
        outbound_clicks: outbound_clicks,
        active_ads_count: activeAds,
        total_ads_count: totalAds,
        account_balance: accountBalance,
        account_status: accountStatus,
        cap_source: 'SIMULATION'
      }
      
      simulatedMetrics.push(metrics)
    }

    // Store simulated metrics in database
    const { error: insertError } = await supabase
      .from('mock_account_metrics')
      .insert(simulatedMetrics)
    
    if (insertError) {
      console.error('Error inserting simulated metrics:', insertError)
      return res.status(500).json({ error: 'Failed to store simulated metrics' })
    }

    // Update simulation configuration
    await supabase
      .from('simulation_config')
      .update({
        last_update: currentTime.toISOString(),
        accounts_count: mockAccounts.length,
        suspension_rate: simulatedMetrics.filter(m => m.account_status === 100).length / mockAccounts.length
      })
      .eq('id', config.id)

    console.log(`Successfully simulated data for ${mockAccounts.length} accounts`)

    return res.status(200).json({
      success: true,
      message: `Simulated data for ${mockAccounts.length} accounts`,
      data: {
        accounts_processed: mockAccounts.length,
        metrics_generated: simulatedMetrics.length,
        suspension_rate: simulatedMetrics.filter(m => m.account_status === 100).length / mockAccounts.length,
        timestamp: currentTime.toISOString()
      }
    })

  } catch (error) {
    console.error('Error in simulation:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}