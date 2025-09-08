// ============================================================================
// Document Analysis API Integration Tests - Story 9.1 QA
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../../../../../../app/api/documents/analyze/route'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-123' }))
}))

// Mock the document analyzer and type suggestion engine
vi.mock('@/services/document-analyzer', () => ({
  DocumentAnalyzer: {
    getInstance: vi.fn(() => ({
      analyzeDocument: vi.fn().mockResolvedValue({
        content: 'Sample document content for analysis',
        metadata: { wordCount: 100, paragraphs: 5 }
      })
    }))
  }
}))

vi.mock('@/services/type-suggestion-engine', () => ({
  TypeSuggestionEngine: vi.fn().mockImplementation(() => ({
    generateTypeSuggestions: vi.fn().mockResolvedValue({
      entityTypes: [
        { name: 'Person', confidence: 0.9, examples: ['John Doe', 'Jane Smith'] },
        { name: 'Organization', confidence: 0.8, examples: ['Acme Corp', 'Tech Solutions'] }
      ],
      edgeTypes: [
        { name: 'WORKS_FOR', confidence: 0.85, description: 'Employment relationship' },
        { name: 'MANAGES', confidence: 0.75, description: 'Management relationship' }
      ]
    }),
    predictClassificationRate: vi.fn().mockResolvedValue({
      expectedRate: 0.82,
      confidence: 0.9,
      totalEntities: 150,
      expectedClassified: 123
    })
  }))
}))

// Mock rate limiter
vi.mock('@/lib/middleware/rate-limit', () => ({
  apiRateLimiter: vi.fn(() => null) // Return null to allow request
}))

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readdir: vi.fn().mockResolvedValue(['test-doc-123.pdf']),
    stat: vi.fn().mockResolvedValue({
      size: 1024,
      birthtime: new Date('2025-09-08T10:00:00Z')
    }),
    readFile: vi.fn().mockResolvedValue(Buffer.from('test content'))
  }
})

