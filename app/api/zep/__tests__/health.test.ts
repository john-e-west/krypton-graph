import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '../health/route';
import { NextRequest } from 'next/server';

// Mock the ZEP client
vi.mock('@krypton/zep-client', () => ({
  getZepClient: vi.fn(() => ({
    getUser: vi.fn(async () => null),
    rateLimiter: {
      getMetrics: () => ({
        currentUsage: 5,
        limit: 30,
        usageRatio: 0.17,
        queueLength: 0,
        requestCount: 10
      })
    },
    retryHandler: {
      getCircuitBreakerState: () => 'CLOSED'
    }
  }))
}));

describe('Health Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/zep/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const request = new NextRequest('http://localhost:3000/api/zep/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.api.status).toBe('ok');
      expect(data.checks.rateLimit.status).toBe('ok');
      expect(data.checks.authentication.status).toBe('ok');
    });

    it('should return warning when rate limit is high', async () => {
      const { getZepClient } = await import('@krypton/zep-client');
      vi.mocked(getZepClient).mockReturnValueOnce({
        getUser: vi.fn(async () => null),
        rateLimiter: {
          getMetrics: () => ({
            currentUsage: 25,
            limit: 30,
            usageRatio: 0.83,
            queueLength: 2,
            requestCount: 50
          })
        },
        retryHandler: {
          getCircuitBreakerState: () => 'CLOSED'
        }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/zep/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.rateLimit.status).toBe('warning');
      expect(data.checks.rateLimit.usageRatio).toBeGreaterThan(0.7);
    });

    it('should return degraded when rate limit is critical', async () => {
      const { getZepClient } = await import('@krypton/zep-client');
      vi.mocked(getZepClient).mockReturnValueOnce({
        getUser: vi.fn(async () => null),
        rateLimiter: {
          getMetrics: () => ({
            currentUsage: 28,
            limit: 30,
            usageRatio: 0.93,
            queueLength: 5,
            requestCount: 100
          })
        },
        retryHandler: {
          getCircuitBreakerState: () => 'CLOSED'
        }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/zep/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.rateLimit.status).toBe('critical');
    });

    it('should return degraded when circuit breaker is open', async () => {
      const { getZepClient } = await import('@krypton/zep-client');
      vi.mocked(getZepClient).mockReturnValueOnce({
        getUser: vi.fn(async () => null),
        rateLimiter: {
          getMetrics: () => ({
            currentUsage: 5,
            limit: 30,
            usageRatio: 0.17,
            queueLength: 0,
            requestCount: 10
          })
        },
        retryHandler: {
          getCircuitBreakerState: () => 'OPEN'
        }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/zep/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.circuitBreaker.state).toBe('OPEN');
    });

    it('should return unhealthy on authentication error', async () => {
      const { getZepClient } = await import('@krypton/zep-client');
      vi.mocked(getZepClient).mockReturnValueOnce({
        getUser: vi.fn(async () => {
          const error: any = new Error('Unauthorized');
          error.status = 401;
          throw error;
        }),
        rateLimiter: {
          getMetrics: () => ({
            currentUsage: 5,
            limit: 30,
            usageRatio: 0.17,
            queueLength: 0,
            requestCount: 10
          })
        },
        retryHandler: {
          getCircuitBreakerState: () => 'CLOSED'
        }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/zep/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.authentication.status).toBe('error');
    });

    it('should track metrics over time', async () => {
      const { getZepClient } = await import('@krypton/zep-client');
      let callCount = 0;
      
      vi.mocked(getZepClient).mockImplementation(() => ({
        getUser: vi.fn(async () => {
          callCount++;
          if (callCount === 2) {
            throw new Error('API Error');
          }
          return null;
        }),
        rateLimiter: {
          getMetrics: () => ({
            currentUsage: 5,
            limit: 30,
            usageRatio: 0.17,
            queueLength: 0,
            requestCount: callCount * 10
          })
        },
        retryHandler: {
          getCircuitBreakerState: () => 'CLOSED'
        }
      } as any));

      // First request - success
      let request = new NextRequest('http://localhost:3000/api/zep/health');
      let response = await GET(request);
      let data = await response.json();
      
      expect(data.metrics.errorRate).toBe(0);
      
      // Second request - error
      request = new NextRequest('http://localhost:3000/api/zep/health');
      response = await GET(request);
      data = await response.json();
      
      expect(data.metrics.errorRate).toBeGreaterThan(0);
      expect(data.metrics.requestCount).toBe(2);
    });
  });

  describe('POST /api/zep/health', () => {
    it('should reset metrics when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/zep/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset_metrics' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Metrics reset successfully');
    });

    it('should reject invalid actions', async () => {
      const request = new NextRequest('http://localhost:3000/api/zep/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('should handle malformed requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/zep/health', {
        method: 'POST',
        body: 'not json'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });
});