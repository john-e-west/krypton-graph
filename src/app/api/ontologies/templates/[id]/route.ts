import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit, validateDocumentAccess } from '@/lib/auth/middleware'

// Declare MCP functions
declare global {
  function mcp__airtable__get_record(params: {
    baseId: string;
    tableId: string;
    recordId: string;
  }): Promise<{
    id: string;
    fields: Record<string, any>;
    createdTime: string;
  }>;

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

const UpdateTemplateRequestSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Name must be under 200 characters').optional(),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional(),
  ontology: OntologyDefinitionSchema.optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be under 50 characters').optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().min(1)).max(10, 'Maximum 10 tags allowed').optional()
})

const RateTemplateRequestSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').int()
})

const CloneTemplateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be under 200 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional(),
  isPublic: z.boolean().default(false)
})

/**
 * GET /api/ontologies/templates/[id] - Get a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`template-get:${user.userId}`, 30, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Fetch template from Airtable
    try {
      const result = await mcp__airtable__get_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        recordId: templateId
      })

      const template = {
        id: result.id,
        name: String(result.fields.Name || ''),
        description: String(result.fields.Description || ''),
        ontology: result.fields.OntologyDefinition ? 
          JSON.parse(String(result.fields.OntologyDefinition)) : null,
        category: String(result.fields.Category || ''),
        isPublic: Boolean(result.fields.IsPublic),
        tags: result.fields.Tags ? 
          String(result.fields.Tags).split(',').map(tag => tag.trim()) : [],
        createdBy: String(result.fields.CreatedBy || ''),
        createdAt: result.createdTime,
        lastModified: String(result.fields.LastModified || result.createdTime),
        usageCount: Number(result.fields.UsageCount || 0),
        rating: Number(result.fields.Rating || 0),
        ratingCount: Number(result.fields.RatingCount || 0),
        isActive: Boolean(result.fields.IsActive)
      }

      // Check access permissions
      const isOwner = template.createdBy === user.userId
      const isPublic = template.isPublic

      if (!isOwner && !isPublic) {
        return NextResponse.json(
          { error: 'Access denied', details: 'Template is private and you are not the owner' },
          { status: 403 }
        )
      }

      if (!template.isActive) {
        return NextResponse.json(
          { error: 'Template not found', details: 'Template has been archived or deleted' },
          { status: 404 }
        )
      }

      return NextResponse.json(template)

    } catch (error: any) {
      if (error.message?.includes('NOT_FOUND') || error.status === 404) {
        return NextResponse.json(
          { error: 'Template not found', details: 'The requested template does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

  } catch (error) {
    console.error('Template get API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ontologies/templates/[id] - Update a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`template-update:${user.userId}`, 10, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, UpdateTemplateRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    const updateData = validationResult.data

    // Step 4: Check if template exists and user has permission
    try {
      const existingTemplate = await mcp__airtable__get_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        recordId: templateId
      })

      if (existingTemplate.fields.CreatedBy !== user.userId) {
        return NextResponse.json(
          { error: 'Access denied', details: 'You can only update your own templates' },
          { status: 403 }
        )
      }

    } catch (error: any) {
      if (error.message?.includes('NOT_FOUND') || error.status === 404) {
        return NextResponse.json(
          { error: 'Template not found', details: 'The requested template does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    // Step 5: Build update fields
    const updateFields: Record<string, any> = {
      LastModified: new Date().toISOString()
    }

    if (updateData.name) updateFields.Name = updateData.name
    if (updateData.description !== undefined) updateFields.Description = updateData.description
    if (updateData.ontology) {
      updateFields.OntologyDefinition = JSON.stringify(updateData.ontology)
      updateFields.EntityTypeCount = updateData.ontology.entityTypes.length
      updateFields.EdgeTypeCount = updateData.ontology.edgeTypes.length
      updateFields.Domain = updateData.ontology.domain || ''
    }
    if (updateData.category) updateFields.Category = updateData.category
    if (updateData.isPublic !== undefined) updateFields.IsPublic = updateData.isPublic
    if (updateData.tags) updateFields.Tags = updateData.tags.join(', ')

    // Step 6: Update template in Airtable
    await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      records: [{
        id: templateId,
        fields: updateFields
      }]
    })

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      updatedFields: Object.keys(updateFields),
      lastModified: updateFields.LastModified
    })

  } catch (error) {
    console.error('Template update API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ontologies/templates/[id] - Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`template-delete:${user.userId}`, 5, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Check if template exists and user has permission
    try {
      const existingTemplate = await mcp__airtable__get_record({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblOntologyTemplates',
        recordId: templateId
      })

      if (existingTemplate.fields.CreatedBy !== user.userId) {
        return NextResponse.json(
          { error: 'Access denied', details: 'You can only delete your own templates' },
          { status: 403 }
        )
      }

    } catch (error: any) {
      if (error.message?.includes('NOT_FOUND') || error.status === 404) {
        return NextResponse.json(
          { error: 'Template not found', details: 'The requested template does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    // Step 4: Soft delete by setting IsActive to false
    await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      records: [{
        id: templateId,
        fields: {
          IsActive: false,
          DeletedAt: new Date().toISOString(),
          LastModified: new Date().toISOString()
        }
      }]
    })

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Template delete API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ontologies/templates/[id]/clone - Clone a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url)
  const action = url.pathname.split('/').pop()

  if (action === 'clone') {
    return handleCloneTemplate(request, params.id)
  } else if (action === 'rate') {
    return handleRateTemplate(request, params.id)
  } else if (action === 'use') {
    return handleUseTemplate(request, params.id)
  }

  return NextResponse.json(
    { error: 'Invalid action', details: 'Supported actions: clone, rate, use' },
    { status: 400 }
  )
}

async function handleCloneTemplate(request: NextRequest, templateId: string) {
  try {
    // Authentication
    const authResult = await withAuth()
    if (authResult.error) return authResult.error
    const { user } = authResult

    // Rate limiting
    const rateLimitError = withRateLimit(`template-clone:${user.userId}`, 5, 60000)
    if (rateLimitError) return rateLimitError

    // Request validation
    const validationResult = await validateRequestBody(request, CloneTemplateRequestSchema)
    if (validationResult.error) return validationResult.error
    const { name, description, isPublic } = validationResult.data

    // Get original template
    const originalTemplate = await mcp__airtable__get_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      recordId: templateId
    })

    // Check if original is accessible
    const isOwner = originalTemplate.fields.CreatedBy === user.userId
    const isOriginalPublic = Boolean(originalTemplate.fields.IsPublic)

    if (!isOwner && !isOriginalPublic) {
      return NextResponse.json(
        { error: 'Access denied', details: 'Cannot clone private template' },
        { status: 403 }
      )
    }

    // Create cloned template
    const cloneRecord = {
      Name: name,
      Description: description || String(originalTemplate.fields.Description || ''),
      OntologyDefinition: originalTemplate.fields.OntologyDefinition,
      Category: originalTemplate.fields.Category,
      IsPublic: isPublic,
      Tags: originalTemplate.fields.Tags,
      CreatedBy: user.userId,
      LastModified: new Date().toISOString(),
      UsageCount: 0,
      Rating: 0,
      RatingCount: 0,
      IsActive: true,
      Domain: originalTemplate.fields.Domain,
      EntityTypeCount: originalTemplate.fields.EntityTypeCount,
      EdgeTypeCount: originalTemplate.fields.EdgeTypeCount,
      ClonedFrom: templateId
    }

    const result = await mcp__airtable__create_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      fields: cloneRecord
    })

    return NextResponse.json({
      id: result.id,
      message: 'Template cloned successfully',
      originalTemplate: {
        id: templateId,
        name: originalTemplate.fields.Name
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Template clone API error:', error)
    return NextResponse.json(
      { error: 'Failed to clone template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleRateTemplate(request: NextRequest, templateId: string) {
  try {
    // Authentication
    const authResult = await withAuth()
    if (authResult.error) return authResult.error
    const { user } = authResult

    // Rate limiting
    const rateLimitError = withRateLimit(`template-rate:${user.userId}`, 10, 60000)
    if (rateLimitError) return rateLimitError

    // Request validation
    const validationResult = await validateRequestBody(request, RateTemplateRequestSchema)
    if (validationResult.error) return validationResult.error
    const { rating } = validationResult.data

    // Get current template
    const template = await mcp__airtable__get_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      recordId: templateId
    })

    // Calculate new rating
    const currentRating = Number(template.fields.Rating || 0)
    const currentCount = Number(template.fields.RatingCount || 0)
    const newCount = currentCount + 1
    const newRating = ((currentRating * currentCount) + rating) / newCount

    // Update template
    await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      records: [{
        id: templateId,
        fields: {
          Rating: Math.round(newRating * 100) / 100,
          RatingCount: newCount,
          LastModified: new Date().toISOString()
        }
      }]
    })

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
      newRating: Math.round(newRating * 100) / 100,
      totalRatings: newCount
    })

  } catch (error) {
    console.error('Template rating API error:', error)
    return NextResponse.json(
      { error: 'Failed to rate template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleUseTemplate(request: NextRequest, templateId: string) {
  try {
    // Authentication
    const authResult = await withAuth()
    if (authResult.error) return authResult.error
    const { user } = authResult

    // Increment usage count
    const template = await mcp__airtable__get_record({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      recordId: templateId
    })

    const currentUsage = Number(template.fields.UsageCount || 0)

    await mcp__airtable__update_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblOntologyTemplates',
      records: [{
        id: templateId,
        fields: {
          UsageCount: currentUsage + 1,
          LastModified: new Date().toISOString()
        }
      }]
    })

    return NextResponse.json({
      success: true,
      message: 'Template usage recorded',
      ontology: JSON.parse(String(template.fields.OntologyDefinition))
    })

  } catch (error) {
    console.error('Template use API error:', error)
    return NextResponse.json(
      { error: 'Failed to record template usage', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}