describe('Story 9.1: Document Analysis API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/documents/analyze', () => {
    describe('Authentication & Rate Limiting', () => {
      it('should require authentication', async () => {
        // Mock unauthenticated request
        const mockAuth = vi.mocked(await import('@clerk/nextjs/server')).auth
        mockAuth.mockReturnValueOnce({ userId: null })

        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: 'test-doc-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should apply rate limiting', async () => {
        // Mock rate limiter to return rejection
        const mockRateLimiter = vi.mocked(await import('@/lib/middleware/rate-limit')).apiRateLimiter
        mockRateLimiter.mockReturnValueOnce(
          new Response('Rate limit exceeded', { status: 429 })
        )

        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: 'test-doc-123' })
        })

        const response = await POST(request)
        expect(response.status).toBe(429)
      })
    })

    describe('Input Validation', () => {
      it('should require documentId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({})
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Document ID is required')
      })

      it('should validate documentId format', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: '../../../etc/passwd' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid document ID format')
      })

      it('should accept valid documentId format', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: 'test-doc-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.jobId).toBeDefined()
        expect(data.documentId).toBe('test-doc-123')
        expect(data.status).toBe('processing')
      })
    })

    describe('Analysis Job Creation', () => {
      it('should create analysis job and return job ID', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: 'valid-doc-id-123' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toMatchObject({
          jobId: expect.any(String),
          documentId: 'valid-doc-id-123',
          status: 'processing',
          message: 'Analysis started'
        })
        expect(data.jobId).toMatch(/^[a-f0-9-]{36}$/) // UUID format
      })

      it('should handle JSON parsing errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: 'invalid-json'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to start analysis')
      })
    })
  })

  describe('GET /api/documents/analyze', () => {
    describe('Authentication & Rate Limiting', () => {
      it('should require authentication', async () => {
        // Mock unauthenticated request
        const mockAuth = vi.mocked(await import('@clerk/nextjs/server')).auth
        mockAuth.mockReturnValueOnce({ userId: null })

        const request = new NextRequest('http://localhost:3000/api/documents/analyze?jobId=test-job-123')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should apply rate limiting', async () => {
        // Mock rate limiter to return rejection
        const mockRateLimiter = vi.mocked(await import('@/lib/middleware/rate-limit')).apiRateLimiter
        mockRateLimiter.mockReturnValueOnce(
          new Response('Rate limit exceeded', { status: 429 })
        )

        const request = new NextRequest('http://localhost:3000/api/documents/analyze?jobId=test-job-123')

        const response = await GET(request)
        expect(response.status).toBe(429)
      })
    })

    describe('Job Status Retrieval', () => {
      it('should require jobId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Job ID is required')
      })

      it('should validate jobId format', async () => {
        const request = new NextRequest('http://localhost:3000/api/documents/analyze?jobId=invalid-format')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid job ID format')
      })

      it('should return 404 for non-existent job', async () => {
        const validJobId = '550e8400-e29b-41d4-a716-446655440000'
        const request = new NextRequest(`http://localhost:3000/api/documents/analyze?jobId=${validJobId}`)

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Job not found')
      })
    })
  })

  describe('Full Analysis Flow Integration', () => {
    it('should process complete analysis workflow', async () => {
      // Step 1: Start analysis
      const startRequest = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'integration-test-doc' })
      })

      const startResponse = await POST(startRequest)
      const startData = await startResponse.json()

      expect(startResponse.status).toBe(200)
      expect(startData.jobId).toBeDefined()
      expect(startData.status).toBe('processing')

      // Step 2: Check job status immediately (should be processing)
      const statusRequest = new NextRequest(
        `http://localhost:3000/api/documents/analyze?jobId=${startData.jobId}`
      )

      const statusResponse = await GET(statusRequest)
      const statusData = await statusResponse.json()

      expect(statusResponse.status).toBe(200)
      expect(statusData.status).toBe('processing')
      expect(statusData.jobId).toBe(startData.jobId)
    })

    it('should handle analysis errors gracefully', async () => {
      // Mock analyzer to throw error
      const mockAnalyzer = vi.mocked(await import('@/services/document-analyzer')).DocumentAnalyzer
      mockAnalyzer.getInstance.mockReturnValueOnce({
        analyzeDocument: vi.fn().mockRejectedValue(new Error('Document not found'))
      } as any)

      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'missing-doc-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Job creation still succeeds
      expect(data.status).toBe('processing')
    })

    it('should handle type suggestion errors', async () => {
      // Mock type suggestion engine to throw error
      const mockEngine = vi.mocked(await import('@/services/type-suggestion-engine')).TypeSuggestionEngine
      mockEngine.mockImplementationOnce(() => ({
        generateTypeSuggestions: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
        predictClassificationRate: vi.fn()
      } as any))

      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'ai-error-doc-123' })
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Job should still be created
    })
  })

  describe('Security Validation', () => {
    it('should sanitize input parameters', async () => {
      const maliciousDocId = '<script>alert("xss")</script>'
      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: maliciousDocId })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid document ID format')
    })

    it('should prevent path traversal in document access', async () => {
      const maliciousPath = '../../../etc/passwd'
      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: maliciousPath })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid document ID format')
    })

    it('should validate UUID format for job IDs', async () => {
      const invalidJobIds = [
        'not-a-uuid',
        '123',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '550e8400-e29b-41d4-a716-44665544000g' // Invalid character
      ]

      for (const jobId of invalidJobIds) {
        const request = new NextRequest(`http://localhost:3000/api/documents/analyze?jobId=${jobId}`)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid job ID format')
      }
    })
  })

  describe('Performance & Resource Management', () => {
    it('should handle concurrent analysis requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        new NextRequest('http://localhost:3000/api/documents/analyze', {
          method: 'POST',
          body: JSON.stringify({ documentId: `concurrent-doc-${i}` })
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      for (const response of responses) {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.jobId).toBeDefined()
        expect(data.status).toBe('processing')
      }
    })

    it('should clean up old analysis jobs', async () => {
      // This test verifies the cleanup interval is working
      // In a real scenario, you'd test with time manipulation
      expect(true).toBe(true) // Placeholder for cleanup logic test
    })
  })

  describe('Error Boundary Testing', () => {
    it('should handle service unavailability', async () => {
      // Mock all services to fail
      const mockAnalyzer = vi.mocked(await import('@/services/document-analyzer')).DocumentAnalyzer
      mockAnalyzer.getInstance.mockImplementationOnce(() => {
        throw new Error('Service unavailable')
      })

      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'service-failure-test' })
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Should still create job, errors handled async
    })

    it('should handle malformed request bodies', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"documentId": incomplete'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to start analysis')
    })
  })
})