import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const searchLatency = new Trend('search_latency');
const searchErrors = new Rate('search_errors');
const cacheHits = new Rate('cache_hits');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(50)<100'], // p95 < 200ms, p50 < 100ms
    search_errors: ['rate<0.05'],                   // Error rate < 5%
    cache_hits: ['rate>0.6'],                        // Cache hit rate > 60%
    http_req_failed: ['rate<0.1'],                  // HTTP failure rate < 10%
  },
};

// Test data
const searchQueries = [
  'authentication',
  'document processing',
  'user management',
  'configuration settings',
  'error handling',
  'database connection',
  'api integration',
  'security protocols',
  'performance optimization',
  'search functionality',
  'what is authentication',
  'how to configure database',
  'show me all documents',
  'find user profiles',
  'recent updates',
  'system errors last week',
  'authentication and security',
  'docs about machine learning',
  'config files',
  'auth setup guide'
];

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.ZEP_API_KEY || '';

export function setup() {
  // Warm up cache with initial queries
  console.log('Warming up cache...');
  for (let i = 0; i < 5; i++) {
    const query = searchQueries[i];
    http.post(`${BASE_URL}/api/search`, JSON.stringify({
      query: query,
      userId: 'load-test-warmup',
      filters: {
        limit: 20
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    sleep(0.5);
  }
  console.log('Cache warmup complete');
}

export default function () {
  // Select a random query
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const userId = `user-${__VU}-${__ITER}`;
  
  // Randomly decide if this should be a cached query (30% chance)
  const useCachedQuery = Math.random() < 0.3;
  const finalQuery = useCachedQuery ? searchQueries[0] : query;
  
  // Prepare request payload
  const payload = JSON.stringify({
    query: finalQuery,
    userId: userId,
    filters: {
      limit: 20,
      sources: Math.random() < 0.3 ? ['documents'] : undefined,
      dateRange: Math.random() < 0.2 ? {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      } : undefined
    }
  });
  
  // Make the search request
  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/search`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    timeout: '5s'
  });
  const endTime = Date.now();
  
  // Record custom metrics
  searchLatency.add(endTime - startTime);
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.results && Array.isArray(body.results);
      } catch (e) {
        return false;
      }
    },
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has processing time': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.processingTimeMs !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Track errors
  if (!success) {
    searchErrors.add(1);
  } else {
    searchErrors.add(0);
    
    // Check if it was a cache hit (processing time < 10ms)
    try {
      const body = JSON.parse(response.body);
      if (body.processingTimeMs < 10) {
        cacheHits.add(1);
      } else {
        cacheHits.add(0);
      }
    } catch (e) {
      cacheHits.add(0);
    }
  }
  
  // Simulate user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function teardown(data) {
  console.log('Load test completed');
}

// Helper function to generate summary
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p50 = data.metrics.http_req_duration.values['p(50)'];
  const errorRate = data.metrics.search_errors.values.rate;
  const cacheHitRate = data.metrics.cache_hits.values.rate;
  
  console.log('\n=== Performance Test Summary ===');
  console.log(`P95 Latency: ${p95?.toFixed(2)}ms (Target: <200ms)`);
  console.log(`P50 Latency: ${p50?.toFixed(2)}ms (Target: <100ms)`);
  console.log(`Error Rate: ${(errorRate * 100)?.toFixed(2)}% (Target: <5%)`);
  console.log(`Cache Hit Rate: ${(cacheHitRate * 100)?.toFixed(2)}% (Target: >60%)`);
  
  // Determine pass/fail
  const passed = p95 < 200 && errorRate < 0.05 && cacheHitRate > 0.6;
  console.log(`\nGate Status: ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify({
      p95_latency: p95,
      p50_latency: p50,
      error_rate: errorRate,
      cache_hit_rate: cacheHitRate,
      gate_status: passed ? 'PASS' : 'FAIL',
      timestamp: new Date().toISOString()
    }, null, 2)
  };
}