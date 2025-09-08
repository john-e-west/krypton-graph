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
  'mcp__airtable__create_record': vi.fn()
}

// Setup global MCP functions
Object.assign(global, mockMcpFunctions)

describe('Ontology Export/Import APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockOntologyRecord = {
    id: 'ont1',
    createdTime: '2024-01-01T00:00:00Z',
    fields: {
      Name: 'Test Ontology',
      Description: 'A test ontology',
      Category: 'test',
      Tags: 'medical, test',
      CreatedBy: 'test-user',
      LastModified: '2024-01-01T00:00:00Z',
      UsageCount: 5,
      Rating: 4.5,
      RatingCount: 2,
      OntologyDefinition: JSON.stringify({
        entityTypes: [
          {
            id: 'Patient',
            name: 'Patient',
            description: 'Medical patient',
            attributes: [
              { name: 'age', type: 'number', required: true },
              { name: 'name', type: 'string', required: true }
            ]
          },
          {
            id: 'Doctor',
            name: 'Doctor',
            description: 'Medical doctor',
            attributes: [
              { name: 'specialty', type: 'string', required: false }
            ]
          }
        ],
        edgeTypes: [
          {
            id: 'treats',
            name: 'treats',
            description: 'Doctor treats patient',
            sourceTypes: ['Doctor'],
            targetTypes: ['Patient']
          }
        ]
      })
    }
  }

  describe('/api/ontologies/export', () => {
    // Import the export handler
    let POST: any
    beforeAll(async () => {
      const module = await import('@/app/api/ontologies/export/route')
      POST = module.POST
    })

    const createExportRequest = (body: any = {}) => {
      return new NextRequest('http://localhost/api/ontologies/export', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    it('exports ontologies in JSON format', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          ontologyIds: ['ont1'],
          format: 'json',
          includeMetadata: true,
          includeUsageStats: false,
          compressOutput: false
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockOntologyRecord]
      })

      const request = createExportRequest({
        ontologyIds: ['ont1'],
        format: 'json'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      
      const exportContent = await response.text()
      const exportData = JSON.parse(exportContent)
      
      expect(exportData.format).toBe('krypton-ontology-export')
      expect(exportData.ontologies).toHaveLength(1)
      expect(exportData.ontologies[0].name).toBe('Test Ontology')
      expect(exportData.ontologies[0].ontology.entityTypes).toHaveLength(2)
    })

    it('exports ontologies in YAML format', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          ontologyIds: ['ont1'],
          format: 'yaml',
          includeMetadata: false
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockOntologyRecord]
      })

      const request = createExportRequest({
        ontologyIds: ['ont1'],
        format: 'yaml'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/x-yaml')
      
      const yamlContent = await response.text()
      expect(yamlContent).toContain('format: krypton-ontology-export')
      expect(yamlContent).toContain('id: "ont1"')
      expect(yamlContent).toContain('name: "Test Ontology"')
    })

    it('exports ontologies in Turtle format', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          ontologyIds: ['ont1'],
          format: 'turtle'
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockOntologyRecord]
      })

      const request = createExportRequest({
        ontologyIds: ['ont1'],
        format: 'turtle'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/turtle')
      
      const turtleContent = await response.text()
      expect(turtleContent).toContain('@prefix rdf:')
      expect(turtleContent).toContain('@prefix owl:')
      expect(turtleContent).toContain('rdf:type owl:Class')
    })

    it('exports ontologies in OWL format', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          ontologyIds: ['ont1'],
          format: 'owl'
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [mockOntologyRecord]
      })

      const request = createExportRequest({
        ontologyIds: ['ont1'],
        format: 'owl'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/rdf+xml')
      
      const owlContent = await response.text()
      expect(owlContent).toContain('<?xml version="1.0"')
      expect(owlContent).toContain('<owl:Class')
      expect(owlContent).toContain('<owl:ObjectProperty')
    })

    it('validates ontology access permissions', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          ontologyIds: ['ont1']
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [] // No accessible ontologies
      })

      const request = createExportRequest({
        ontologyIds: ['ont1']
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toContain('No accessible ontologies found')
    })
  })

  describe('/api/ontologies/import', () => {
    let POST: any
    beforeAll(async () => {
      const module = await import('@/app/api/ontologies/import/route')
      POST = module.POST
    })

    const createImportRequest = (body: any = {}) => {
      return new NextRequest('http://localhost/api/ontologies/import', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const validJsonOntology = JSON.stringify({
      format: 'krypton-ontology-export',
      ontologies: [{
        name: 'Imported Ontology',
        description: 'A test imported ontology',
        category: 'imported',
        tags: ['test', 'imported'],
        ontology: {
          entityTypes: [
            {
              id: 'ImportedEntity',
              name: 'Imported Entity',
              description: 'An imported entity',
              attributes: []
            }
          ],
          edgeTypes: []
        }
      }]
    })

    it('imports JSON ontologies successfully', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: validJsonOntology,
          options: {
            validateStructure: true,
            overwriteExisting: false
          }
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [] // No existing ontologies
      })

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'imported1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createImportRequest({
        source: 'file',
        data: validJsonOntology
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.results.imported).toHaveLength(1)
      expect(data.results.imported[0].name).toBe('Imported Ontology')
    })

    it('auto-detects ontology format', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: validJsonOntology,
          options: {}
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: []
      })

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'imported1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createImportRequest({
        source: 'file',
        data: validJsonOntology
        // No format specified
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.summary.format).toBe('json')
    })

    it('validates ontology structure', async () => {
      const invalidOntology = JSON.stringify({
        format: 'krypton-ontology-export',
        ontologies: [{
          name: 'Invalid Ontology',
          ontology: {
            entityTypes: [
              {
                // Missing required fields
                description: 'Invalid entity'
              }
            ]
          }
        }]
      })

      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: invalidOntology,
          options: {
            validateStructure: true
          }
        }
      })

      const request = createImportRequest({
        source: 'file',
        data: invalidOntology
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('No valid ontologies found')
    })

    it('handles existing ontologies correctly', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: validJsonOntology,
          options: {
            overwriteExisting: false
          }
        }
      })

      // Mock existing ontology with same name
      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: [{
          id: 'existing1',
          fields: {
            Name: 'Imported Ontology'
          }
        }]
      })

      const request = createImportRequest({
        source: 'file',
        data: validJsonOntology
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.results.skipped).toContain('Imported Ontology')
      expect(data.results.imported).toHaveLength(0)
    })

    it('imports from URL source', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'url',
          data: '', // Will be fetched from URL
          options: {}
        }
      })

      // Mock URL fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => validJsonOntology
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: []
      })

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'imported1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createImportRequest({
        source: 'url',
        data: 'https://example.com/ontology.json'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('applies import options correctly', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: validJsonOntology,
          options: {
            assignToCategory: 'custom-category',
            makePublic: true,
            addTags: ['custom-tag']
          }
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: []
      })

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'imported1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createImportRequest({
        source: 'file',
        data: validJsonOntology,
        options: {
          assignToCategory: 'custom-category',
          makePublic: true,
          addTags: ['custom-tag']
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      // Check that create_record was called with correct options
      const createCall = mockMcpFunctions['mcp__airtable__create_record'].mock.calls[0]
      expect(createCall[0].fields.Category).toBe('custom-category')
      expect(createCall[0].fields.IsPublic).toBe(true)
      expect(createCall[0].fields.Tags).toContain('custom-tag')
    })

    it('handles YAML import', async () => {
      const yamlOntology = `
format: krypton-ontology-export
version: "1.0"
ontologies:
  - id: "test1"
    name: "YAML Test Ontology"
    description: "A test ontology from YAML"
    category: "test"
    tags: ["yaml", "test"]
    ontology:
      entityTypes:
        - id: "TestEntity"
          name: "Test Entity"
          description: "A test entity"
`

      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: yamlOntology,
          format: 'yaml',
          options: {}
        }
      })

      mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
        records: []
      })

      mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
        id: 'imported1',
        createdTime: '2024-01-01T00:00:00Z'
      })

      const request = createImportRequest({
        source: 'file',
        data: yamlOntology,
        format: 'yaml'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.results.imported).toHaveLength(1)
      expect(data.summary.format).toBe('yaml')
    })

    it('handles parse errors gracefully', async () => {
      const { validateRequestBody } = await import('@/lib/auth/middleware')
      ;(validateRequestBody as any).mockResolvedValue({
        data: {
          source: 'file',
          data: 'invalid json content',
          format: 'json'
        }
      })

      const request = createImportRequest({
        source: 'file',
        data: 'invalid json content',
        format: 'json'
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Failed to parse ontology data')
    })
  })
})