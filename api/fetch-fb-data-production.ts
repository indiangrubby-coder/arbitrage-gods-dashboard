import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { Database } from '@/types/database'

// Facebook Graph API response interfaces
interface FacebookAccount {
  id: string
  account_status: number
  daily_spend_limit?: number
  amount_spent?: number
  cpc?: number
  outbound_clicks?: number
  active_ads_count?: number
  total_ads_count?: number
  account_balance?: number
}

interface FacebookInsight {
  cpc?: number
  outbound_clicks?: number
}

// Helper function to convert cents to dollars
function centsToDollars(cents?: number): number {
  return cents ? cents / 100 : 0
}

// Helper function to convert dollars to cents
function dollarsToCents(dollars?: number): number {
  return dollars ? Math.round(dollars * 100) : 0
}

// Helper function to get account status text
function getAccountStatusText(status: number): string {
  switch (status) {
    case 1: return 'ACTIVE'
    case 2: return 'PENDING_REVIEW'
    case 3: return 'PENDING_ID_VERIFICATION'
    case 7: return 'AD_PAUSED'
    case 9: return 'IN_GRACE_PERIOD'
    case 100: return 'SUSPENDED'
    default: return 'UNKNOWN'
  }
}

// Helper function to fetch Facebook API data with retry logic
async function fetchFacebookDataWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Main handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch all ad accounts from database
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('ad_accounts')
      .select('account_id, vendor_name')
      .eq('status', 'active')

    if (accountsError) {
      console.error('Failed to fetch accounts:', accountsError)
      return res.status(500).json({ error: 'Failed to fetch accounts' })
    }

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: 'No active accounts found' 
      })
    }

    console.log(`Fetching data for ${accounts.length} Facebook accounts`)

    // Build Facebook API batch request
    const batchRequests = accounts.flatMap((account: any) => [
      {
        method: 'GET',
        relative_url: `${account.account_id}?fields=account_status,daily_spend_limit,amount_spent,cpc,outbound_clicks,active_ads_count,total_ads_count,account_balance`
      },
      {
        method: 'GET',
        relative_url: `${account.account_id}/insights?date_preset=today&fields=cpc,outbound_clicks`
      }
    ])

    // Execute Facebook API batch request
    const batchUrl = 'https://graph.facebook.com/v21.0/'
    const batchData = {
      access_token: process.env.FB_ACCESS_TOKEN,
      batch: JSON.stringify(batchRequests)
    }

    const batchResponse = await fetchFacebookDataWithRetry(batchUrl)
    
    if (!batchResponse || !batchResponse.data) {
      console.error('Facebook API batch request failed')
      return res.status(500).json({ error: 'Facebook API request failed' })
    }

    // Process batch response
    const batchResults = batchResponse.data
    const metricsToInsert: any[] = []

    // Supabase returns `accounts` typed according to the client; cast to any[] for processing
    const accountsList = accounts as any[]

    for (let i = 0; i < accountsList.length; i++) {
      const account = accountsList[i]
      const accountData = batchResults[i * 2] // 2 responses per account (account data + insights)
      const accountResponse = accountData?.code === 200 ? accountData.body : null

      if (!accountResponse) {
        console.error(`No data for account ${account.account_id}`)
        continue
      }

      // Parse account data
      const accountInfo = accountResponse.find((item: any) => item.account_status !== undefined)
      const insightsData = accountResponse.find((item: any) => item.cpc !== undefined)

      if (!accountInfo) {
        console.error(`Missing account info for ${account.account_id}`)
        continue
      }

      // Build metrics object
      const metrics: any = {
        account_id: account.account_id,
        vendor_name: account.vendor_name,
        snapshot_time: new Date().toISOString(),
        daily_spend_limit: dollarsToCents(accountInfo.daily_spend_limit),
        spend_cap: dollarsToCents(accountInfo.daily_spend_limit),
        amount_spent: dollarsToCents(accountInfo.amount_spent),
        spend_today: centsToDollars(accountInfo.amount_spent),
        daily_limit_display: centsToDollars(accountInfo.daily_spend_limit),
        spend_progress_percent: accountInfo.daily_spend_limit 
          ? ((accountInfo.amount_spent || 0) / accountInfo.daily_spend_limit * 100).toFixed(2)
          : null,
        cpc: insightsData?.cpc || 0,
        outbound_clicks: insightsData?.outbound_clicks || 0,
        active_ads_count: accountInfo.active_ads_count || 0,
        total_ads_count: accountInfo.total_ads_count || 0,
        account_balance: centsToDollars(accountInfo.account_balance),
        account_status: accountInfo.account_status,
        cap_source: 'API'
      }

      metricsToInsert.push(metrics)
    }

    // Insert metrics into database
    if (metricsToInsert.length > 0) {
      const { data: insertedMetrics, error: insertError } = await supabaseAdmin
        .from('account_metrics')
        .insert(metricsToInsert as any)

      if (insertError) {
        console.error('Failed to insert metrics:', insertError)
        
        // Try to insert individual records
        let successCount = 0
        for (const metrics of metricsToInsert) {
          const { error: singleError } = await supabaseAdmin
            .from('account_metrics')
            .insert(metrics)
          
          if (!singleError) {
            successCount++
          } else {
            console.error(`Failed to insert metrics for ${metrics.account_id}:`, singleError)
          }
        }

        return res.status(200).json({
          success: true,
          message: `Successfully inserted ${successCount}/${metricsToInsert.length} account metrics`,
          data: {
            accounts_processed: accounts.length,
            metrics_generated: successCount,
            total_requested: metricsToInsert.length
          }
        })
      }

      // Update simulation config to mark last run
      const { error: updateError } = await (supabaseAdmin as any)
        .from('simulation_config')
        .update({ 
          last_update: new Date().toISOString(),
          accounts_count: accounts.length
        } as any)
        .eq('id', 1)

      if (updateError) {
        console.error('Failed to update simulation config:', updateError)
      }

      return res.status(200).json({
        success: true,
        message: `Successfully fetched and stored data for ${accounts.length} accounts`,
        data: {
          accounts_processed: accounts.length,
          metrics_generated: metricsToInsert.length,
          accounts: accounts.map((a: any) => ({
            account_id: a.account_id,
            vendor_name: a.vendor_name,
            status: getAccountStatusText(a.account_status || 1),
            metrics: {
              daily_limit: centsToDollars(metricsToInsert.find((m: any) => m.account_id === a.account_id)?.daily_spend_limit || 0),
              spend_today: centsToDollars(metricsToInsert.find((m: any) => m.account_id === a.account_id)?.amount_spent || 0),
              spend_progress_percent: metricsToInsert.find((m: any) => m.account_id === a.account_id)?.spend_progress_percent || null
            }
          }))
        }
      })
    }

  } catch (error) {
    console.error('Error in Facebook data fetch:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}