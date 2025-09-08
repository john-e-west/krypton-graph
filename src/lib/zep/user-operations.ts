import { z } from 'zod'

const zepUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export type ZepUserData = z.infer<typeof zepUserSchema>

export interface ZepUser {
  user_id: string
  email: string
  name: string
  avatar_url?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

const ZEP_API_URL = process.env.ZEP_API_URL || 'https://api.getzep.com'
const ZEP_API_KEY = process.env.ZEP_API_KEY

// Metrics collection for sync operations
interface SyncMetrics {
  operation: string
  startTime: number
  endTime?: number
  success: boolean
  error?: string
  userId?: string
}

const syncMetrics: SyncMetrics[] = []

function trackSyncOperation<T>(operation: string, userId?: string) {
  return async (fn: () => Promise<T>): Promise<T> => {
    const metric: SyncMetrics = {
      operation,
      startTime: Date.now(),
      success: false,
      userId
    }

    try {
      const result = await fn()
      metric.success = true
      return result
    } catch (error) {
      metric.success = false
      metric.error = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      metric.endTime = Date.now()
      syncMetrics.push(metric)
      
      // Keep only last 1000 metrics in memory
      if (syncMetrics.length > 1000) {
        syncMetrics.splice(0, 100)
      }
      
      // Log slow operations
      const duration = (metric.endTime || Date.now()) - metric.startTime
      if (duration > 5000) { // > 5 seconds
        console.warn(`Slow sync operation: ${operation} took ${duration}ms for user ${userId}`)
      }
    }
  }
}

export function getSyncMetrics() {
  const now = Date.now()
  const oneHourAgo = now - 3600000
  
  const recentMetrics = syncMetrics.filter(m => m.startTime > oneHourAgo)
  
  return {
    total: recentMetrics.length,
    successful: recentMetrics.filter(m => m.success).length,
    failed: recentMetrics.filter(m => !m.success).length,
    averageLatency: recentMetrics.length > 0 
      ? Math.round(recentMetrics.reduce((sum, m) => 
          sum + ((m.endTime || Date.now()) - m.startTime), 0) / recentMetrics.length)
      : 0,
    operations: recentMetrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    errors: recentMetrics
      .filter(m => !m.success)
      .map(m => ({ operation: m.operation, error: m.error, userId: m.userId }))
  }
}

async function zepApiRequest(
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): Promise<Response> {
  if (!ZEP_API_KEY) {
    throw new Error('ZEP_API_KEY is not configured')
  }

  const response = await fetch(`${ZEP_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ZEP_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ZEP API error: ${response.status} - ${error}`)
  }

  return response
}

export async function createZepUser(userData: ZepUserData): Promise<ZepUser> {
  const validatedData = zepUserSchema.parse(userData)
  
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await zepApiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })
      
      return await response.json()
    } catch (error) {
      lastError = error as Error
      
      if (error instanceof Error && error.message.includes('already exists')) {
        const existingUser = await getZepUserByEmail(validatedData.email)
        if (existingUser) {
          return existingUser
        }
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }
  
  throw lastError || new Error('Failed to create ZEP user after retries')
}

export async function updateZepUser(
  userId: string,
  userData: Partial<ZepUserData>
): Promise<ZepUser> {
  const response = await zepApiRequest(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(userData)
  })
  
  return await response.json()
}

export async function deleteZepUser(userId: string): Promise<void> {
  const maxRetries = 5
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await zepApiRequest(`/users/${userId}`, {
        method: 'DELETE'
      })
      return
    } catch (error) {
      lastError = error as Error
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }
  
  console.error(`Failed to delete ZEP user ${userId} after ${maxRetries} attempts:`, lastError)
  
  await logFailedDeletion(userId, lastError?.message || 'Unknown error')
}

export async function getZepUser(userId: string): Promise<ZepUser | null> {
  try {
    const response = await zepApiRequest(`/users/${userId}`, {
      method: 'GET'
    })
    
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

export async function getZepUserByEmail(email: string): Promise<ZepUser | null> {
  try {
    const response = await zepApiRequest(`/users/by-email/${encodeURIComponent(email)}`, {
      method: 'GET'
    })
    
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

async function logFailedDeletion(userId: string, error: string) {
  console.error(`[CRITICAL] Failed to delete ZEP user ${userId}: ${error}`)
  
}