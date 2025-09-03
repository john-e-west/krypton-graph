<!--
@status: READY_FOR_DEVELOPMENT
@priority: P2
@sprint: 2
@assigned: UNASSIGNED
@reviewed_by: PM
@approved_date: 2025-09-01
-->

# Story: DEPLOY-004 - Monitoring & Observability Setup

**Story ID:** DEPLOY-004  
**Epic:** DEPLOY-EPIC-004  
**Points:** 3  
**Priority:** P2 - Important  
**Type:** Operations  
**Dependencies:** DEPLOY-001, DEPLOY-002  

## User Story

As an **operations team**,  
I want **comprehensive monitoring and alerting for the production system**,  
So that **we can proactively identify and resolve issues before they impact users**.

## Story Context

**Monitoring Requirements:**
- Application performance monitoring
- Error tracking and alerting
- Infrastructure metrics
- User analytics
- Uptime monitoring
- Log aggregation

**Observability Stack:**
- Sentry for error tracking
- Vercel Analytics for performance
- Better Uptime for availability
- PostHog for user analytics
- Custom dashboards

## Acceptance Criteria

### Error Tracking:

1. **Sentry Integration**
   - [ ] Sentry project created
   - [ ] DSN configured in environment
   - [ ] Source maps uploaded
   - [ ] Error boundaries implemented
   - [ ] Performance monitoring enabled
   - [ ] Release tracking configured

2. **Error Handling**
   - [ ] Global error handler
   - [ ] API error tracking
   - [ ] Async error handling
   - [ ] User context attached
   - [ ] Environment tagging
   - [ ] Alert rules configured

3. **Alert Configuration**
   - [ ] Critical error alerts
   - [ ] Performance degradation alerts
   - [ ] Error rate thresholds
   - [ ] Slack/email notifications
   - [ ] On-call rotation setup
   - [ ] Escalation policies

### Performance Monitoring:

4. **Application Metrics**
   - [ ] Page load times tracked
   - [ ] API response times
   - [ ] Database query performance
   - [ ] Bundle size monitoring
   - [ ] Memory usage tracking
   - [ ] WebVitals metrics

5. **User Analytics**
   - [ ] User journey tracking
   - [ ] Feature usage metrics
   - [ ] Conversion funnels
   - [ ] Session recording
   - [ ] A/B test framework
   - [ ] Custom events tracking

6. **Infrastructure Monitoring**
   - [ ] Uptime monitoring
   - [ ] SSL certificate monitoring
   - [ ] DNS monitoring
   - [ ] CDN performance
   - [ ] Database health
   - [ ] API availability

## Implementation Details

### Sentry Setup:
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { CaptureConsole } from '@sentry/integrations';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT || 'production',
      release: import.meta.env.VITE_APP_VERSION,
      
      integrations: [
        new BrowserTracing({
          // Trace all navigation
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
          
          // Trace fetch and XHR requests
          tracingOrigins: [
            'localhost',
            'krypton-graph.com',
            /^https:\/\/.*\.convex\.cloud/,
          ],
        }),
        
        // Capture console errors
        new CaptureConsole({
          levels: ['error', 'warn'],
        }),
        
        // Session replay
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
          sampleRate: 0.1,
          errorSampleRate: 1.0,
        }),
      ],
      
      // Performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      // Session tracking
      autoSessionTracking: true,
      
      // Release health
      sessionTrackingIntervalMillis: 30000,
      
      // Filtering
      ignoreErrors: [
        'Network request failed',
        'NetworkError',
        'ResizeObserver loop limit exceeded',
      ],
      
      beforeSend(event, hint) {
        // Filter out non-actionable errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Skip third-party errors
          if (error?.stack?.includes('chrome-extension://')) {
            return null;
          }
          
          // Add user context
          const user = getCurrentUser();
          if (user) {
            event.user = {
              id: user.id,
              email: user.email,
              username: user.name,
            };
          }
          
          // Add custom context
          event.contexts = {
            ...event.contexts,
            app: {
              build_time: import.meta.env.VITE_BUILD_TIME,
              convex_deployment: import.meta.env.VITE_CONVEX_URL,
            },
          };
        }
        
        return event;
      },
    });
  }
}

// Error boundary component
export const ErrorBoundary = Sentry.ErrorBoundary;

// Performance profiler
export const Profiler = Sentry.Profiler;

// Custom error capture
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

// Performance transaction
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}
```

### Analytics Implementation:
```typescript
// src/lib/analytics.ts
import posthog from 'posthog-js';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Initialize PostHog
export function initAnalytics() {
  if (import.meta.env.PROD) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      autocapture: true,
      capture_pageview: false, // Manual control
      capture_pageleave: true,
      cross_subdomain_cookie: true,
      disable_session_recording: false,
      mask_all_text: false,
      mask_all_element_attributes: false,
      
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          posthog.debug();
        }
      },
    });
  }
}

// Track page views
export function usePageTracking() {
  const location = useLocation();
  
  useEffect(() => {
    if (import.meta.env.PROD) {
      posthog.capture('$pageview', {
        $current_url: location.pathname + location.search,
      });
    }
  }, [location]);
}

