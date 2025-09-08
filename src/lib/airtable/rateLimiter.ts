// ============================================================================
// Rate Limiter Implementation for Airtable API
// Limits requests to 5 per second with exponential backoff retry logic
// ============================================================================

import { QueuedRequest, RateLimitConfig, RateLimitError } from '../types/airtable'

export class RateLimiter {
  private queue: QueuedRequest[] = []
  private processing = false
  private requestTimes: number[] = []
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      requestsPerSecond: 5,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      apiKey: '',
      ...config
    }
  }

  /**
   * Execute a request with rate limiting and retry logic
   */
  async execute<T>(
    method: string,
    url: string,
    data?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: this.generateRequestId(),
        method,
        url,
        data,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }

      this.queue.push(request)
      this.processQueue()
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const request = this.queue.shift()!
      
      try {
        // Check rate limit
        await this.waitForRateLimit()
        
        // Execute request
        const result = await this.makeRequest(request)
        request.resolve(result)
        
        // Track successful request timing
        this.requestTimes.push(Date.now())
        this.cleanOldRequestTimes()
        
      } catch (error) {
        await this.handleRequestError(request, error as Error)
      }
    }

    this.processing = false
  }

  /**
   * Wait if necessary to respect rate limits
   */
  private async waitForRateLimit(): Promise<void> {
    this.cleanOldRequestTimes()
    
    if (this.requestTimes.length >= this.config.requestsPerSecond) {
      const oldestRequestTime = this.requestTimes[0]
      const timeSinceOldest = Date.now() - oldestRequestTime
      const waitTime = 1000 - timeSinceOldest

      if (waitTime > 0) {
        console.log(`Rate limit: waiting ${waitTime}ms`)
        await this.delay(waitTime)
      }
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(request: QueuedRequest<T>): Promise<T> {
    const { method, url, data } = request
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    // Add Authorization header if API key is provided
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new RateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        )
      }

      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  /**
   * Handle request errors with retry logic
   */
  private async handleRequestError(request: QueuedRequest, error: Error): Promise<void> {
    const shouldRetry = this.shouldRetryRequest(request, error)
    
    if (shouldRetry) {
      request.retryCount++
      const delay = this.calculateRetryDelay(request.retryCount, error)
      
      console.log(
        `Retrying request ${request.id} (attempt ${request.retryCount}/${this.config.maxRetries}) after ${delay}ms delay`
      )
      
      await this.delay(delay)
      this.queue.unshift(request) // Add back to front of queue
    } else {
      request.reject(error)
    }
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetryRequest(request: QueuedRequest, error: Error): boolean {
    if (request.retryCount >= this.config.maxRetries) {
      return false
    }

    // Retry on rate limit errors
    if (error instanceof RateLimitError) {
      return true
    }

    // Retry on network errors
    if (error.message.includes('fetch')) {
      return true
    }

    // Retry on 5xx server errors
    if (error.message.includes('HTTP 5')) {
      return true
    }

    return false
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  private calculateRetryDelay(retryCount: number, error: Error): number {
    let delay = this.config.baseDelayMs * Math.pow(2, retryCount - 1)
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000
    
    // If it's a rate limit error with retry-after header, use that
    if (error instanceof RateLimitError && error.retryAfter) {
      delay = Math.max(delay, error.retryAfter)
    }
    
    // Cap the delay
    return Math.min(delay, this.config.maxDelayMs)
  }

  /**
   * Remove request times older than 1 second
   */
  private cleanOldRequestTimes(): void {
    const oneSecondAgo = Date.now() - 1000
    this.requestTimes = this.requestTimes.filter(time => time > oneSecondAgo)
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current queue stats for monitoring
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      recentRequests: this.requestTimes.length,
      requestsPerSecond: this.config.requestsPerSecond
    }
  }

  /**
   * Clear the queue (useful for testing)
   */
  clearQueue(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
    this.processing = false
  }
}