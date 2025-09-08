import { NextRequest, NextResponse } from 'next/server'
import { DocumentAnalyzer } from '@/services/document-analyzer'
import { TypeSuggestionEngine } from '@/services/type-suggestion-engine'

// In-memory cache for suggestions (in production, use Redis or database)
const suggestionsCache = new Map<string, {
  data: any
  timestamp: Date
  ttl: number
}>()

// Clean up old cache entries
setInterval(() => {
  const now = new Date()
  for (const [key, value] of suggestionsCache.entries()) {
    if (now.getTime() - value.timestamp.getTime() > value.ttl) {
      suggestionsCache.delete(key)
    }
  }
}, 60 * 1000) // Clean every minute

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Check cache first
    const cached = suggestionsCache.get(documentId)
    if (cached && new Date().getTime() - cached.timestamp.getTime() < cached.ttl) {
      return NextResponse.json({
        ...cached.data,
        cached: true
      })
    }

    // Get analysis result
    const analyzer = DocumentAnalyzer.getInstance()
    const analysisResult = await analyzer.getAnalysisResult(documentId)
    
    if (!analysisResult) {
      // Check if analysis is still in progress
      const activeJobs = analyzer.getActiveJobs()
      if (activeJobs.includes(documentId)) {
        return NextResponse.json({
          status: 'generating',
          documentId,
          message: 'Analysis in progress'
        })
      }
      
      return NextResponse.json(
        { error: 'No analysis found for this document' },
        { status: 404 }
      )
    }

    // Generate type suggestions
    const suggestionEngine = new TypeSuggestionEngine()
    const typeSuggestions = await suggestionEngine.generateTypeSuggestions(
      analysisResult.content
    )
    
    // Calculate classification rate
    const classificationRate = await suggestionEngine.predictClassificationRate(
      analysisResult.content,
      typeSuggestions.entityTypes,
      typeSuggestions.edgeTypes
    )

    const result = {
      status: 'complete',
      documentId,
      entityTypes: typeSuggestions.entityTypes,
      edgeTypes: typeSuggestions.edgeTypes,
      classificationRate,
      processingTime: analysisResult.processingTime,
      metadata: typeSuggestions.analysisMetadata,
      cached: false
    }

    // Cache the result
    suggestionsCache.set(documentId, {
      data: result,
      timestamp: new Date(),
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Suggestions retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve suggestions' },
      { status: 500 }
    )
  }
}

// Apply suggested types to create knowledge graph
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    const body = await request.json()
    const { entityTypes, edgeTypes } = body

    if (!entityTypes || !edgeTypes) {
      return NextResponse.json(
        { error: 'Entity and edge types are required' },
        { status: 400 }
      )
    }

    // Validate types meet Zep v3 constraints
    if (entityTypes.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 entity types allowed' },
        { status: 400 }
      )
    }

    if (edgeTypes.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 edge types allowed' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Create an ontology with the selected types
    // 2. Apply the ontology to the document
    // 3. Generate the knowledge graph
    // 4. Store in Zep

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Types applied successfully',
      ontologyId: `ontology-${documentId}`,
      entityTypesCount: entityTypes.length,
      edgeTypesCount: edgeTypes.length
    })

  } catch (error) {
    console.error('Type application error:', error)
    return NextResponse.json(
      { error: 'Failed to apply types' },
      { status: 500 }
    )
  }
}