// Track custom events
export function trackEvent(
  event: string,
  properties?: Record<string, any>
) {
  if (import.meta.env.PROD) {
    posthog.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }
}

// Track user identification
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (import.meta.env.PROD) {
    posthog.identify(userId, traits);
  }
}

// Feature flags
export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    if (import.meta.env.PROD) {
      setEnabled(posthog.isFeatureEnabled(flag) || false);
    }
  }, [flag]);
  
  return enabled;
}

// A/B testing
export function useExperiment(
  experimentName: string,
  variants: string[]
): string {
  const [variant, setVariant] = useState(variants[0]);
  
  useEffect(() => {
    if (import.meta.env.PROD) {
      const assignedVariant = posthog.getFeatureFlag(experimentName);
      if (assignedVariant && variants.includes(assignedVariant as string)) {
        setVariant(assignedVariant as string);
      }
    }
  }, [experimentName, variants]);
  
  return variant;
}
```

### Performance Monitoring:
```typescript
// src/lib/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Report Web Vitals
export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  reportWebVitals((metric) => {
    // Send to analytics
    trackEvent('web_vitals', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
    });
    
    // Send to Sentry
    if (window.Sentry) {
      const transaction = window.Sentry.getCurrentHub()
        .getScope()
        .getTransaction();
      
      if (transaction) {
        transaction.setMeasurement(
          metric.name,
          metric.value,
          metric.rating === 'good' ? 'millisecond' : 'second'
        );
      }
    }
    
    // Log to console in dev
    if (import.meta.env.DEV) {
      console.log(metric);
    }
  });
  
  // Custom performance marks
  if ('performance' in window) {
    // Mark app initialization
    performance.mark('app-init-start');
    
    // Measure time to interactive
    window.addEventListener('load', () => {
      performance.mark('app-init-end');
      performance.measure(
        'app-initialization',
        'app-init-start',
        'app-init-end'
      );
      
      const measure = performance.getEntriesByName('app-initialization')[0];
      trackEvent('app_initialization_time', {
        duration: measure.duration,
      });
    });
  }
}

// API performance tracking
export function trackAPICall(
  endpoint: string,
  method: string,
  startTime: number,
  success: boolean,
  statusCode?: number
) {
  const duration = Date.now() - startTime;
  
  trackEvent('api_call', {
    endpoint,
    method,
    duration,
    success,
    status_code: statusCode,
  });
  
  // Alert on slow APIs
  if (duration > 3000) {
    captureException(new Error(`Slow API call: ${endpoint}`), {
      endpoint,
      method,
      duration,
    });
  }
}
```

### Uptime Monitoring:
```typescript
// scripts/setup-monitoring.ts
import fetch from 'node-fetch';

const BETTER_UPTIME_API = 'https://betteruptime.com/api/v2';
const API_KEY = process.env.BETTER_UPTIME_API_KEY;

async function setupMonitors() {
  const monitors = [
    {
      monitor_type: 'status',
      url: 'https://krypton-graph.com',
      name: 'Homepage',
      check_frequency: 180, // 3 minutes
      request_timeout: 30,
      expected_status_codes: [200],
    },
    {
      monitor_type: 'status',
      url: 'https://krypton-graph.com/api/health',
      name: 'API Health',
      check_frequency: 60, // 1 minute
      request_timeout: 10,
      expected_status_codes: [200],
    },
    {
      monitor_type: 'keyword',
      url: 'https://krypton-graph.com/dashboard',
      name: 'Dashboard',
      check_frequency: 300, // 5 minutes
      request_timeout: 30,
      required_keyword: 'Krypton-Graph',
    },
    {
      monitor_type: 'ssl',
      url: 'https://krypton-graph.com',
      name: 'SSL Certificate',
      check_frequency: 86400, // Daily
      ssl_expiry_threshold: 30, // Alert 30 days before expiry
    },
  ];
  
  for (const monitor of monitors) {
    await fetch(`${BETTER_UPTIME_API}/monitors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(monitor),
    });
  }
  
  // Setup status page
  await fetch(`${BETTER_UPTIME_API}/status-pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_name: 'Krypton-Graph',
      company_url: 'https://krypton-graph.com',
      subdomain: 'status-krypton-graph',
      custom_domain: 'status.krypton-graph.com',
      timezone: 'America/New_York',
      design: {
        theme: 'light',
        layout: 'vertical',
      },
    }),
  });
}

setupMonitors().catch(console.error);
```

### Custom Dashboard:
```typescript
// src/pages/Monitoring.tsx
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Line, Bar, Pie } from 'react-chartjs-2';

