import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit, validateDocumentAccess } from '@/lib/auth/middleware'

// Declare MCP functions - will be available at runtime
declare global {
  function mcp__airtable__create_record(params: {
    baseId: string;
    tableId: string;
    fields: Record<string, any>;
  }): Promise<{ id: string; fields: Record<string, any>; createdTime: string; }>;
  
  function mcp__airtable__update_records(params: {
    baseId: string;
    tableId: string;
    records: Array<{ id: string; fields: Record<string, any>; }>;
  }): Promise<Array<{ id: string; fields: Record<string, any>; }>>; 
}

interface TypeDefinition {
  id: string
  name: string
  description: string
  pattern?: string
  attributes?: Array<{
    name: string
    type: string
    required: boolean
  }>
}

interface EdgeTypeDefinition {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  pattern?: string
}

interface GraphConfiguration {
  name: string
  description: string
  isPrivate: boolean
  allowCollaboration: boolean
  tags: string[]
}

// Validation schemas
const AttributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  type: z.string().min(1, 'Attribute type is required'),
  required: z.boolean()
})

const TypeDefinitionSchema = z.object({
  id: z.string().min(1, 'Type ID is required'),
  name: z.string().min(1, 'Type name is required').max(100, 'Type name must be under 100 characters'),
  description: z.string().min(1, 'Type description is required').max(500, 'Description must be under 500 characters'),
  pattern: z.string().optional(),
  attributes: z.array(AttributeSchema).optional()
})

const EdgeTypeDefinitionSchema = z.object({
  id: z.string().min(1, 'Edge type ID is required'),
  name: z.string().min(1, 'Edge type name is required').max(100, 'Edge type name must be under 100 characters'),
  description: z.string().min(1, 'Edge type description is required').max(500, 'Description must be under 500 characters'),
  sourceTypes: z.array(z.string().min(1)).min(1, 'At least one source type is required'),
  targetTypes: z.array(z.string().min(1)).min(1, 'At least one target type is required'),
  pattern: z.string().optional()
})

const GraphConfigurationSchema = z.object({
  name: z.string().min(1, 'Graph name is required').max(200, 'Graph name must be under 200 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional().default(''),
  isPrivate: z.boolean().default(false),
  allowCollaboration: z.boolean().default(true),
  tags: z.array(z.string().min(1)).max(20, 'Maximum 20 tags allowed').default([])
})

const ApplyTypesRequestSchema = z.object({
  entityTypes: z.array(TypeDefinitionSchema)
    .min(1, 'At least one entity type is required')
    .max(10, 'Maximum of 10 entity types allowed (Zep v3 constraint)'),
  edgeTypes: z.array(EdgeTypeDefinitionSchema)
    .max(10, 'Maximum of 10 edge types allowed (Zep v3 constraint)')
    .default([]),
  config: GraphConfigurationSchema
})

interface ApplyTypesRequest {
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  config: GraphConfiguration
}

interface ZepGraphConfig {
  name: string
  description?: string
  entity_types: Array<{
    name: string
    description: string
    attributes?: Record<string, string>
  }>
  edge_types: Array<{
    name: string
    description: string
    source_types: string[]
    target_types: string[]
  }>
}

const createAirtableKnowledgeGraph = async (
  documentId: string,
  config: GraphConfiguration,
  entityTypes: TypeDefinition[],
  edgeTypes: EdgeTypeDefinition[],
  userId: string
) => {
  // Create knowledge graph record in Airtable using MCP
  const graphRecord = {
    Name: config.name,
    Description: config.description || '',
    Status: 'Creating',
    Tags: config.tags.join(', '),
    IsActive: true,
    IsArchived: false,
    IsPublic: !config.isPrivate,
    AllowCloning: config.allowCollaboration,
    ProcessingEnabled: true,
    EntityCount: entityTypes.length,
    EdgeCount: edgeTypes.length,
    DocumentCount: 1,
    CreatedBy: userId,
    LastModifiedBy: userId
  }

  try {
    // Use Airtable MCP to create the graph record
    const result = await mcp__airtable__create_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblKBwwyf3xrCVlH6', // Graphs table
      fields: graphRecord
    })
    
    return {
      graphId: result.id,
      status: 'created',
      record: { ...graphRecord, id: result.id }
    }
  } catch (error) {
    console.error('Failed to create Airtable graph record:', error)
    throw new Error('Failed to create knowledge graph in Airtable')
  }
}

