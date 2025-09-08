import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { GraphMatcher } from '@/server/services/graph-matcher'
import { withAuth, validateRequestBody, withRateLimit } from '@/lib/auth/middleware'

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

interface OntologyDefinition {
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  domain?: string
  tags?: string[]
}

// Validation schemas
const TypeDefinitionSchema = z.object({
  id: z.string().min(1, 'Type ID is required'),
  name: z.string().min(1, 'Type name is required').max(100, 'Type name must be under 100 characters'),
  description: z.string().min(1, 'Type description is required').max(500, 'Description must be under 500 characters'),
  pattern: z.string().optional(),
  attributes: z.array(z.object({
    name: z.string().min(1, 'Attribute name is required'),
    type: z.string().min(1, 'Attribute type is required'),
    required: z.boolean()
  })).optional()
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
    .max(10, 'Maximum of 10 entity types allowed'),
  edgeTypes: z.array(EdgeTypeDefinitionSchema)
    .max(10, 'Maximum of 10 edge types allowed'),
  domain: z.string().optional(),
  tags: z.array(z.string().min(1)).max(20, 'Maximum 20 tags allowed').optional()
})

const SimilarGraphsOptionsSchema = z.object({
  min_score: z.number().min(0).max(1).optional(),
  max_results: z.number().min(1).max(100).default(10),
  include_low_confidence: z.boolean().default(false),
  weight_usage: z.boolean().default(true),
  domain_filter: z.array(z.string().min(1)).max(10).optional()
})

const SimilarGraphsRequestSchema = z.object({
  ontology: OntologyDefinitionSchema,
  options: SimilarGraphsOptionsSchema.default({})
})

interface SimilarGraphsRequest {
  ontology: OntologyDefinition
  options?: {
    min_score?: number
    max_results?: number
    include_low_confidence?: boolean
    weight_usage?: boolean
    domain_filter?: string[]
  }
}

interface SimilarGraphsResponse {
  matches: Array<{
    graph: {
      id: string
      name: string
      description: string
      domain?: string
      tags?: string[]
      usage_count?: number
      success_rate?: number
      created_at?: string
      last_used?: string
    }
    scores: {
      overall: number
      entity_similarity: number
      edge_similarity: number
      domain_match: number
      tag_overlap: number
      usage_factor: number
    }
    reasoning: string[]
    confidence: 'high' | 'medium' | 'low'
  }>
  total_candidates: number
  search_time_ms: number
  query_summary: {
    entity_types: number
    edge_types: number
    domain: string | null
    tags: string[]
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`similarity-search:${user.userId}`, 20, 60000) // 20 per minute
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, SimilarGraphsRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    const { ontology, options } = validationResult.data

    // Get candidate graphs from Airtable
    const candidateGraphs = await GraphMatcher.getGraphsFromAirtable()

    // Find similar graphs
    const matches = await GraphMatcher.findSimilarGraphs(
      ontology,
      candidateGraphs,
      options
    )

    const searchTimeMs = Date.now() - startTime

    const response: SimilarGraphsResponse = {
      matches: matches.map(match => ({
        graph: {
          id: match.graph.id,
          name: match.graph.name,
          description: match.graph.description,
          domain: match.graph.domain,
          tags: match.graph.tags,
          usage_count: match.graph.usage_count,
          success_rate: match.graph.success_rate,
          created_at: match.graph.created_at,
          last_used: match.graph.last_used
        },
        scores: match.scores,
        reasoning: match.reasoning,
        confidence: match.confidence
      })),
      total_candidates: candidateGraphs.length,
      search_time_ms: searchTimeMs,
      query_summary: {
        entity_types: ontology.entityTypes.length,
        edge_types: ontology.edgeTypes.length,
        domain: ontology.domain || null,
        tags: ontology.tags || []
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Similar graphs API error:', error)
    
    const searchTimeMs = Date.now() - startTime
    
    return NextResponse.json(
      { 
        error: 'Failed to search for similar graphs',
        details: error instanceof Error ? error.message : 'Unknown error',
        search_time_ms: searchTimeMs
      },
      { status: 500 }
    )
  }
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
    const rateLimitError = withRateLimit(`similarity-search-get:${user.userId}`, 30, 60000) // 30 per minute
    if (rateLimitError) {
      return rateLimitError
    }

    // Support query parameter version for simple searches
    const { searchParams } = new URL(request.url)
    const entityTypes = searchParams.get('entity_types')?.split(',') || []
    const edgeTypes = searchParams.get('edge_types')?.split(',') || []
    const domain = searchParams.get('domain') || undefined
    const tags = searchParams.get('tags')?.split(',') || []

    // Basic validation
    if (entityTypes.length === 0) {
      return NextResponse.json({
        error: 'At least one entity type is required. Use entity_types query parameter.',
        example: '/api/ontologies/similar?entity_types=Person,Organization&edge_types=WORKS_AT'
      }, { status: 400 })
    }

    if (entityTypes.length > 10) {
      return NextResponse.json({
        error: 'Maximum of 10 entity types allowed for similarity search'
      }, { status: 400 })
    }

    if (edgeTypes.length > 10) {
      return NextResponse.json({
        error: 'Maximum of 10 edge types allowed for similarity search'
      }, { status: 400 })
    }

    // Convert query params to ontology format
    const ontology: OntologyDefinition = {
      entityTypes: entityTypes.map((name, index) => ({
        id: `entity_${index}`,
        name: name.trim(),
        description: `Entity type: ${name.trim()}`
      })),
      edgeTypes: edgeTypes.map((name, index) => ({
        id: `edge_${index}`,
        name: name.trim(),
        description: `Edge type: ${name.trim()}`,
        sourceTypes: ['*'], // Wildcard for query param version
        targetTypes: ['*']
      })),
      domain,
      tags
    }

    // Get candidate graphs
    const candidateGraphs = await GraphMatcher.getGraphsFromAirtable()

    // Find similar graphs
    const matches = await GraphMatcher.findSimilarGraphs(ontology, candidateGraphs, {
      max_results: 5, // Limit for GET requests
      min_score: 0.5, // Higher threshold for GET requests
      include_low_confidence: false
    })

    const response = {
      matches: matches.map(match => ({
        graph: {
          id: match.graph.id,
          name: match.graph.name,
          description: match.graph.description,
          domain: match.graph.domain,
          usage_count: match.graph.usage_count,
          success_rate: match.graph.success_rate
        },
        overall_score: match.scores.overall,
        confidence: match.confidence,
        top_reasons: match.reasoning.slice(0, 2)
      })),
      query: {
        entity_types: entityTypes,
        edge_types: edgeTypes,
        domain,
        tags
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Similar graphs GET API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search for similar graphs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}