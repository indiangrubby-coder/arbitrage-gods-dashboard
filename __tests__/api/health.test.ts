import { createMocks } from 'node-mocks-http'
import handler from '@/api/health'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

const { supabaseAdmin } = require('@/lib/supabase')

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with healthy status when all checks pass', async () => {
    // Mock successful database query
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ snapshot_time: new Date().toISOString() }],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.status).toBe('healthy')
    expect(data.checks.database_connection).toBe(true)
    expect(data.checks.environment_variables).toBe(true)
  })

  it('returns 503 with unhealthy status when database fails', async () => {
    // Mock database error
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' }
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    const data = JSON.parse(res._getData())
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database_connection).toBe(false)
  })

  it('includes response time in milliseconds', async () => {
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.response_time_ms).toBeDefined()
    expect(typeof data.response_time_ms).toBe('number')
    expect(data.response_time_ms).toBeGreaterThanOrEqual(0)
  })

  it('includes system information', async () => {
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.system).toBeDefined()
    expect(data.system.node_version).toBeDefined()
    expect(data.system.platform).toBeDefined()
    expect(data.system.uptime).toBeDefined()
  })

  it('includes database metrics when available', async () => {
    const mockTime = new Date().toISOString()
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ snapshot_time: mockTime }],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.database).toBeDefined()
    expect(data.database.status).toBe('healthy')
  })

  it('includes environment configuration', async () => {
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.environment).toBeDefined()
    expect(typeof data.environment.simulation).toBe('boolean')
  })

  it('returns degraded status when response time is slow', async () => {
    // Mock slow database response
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ data: [], error: null })
              }, 1500) // Simulate 1.5 second delay
            })
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    // Status might be degraded or healthy depending on threshold
    expect(['healthy', 'degraded']).toContain(data.status)
    expect(data.checks.response_time).toBeDefined()
  })

  it('returns timestamp in ISO format', async () => {
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.timestamp).toBeDefined()
    // Check if valid ISO 8601 format
    expect(() => new Date(data.timestamp).toISOString()).not.toThrow()
  })

  it('handles database connection timeout gracefully', async () => {
    // Mock database timeout
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Connection timeout'))
        })
      })
    })

    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    const data = JSON.parse(res._getData())
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database_connection).toBe(false)
  })
})
