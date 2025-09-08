import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryHandler, CircuitBreaker } from '../retry';
import { ZEPRateLimitError, ZEPConnectionError, CircuitBreakerError } from '../errors';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = new RetryHandler({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    });
    vi.clearAllMocks();
  });

  describe('exponential backoff', () => {
    it('should retry with exponential backoff', async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];
      
      const operation = vi.fn(async () => {
        attemptTimes.push(Date.now());
        attemptCount++;
        
        if (attemptCount < 3) {
          throw new ZEPConnectionError('Server error', 500);
        }
        return 'success';
      });

      const result = await retryHandler.executeWithRetry(operation, 'test operation');
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
      
      // Check delays are increasing
      if (attemptTimes.length > 2) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    it('should respect max delay', async () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 600,
        backoffMultiplier: 3
      });

      let attemptCount = 0;
      const attemptTimes: number[] = [];
      
      const operation = vi.fn(async () => {
        attemptTimes.push(Date.now());
        attemptCount++;
        
        if (attemptCount < 4) {
          throw new ZEPConnectionError('Server error', 500);
        }
        return 'success';
      });

      await handler.executeWithRetry(operation, 'test operation');
      
      // Check that delays don't exceed max
      for (let i = 1; i < attemptTimes.length; i++) {
        const delay = attemptTimes[i] - attemptTimes[i - 1];
        expect(delay).toBeLessThanOrEqual(700); // 600ms max + some tolerance
      }
    });

    it('should use retry-after header for rate limit errors', async () => {
      let attemptCount = 0;
      const startTime = Date.now();
      
      const operation = vi.fn(async () => {
        attemptCount++;
        
        if (attemptCount === 1) {
          throw new ZEPRateLimitError('Rate limited', 1); // 1 second retry-after
        }
        return 'success';
      });

      await retryHandler.executeWithRetry(operation, 'test operation');
      
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(900); // At least 1 second
      expect(elapsedTime).toBeLessThan(1200); // But not too much more
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const handler = new RetryHandler(
        { maxRetries: 0, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 },
        { failureThreshold: 3, resetTimeout: 1000, halfOpenRequests: 2 }
      );

      const operation = vi.fn(async () => {
        throw new ZEPConnectionError('Server error', 500);
      });

      // Make 3 failing requests to open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();
      }

      // Circuit should now be open
      await expect(handler.executeWithRetry(operation, 'test'))
        .rejects.toThrow(CircuitBreakerError);
      
      // Operation should not have been called for the last attempt
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should transition to half-open after timeout', async () => {
      const handler = new RetryHandler(
        { maxRetries: 0, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 },
        { failureThreshold: 2, resetTimeout: 200, halfOpenRequests: 2 }
      );

      let shouldFail = true;
      const operation = vi.fn(async () => {
        if (shouldFail) {
          throw new ZEPConnectionError('Server error', 500);
        }
        return 'success';
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();
      }

      // Circuit is open
      await expect(handler.executeWithRetry(operation, 'test'))
        .rejects.toThrow(CircuitBreakerError);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 250));

      // Now should transition to half-open and try again
      shouldFail = false;
      const result = await handler.executeWithRetry(operation, 'test');
      expect(result).toBe('success');
    });

    it('should close circuit after successful half-open requests', async () => {
      const handler = new RetryHandler(
        { maxRetries: 0, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 },
        { failureThreshold: 2, resetTimeout: 100, halfOpenRequests: 2 }
      );

      let failCount = 0;
      const operation = vi.fn(async () => {
        failCount++;
        if (failCount <= 2) {
          throw new ZEPConnectionError('Server error', 500);
        }
        return 'success';
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();
      }

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make successful requests to close circuit
      await handler.executeWithRetry(operation, 'test');
      await handler.executeWithRetry(operation, 'test');

      // Circuit should be closed now
      expect(handler.getCircuitBreakerState()).toBe('CLOSED');
    });
  });

  describe('error propagation', () => {
    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Validation error');
      });

      await expect(retryHandler.executeWithRetry(operation, 'test'))
        .rejects.toThrow('Validation error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should transform errors correctly', async () => {
      let attemptCount = 0;
      
      const operation = vi.fn(async () => {
        attemptCount++;
        
        const error: any = new Error('API Error');
        if (attemptCount === 1) {
          error.status = 429;
          throw error;
        } else if (attemptCount === 2) {
          error.status = 503;
          throw error;
        } else if (attemptCount === 3) {
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.executeWithRetry(operation, 'test');
      expect(result).toBe('success');
      expect(attemptCount).toBe(4);
    });

    it('should throw after max retries exceeded', async () => {
      const operation = vi.fn(async () => {
        throw new ZEPConnectionError('Persistent error', 500);
      });

      await expect(retryHandler.executeWithRetry(operation, 'test'))
        .rejects.toThrow('Max retries exceeded');
      
      expect(operation).toHaveBeenCalledTimes(4); // initial + 3 retries
    });
  });

  describe('state management', () => {
    it('should report circuit breaker state', () => {
      expect(retryHandler.getCircuitBreakerState()).toBe('CLOSED');
    });

    it('should reset circuit breaker', async () => {
      const handler = new RetryHandler(
        { maxRetries: 0, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 },
        { failureThreshold: 2, resetTimeout: 1000, halfOpenRequests: 2 }
      );

      const operation = vi.fn(async () => {
        throw new ZEPConnectionError('Server error', 500);
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();
      }

      expect(handler.getCircuitBreakerState()).toBe('OPEN');
      
      // Reset the circuit
      handler.resetCircuitBreaker();
      
      expect(handler.getCircuitBreakerState()).toBe('CLOSED');
    });
  });
});