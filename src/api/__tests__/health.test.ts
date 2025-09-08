import { describe, it, expect, vi, beforeEach } from 'vitest'
import { healthCheck } from '../health'

vi.mock('@/lib/services/airtable-service', () => ({
  airtableService: {
    testConnection: vi.fn()
  }
}))

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy status when all services are connected', async () => {
    const { airtableService } = await import('@/lib/services/airtable-service')
    vi.mocked(airtableService.testConnection).mockResolvedValueOnce(true)

    const result = await healthCheck()

    expect(result.status).toBe('healthy')
    expect(result.version).toBe('1.0.0')
    expect(result.services.airtable.status).toBe('connected')
    expect(result.services.api.status).toBe('operational')
    expect(result.timestamp).toBeDefined()
  })

  it('returns error status when Airtable fails', async () => {
    const { airtableService } = await import('@/lib/services/airtable-service')
    vi.mocked(airtableService.testConnection).mockRejectedValueOnce(new Error('Connection failed'))

    const result = await healthCheck()

    expect(result.status).toBe('error')
    expect(result.services.airtable.status).toBe('error')
    expect(result.services.airtable.error).toBe('Connection failed')
  })

  it('includes response time for successful connections', async () => {
    const { airtableService } = await import('@/lib/services/airtable-service')
    vi.mocked(airtableService.testConnection).mockResolvedValueOnce(true)

    const result = await healthCheck()

    expect(result.services.airtable.responseTime).toBeDefined()
    expect(typeof result.services.airtable.responseTime).toBe('number')
  })
})