export default function MonitoringDashboard() {
  // Real-time metrics from Convex
  const metrics = useQuery(api.monitoring.getMetrics);
  const errors = useQuery(api.monitoring.getRecentErrors);
  const performance = useQuery(api.monitoring.getPerformance);
  
  return (
    <div className="monitoring-dashboard">
      {/* System Health */}
      <div className="health-indicators">
        <HealthIndicator
          name="API"
          status={metrics?.apiHealth}
          latency={metrics?.apiLatency}
        />
        <HealthIndicator
          name="Database"
          status={metrics?.dbHealth}
          latency={metrics?.dbLatency}
        />
        <HealthIndicator
          name="Zep Sync"
          status={metrics?.zepHealth}
          latency={metrics?.zepLatency}
        />
      </div>
      
      {/* Error Rate Chart */}
      <Line
        data={{
          labels: performance?.timestamps,
          datasets: [
            {
              label: 'Error Rate',
              data: performance?.errorRates,
              borderColor: 'rgb(255, 99, 132)',
            },
          ],
        }}
      />
      
      {/* Response Time Distribution */}
      <Bar
        data={{
          labels: ['< 100ms', '100-500ms', '500ms-1s', '> 1s'],
          datasets: [
            {
              label: 'Response Time Distribution',
              data: performance?.responseTimeDistribution,
            },
          ],
        }}
      />
      
      {/* Recent Errors */}
      <ErrorList errors={errors} />
      
      {/* Active Users */}
      <RealTimeUsers count={metrics?.activeUsers} />
    </div>
  );
}
```

### Logging Configuration:
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private queue: LogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  
  constructor() {
    if (import.meta.env.PROD) {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    
    // Console output in dev
    if (import.meta.env.DEV) {
      console[level](message, context);
    }
    
    // Queue for batch sending in prod
    if (import.meta.env.PROD) {
      this.queue.push(entry);
      
      // Immediate flush for errors
      if (level === 'error') {
        this.flush();
      }
    }
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    
    const entries = [...this.queue];
    this.queue = [];
    
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Re-queue failed logs
      this.queue.unshift(...entries);
    }
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, {
      ...context,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      },
    });
    
    // Also send to Sentry
    if (error && window.Sentry) {
      window.Sentry.captureException(error, { extra: context });
    }
  }
}

export const logger = new Logger();
```

### Alert Rules Configuration:
```yaml
# monitoring/alerts.yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 1%
    duration: 5 minutes
    severity: critical
    notifications:
      - slack
      - email
      - pagerduty
    
  - name: Slow API Response
    condition: p95_latency > 3000ms
    duration: 10 minutes
    severity: warning
    notifications:
      - slack
      
  - name: Database Connection Failed
    condition: db_health == "down"
    duration: 1 minute
    severity: critical
    notifications:
      - slack
      - pagerduty
      
  - name: Zep Sync Failures
    condition: sync_failure_rate > 10%
    duration: 15 minutes
    severity: warning
    notifications:
      - slack
      - email
      
  - name: Memory Usage High
    condition: memory_usage > 90%
    duration: 5 minutes
    severity: warning
    notifications:
      - slack
      
  - name: SSL Certificate Expiry
    condition: ssl_days_remaining < 30
    severity: warning
    notifications:
      - email
      
  - name: Deployment Failed
    condition: deployment_status == "failed"
    severity: critical
    notifications:
      - slack
      - email
      - pagerduty
```

## Testing Approach

1. **Monitoring Tests:**
   ```typescript
   // Test Sentry integration
   Sentry.captureException(new Error('Test error'));
   
   // Test analytics
   trackEvent('test_event', { test: true });
   
   // Test performance tracking
   reportWebVitals(console.log);
   
   // Test uptime monitoring
   curl https://krypton-graph.com/api/health
   ```

2. **Alert Testing:**
   ```bash
   # Trigger test alerts
   npm run test:alerts
   
   # Verify notifications received
   # Check Slack, email, PagerDuty
   ```

## Definition of Done

- [ ] Sentry project configured
- [ ] Error tracking implemented
- [ ] Performance monitoring active
- [ ] Analytics tracking events
- [ ] Uptime monitors created
- [ ] Alert rules configured
- [ ] Dashboards created
- [ ] Logging implemented
- [ ] Status page live
- [ ] Team trained on tools
- [ ] Runbooks documented
- [ ] On-call rotation setup

## Time Estimate

- Sentry Setup: 1.5 hours
- Analytics Implementation: 1.5 hours
- Performance Monitoring: 1 hour
- Uptime Configuration: 1 hour
- Alert Rules: 1 hour
- Dashboard Creation: 1 hour
- Testing & Documentation: 1 hour
- **Total: 8 hours**

## Notes

Start with error tracking as it's most critical. Use free tiers where possible for the POC. Focus on actionable metrics rather than vanity metrics. Ensure alerts are not too noisy - tune thresholds based on actual usage. Document all monitoring tools and access in the handoff materials.

---

<!--
@bmad_status: READY_FOR_DEVELOPMENT
@bmad_review: APPROVED
@bmad_checklist:
  - [x] Story documented
  - [x] Acceptance criteria defined
  - [x] Technical approach validated
  - [x] Dependencies identified
  - [x] Time estimates provided
  - [x] Testing approach defined
  - [ ] Developer assigned
  - [ ] Sprint planned
-->

**Status:** Ready for Development  
**Created:** September 1, 2025  
**Assigned To:** [Pending]