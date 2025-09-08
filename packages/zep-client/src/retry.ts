import { 
  ZEPRateLimitError, 
  ZEPConnectionError, 
  CircuitBreakerError 
} from './errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private halfOpenAttempts = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        const timeUntilReset = this.config.resetTimeout - 
          (Date.now() - (this.lastFailureTime || 0));
        throw new CircuitBreakerError(
          'Circuit breaker is open',
          Math.ceil(timeUntilReset / 1000)
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime 
      ? Date.now() - this.lastFailureTime >= this.config.resetTimeout 
      : false;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.halfOpenAttempts++;
      
      if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.halfOpenAttempts = 0;
  }
}

export class RetryHandler {
  private circuitBreaker: CircuitBreaker;

  constructor(
    private retryConfig: RetryConfig,
    circuitBreakerConfig?: CircuitBreakerConfig
  ) {
    this.circuitBreaker = new CircuitBreaker(
      circuitBreakerConfig || {
        failureThreshold: 5,
        resetTimeout: 60000, // 60 seconds
        halfOpenRequests: 3
      }
    );
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | undefined;
      let delay = this.retryConfig.baseDelay;

      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = this.transformError(error as Error);
          
          if (!this.isRetryableError(lastError)) {
            throw lastError;
          }

          if (attempt < this.retryConfig.maxRetries) {
            console.warn(
              `Retry ${attempt + 1}/${this.retryConfig.maxRetries} for ${context}: ${lastError.message}`
            );
            
            // Use retry-after header if available
            if (lastError instanceof ZEPRateLimitError && lastError.retryAfter) {
              delay = lastError.retryAfter * 1000;
            }
            
            await this.sleep(Math.min(delay, this.retryConfig.maxDelay));
            delay = delay * this.retryConfig.backoffMultiplier;
          }
        }
      }

      throw new Error(`Max retries exceeded for ${context}: ${lastError?.message}`);
    });
  }

  private transformError(error: any): Error {
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'];
      return new ZEPRateLimitError(
        error.message || 'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }
    
    if (error.status >= 500 && error.status < 600) {
      return new ZEPConnectionError(
        error.message || 'Server error',
        error.status
      );
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return new ZEPConnectionError(error.message || 'Network error');
    }
    
    return error;
  }

  private isRetryableError(error: Error): boolean {
    return error instanceof ZEPRateLimitError ||
           error instanceof ZEPConnectionError ||
           (error as any).status >= 500;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

/**
 * Simple retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryConfig
): Promise<T> {
  const handler = new RetryHandler(options);
  return handler.executeWithRetry(operation, 'operation');
}