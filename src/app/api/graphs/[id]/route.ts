import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit } from '@/lib/auth/middleware'

declare global {
  function mcp__airtable__list_records(params: {
    baseId: string;
    tableId: string;
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    view?: string;
  }): Promise<{
    records: Array<{
      id: string;
      fields: Record<string, any>;
      createdTime: string;
    }>;
  }>;

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

  function mcp__airtable__delete_records(params: {
    baseId: string;
    tableId: string;
    recordIds: string[];
  }): Promise<{ deletedRecords: Array<{ id: string; deleted: boolean; }> }>;
}

const UpdateGraphRequestSchema = z.object({
  name: z.string().min(1, 'Graph name is required').max(200, 'Name must be under 200 characters').optional(),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional(),
  status: z.enum(['active', 'inactive', 'archived', 'processing']).optional(),
  ontologyId: z.string().optional(),
  configuration: z.object({
    maxNodes: z.number().int().positive().optional(),
    maxEdges: z.number().int().positive().optional(),
    autoClassification: z.boolean().optional(),
    retentionDays: z.number().int().positive().optional(),
    processingPriority: z.enum(['low', 'normal', 'high']).optional()
  }).optional(),
  tags: z.array(z.string().min(1)).max(20, 'Maximum 20 tags allowed').optional()
})

const GraphQuerySchema = z.object({
  includeMetrics: z.boolean().default(false),
  includeOntology: z.boolean().default(false),
  includeActivity: z.boolean().default(false)
})

