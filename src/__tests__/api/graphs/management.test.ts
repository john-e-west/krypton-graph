import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  withAuth: vi.fn(() => ({ user: { userId: 'test-user', sessionId: 'test-session' } })),
  validateRequestBody: vi.fn(),
  withRateLimit: vi.fn(() => null)
}))

// Mock Airtable MCP functions
const mockMcpFunctions = {
  'mcp__airtable__list_records': vi.fn(),
  'mcp__airtable__create_record': vi.fn(),
  'mcp__airtable__update_records': vi.fn(),
  'mcp__airtable__delete_records': vi.fn()
}

// Setup global MCP functions
Object.assign(global, mockMcpFunctions)

describe('Graph Management APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockGraphRecord = {
    id: 'graph1',
    createdTime: '2024-01-01T00:00:00Z',
    fields: {
      Name: 'Test Graph',
      Description: 'A test graph',
      Status: 'active',
      CreatedBy: 'test-user',
      LastModified: '2024-01-01T00:00:00Z',
      LastActivity: '2024-01-01T00:00:00Z',
      OntologyId: 'ont1',
      Configuration: JSON.stringify({
        maxNodes: 10000,
        maxEdges: 50000,
        autoClassification: true,
        retentionDays: 30,
        processingPriority: 'normal'
      }),
      Tags: 'medical, test',
      NodeCount: 500,
      EdgeCount: 1200,
      DataSize: 1024000
    }
  }

  const mockOntologyRecord = {
    id: 'ont1',
    fields: {
      Name: 'Test Ontology',
      IsPublic: true
    }
  }

  describe('/api/graphs', () => {
    let GET: any, POST: any
    beforeAll(async () => {
      const module = await import('@/app/api/graphs/route')
      GET = module.GET
      POST = module.POST
    })

    const createListRequest = (params: Record<string, string> = {}) => {
      const url = new URL('http://localhost/api/graphs')
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      
      return new NextRequest(url.toString(), {
        method: 'GET'
      })
    }

    const createCreateRequest = (body: any = {}) => {
      return new NextRequest('http://localhost/api/graphs', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    it('lists graphs for authenticated user', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      const request = createListRequest()
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.graphs).toHaveLength(1)
      expect(data.graphs[0].name).toBe('Test Graph')
      expect(data.graphs[0].nodeCount).toBe(500)
      expect(data.graphs[0].edgeCount).toBe(1200)
    })

    it('filters graphs by status', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      const request = createListRequest({ status: 'active' })
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      // Check that filter was applied in Airtable query
      expect(mockMcpFunctions['mcp__airtable__list_records']).toHaveBeenCalledWith(
        expect.objectContaining({
          filterByFormula: expect.stringContaining('{Status} = "active"')
        })
      )
    })

    it('searches graphs by name and description', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      const request = createListRequest({ search: 'test' })
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      // Check that search filter was applied
      expect(mockMcpFunctions['mcp__airtable__list_records']).toHaveBeenCalledWith(
        expect.objectContaining({
          filterByFormula: expect.stringContaining('FIND(LOWER("test")')
        })
      )
    })

    it('includes ontology names when requested', async () => {
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockGraphRecord]
        })
        .mockResolvedValueOnce({
          records: [mockOntologyRecord]
        })

      const request = createListRequest({ includeOntologyNames: 'true' })
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.graphs[0].ontologyName).toBe('Test Ontology')
    })

    it('creates new graph successfully', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          name: 'New Test Graph',
          description: 'A new test graph',
          ontologyId: 'ont1',
          configuration: {
            maxNodes: 5000,
            autoClassification: true
          },
          tags: ['test', 'new'],
          initialStatus: 'active'
        }
      })

      // Mock ontology exists and is accessible
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockOntologyRecord]
        })
        .mockResolvedValueOnce({
          records: [] // No existing graphs with same name
        })

      mockMcpFunctions['mcp__airtable__create_record']
        .mockResolvedValueOnce({
          id: 'graph2',
          createdTime: '2024-01-01T00:00:00Z'
        })
        .mockResolvedValueOnce({
          id: 'activity1',
          createdTime: '2024-01-01T00:00:00Z'
        })

      // Mock ontology usage count update
      mockMcpFunctions['mcp__airtable__update_records'].mockResolvedValue([])

      const request = createCreateRequest({
        name: 'New Test Graph',
        description: 'A new test graph',
        ontologyId: 'ont1'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.name).toBe('New Test Graph')
      expect(data.id).toBe('graph2')
      expect(data.status).toBe('active')
    })

    it('prevents duplicate graph names', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          name: 'Test Graph',
          ontologyId: 'ont1'
        }
      })

      // Mock ontology exists
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockOntologyRecord]
        })
        .mockResolvedValueOnce({
          records: [mockGraphRecord] // Existing graph with same name
        })

      const request = createCreateRequest({
        name: 'Test Graph',
        ontologyId: 'ont1'
      })

      const response = await POST(request)
      expect(response.status).toBe(409)
      
      const data = await response.json()
      expect(data.error).toContain('graph with this name already exists')
    })

    it('validates ontology access', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          name: 'Test Graph',
          ontologyId: 'ont1'
        }
      })

      // Mock no accessible ontology
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: []
      })

      const request = createCreateRequest({
        name: 'Test Graph',
        ontologyId: 'ont1'
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toContain('Ontology not found or access denied')
    })

    it('returns summary statistics', async () => {
      const multipleGraphs = [
        { ...mockGraphRecord, id: 'graph1' },
        { 
          ...mockGraphRecord, 
          id: 'graph2',
          fields: {
            ...mockGraphRecord.fields,
            Name: 'Graph 2',
            Status: 'inactive',
            NodeCount: 300,
            EdgeCount: 800,
            DataSize: 512000
          }
        }
      ]

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: multipleGraphs
      })

      const request = createListRequest()
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.summary.totalGraphs).toBe(2)
      expect(data.summary.totalNodes).toBe(800) // 500 + 300
      expect(data.summary.totalEdges).toBe(2000) // 1200 + 800
      expect(data.summary.statusCounts).toEqual({
        active: 1,
        inactive: 1
      })
    })
  })

  describe('/api/graphs/[id]', () => {
    let GET: any, PUT: any, DELETE: any
    beforeAll(async () => {
      const module = await import('@/app/api/graphs/[id]/route')
      GET = module.GET
      PUT = module.PUT
      DELETE = module.DELETE
    })

    const createGetRequest = (params: Record<string, string> = {}) => {
      const url = new URL('http://localhost/api/graphs/graph1')
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      
      return new NextRequest(url.toString(), {
        method: 'GET'
      })
    }

    const createUpdateRequest = (body: any = {}) => {
      return new NextRequest('http://localhost/api/graphs/graph1', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const createDeleteRequest = () => {
      return new NextRequest('http://localhost/api/graphs/graph1', {
        method: 'DELETE'
      })
    }

    it('retrieves graph by ID', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      const request = createGetRequest()
      const response = await GET(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.id).toBe('graph1')
      expect(data.name).toBe('Test Graph')
      expect(data.configuration.maxNodes).toBe(10000)
    })

    it('includes metrics when requested', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      const request = createGetRequest({ includeMetrics: 'true' })
      const response = await GET(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.metrics).toBeDefined()
      expect(data.metrics.nodeCount).toBe(500)
      expect(data.metrics.edgeCount).toBe(1200)
    })

    it('includes ontology when requested', async () => {
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockGraphRecord]
        })
        .mockResolvedValueOnce({
          records: [{
            ...mockOntologyRecord,
            fields: {
              ...mockOntologyRecord.fields,
              OntologyDefinition: JSON.stringify({
                entityTypes: [{ id: 'Person', name: 'Person' }],
                edgeTypes: []
              })
            }
          }]
        })

      const request = createGetRequest({ includeOntology: 'true' })
      const response = await GET(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.ontology).toBeDefined()
      expect(data.ontology.name).toBe('Test Ontology')
      expect(data.ontology.definition.entityTypes).toHaveLength(1)
    })

    it('updates graph configuration', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          name: 'Updated Graph Name',
          status: 'inactive',
          configuration: {
            maxNodes: 15000
          }
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      mockMcpFunctions['mcp__airtable__update_records'].mockResolvedValue([
        {
          id: 'graph1',
          fields: {
            ...mockGraphRecord.fields,
            Name: 'Updated Graph Name',
            Status: 'inactive'
          }
        }
      ])

      const request = createUpdateRequest({
        name: 'Updated Graph Name',
        status: 'inactive'
      })

      const response = await PUT(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.name).toBe('Updated Graph Name')
      expect(data.status).toBe('inactive')
    })

    it('archives graph instead of deleting', async () => {
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockGraphRecord]
        })
        .mockResolvedValueOnce({
          records: [] // No dependent documents
        })

      mockMcpFunctions['mcp__airtable__update_records'].mockResolvedValue([
        {
          id: 'graph1',
          fields: {
            ...mockGraphRecord.fields,
            Status: 'archived'
          }
        }
      ])

      const request = createDeleteRequest()
      const response = await DELETE(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.message).toContain('archived successfully')
      
      // Should have updated status to archived, not deleted
      expect(mockMcpFunctions['mcp__airtable__update_records']).toHaveBeenCalledWith(
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.objectContaining({
                Status: 'archived'
              })
            })
          ])
        })
      )
    })

    it('prevents deletion when graph has dependencies', async () => {
      mockMcpFunctions['mcp__airtable__list_records']
        .mockResolvedValueOnce({
          records: [mockGraphRecord]
        })
        .mockResolvedValueOnce({
          records: [{ id: 'doc1' }] // Has dependent documents
        })

      const request = createDeleteRequest()
      const response = await DELETE(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(409)
      
      const data = await response.json()
      expect(data.error).toContain('Cannot delete graph with associated documents')
    })

    it('validates graph access permissions', async () => {
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [] // No accessible graphs
      })

      const request = createGetRequest()
      const response = await GET(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toContain('Graph not found or access denied')
    })

    it('logs update activity', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          name: 'Updated Graph'
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockGraphRecord]
      })

      mockMcpFunctions['mcp__airtable__update_records'].mockResolvedValue([
        {
          id: 'graph1',
          fields: {
            ...mockGraphRecord.fields,
            Name: 'Updated Graph'
          }
        }
      ])

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'activity1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createUpdateRequest({
        name: 'Updated Graph'
      })

      const response = await PUT(request, { params: { id: 'graph1' } })
      
      expect(response.status).toBe(200)
      
      // Should have created activity log entry
      expect(mockMcpFunctions['mcp__airtable__create_record']).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'tblGraphActivity',
          fields: expect.objectContaining({
            GraphId: 'graph1',
            Type: 'configuration_update'
          })
        })
      )
    })
  })
})