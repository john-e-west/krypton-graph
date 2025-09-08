import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit } from '@/lib/auth/middleware'

// Declare MCP functions - will be available at runtime
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

const OntologyDefinitionSchema = z.object({
  entityTypes: z.array(TypeDefinitionSchema)
    .min(1, 'At least one entity type is required')
    .max(10, 'Maximum of 10 entity types allowed (Zep v3 constraint)'),
  edgeTypes: z.array(EdgeTypeDefinitionSchema)
    .max(10, 'Maximum of 10 edge types allowed (Zep v3 constraint)')
    .default([]),
  domain: z.string().optional(),
  tags: z.array(z.string().min(1)).max(20, 'Maximum 20 tags allowed').optional()
})

const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Name must be under 200 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional().default(''),
  ontology: OntologyDefinitionSchema,
  category: z.string().min(1, 'Category is required').max(50, 'Category must be under 50 characters'),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string().min(1)).max(10, 'Maximum 10 tags allowed').default([])
})

const UpdateTemplateRequestSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Name must be under 200 characters').optional(),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional(),
  ontology: OntologyDefinitionSchema.optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be under 50 characters').optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1)).max(10, 'Maximum 10 tags allowed').optional()
})

interface OntologyTemplate {
  id: string
  name: string
  description: string
  ontology: any
  category: string
  isPublic: boolean
  tags: string[]
  createdBy: string
  createdAt: string
  lastModified: string
  usageCount: number
  rating: number
  ratingCount: number
}

/**
 * GET /api/ontologies/templates - List templates with filtering and search
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`ontology-templates-list:${user.userId}`, 50, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Parse query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const domain = searchParams.get('domain')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const search = searchParams.get('search')
    const isPublic = searchParams.get('public')
    const sortBy = searchParams.get('sortBy') || 'created'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Step 4: Build Airtable filter formula
    let filterParts = ['AND({IsActive} = TRUE())']
    
    if (isPublic === 'true') {
      filterParts.push('{IsPublic} = TRUE()')
    } else if (isPublic === 'false') {
      filterParts.push(`OR({IsPublic} = FALSE(), {CreatedBy} = "${user.userId}")`)
    } else {
      // Show both public templates and user's private templates
      filterParts.push(`OR({IsPublic} = TRUE(), {CreatedBy} = "${user.userId}")`)
    }

    if (category) {
      filterParts.push(`{Category} = "${category}"`)
    }

    if (domain) {
      filterParts.push(`FIND("${domain}", {Domain})`)
    }

    if (tags.length > 0) {
      const tagFilters = tags.map(tag => `FIND("${tag}", {Tags})`).join(', ')
      filterParts.push(`OR(${tagFilters})`)
    }

    if (search) {
      filterParts.push(`OR(FIND(LOWER("${search}"), LOWER({Name})), FIND(LOWER("${search}"), LOWER({Description})))`)
    }

    const filterFormula = filterParts.length > 1 ? 
      `AND(${filterParts.join(', ')})` : 
      filterParts[0]

    // Step 5: Fetch templates from Airtable
    const sortField = {
      created: 'CreatedAt',
      modified: 'LastModified',
      usage: 'UsageCount',
      rating: 'Rating',
      name: 'Name'
    }[sortBy] || 'CreatedAt'

    const result = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates', // Assuming this table exists
      filterByFormula: filterFormula,
      maxRecords: limit,
      sort: [{ field: sortField, direction: sortOrder as 'asc' | 'desc' }]
    })

    // Step 6: Transform records to template format
    const templates: OntologyTemplate[] = result.records.map(record => ({
      id: record.id,
      name: String(record.fields.Name || ''),
      description: String(record.fields.Description || ''),
      ontology: record.fields.OntologyDefinition ? 
        JSON.parse(String(record.fields.OntologyDefinition)) : null,
      category: String(record.fields.Category || ''),
      isPublic: Boolean(record.fields.IsPublic),
      tags: record.fields.Tags ? 
        String(record.fields.Tags).split(',').map(tag => tag.trim()) : [],
      createdBy: String(record.fields.CreatedBy || ''),
      createdAt: record.createdTime,
      lastModified: String(record.fields.LastModified || record.createdTime),
      usageCount: Number(record.fields.UsageCount || 0),
      rating: Number(record.fields.Rating || 0),
      ratingCount: Number(record.fields.RatingCount || 0)
    }))

    const response = {
      templates,
      pagination: {
        total: templates.length,
        limit,
        hasMore: templates.length === limit
      },
      filters: {
        category,
        domain,
        tags,
        search,
        isPublic
      },
      sort: {
        field: sortBy,
        order: sortOrder
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Templates list API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch ontology templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ontologies/templates - Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`ontology-templates-create:${user.userId}`, 10, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, CreateTemplateRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    const { name, description, ontology, category, isPublic, tags } = validationResult.data

    // Step 4: Create template record in Airtable
    const templateRecord = {
      Name: name,
      Description: description,
      OntologyDefinition: JSON.stringify(ontology),
      Category: category,
      IsPublic: isPublic,
      Tags: tags.join(', '),
      CreatedBy: user.userId,
      LastModified: new Date().toISOString(),
      UsageCount: 0,
      Rating: 0,
      RatingCount: 0,
      IsActive: true,
      Domain: ontology.domain || '',
      EntityTypeCount: ontology.entityTypes.length,
      EdgeTypeCount: ontology.edgeTypes.length
    }

    const result = await mcp__airtable__create_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      fields: templateRecord
    })

    const response = {
      id: result.id,
      name,
      description,
      ontology,
      category,
      isPublic,
      tags,
      createdBy: user.userId,
      createdAt: result.createdTime,
      lastModified: templateRecord.LastModified,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      message: 'Ontology template created successfully'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Template creation API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create ontology template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}