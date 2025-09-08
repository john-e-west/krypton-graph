import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      requestsPerMinute: 60,
      burstSize: 10
    });
  });

  describe('request queuing', () => {
    it('should allow requests within rate limit', async () => {
      const startTime = Date.now();
      
      // Make 5 requests
      const promises = Array(5).fill(null).map(() => rateLimiter.acquire());
      await Promise.all(promises);
      
      const elapsedTime = Date.now() - startTime;
      
      // Should complete quickly (within 100ms)
      expect(elapsedTime).toBeLessThan(100);
    });

    it('should queue requests when exceeding burst size', async () => {
      const acquireTimes: number[] = [];
      
      // Make 12 requests (exceeding burst size of 10)
      const promises = Array(12).fill(null).map(async () => {
        const startTime = Date.now();
        await rateLimiter.acquire();
        acquireTimes.push(Date.now() - startTime);
      });

      await Promise.all(promises);
      
      // First 10 should be immediate
      const firstTen = acquireTimes.slice(0, 10);
      firstTen.forEach(time => {
        expect(time).toBeLessThan(50);
      });
      
      // Remaining should be delayed
      const remaining = acquireTimes.slice(10);
      expect(remaining.some(time => time >= 50)).toBe(true);
    });

    it('should respect rate limit over time', async () => {
      // Create limiter with low rate for testing
      const testLimiter = new RateLimiter({
        requestsPerMinute: 30, // 0.5 per second
        burstSize: 2
      });

      const startTime = Date.now();
      
      // Make 4 requests
      await testLimiter.acquire();
      await testLimiter.acquire();
      await testLimiter.acquire();
      await testLimiter.acquire();
      
      const elapsedTime = Date.now() - startTime;
      
      // Should take at least 2 seconds for 4 requests at 0.5/sec
      expect(elapsedTime).toBeGreaterThanOrEqual(1900);
    });
  });

  describe('limit enforcement', () => {
    it('should track current usage correctly', () => {
      const metrics = rateLimiter.getMetrics();
      expect(metrics.currentUsage).toBe(0);
      expect(metrics.limit).toBe(10); // burst size
    });

    it('should update metrics after acquiring tokens', async () => {
      await rateLimiter.acquire();
      await rateLimiter.acquire();
      
      const metrics = rateLimiter.getMetrics();
      expect(metrics.currentUsage).toBeGreaterThan(0);
      expect(metrics.requestCount).toBe(2);
    });

    it('should calculate usage ratio correctly', async () => {
      // Acquire half of available tokens
      for (let i = 0; i < 5; i++) {
        await rateLimiter.acquire();
      }
      
      const metrics = rateLimiter.getMetrics();
      expect(metrics.usageRatio).toBeGreaterThanOrEqual(0.4);
      expect(metrics.usageRatio).toBeLessThanOrEqual(0.6);
    });
  });

  describe('reset behavior', () => {
    it('should reset all state', async () => {
      // Use some tokens
      await rateLimiter.acquire();
      await rateLimiter.acquire();
      
      let metrics = rateLimiter.getMetrics();
      expect(metrics.requestCount).toBe(2);
      expect(metrics.currentUsage).toBeGreaterThan(0);
      
      // Reset
      rateLimiter.reset();
      
      metrics = rateLimiter.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.currentUsage).toBe(0);
      expect(metrics.queueLength).toBe(0);
    });

    it('should clear queued requests on reset', async () => {
      // Create a limiter that will queue requests
      const testLimiter = new RateLimiter({
        requestsPerMinute: 1,
        burstSize: 1
      });

      // Start multiple requests (they will queue)
      const promise1 = testLimiter.acquire();
      const promise2 = testLimiter.acquire();
      const promise3 = testLimiter.acquire();
      
      // Wait for first to complete
      await promise1;
      
      // Reset while others are queued
      testLimiter.reset();
      
      const metrics = testLimiter.getMetrics();
      expect(metrics.queueLength).toBe(0);
    });
  });

  describe('monitoring', () => {
    it('should track queue length', async () => {
      // Create limiter with small burst to force queuing
      const testLimiter = new RateLimiter({
        requestsPerMinute: 60,
        burstSize: 2
      });

      // Start multiple requests simultaneously
      const promises = Array(5).fill(null).map(() => testLimiter.acquire());
      
      // Check queue length immediately
      const metrics = testLimiter.getMetrics();
      expect(metrics.queueLength).toBeGreaterThan(0);
      
      // Wait for all to complete
      await Promise.all(promises);
      
      // Queue should be empty
      const finalMetrics = testLimiter.getMetrics();
      expect(finalMetrics.queueLength).toBe(0);
    });

    it('should provide accurate metrics snapshot', async () => {
      await rateLimiter.acquire();
      
      const metrics = rateLimiter.getMetrics();
      
      expect(metrics).toHaveProperty('currentUsage');
      expect(metrics).toHaveProperty('limit');
      expect(metrics).toHaveProperty('usageRatio');
      expect(metrics).toHaveProperty('queueLength');
      expect(metrics).toHaveProperty('requestCount');
      
      expect(typeof metrics.currentUsage).toBe('number');
      expect(typeof metrics.limit).toBe('number');
      expect(typeof metrics.usageRatio).toBe('number');
      expect(typeof metrics.queueLength).toBe('number');
      expect(typeof metrics.requestCount).toBe('number');
    });
  });
});