interface GraphRecord {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived' | 'processing'
  createdBy: string
  createdAt: string
  lastModified: string
  lastActivity: string
  ontologyId: string
  configuration: {
    maxNodes: number
    maxEdges: number
    autoClassification: boolean
    retentionDays: number
    processingPriority: 'low' | 'normal' | 'high'
  }
  metrics: {
    nodeCount: number
    edgeCount: number
    dataSize: number
    lastSync: string
  }
  tags: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graph-get:${user.userId}`, 100, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = GraphQuerySchema.safeParse({
      includeMetrics: searchParams.get('includeMetrics') === 'true',
      includeOntology: searchParams.get('includeOntology') === 'true',
      includeActivity: searchParams.get('includeActivity') === 'true'
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.issues },
        { status: 400 }
      )
    }

    const { includeMetrics, includeOntology, includeActivity } = queryValidation.data

    // Step 4: Fetch graph record from Airtable
    const graphRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      filterByFormula: `AND(RECORD_ID() = "${params.id}", {CreatedBy} = "${user.userId}")`,
      maxRecords: 1
    })

    if (graphRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'Graph not found or access denied' },
        { status: 404 }
      )
    }

    const record = graphRecords.records[0]
    
    // Step 5: Build base graph response
    const graph: any = {
      id: record.id,
      name: String(record.fields.Name || ''),
      description: String(record.fields.Description || ''),
      status: record.fields.Status || 'active',
      createdBy: String(record.fields.CreatedBy || ''),
      createdAt: record.createdTime,
      lastModified: String(record.fields.LastModified || record.createdTime),
      lastActivity: String(record.fields.LastActivity || ''),
      ontologyId: String(record.fields.OntologyId || ''),
      configuration: record.fields.Configuration ? 
        JSON.parse(String(record.fields.Configuration)) : {
          maxNodes: 10000,
          maxEdges: 50000,
          autoClassification: true,
          retentionDays: 30,
          processingPriority: 'normal'
        },
      tags: record.fields.Tags ? 
        String(record.fields.Tags).split(',').map(tag => tag.trim()) : []
    }

    // Step 6: Include metrics if requested
    if (includeMetrics) {
      graph.metrics = {
        nodeCount: Number(record.fields.NodeCount || 0),
        edgeCount: Number(record.fields.EdgeCount || 0),
        dataSize: Number(record.fields.DataSize || 0),
        lastSync: String(record.fields.LastSync || '')
      }
    }

    // Step 7: Include ontology if requested
    if (includeOntology && graph.ontologyId) {
      const ontologyRecords = await mcp__airtable__list_records({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        filterByFormula: `RECORD_ID() = "${graph.ontologyId}"`,
        maxRecords: 1
      })

      if (ontologyRecords.records.length > 0) {
        const ontologyRecord = ontologyRecords.records[0]
        graph.ontology = {
          id: ontologyRecord.id,
          name: String(ontologyRecord.fields.Name || ''),
          description: String(ontologyRecord.fields.Description || ''),
          definition: ontologyRecord.fields.OntologyDefinition ? 
            JSON.parse(String(ontologyRecord.fields.OntologyDefinition)) : {}
        }
      }
    }

    // Step 8: Include activity log if requested
    if (includeActivity) {
      const activityRecords = await mcp__airtable__list_records({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblGraphActivity',
        filterByFormula: `{GraphId} = "${params.id}"`,
        maxRecords: 50,
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      })

      graph.activity = activityRecords.records.map(activity => ({
        id: activity.id,
        type: String(activity.fields.Type || ''),
        description: String(activity.fields.Description || ''),
        metadata: activity.fields.Metadata ? 
          JSON.parse(String(activity.fields.Metadata)) : {},
        createdAt: activity.createdTime,
        createdBy: String(activity.fields.CreatedBy || '')
      }))
    }

    return NextResponse.json(graph)

  } catch (error) {
    console.error('Graph get API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graph-update:${user.userId}`, 20, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, UpdateGraphRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }

    const updateData = validationResult.data

    // Step 4: Check if graph exists and user has access
    const existingRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      filterByFormula: `AND(RECORD_ID() = "${params.id}", {CreatedBy} = "${user.userId}")`,
      maxRecords: 1
    })

    if (existingRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'Graph not found or access denied' },
        { status: 404 }
      )
    }

    // Step 5: Prepare update fields
    const updateFields: Record<string, any> = {
      LastModified: new Date().toISOString()
    }

    if (updateData.name !== undefined) {
      updateFields.Name = updateData.name
    }

    if (updateData.description !== undefined) {
      updateFields.Description = updateData.description
    }

    if (updateData.status !== undefined) {
      updateFields.Status = updateData.status
    }

    if (updateData.ontologyId !== undefined) {
      updateFields.OntologyId = updateData.ontologyId
    }

    if (updateData.configuration !== undefined) {
      const existingConfig = existingRecords.records[0].fields.Configuration ? 
        JSON.parse(String(existingRecords.records[0].fields.Configuration)) : {}
      
      const newConfig = { ...existingConfig, ...updateData.configuration }
      updateFields.Configuration = JSON.stringify(newConfig)
    }

    if (updateData.tags !== undefined) {
      updateFields.Tags = updateData.tags.join(', ')
    }

    // Step 6: Update record in Airtable
    const updatedRecords = await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      records: [{
        id: params.id,
        fields: updateFields
      }]
    })

    // Step 7: Log activity
    try {
      await mcp__airtable__create_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblGraphActivity',
        fields: {
          GraphId: params.id,
          Type: 'configuration_update',
          Description: `Graph configuration updated`,
          Metadata: JSON.stringify({
            updatedFields: Object.keys(updateFields).filter(key => key !== 'LastModified'),
            updatedBy: user.userId
          }),
          CreatedBy: user.userId
        }
      })
    } catch (activityError) {
      // Log activity creation failure but don't fail the main operation
      console.warn('Failed to log graph update activity:', activityError)
    }

    // Step 8: Return updated graph
    const updatedRecord = updatedRecords[0]
    const response = {
      id: updatedRecord.id,
      name: String(updatedRecord.fields.Name || ''),
      description: String(updatedRecord.fields.Description || ''),
      status: updatedRecord.fields.Status || 'active',
      createdBy: String(updatedRecord.fields.CreatedBy || ''),
      lastModified: String(updatedRecord.fields.LastModified),
      ontologyId: String(updatedRecord.fields.OntologyId || ''),
      configuration: updatedRecord.fields.Configuration ? 
        JSON.parse(String(updatedRecord.fields.Configuration)) : {},
      tags: updatedRecord.fields.Tags ? 
        String(updatedRecord.fields.Tags).split(',').map(tag => tag.trim()) : [],
      message: 'Graph updated successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Graph update API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graph-delete:${user.userId}`, 5, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Check if graph exists and user has access
    const existingRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      filterByFormula: `AND(RECORD_ID() = "${params.id}", {CreatedBy} = "${user.userId}")`,
      maxRecords: 1
    })

    if (existingRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'Graph not found or access denied' },
        { status: 404 }
      )
    }

    const graphRecord = existingRecords.records[0]
    const graphName = String(graphRecord.fields.Name || 'Unknown Graph')

    // Step 4: Check for dependent resources
    const dependentDocuments = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblDocuments',
      filterByFormula: `{GraphId} = "${params.id}"`,
      maxRecords: 1
    })

    if (dependentDocuments.records.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete graph with associated documents',
          details: 'Please remove all documents from this graph before deleting it'
        },
        { status: 409 }
      )
    }

    // Step 5: Archive instead of hard delete for safety
    const archiveUpdate = await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      records: [{
        id: params.id,
        fields: {
          Status: 'archived',
          LastModified: new Date().toISOString(),
          ArchivedAt: new Date().toISOString(),
          ArchivedBy: user.userId
        }
      }]
    })

    // Step 6: Log activity
    try {
      await mcp__airtable__create_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblGraphActivity',
        fields: {
          GraphId: params.id,
          Type: 'graph_archived',
          Description: `Graph "${graphName}" archived by user`,
          Metadata: JSON.stringify({
            archivedBy: user.userId,
            originalStatus: graphRecord.fields.Status || 'active'
          }),
          CreatedBy: user.userId
        }
      })
    } catch (activityError) {
      console.warn('Failed to log graph deletion activity:', activityError)
    }

    return NextResponse.json({
      message: `Graph "${graphName}" has been archived successfully`,
      id: params.id,
      archivedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Graph delete API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}