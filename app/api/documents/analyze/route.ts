import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { DocumentAnalyzer } from '@/services/document-analyzer'
import { TypeSuggestionEngine } from '@/services/type-suggestion-engine'
import { apiRateLimiter } from '@/lib/middleware/rate-limit'
import { randomUUID } from 'crypto'
import path from 'path'
import { readdir, stat } from 'fs/promises'

// Store active analysis jobs
const analysisJobs = new Map<string, {
  documentId: string
  status: 'processing' | 'complete' | 'error'
  result?: unknown
  error?: string
  startedAt: Date
}>()

// Clean up old jobs periodically
setInterval(() => {
  const now = new Date()
  const maxAge = 30 * 60 * 1000 // 30 minutes
  
  for (const [jobId, job] of analysisJobs.entries()) {
    if (now.getTime() - job.startedAt.getTime() > maxAge) {
      analysisJobs.delete(jobId)
    }
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimiter(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Check authentication
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Validate documentId format (basic security check)
    if (!/^[a-zA-Z0-9\-_]+$/.test(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    // Create a job ID for tracking
    const jobId = randomUUID()
    
    // Initialize job tracking
    analysisJobs.set(jobId, {
      documentId,
      status: 'processing',
      startedAt: new Date()
    })

    // Start async analysis
    performAnalysis(jobId, documentId).catch(error => {
      console.error('Analysis error:', error)
      const job = analysisJobs.get(jobId)
      if (job) {
        job.status = 'error'
        job.error = error.message
      }
    })

    return NextResponse.json({
      jobId,
      documentId,
      status: 'processing',
      message: 'Analysis started'
    })

  } catch (error) {
    console.error('Analysis initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    )
  }
}

async function performAnalysis(jobId: string, documentId: string) {
  try {
    const analyzer = DocumentAnalyzer.getInstance()
    const suggestionEngine = new TypeSuggestionEngine()
    
    // Get document metadata (in production, this would query the database)
    const UPLOAD_DIR = path.join(process.cwd(), 'temp', 'uploads')
    const files = await readdir(UPLOAD_DIR)
    const documentFile = files.find(f => f.includes(documentId))
    
    if (!documentFile) {
      throw new Error('Document file not found')
    }
    
    const filePath = path.join(UPLOAD_DIR, documentFile)
    const stats = await stat(filePath)
    
    const metadata = {
      id: documentId,
      name: documentFile,
      size: stats.size,
      type: path.extname(documentFile),
      path: filePath,
      uploadedAt: stats.birthtime.toISOString()
    }
    
    // Analyze document
    const analysisResult = await analyzer.analyzeDocument(
      documentId,
      filePath,
      metadata
    )
    
    // Generate type suggestions
    const typeSuggestions = await suggestionEngine.generateTypeSuggestions(
      analysisResult.content
    )
    
    // Predict classification rate
    const classificationRate = await suggestionEngine.predictClassificationRate(
      analysisResult.content,
      typeSuggestions.entityTypes,
      typeSuggestions.edgeTypes
    )
    
    // Update job with results
    const job = analysisJobs.get(jobId)
    if (job) {
      job.status = 'complete'
      job.result = {
        documentId,
        analysisResult,
        typeSuggestions: {
          ...typeSuggestions,
          classificationRate
        }
      }
    }
    
  } catch (error) {
    console.error('Analysis processing error:', error)
    const job = analysisJobs.get(jobId)
    if (job) {
      job.status = 'error'
      job.error = error instanceof Error ? error.message : 'Analysis failed'
    }
  }
}

// Get analysis status
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimiter(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Check authentication
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Validate jobId format (security check)
    if (!/^[a-f0-9-]{36}$/.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }
    
    const job = analysisJobs.get(jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      jobId,
      status: job.status,
      documentId: job.documentId,
      result: job.result,
      error: job.error
    })
    
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check analysis status' },
      { status: 500 }
    )
  }
}