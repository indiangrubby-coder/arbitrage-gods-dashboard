import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/get-accounts
 * 
 * Fetches the latest account metrics from the database.
 * Returns both production and mock data depending on simulation mode.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check simulation mode from config
    const { data: config, error: configError } = await supabaseAdmin
      .from('simulation_config')
      .select('simulation_mode')
      .eq('id', 1)
      .single()

    if (configError) {
      console.error('Failed to fetch simulation config:', configError)
    }

    const isSimulation = config?.simulation_mode !== false

    // Choose the correct table based on simulation mode
    const metricsTable = isSimulation ? 'mock_account_metrics' : 'account_metrics'

    // Fetch latest metrics for each account
    const { data: allMetrics, error: metricsError } = await supabaseAdmin
      .from(metricsTable)
      .select('*')
      .order('snapshot_time', { ascending: false })

    if (metricsError) {
      console.error('Failed to fetch metrics:', metricsError)
      return res.status(500).json({ 
        error: 'Failed to fetch account metrics',
        details: metricsError.message 
      })
    }

    if (!allMetrics || allMetrics.length === 0) {
      return res.status(200).json({ 
        success: true,
        accounts: [],
        message: 'No account data available yet',
        simulation_mode: isSimulation
      })
    }

    // Get unique accounts with their latest metrics
    const accountsMap = new Map()
    
    for (const metric of allMetrics) {
      const existingMetric = accountsMap.get(metric.account_id)
      
      if (!existingMetric || new Date(metric.snapshot_time) > new Date(existingMetric.snapshot_time)) {
        accountsMap.set(metric.account_id, metric)
      }
    }

    const accounts = Array.from(accountsMap.values())

    return res.status(200).json({
      success: true,
      accounts,
      simulation_mode: isSimulation,
      total_accounts: accounts.length,
      last_update: accounts[0]?.snapshot_time || null
    })

  } catch (error) {
    console.error('Error fetching accounts:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}