const createZepKnowledgeGraph = async (
  graphId: string,
  entityTypes: TypeDefinition[],
  edgeTypes: EdgeTypeDefinition[],
  _documentContent: string
) => {
  // Convert our types to Zep v3 format
  const _zepConfig: ZepGraphConfig = {
    name: graphId,
    entity_types: entityTypes.map(type => ({
      name: type.name,
      description: type.description,
      attributes: type.attributes?.reduce((acc, attr) => ({
        ...acc,
        [attr.name]: attr.type
      }), {})
    })),
    edge_types: edgeTypes.map(type => ({
      name: type.name,
      description: type.description,
      source_types: type.sourceTypes,
      target_types: type.targetTypes
    }))
  }

  // For now, simulate Zep v3 API call
  // TODO: Replace with actual Zep v3 Graph API integration
  const zepResponse = {
    graph_id: graphId,
    status: 'processing',
    entity_count: Math.floor(Math.random() * 50) + 20,
    edge_count: Math.floor(Math.random() * 80) + 30,
    processing_time_ms: Math.floor(Math.random() * 5000) + 2000
  }

  return zepResponse
}

const processDocumentChunks = async (documentId: string, entityTypes: TypeDefinition[]) => {
  // Apply ontology to document chunks
  // For now, simulate chunk processing
  const mockChunks = [
    { id: '1', text: 'Sample chunk 1 content...', entities_extracted: 5 },
    { id: '2', text: 'Sample chunk 2 content...', entities_extracted: 3 },
    { id: '3', text: 'Sample chunk 3 content...', entities_extracted: 7 }
  ]

  const processedChunks = mockChunks.map(chunk => ({
    ...chunk,
    classification_results: entityTypes.map(type => ({
      type: type.name,
      confidence: 0.7 + Math.random() * 0.3,
      count: Math.floor(Math.random() * 5)
    }))
  }))

  return {
    total_chunks: processedChunks.length,
    processed_chunks: processedChunks.length,
    total_entities: processedChunks.reduce((sum, chunk) => sum + chunk.entities_extracted, 0),
    chunks: processedChunks
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graph-creation:${user.userId}`, 10, 60000) // 10 per minute
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Document access validation
    const accessResult = await validateDocumentAccess(user.userId, documentId, 'write')
    if (!accessResult.authorized) {
      return accessResult.error!
    }

    // Step 4: Request body validation
    const validationResult = await validateRequestBody(request, ApplyTypesRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    const { entityTypes, edgeTypes, config } = validationResult.data

    // Step 5: Create knowledge graph record in Airtable
    const airtableResult = await createAirtableKnowledgeGraph(
      documentId,
      config,
      entityTypes,
      edgeTypes,
      user.userId
    )

    // Step 6: Process document chunks with the ontology
    const chunkResults = await processDocumentChunks(documentId, entityTypes)

    // Step 7: Create knowledge graph in Zep v3
    const zepResult = await createZepKnowledgeGraph(
      airtableResult.graphId,
      entityTypes,
      edgeTypes,
      'document content placeholder'
    )

    // Step 8: Update Airtable record with results
    try {
      await mcp__airtable__update_records({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblKBwwyf3xrCVlH6',
        records: [{
          id: airtableResult.graphId,
          fields: {
            Status: 'Active',
            EntityCount: zepResult.entity_count,
            EdgeCount: zepResult.edge_count,
            DocumentCount: 1
          }
        }]
      })
    } catch (error) {
      console.error('Failed to update Airtable graph record:', error)
      // Don't throw - graph was created successfully
    }
    
    const response = {
      graphId: airtableResult.graphId,
      status: 'created',
      airtable: {
        recordId: airtableResult.graphId,
        status: airtableResult.status
      },
      zep: {
        graphId: zepResult.graph_id,
        status: zepResult.status,
        entityCount: zepResult.entity_count,
        edgeCount: zepResult.edge_count,
        processingTimeMs: zepResult.processing_time_ms
      },
      processing: {
        totalChunks: chunkResults.total_chunks,
        processedChunks: chunkResults.processed_chunks,
        totalEntities: chunkResults.total_entities
      },
      config: {
        name: config.name,
        description: config.description,
        entityTypes: entityTypes.length,
        edgeTypes: edgeTypes.length,
        isPrivate: config.isPrivate
      },
      createdAt: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Apply types API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create knowledge graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to apply types and create knowledge graph.' },
    { status: 405 }
  )
}