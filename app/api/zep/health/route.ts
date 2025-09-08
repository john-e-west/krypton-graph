import { NextRequest, NextResponse } from 'next/server';
import { getZepClient } from '@krypton/zep-client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    api: {
      status: 'ok' | 'error';
      responseTime?: number;
      error?: string;
    };
    rateLimit: {
      status: 'ok' | 'warning' | 'critical';
      currentUsage: number;
      limit: number;
      usageRatio: number;
    };
    authentication: {
      status: 'ok' | 'error';
      error?: string;
    };
    circuitBreaker?: {
      state: string;
    };
  };
  metrics: {
    lastSuccessfulRequest?: string;
    averageResponseTime?: number;
    errorRate?: number;
    requestCount?: number;
  };
}

let healthMetrics = {
  lastSuccessfulRequest: undefined as string | undefined,
  responseTimeSamples: [] as number[],
  errorCount: 0,
  successCount: 0,
  totalRequests: 0
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      api: { status: 'ok' },
      rateLimit: { status: 'ok', currentUsage: 0, limit: 0, usageRatio: 0 },
      authentication: { status: 'ok' }
    },
    metrics: {}
  };

  try {
    // Get ZEP client instance
    const zepClient = getZepClient();
    
    // Check rate limit status
    const rateLimitMetrics = (zepClient as any).rateLimiter.getMetrics();
    health.checks.rateLimit = {
      status: rateLimitMetrics.usageRatio > 0.9 ? 'critical' 
            : rateLimitMetrics.usageRatio > 0.7 ? 'warning' 
            : 'ok',
      currentUsage: rateLimitMetrics.currentUsage,
      limit: rateLimitMetrics.limit,
      usageRatio: rateLimitMetrics.usageRatio
    };

    // Check circuit breaker state if available
    if ((zepClient as any).retryHandler) {
      health.checks.circuitBreaker = {
        state: (zepClient as any).retryHandler.getCircuitBreakerState()
      };
    }

    // Ping ZEP API
    try {
      const pingStart = Date.now();
      // Try to get a non-existent user (should return null, not error)
      await zepClient.getUser('health_check_user_' + Date.now());
      const responseTime = Date.now() - pingStart;
      
      health.checks.api = {
        status: 'ok',
        responseTime
      };

      // Update metrics
      healthMetrics.lastSuccessfulRequest = new Date().toISOString();
      healthMetrics.responseTimeSamples.push(responseTime);
      if (healthMetrics.responseTimeSamples.length > 100) {
        healthMetrics.responseTimeSamples.shift();
      }
      healthMetrics.successCount++;
      healthMetrics.totalRequests++;
    } catch (apiError: any) {
      // Check if it's an auth error
      if (apiError.status === 401 || apiError.status === 403) {
        health.checks.authentication = {
          status: 'error',
          error: 'Authentication failed'
        };
        health.status = 'unhealthy';
      } else {
        health.checks.api = {
          status: 'error',
          error: apiError.message
        };
        health.status = 'degraded';
      }
      
      healthMetrics.errorCount++;
      healthMetrics.totalRequests++;
    }

    // Calculate metrics
    if (healthMetrics.responseTimeSamples.length > 0) {
      const avgResponseTime = healthMetrics.responseTimeSamples.reduce((a, b) => a + b, 0) 
                            / healthMetrics.responseTimeSamples.length;
      health.metrics.averageResponseTime = Math.round(avgResponseTime);
    }

    health.metrics.lastSuccessfulRequest = healthMetrics.lastSuccessfulRequest;
    health.metrics.errorRate = healthMetrics.totalRequests > 0 
      ? healthMetrics.errorCount / healthMetrics.totalRequests 
      : 0;
    health.metrics.requestCount = healthMetrics.totalRequests;

    // Determine overall health status
    if (health.checks.authentication.status === 'error') {
      health.status = 'unhealthy';
    } else if (health.checks.api.status === 'error' || 
               health.checks.rateLimit.status === 'critical') {
      health.status = 'degraded';
    } else if (health.checks.circuitBreaker?.state === 'OPEN') {
      health.status = 'degraded';
    }

    // Log health check
    if (health.status !== 'healthy') {
      console.warn('ZEP health check:', health);
    }

    return NextResponse.json(health, {
      status: health.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      checks: {
        api: { status: 'error', error: 'Health check failed' },
        rateLimit: { status: 'ok', currentUsage: 0, limit: 0, usageRatio: 0 },
        authentication: { status: 'error', error: 'Unable to verify' }
      },
      metrics: healthMetrics
    }, { status: 503 });
  }
}

// Reset metrics endpoint (for debugging/monitoring)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  
  if (body.action === 'reset_metrics') {
    healthMetrics = {
      lastSuccessfulRequest: undefined,
      responseTimeSamples: [],
      errorCount: 0,
      successCount: 0,
      totalRequests: 0
    };
    
    return NextResponse.json({ message: 'Metrics reset successfully' });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}