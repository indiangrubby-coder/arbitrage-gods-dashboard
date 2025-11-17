import { createMocks } from 'node-mocks-http'
import handler from '@/api/simulate-fb-data'

// Mock Supabase
const mockSupabase = {
  from: jest.fn((table: string) => {
    const mockChain: any = {
      select: jest.fn((): any => mockChain),
      eq: jest.fn(() => mockChain),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => Promise.resolve({ error: null })),
      single: jest.fn(() => {
        if (table === 'simulation_config') {
          return Promise.resolve({ data: { simulation_mode: true }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })
    }
    
    // Override select to return different data based on table
    mockChain.select = jest.fn(() => {
      if (table === 'simulation_config') {
        return Promise.resolve({ data: { simulation_mode: true }, error: null })
      }
      if (table === 'mock_accounts') {
        return Promise.resolve({
          data: [
            {
              account_id: 'act_123',
              vendor_name: 'Test Agency',
              initial_cap_cents: 25000,
              cap_growth_rate: 'normal',
              base_cpc: 0.30,
              suspension_probability: 0.05,
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        })
      }
      return Promise.resolve({ data: [], error: null })
    })
    
    return mockChain
  })
}

jest.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

describe('/api/simulate-fb-data', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rejects non-POST requests', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  test('returns error when simulation mode is disabled', async () => {
    // Mock simulation config as disabled
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: { simulation_mode: false },
          error: null
        }))
      }))
    })

    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(false)
    expect(responseData.message).toBe('Simulation mode is disabled')
  })

  test('returns error when no mock accounts found', async () => {
    // Mock empty accounts list
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })

    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(false)
    expect(responseData.message).toBe('No mock accounts found to simulate')
  })

  test('successfully simulates data for accounts', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    expect(responseData.success).toBe(true)
    expect(responseData.message).toContain('Simulated data for 1 accounts')
    expect(responseData.data.accounts_processed).toBe(1)
    expect(responseData.data.metrics_generated).toBe(1)
  })

  test('generates realistic metrics', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    
    // Verify the mock insert was called with metrics
    const mockSupabase = require('@/lib/supabase').supabase
    const mockInsert = mockSupabase.from('mock_account_metrics').insert
    
    expect(mockInsert).toHaveBeenCalled()
    const insertedMetrics = mockInsert.mock.calls[0][0][0]
    
    // Check structure of generated metrics
    expect(insertedMetrics).toHaveLength(1)
    const metric = insertedMetrics[0]
    
    expect(metric).toHaveProperty('account_id')
    expect(metric).toHaveProperty('snapshot_time')
    expect(metric).toHaveProperty('daily_spend_limit')
    expect(metric).toHaveProperty('spend_today')
    expect(metric).toHaveProperty('spend_progress_percent')
    expect(metric).toHaveProperty('cpc')
    expect(metric).toHaveProperty('outbound_clicks')
    expect(metric).toHaveProperty('account_status')
    expect(metric).toHaveProperty('cap_source')
    expect(metric.cap_source).toBe('SIMULATION')
  })

  test('handles database errors gracefully', async () => {
    // Mock database error
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      }))
    })

    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(500)
    const responseData = JSON.parse(res._getData())
    expect(responseData.error).toBe('Failed to fetch mock accounts')
  })

  test('generates different spend patterns based on growth rates', async () => {
    // Mock multiple accounts with different growth rates
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [
            {
              account_id: 'act_fast',
              vendor_name: 'Fast Growth',
              initial_cap_cents: 25000,
              cap_growth_rate: 'fast',
              base_cpc: 0.30,
              suspension_probability: 0.05,
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              account_id: 'act_slow',
              vendor_name: 'Slow Growth',
              initial_cap_cents: 25000,
              cap_growth_rate: 'slow',
              base_cpc: 0.30,
              suspension_probability: 0.05,
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        }))
      }))
    })

    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    
    const mockInsert = mockSupabase.from('mock_account_metrics').insert
    const insertedMetrics = mockInsert.mock.calls[0][0][0]
    
    expect(insertedMetrics).toHaveLength(2)
    
    // Fast growth should have higher spend than slow growth
    const fastMetric = insertedMetrics.find((m: any) => m.account_id === 'act_fast')
    const slowMetric = insertedMetrics.find((m: any) => m.account_id === 'act_slow')
    
    expect(fastMetric.daily_spend_limit).toBeGreaterThan(slowMetric.daily_spend_limit)
  })

  test('updates simulation configuration', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    
    const mockSupabase = require('@/lib/supabase').supabase
    const mockUpdate = mockSupabase.from('simulation_config').update
    
    expect(mockUpdate).toHaveBeenCalled()
    const updateCall = mockUpdate.mock.calls[0][0]
    
    expect(updateCall[1]).toBe(1) // id
    expect(updateCall[0]).toHaveProperty('last_update')
    expect(updateCall[0]).toHaveProperty('accounts_count')
    expect(updateCall[0]).toHaveProperty('suspension_rate')
  })

  test('handles unexpected errors', async () => {
    // Mock an unexpected error
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Unexpected database error')
    })

    const { req, res } = createMocks({ method: 'POST' })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(500)
    const responseData = JSON.parse(res._getData())
    expect(responseData.error).toBe('Internal server error')
  })
})