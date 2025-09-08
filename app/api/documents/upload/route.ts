import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { apiRateLimiter } from '@/lib/middleware/rate-limit'

const UPLOAD_DIR = path.join(process.cwd(), 'temp', 'uploads')
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

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
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Enhanced file validation
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    const allowedExtensions = ['.pdf', '.txt', '.md', '.docx']
    const fileExtension = path.extname(file.name.toLowerCase())
    
    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'File type not supported. Please upload PDF, TXT, MD, or DOCX files' },
        { status: 400 }
      )
    }

    // Sanitize filename to prevent path traversal (for logging/validation)
    const _sanitizedName = path.basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_')

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileId = randomUUID()
    const fileExtension = path.extname(file.name)
    const uniqueFileName = `${fileId}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, uniqueFileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return file metadata with documentId for tracking
    return NextResponse.json({
      documentId: fileId,
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Cleanup endpoint for orphaned uploads
export async function DELETE(request: NextRequest) {
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
    const fileId = searchParams.get('id')
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'No file ID provided' },
        { status: 400 }
      )
    }

    // Validate fileId format (security check)
    if (!/^[a-f0-9-]{36}$/.test(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID format' },
        { status: 400 }
      )
    }

    // In production, you would:
    // 1. Verify the file belongs to the user
    // 2. Delete from database
    // 3. Delete from filesystem
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}