import { createMocks } from 'node-mocks-http'
import handler from '@/api/get-accounts'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

const { supabaseAdmin } = require('@/lib/supabase')

describe('/api/get-accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })

  it('fetches accounts from mock_account_metrics in simulation mode', async () => {
    // Mock simulation config
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: true },
                error: null
              })
            })
          })
        }
      }
      if (table === 'mock_account_metrics') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  account_id: 'act_123',
                  vendor_name: 'Test Agency',
                  spend_today: 100,
                  snapshot_time: '2024-11-17T12:00:00Z'
                }
              ],
              error: null
            })
          })
        }
      }
      return { select: jest.fn() }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.simulation_mode).toBe(true)
    expect(data.accounts).toHaveLength(1)
    expect(data.accounts[0].account_id).toBe('act_123')
  })

  it('fetches accounts from account_metrics in production mode', async () => {
    // Mock production config
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: false },
                error: null
              })
            })
          })
        }
      }
      if (table === 'account_metrics') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  account_id: 'act_456',
                  vendor_name: 'Production Agency',
                  spend_today: 200,
                  snapshot_time: '2024-11-17T12:00:00Z'
                }
              ],
              error: null
            })
          })
        }
      }
      return { select: jest.fn() }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.simulation_mode).toBe(false)
    expect(data.accounts).toHaveLength(1)
    expect(data.accounts[0].account_id).toBe('act_456')
  })

  it('returns empty array when no accounts exist', async () => {
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: true },
                error: null
              })
            })
          })
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.accounts).toEqual([])
    expect(data.message).toBe('No account data available yet')
  })

  it('returns latest metrics for each account', async () => {
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: true },
                error: null
              })
            })
          })
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                account_id: 'act_123',
                vendor_name: 'Agency A',
                spend_today: 150,
                snapshot_time: '2024-11-17T14:00:00Z' // Later time
              },
              {
                account_id: 'act_123',
                vendor_name: 'Agency A',
                spend_today: 100,
                snapshot_time: '2024-11-17T12:00:00Z' // Earlier time
              },
              {
                account_id: 'act_456',
                vendor_name: 'Agency B',
                spend_today: 200,
                snapshot_time: '2024-11-17T13:00:00Z'
              }
            ],
            error: null
          })
        })
      }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.accounts).toHaveLength(2) // 2 unique accounts
    
    // Should return latest metric for act_123
    const act123 = data.accounts.find((a: any) => a.account_id === 'act_123')
    expect(act123.spend_today).toBe(150) // Latest value, not 100
  })

  it('handles database errors gracefully', async () => {
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: true },
                error: null
              })
            })
          })
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Failed to fetch account metrics')
    expect(data.details).toBe('Database connection failed')
  })

  it('includes total account count in response', async () => {
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'simulation_config') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { simulation_mode: true },
                error: null
              })
            })
          })
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { account_id: 'act_1', snapshot_time: '2024-11-17T12:00:00Z' },
              { account_id: 'act_2', snapshot_time: '2024-11-17T12:00:00Z' },
              { account_id: 'act_3', snapshot_time: '2024-11-17T12:00:00Z' }
            ],
            error: null
          })
        })
      }
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.total_accounts).toBe(3)
  })

  it('handles unexpected errors with 500 status', async () => {
    supabaseAdmin.from.mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Internal server error')
    expect(data.message).toBe('Unexpected error')
  })
})
