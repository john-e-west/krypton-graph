import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface AuthenticatedUser {
  userId: string
  sessionId: string
}

interface AuthMiddlewareResult {
  user: AuthenticatedUser
  error?: never
}

interface AuthMiddlewareError {
  user?: never
  error: NextResponse
}

type AuthMiddlewareResponse = AuthMiddlewareResult | AuthMiddlewareError

/**
 * Authentication middleware for API routes
 * Validates that the user is authenticated and returns user info
 */
export async function withAuth(): Promise<AuthMiddlewareResponse> {
  try {
    const { userId, sessionId } = auth()

    if (!userId || !sessionId) {
      return {
        error: NextResponse.json(
          { 
            error: 'Authentication required',
            details: 'You must be signed in to access this resource'
          },
          { status: 401 }
        )
      }
    }

    return {
      user: {
        userId,
        sessionId
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return {
      error: NextResponse.json(
        { 
          error: 'Authentication failed',
          details: 'Failed to validate authentication status'
        },
        { status: 401 }
      )
    }
  }
}

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    
    return { data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            error: 'Invalid request body',
            details: 'Request validation failed',
            validation_errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        )
      }
    }

    if (error instanceof SyntaxError) {
      return {
        error: NextResponse.json(
          {
            error: 'Invalid JSON',
            details: 'Request body contains invalid JSON'
          },
          { status: 400 }
        )
      }
    }

    console.error('Request validation error:', error)
    return {
      error: NextResponse.json(
        {
          error: 'Request validation failed',
          details: 'Failed to validate request body'
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Rate limiting helper (basic implementation)
 * In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): NextResponse | null {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }

  const current = rateLimitStore.get(identifier)
  
  if (!current || current.resetTime < windowStart) {
    // New window or first request
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return null
  }

  if (current.count >= maxRequests) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        details: `Maximum ${maxRequests} requests per minute exceeded`,
        retry_after: Math.ceil((current.resetTime - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    )
  }

  // Increment counter
  current.count += 1
  rateLimitStore.set(identifier, current)
  
  return null
}

/**
 * Validates that the user has permission to access/modify a document
 * This is a basic implementation - in production, integrate with your authorization system
 */
export async function validateDocumentAccess(
  userId: string,
  documentId: string,
  action: 'read' | 'write' = 'read'
): Promise<{ authorized: boolean; error?: NextResponse }> {
  try {
    // Basic validation - in production, this would check:
    // 1. Document ownership
    // 2. Team/organization membership  
    // 3. Permission levels
    // 4. Document status (archived, deleted, etc.)
    
    if (!documentId || documentId.length < 3) {
      return {
        authorized: false,
        error: NextResponse.json(
          {
            error: 'Invalid document ID',
            details: 'Document ID must be provided and valid'
          },
          { status: 400 }
        )
      }
    }

    // For now, allow all authenticated users access to all documents
    // TODO: Implement proper authorization logic with Airtable user/document relationships
    return { authorized: true }
    
  } catch (error) {
    console.error('Document access validation error:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        {
          error: 'Authorization check failed',
          details: 'Failed to validate document access permissions'
        },
        { status: 500 }
      )
    }
  }
}