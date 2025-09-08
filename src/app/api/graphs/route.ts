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
}

const CreateGraphRequestSchema = z.object({
  name: z.string().min(1, 'Graph name is required').max(200, 'Name must be under 200 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').default(''),
  ontologyId: z.string().min(1, 'Ontology ID is required'),
  configuration: z.object({
    maxNodes: z.number().int().positive().default(10000),
    maxEdges: z.number().int().positive().default(50000),
    autoClassification: z.boolean().default(true),
    retentionDays: z.number().int().positive().default(30),
    processingPriority: z.enum(['low', 'normal', 'high']).default('normal')
  }).default({}),
  tags: z.array(z.string().min(1)).max(20, 'Maximum 20 tags allowed').default([]),
  initialStatus: z.enum(['active', 'inactive']).default('active')
})

interface GraphSummary {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived' | 'processing'
  createdBy: string
  createdAt: string
  lastModified: string
  lastActivity: string
  ontologyId: string
  ontologyName?: string
  nodeCount: number
  edgeCount: number
  dataSize: number
  tags: string[]
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graphs-list:${user.userId}`, 100, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const ontologyId = searchParams.get('ontologyId')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const sortBy = searchParams.get('sortBy') || 'created'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const includeOntologyNames = searchParams.get('includeOntologyNames') === 'true'

    // Step 4: Build Airtable filter formula
    let filterParts = [`{CreatedBy} = "${user.userId}"`]
    
    if (status) {
      filterParts.push(`{Status} = "${status}"`)
    } else {
      // Exclude archived by default
      filterParts.push(`{Status} != "archived"`)
    }

    if (search) {
      filterParts.push(`OR(FIND(LOWER("${search}"), LOWER({Name})), FIND(LOWER("${search}"), LOWER({Description})))`)
    }

    if (ontologyId) {
      filterParts.push(`{OntologyId} = "${ontologyId}"`)
    }

    if (tags.length > 0) {
      const tagFilters = tags.map(tag => `FIND("${tag}", {Tags})`).join(', ')
      filterParts.push(`OR(${tagFilters})`)
    }

    const filterFormula = filterParts.length > 1 ? 
      `AND(${filterParts.join(', ')})` : 
      filterParts[0]

    // Step 5: Fetch graphs from Airtable
    const sortField = {
      created: 'CreatedAt',
      modified: 'LastModified',
      activity: 'LastActivity',
      name: 'Name',
      nodes: 'NodeCount',
      edges: 'EdgeCount'
    }[sortBy] || 'CreatedAt'

    const graphRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      filterByFormula: filterFormula,
      maxRecords: limit,
      sort: [{ field: sortField, direction: sortOrder as 'asc' | 'desc' }]
    })

    // Step 6: Transform records to graph summaries
    const graphs: GraphSummary[] = graphRecords.records.map(record => ({
      id: record.id,
      name: String(record.fields.Name || ''),
      description: String(record.fields.Description || ''),
      status: record.fields.Status || 'active',
      createdBy: String(record.fields.CreatedBy || ''),
      createdAt: record.createdTime,
      lastModified: String(record.fields.LastModified || record.createdTime),
      lastActivity: String(record.fields.LastActivity || ''),
      ontologyId: String(record.fields.OntologyId || ''),
      nodeCount: Number(record.fields.NodeCount || 0),
      edgeCount: Number(record.fields.EdgeCount || 0),
      dataSize: Number(record.fields.DataSize || 0),
      tags: record.fields.Tags ? 
        String(record.fields.Tags).split(',').map(tag => tag.trim()) : []
    }))

    // Step 7: Include ontology names if requested
    if (includeOntologyNames && graphs.length > 0) {
      const uniqueOntologyIds = [...new Set(graphs.map(g => g.ontologyId).filter(Boolean))]
      
      if (uniqueOntologyIds.length > 0) {
        const ontologyRecords = await mcp__airtable__list_records({
          baseId: 'appvLsaMZqtLc9EIX',
          tableId: 'tblOntologyTemplates',
          filterByFormula: `OR(${uniqueOntologyIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`,
          maxRecords: uniqueOntologyIds.length
        })

        const ontologyMap = new Map()
        ontologyRecords.records.forEach(record => {
          ontologyMap.set(record.id, String(record.fields.Name || ''))
        })

        graphs.forEach(graph => {
          if (graph.ontologyId && ontologyMap.has(graph.ontologyId)) {
            graph.ontologyName = ontologyMap.get(graph.ontologyId)
          }
        })
      }
    }

    // Step 8: Calculate summary statistics
    const totalNodes = graphs.reduce((sum, graph) => sum + graph.nodeCount, 0)
    const totalEdges = graphs.reduce((sum, graph) => sum + graph.edgeCount, 0)
    const totalDataSize = graphs.reduce((sum, graph) => sum + graph.dataSize, 0)
    const statusCounts = graphs.reduce((acc, graph) => {
      acc[graph.status] = (acc[graph.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const response = {
      graphs,
      pagination: {
        total: graphs.length,
        limit,
        hasMore: graphs.length === limit
      },
      filters: {
        status,
        search,
        ontologyId,
        tags
      },
      sort: {
        field: sortBy,
        order: sortOrder
      },
      summary: {
        totalGraphs: graphs.length,
        totalNodes,
        totalEdges,
        totalDataSize,
        statusCounts
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Graphs list API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch graphs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`graphs-create:${user.userId}`, 10, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, CreateGraphRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }

    const { name, description, ontologyId, configuration, tags, initialStatus } = validationResult.data

    // Step 4: Check if ontology exists and user has access
    const ontologyRecords = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      filterByFormula: `AND(RECORD_ID() = "${ontologyId}", OR({IsPublic} = TRUE(), {CreatedBy} = "${user.userId}"))`,
      maxRecords: 1
    })

    if (ontologyRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'Ontology not found or access denied' },
        { status: 404 }
      )
    }

    const ontologyRecord = ontologyRecords.records[0]

    // Step 5: Check for duplicate graph name (within user's graphs)
    const existingGraphs = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      filterByFormula: `AND({Name} = "${name}", {CreatedBy} = "${user.userId}")`,
      maxRecords: 1
    })

    if (existingGraphs.records.length > 0) {
      return NextResponse.json(
        { error: 'A graph with this name already exists' },
        { status: 409 }
      )
    }

    // Step 6: Create graph record
    const graphRecord = {
      Name: name,
      Description: description,
      Status: initialStatus,
      CreatedBy: user.userId,
      LastModified: new Date().toISOString(),
      LastActivity: new Date().toISOString(),
      OntologyId: ontologyId,
      Configuration: JSON.stringify(configuration),
      Tags: tags.join(', '),
      NodeCount: 0,
      EdgeCount: 0,
      DataSize: 0,
      LastSync: '',
      ProcessingQueue: 0,
      ErrorCount: 0,
      Version: 1
    }

    const result = await mcp__airtable__create_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblGraphs',
      fields: graphRecord
    })

    // Step 7: Create initial activity log entry
    try {
      await mcp__airtable__create_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblGraphActivity',
        fields: {
          GraphId: result.id,
          Type: 'graph_created',
          Description: `Graph "${name}" created`,
          Metadata: JSON.stringify({
            ontologyId,
            ontologyName: String(ontologyRecord.fields.Name || ''),
            initialConfiguration: configuration,
            createdBy: user.userId
          }),
          CreatedBy: user.userId
        }
      })
    } catch (activityError) {
      // Log activity creation failure but don't fail the main operation
      console.warn('Failed to create initial graph activity log:', activityError)
    }

    // Step 8: Update ontology usage count
    try {
      const currentUsageCount = Number(ontologyRecord.fields.UsageCount || 0)
      await mcp__airtable__update_records({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        records: [{
          id: ontologyId,
          fields: {
            UsageCount: currentUsageCount + 1,
            LastUsed: new Date().toISOString()
          }
        }]
      })
    } catch (usageUpdateError) {
      console.warn('Failed to update ontology usage count:', usageUpdateError)
    }

    const response = {
      id: result.id,
      name,
      description,
      status: initialStatus,
      createdBy: user.userId,
      createdAt: result.createdTime,
      lastModified: graphRecord.LastModified,
      ontologyId,
      ontologyName: String(ontologyRecord.fields.Name || ''),
      configuration,
      tags,
      nodeCount: 0,
      edgeCount: 0,
      dataSize: 0,
      message: 'Graph created successfully'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Graph creation API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}