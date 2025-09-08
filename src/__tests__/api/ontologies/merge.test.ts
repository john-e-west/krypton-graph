import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  withAuth: vi.fn(() => ({ user: { userId: 'test-user', sessionId: 'test-session' } })),
  validateRequestBody: vi.fn((req, schema) => ({ 
    data: {
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merged Ontology',
      resolutions: []
    }
  })),
  withRateLimit: vi.fn(() => null)
}))

// Mock Airtable MCP functions
const mockMcpFunctions = {
  'mcp__airtable__list_records': vi.fn(),
  'mcp__airtable__create_record': vi.fn(),
  'mcp__airtable__update_records': vi.fn()
}

// Setup global MCP functions
Object.assign(global, mockMcpFunctions)

// Import the API route handler
import { POST } from '@/app/api/ontologies/merge/route'

describe('/api/ontologies/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createRequest = (body: any = {}) => {
    return new NextRequest('http://localhost/api/ontologies/merge', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const mockOntologies = [
    {
      id: 'ont1',
      fields: {
        Name: 'Medical Ontology',
        OntologyDefinition: JSON.stringify({
          entityTypes: [
            { id: 'Patient', name: 'Patient', description: 'Medical patient', attributes: [] },
            { id: 'Doctor', name: 'Doctor', description: 'Medical doctor', attributes: [] }
          ],
          edgeTypes: [
            { id: 'treats', name: 'treats', description: 'Doctor treats patient', sourceTypes: ['Doctor'], targetTypes: ['Patient'] }
          ]
        })
      }
    },
    {
      id: 'ont2',
      fields: {
        Name: 'Person Ontology',
        OntologyDefinition: JSON.stringify({
          entityTypes: [
            { id: 'Person', name: 'Person', description: 'General person', attributes: [] }
          ],
          edgeTypes: [
            { id: 'knows', name: 'knows', description: 'Person knows another', sourceTypes: ['Person'], targetTypes: ['Person'] }
          ]
        })
      }
    }
  ]

  it('successfully merges ontologies with union strategy', async () => {
    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: mockOntologies
    })

    mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
      id: 'merged1',
      createdTime: '2024-01-01T00:00:00Z'
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Merged Healthcare Ontology',
      mergedOntologyDescription: 'Combined medical and person ontology'
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.mergedOntology.name).toBe('Merged Healthcare Ontology')
    expect(data.mergedOntology.entityTypes).toHaveLength(3) // Patient, Doctor, Person
    expect(data.mergedOntology.edgeTypes).toHaveLength(2) // treats, knows
  })

  it('detects and reports conflicts', async () => {
    const conflictingOntologies = [
      {
        id: 'ont1',
        fields: {
          Name: 'Ontology A',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Medical person', attributes: [] }
            ],
            edgeTypes: []
          })
        }
      },
      {
        id: 'ont2',
        fields: {
          Name: 'Ontology B',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'General person', attributes: [] }
            ],
            edgeTypes: []
          })
        }
      }
    ]

    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: conflictingOntologies
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merge'
    })

    const response = await POST(request)
    expect(response.status).toBe(400) // Should fail due to conflicts

    const data = await response.json()
    expect(data.conflicts).toBeDefined()
    expect(data.conflicts).toHaveLength(1)
    expect(data.conflicts[0].type).toBe('entity_name_collision')
  })

  it('applies conflict resolutions correctly', async () => {
    const conflictingOntologies = [
      {
        id: 'ont1',
        fields: {
          Name: 'Ontology A',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Medical person', attributes: [] }
            ],
            edgeTypes: []
          })
        }
      },
      {
        id: 'ont2',
        fields: {
          Name: 'Ontology B',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'General person', attributes: [] }
            ],
            edgeTypes: []
          })
        }
      }
    ]

    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: conflictingOntologies
    })

    mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
      id: 'merged1',
      createdTime: '2024-01-01T00:00:00Z'
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merge',
      resolutions: [
        {
          conflictId: 'Person',
          action: 'keep_both',
          parameters: {
            renameFirst: 'MedicalPerson',
            renameSecond: 'GeneralPerson'
          }
        }
      ]
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.mergedOntology.entityTypes).toHaveLength(2)
    expect(data.mergedOntology.entityTypes.find((t: any) => t.id === 'MedicalPerson')).toBeDefined()
    expect(data.mergedOntology.entityTypes.find((t: any) => t.id === 'GeneralPerson')).toBeDefined()
  })

  it('validates ontology access permissions', async () => {
    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: [] // No accessible ontologies
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merge'
    })

    const response = await POST(request)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toContain('No accessible ontologies found')
  })

  it('handles intersection merge strategy', async () => {
    const overlappingOntologies = [
      {
        id: 'ont1',
        fields: {
          Name: 'Ontology A',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Person entity', attributes: [] },
              { id: 'Doctor', name: 'Doctor', description: 'Medical doctor', attributes: [] }
            ],
            edgeTypes: [
              { id: 'knows', name: 'knows', description: 'Person knows another', sourceTypes: ['Person'], targetTypes: ['Person'] }
            ]
          })
        }
      },
      {
        id: 'ont2',
        fields: {
          Name: 'Ontology B',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Person entity', attributes: [] },
              { id: 'Customer', name: 'Customer', description: 'Business customer', attributes: [] }
            ],
            edgeTypes: [
              { id: 'knows', name: 'knows', description: 'Person knows another', sourceTypes: ['Person'], targetTypes: ['Person'] },
              { id: 'purchases', name: 'purchases', description: 'Customer purchases', sourceTypes: ['Customer'], targetTypes: ['Product'] }
            ]
          })
        }
      }
    ]

    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: overlappingOntologies
    })

    mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
      id: 'merged1',
      createdTime: '2024-01-01T00:00:00Z'
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'intersection',
      mergedOntologyName: 'Common Elements Ontology'
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    // Only common elements should remain
    expect(data.mergedOntology.entityTypes).toHaveLength(1) // Only Person
    expect(data.mergedOntology.entityTypes[0].id).toBe('Person')
    expect(data.mergedOntology.edgeTypes).toHaveLength(1) // Only knows
  })

  it('validates merge configuration', async () => {
    const request = createRequest({
      ontologyIds: [],
      strategy: 'union',
      mergedOntologyName: ''
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('validation')
  })

  it('handles edge type conflicts', async () => {
    const edgeConflictOntologies = [
      {
        id: 'ont1',
        fields: {
          Name: 'Ontology A',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Person', attributes: [] },
              { id: 'Company', name: 'Company', description: 'Company', attributes: [] }
            ],
            edgeTypes: [
              { 
                id: 'works_at', 
                name: 'works_at', 
                description: 'Person works at company', 
                sourceTypes: ['Person'], 
                targetTypes: ['Company'] 
              }
            ]
          })
        }
      },
      {
        id: 'ont2',
        fields: {
          Name: 'Ontology B',
          OntologyDefinition: JSON.stringify({
            entityTypes: [
              { id: 'Person', name: 'Person', description: 'Person', attributes: [] },
              { id: 'Organization', name: 'Organization', description: 'Organization', attributes: [] }
            ],
            edgeTypes: [
              { 
                id: 'works_at', 
                name: 'works_at', 
                description: 'Person works at organization', 
                sourceTypes: ['Person'], 
                targetTypes: ['Organization'] 
              }
            ]
          })
        }
      }
    ]

    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: edgeConflictOntologies
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merge'
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.conflicts.some((c: any) => c.type === 'edge_signature_conflict')).toBe(true)
  })

  it('logs merge activity', async () => {
    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: mockOntologies
    })

    mockMcpFunctions['mcp__airtable__create_record']
      .mockResolvedValueOnce({
        id: 'merged1',
        createdTime: '2024-01-01T00:00:00Z'
      })
      .mockResolvedValueOnce({
        id: 'activity1',
        createdTime: '2024-01-01T00:00:00Z'
      })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'union',
      mergedOntologyName: 'Test Merge'
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    // Should have called create_record twice: once for ontology, once for activity log
    expect(mockMcpFunctions['mcp__airtable__create_record']).toHaveBeenCalledTimes(2)
  })

  it('handles custom merge strategy with user-defined rules', async () => {
    mockMcpFunctions['mcp__airtable__list_records'].mockResolvedValue({
      records: mockOntologies
    })

    mockMcpFunctions['mcp__airtable__create_record'].mockResolvedValue({
      id: 'merged1',
      createdTime: '2024-01-01T00:00:00Z'
    })

    const request = createRequest({
      ontologyIds: ['ont1', 'ont2'],
      strategy: 'custom',
      mergedOntologyName: 'Custom Merge',
      customRules: {
        entitySelection: ['Patient', 'Person'],
        edgeSelection: ['treats'],
        priorityOntology: 'ont1'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.mergedOntology.entityTypes).toHaveLength(2)
    expect(data.mergedOntology.edgeTypes).toHaveLength(1)
  })
})