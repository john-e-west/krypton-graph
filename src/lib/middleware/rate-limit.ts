import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: NextRequest) => string
}

interface RateLimitStore {
  requests: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitStore>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private config: RateLimitConfig) {
    this.startCleanup()
  }

  private startCleanup() {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key)
        }
      }
    }, this.config.windowMs)
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const record = this.store.get(key)

    if (!record || record.resetTime < now) {
      this.store.set(key, {
        requests: 1,
        resetTime: now + this.config.windowMs
      })
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      }
    }

    if (record.requests >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      }
    }

    record.requests++
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.requests,
      resetTime: record.resetTime
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

const rateLimiters = new Map<string, RateLimiter>()

export function createRateLimiter(
  name: string,
  config: RateLimitConfig
): (req: NextRequest) => NextResponse | null {
  let limiter = rateLimiters.get(name)
  
  if (!limiter) {
    limiter = new RateLimiter(config)
    rateLimiters.set(name, limiter)
  }

  return (req: NextRequest): NextResponse | null => {
    const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req)
    const result = limiter!.check(key)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

    return null
  }
}

function getDefaultKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `${ip}:${req.nextUrl.pathname}`
}

export const webhookRateLimiter = createRateLimiter('webhook', {
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (req) => {
    const webhookId = req.headers.get('svix-id') || 'unknown'
    return `webhook:${webhookId}`
  }
})

export const apiRateLimiter = createRateLimiter('api', {
  windowMs: 60 * 1000,
  maxRequests: 60
})

export const adminRateLimiter = createRateLimiter('admin', {
  windowMs: 60 * 1000,
  maxRequests: 30
})