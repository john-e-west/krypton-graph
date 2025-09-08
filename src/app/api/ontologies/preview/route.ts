import { NextRequest, NextResponse } from 'next/server'

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

interface PreviewRequest {
  documentId: string
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  sampleSize?: number
}

interface ClassificationResult {
  entityType: string
  confidence: number
  count: number
  samples: Array<{
    text: string
    confidence: number
  }>
}

interface ClassificationMetrics {
  totalItems: number
  classifiedCount: number
  unclassifiedCount: number
  classificationRate: number
  averageConfidence: number
  byType: ClassificationResult[]
}

const simulateClassification = (
  documentContent: string[],
  entityTypes: TypeDefinition[]
): ClassificationMetrics => {
  const results: Map<string, ClassificationResult> = new Map()
  let classifiedCount = 0
  let totalConfidence = 0
  let confidenceCount = 0

  entityTypes.forEach(type => {
    results.set(type.name, {
      entityType: type.name,
      confidence: 0,
      count: 0,
      samples: []
    })
  })

  documentContent.forEach(item => {
    let bestMatch: { type: string; confidence: number } | null = null
    
    entityTypes.forEach(type => {
      let confidence = 0
      
      if (type.pattern) {
        try {
          const regex = new RegExp(type.pattern, 'i')
          if (regex.test(item)) {
            confidence = 0.8 + Math.random() * 0.2
          }
        } catch (e) {
          console.error('Invalid regex pattern:', type.pattern)
        }
      } else {
        const lowerItem = item.toLowerCase()
        const lowerName = type.name.toLowerCase()
        if (lowerItem.includes(lowerName)) {
          confidence = 0.6 + Math.random() * 0.3
        }
      }
      
      if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { type: type.name, confidence }
      }
    })
    
    if (bestMatch) {
      const result = results.get(bestMatch.type)!
      result.count++
      result.confidence = (result.confidence * (result.count - 1) + bestMatch.confidence) / result.count
      
      if (result.samples.length < 5) {
        result.samples.push({
          text: item.substring(0, 100),
          confidence: bestMatch.confidence
        })
      }
      
      classifiedCount++
      totalConfidence += bestMatch.confidence
      confidenceCount++
    }
  })

  const byType = Array.from(results.values()).filter(r => r.count > 0)
  const totalItems = documentContent.length
  const unclassifiedCount = totalItems - classifiedCount
  const classificationRate = (classifiedCount / totalItems) * 100
  const averageConfidence = confidenceCount > 0 ? (totalConfidence / confidenceCount) * 100 : 0

  return {
    totalItems,
    classifiedCount,
    unclassifiedCount,
    classificationRate,
    averageConfidence,
    byType
  }
}

const getMockDocumentContent = (documentId: string): string[] => {
  const mockDocuments: Record<string, string[]> = {
    'doc1': [
      'John Smith is a software engineer',
      'Apple Inc. is a technology company',
      'Sarah Johnson works at Google',
      'Microsoft develops software products',
      'The meeting is scheduled for tomorrow',
      'Product launch date is next month',
      'Customer feedback was positive',
      'Sales increased by 20%',
      'New York is a major city',
      'The project deadline is Friday'
    ],
    'doc2': [
      'Alice manages the development team',
      'Bob reports to Alice',
      'The company headquarters is in Seattle',
      'Product version 2.0 was released',
      'Customer satisfaction score improved',
      'Revenue grew in Q3',
      'The conference will be held in June',
      'Team meeting at 3 PM',
      'Project status: on track',
      'Budget approved for next quarter'
    ]
  }
  
  return mockDocuments[documentId] || mockDocuments['doc1']
}

let previewCache: Map<string, { result: ClassificationMetrics; timestamp: number }> = new Map()
const CACHE_TTL = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json()
    const { documentId, entityTypes, edgeTypes, sampleSize = 100 } = body

    if (!documentId || !entityTypes) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId and entityTypes' },
        { status: 400 }
      )
    }

    const cacheKey = JSON.stringify({ documentId, entityTypes, edgeTypes })
    const cached = previewCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.result)
    }

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))

    const documentContent = getMockDocumentContent(documentId)
    const sampleContent = documentContent.slice(0, sampleSize)
    
    const metrics = simulateClassification(sampleContent, entityTypes)
    
    previewCache.set(cacheKey, {
      result: metrics,
      timestamp: Date.now()
    })
    
    if (previewCache.size > 100) {
      const oldestKey = Array.from(previewCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      previewCache.delete(oldestKey)
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Preview API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate classification preview' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to preview classification.' },
    { status: 405 }
  )
}