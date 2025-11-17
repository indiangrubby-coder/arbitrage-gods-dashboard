import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const startTime = Date.now()
    
    // Check database connection
    let dbStatus = 'healthy'
    let lastFbSync = null
    let accountsMonitored = 0
    let successRate = 0

    try {
      // Test database connection
      const { data: config, error: configError } = await supabase
        .from('simulation_config')
        .select('*')
        .single()

      if (configError) {
        dbStatus = 'error'
        console.error('Database config error:', configError)
      } else {
        lastFbSync = config?.last_update
        accountsMonitored = config?.accounts_count || 0
        successRate = config?.suspension_rate ? 1 - config.suspension_rate : 1
      }

      // Get latest metrics to verify data flow
      const { data: latestMetrics, error: metricsError } = await supabase
        .from('mock_account_metrics')
        .select('account_id, snapshot_time')
        .order('snapshot_time', { ascending: false })
        .limit(10)

      if (metricsError) {
        dbStatus = 'error'
        console.error('Database metrics error:', metricsError)
      }

    } catch (dbError) {
      dbStatus = 'error'
      console.error('Database connection error:', dbError)
    }

    // Check environment variables
    const envStatus = {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      simulation: process.env.SIMULATION_MODE === 'true',
      debug: process.env.DEBUG_MODE === 'true'
    }

    const allEnvValid = Object.values(envStatus).every(Boolean)

    // Calculate response time
    const responseTime = Date.now() - startTime

    // Determine overall health status
    let overallStatus = 'healthy'
    if (dbStatus === 'error' || !allEnvValid) {
      overallStatus = 'unhealthy'
    } else if (responseTime > 5000) {
      overallStatus = 'degraded'
    }

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      database: {
        status: dbStatus,
        last_fb_sync: lastFbSync,
        accounts_monitored: accountsMonitored,
        success_rate: Math.round(successRate * 100)
      },
      environment: envStatus,
      system: {
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime()
      },
      checks: {
        database_connection: dbStatus === 'healthy',
        environment_variables: allEnvValid,
        response_time: responseTime < 5000
      }
    }

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503

    return res.status(statusCode).json(healthData)

  } catch (error) {
    console.error('Health check error:', error)
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database_connection: false,
        environment_variables: false,
        response_time: false
      }
    })
  }
}