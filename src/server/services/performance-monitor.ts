interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

interface PerformanceBudget {
  metric: string;
  target: number;
  warning: number;
  critical: number;
  unit: string;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  level: 'warning' | 'critical';
  timestamp: number;
  message: string;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private budgets: Map<string, PerformanceBudget> = new Map();
  private alerts: PerformanceAlert[] = [];
  private timers: Map<string, number> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeDefaultBudgets();
    this.setupPerformanceObservers();
  }

  private initializeDefaultBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      {
        metric: 'type-suggestion-time',
        target: 3000,
        warning: 4000,
        critical: 5000,
        unit: 'ms'
      },
      {
        metric: 'document-analysis-time',
        target: 25000,
        warning: 30000,
        critical: 35000,
        unit: 'ms'
      },
      {
        metric: 'classification-time',
        target: 1000,
        warning: 2000,
        critical: 3000,
        unit: 'ms'
      },
      {
        metric: 'graph-render-time',
        target: 800,
        warning: 1000,
        critical: 1500,
        unit: 'ms'
      },
      {
        metric: 'page-load-time',
        target: 2000,
        warning: 3000,
        critical: 5000,
        unit: 'ms'
      },
      {
        metric: 'memory-usage',
        target: 100,
        warning: 200,
        critical: 300,
        unit: 'MB'
      },
      {
        metric: 'api-response-time',
        target: 500,
        warning: 1000,
        critical: 2000,
        unit: 'ms'
      }
    ];

    defaultBudgets.forEach(budget => {
      this.budgets.set(budget.metric, budget);
    });
  }

  private setupPerformanceObservers(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page-load-time', navEntry.loadEventEnd - navEntry.navigationStart);
            this.recordMetric('dom-content-loaded', navEntry.domContentLoadedEventEnd - navEntry.navigationStart);
            this.recordMetric('first-paint', navEntry.responseEnd - navEntry.navigationStart);
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported');
      }

      // Resource timing for API calls
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('/api/')) {
            this.recordMetric('api-response-time', entry.duration, {
              endpoint: entry.name
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported');
      }

      // Long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('long-task-duration', entry.duration);
          if (entry.duration > 50) {
            this.createAlert('long-task-duration', entry.duration, 50, 'warning', 
              `Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported');
      }
    }

    // Memory usage monitoring (if available)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.recordMetric('memory-usage', memory.usedJSHeapSize / (1024 * 1024)); // MB
          this.recordMetric('memory-total', memory.totalJSHeapSize / (1024 * 1024)); // MB
        }
      }, 5000);
    }
  }

  // Core timing methods
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.recordMetric(name, duration, tags);
    return duration;
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit: this.budgets.get(name)?.unit || 'ms'
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only last 100 metrics per type
    if (metricArray.length > 100) {
      metricArray.shift();
    }

    // Check against budget
    this.checkBudget(name, value);
  }

  private checkBudget(metricName: string, value: number): void {
    const budget = this.budgets.get(metricName);
    if (!budget) return;

    if (value > budget.critical) {
      this.createAlert(metricName, value, budget.critical, 'critical',
        `${metricName} exceeded critical threshold: ${value.toFixed(2)}${budget.unit} > ${budget.critical}${budget.unit}`);
    } else if (value > budget.warning) {
      this.createAlert(metricName, value, budget.warning, 'warning',
        `${metricName} exceeded warning threshold: ${value.toFixed(2)}${budget.unit} > ${budget.warning}${budget.unit}`);
    }
  }

  private createAlert(metric: string, value: number, threshold: number, level: 'warning' | 'critical', message: string): void {
    const alert: PerformanceAlert = {
      id: `${metric}-${Date.now()}`,
      metric,
      value,
      threshold,
      level,
      timestamp: Date.now(),
      message
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Emit alert (in real app, would use event system)
    console.warn(`Performance Alert [${level.toUpperCase()}]:`, message);
  }

  // Analysis methods
  getMetrics(metricName: string, timeRange?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(metricName) || [];
    if (!timeRange) return metrics;

    const cutoff = Date.now() - timeRange;
    return metrics.filter(m => m.timestamp >= cutoff);
  }

  getAverageMetric(metricName: string, timeRange?: number): number {
    const metrics = this.getMetrics(metricName, timeRange);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  getPercentile(metricName: string, percentile: number, timeRange?: number): number {
    const metrics = this.getMetrics(metricName, timeRange);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getMetricSummary(metricName: string, timeRange?: number) {
    const metrics = this.getMetrics(metricName, timeRange);
    if (metrics.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;

    return {
      count,
      avg: values.reduce((sum, v) => sum + v, 0) / count,
      min: values[0],
      max: values[count - 1],
      p50: this.getPercentileFromSorted(values, 50),
      p95: this.getPercentileFromSorted(values, 95),
      p99: this.getPercentileFromSorted(values, 99)
    };
  }

  private getPercentileFromSorted(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // Budget management
  setBudget(metric: string, budget: PerformanceBudget): void {
    this.budgets.set(metric, budget);
  }

  getBudget(metric: string): PerformanceBudget | undefined {
    return this.budgets.get(metric);
  }

  getAllBudgets(): PerformanceBudget[] {
    return Array.from(this.budgets.values());
  }

  // Alert management
  getAlerts(level?: 'warning' | 'critical'): PerformanceAlert[] {
    if (!level) return [...this.alerts];
    return this.alerts.filter(a => a.level === level);
  }

  clearAlerts(): void {
    this.alerts.length = 0;
  }

  // Performance optimization suggestions
  getOptimizationSuggestions(): Array<{
    metric: string;
    issue: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    const suggestions = [];
    const recentTimeRange = 5 * 60 * 1000; // 5 minutes

    // Check type suggestion performance
    const typeSuggestionAvg = this.getAverageMetric('type-suggestion-time', recentTimeRange);
    const typeSuggestionBudget = this.getBudget('type-suggestion-time');
    if (typeSuggestionBudget && typeSuggestionAvg > typeSuggestionBudget.warning) {
      suggestions.push({
        metric: 'type-suggestion-time',
        issue: `Type suggestions taking ${typeSuggestionAvg.toFixed(0)}ms on average`,
        suggestion: 'Consider implementing caching for type suggestions or optimizing AI model calls',
        impact: 'high'
      });
    }

    // Check memory usage
    const memoryAvg = this.getAverageMetric('memory-usage', recentTimeRange);
    const memoryBudget = this.getBudget('memory-usage');
    if (memoryBudget && memoryAvg > memoryBudget.warning) {
      suggestions.push({
        metric: 'memory-usage',
        issue: `High memory usage: ${memoryAvg.toFixed(0)}MB average`,
        suggestion: 'Check for memory leaks, implement virtual scrolling, or optimize data structures',
        impact: 'medium'
      });
    }

    // Check API response times
    const apiAvg = this.getAverageMetric('api-response-time', recentTimeRange);
    const apiBudget = this.getBudget('api-response-time');
    if (apiBudget && apiAvg > apiBudget.warning) {
      suggestions.push({
        metric: 'api-response-time',
        issue: `Slow API responses: ${apiAvg.toFixed(0)}ms average`,
        suggestion: 'Optimize database queries, implement request caching, or add API compression',
        impact: 'high'
      });
    }

    // Check for long tasks
    const longTaskCount = this.getMetrics('long-task-duration', recentTimeRange).length;
    if (longTaskCount > 5) {
      suggestions.push({
        metric: 'long-task-duration',
        issue: `${longTaskCount} long tasks detected in the last 5 minutes`,
        suggestion: 'Break up long-running operations using requestIdleCallback or web workers',
        impact: 'medium'
      });
    }

    return suggestions;
  }

  // Regression detection
  detectRegressions(): Array<{
    metric: string;
    currentValue: number;
    baselineValue: number;
    regressionPercent: number;
    severity: 'minor' | 'major' | 'critical';
  }> {
    const regressions = [];
    const currentPeriod = 10 * 60 * 1000; // Last 10 minutes
    const baselinePeriod = 60 * 60 * 1000; // 1 hour ago to 50 minutes ago

    for (const [metricName] of this.budgets) {
      const currentAvg = this.getAverageMetric(metricName, currentPeriod);
      const baselineStart = Date.now() - baselinePeriod - currentPeriod;
      const baselineEnd = Date.now() - currentPeriod;
      
      const baselineMetrics = this.metrics.get(metricName)?.filter(m => 
        m.timestamp >= baselineStart && m.timestamp <= baselineEnd
      ) || [];

      if (baselineMetrics.length === 0 || currentAvg === 0) continue;

      const baselineAvg = baselineMetrics.reduce((sum, m) => sum + m.value, 0) / baselineMetrics.length;
      const regressionPercent = ((currentAvg - baselineAvg) / baselineAvg) * 100;

      if (regressionPercent > 20) { // More than 20% regression
        const severity = regressionPercent > 50 ? 'critical' : regressionPercent > 35 ? 'major' : 'minor';
        
        regressions.push({
          metric: metricName,
          currentValue: currentAvg,
          baselineValue: baselineAvg,
          regressionPercent,
          severity
        });
      }
    }

    return regressions;
  }

  // Export data for analysis
  exportMetrics(timeRange?: number): Record<string, PerformanceMetric[]> {
    const exported: Record<string, PerformanceMetric[]> = {};
    
    for (const [name, metrics] of this.metrics) {
      exported[name] = timeRange ? this.getMetrics(name, timeRange) : [...metrics];
    }

    return exported;
  }

  // Cleanup
  cleanup(): void {
    // Clear all timers
    this.timers.clear();

    // Disconnect observers
    for (const [, observer] of this.observers) {
      observer.disconnect();
    }
    this.observers.clear();

    // Clear data
    this.metrics.clear();
    this.alerts.length = 0;
  }

  // Utility methods for specific performance scenarios
  measureTypeSuggestion<T>(operation: () => Promise<T>): Promise<T> {
    const operationId = `type-suggestion-${Date.now()}`;
    this.startTimer(operationId);
    
    return operation().finally(() => {
      const duration = this.endTimer(operationId);
      this.recordMetric('type-suggestion-time', duration);
    });
  }

  measureClassification<T>(operation: () => Promise<T>, itemCount: number): Promise<T> {
    const operationId = `classification-${Date.now()}`;
    this.startTimer(operationId);
    
    return operation().finally(() => {
      const duration = this.endTimer(operationId);
      this.recordMetric('classification-time', duration);
      this.recordMetric('classification-throughput', itemCount / (duration / 1000)); // items per second
    });
  }

  measureGraphRender<T>(operation: () => T, nodeCount: number): T {
    const operationId = `graph-render-${Date.now()}`;
    this.startTimer(operationId);
    
    try {
      const result = operation();
      const duration = this.endTimer(operationId);
      this.recordMetric('graph-render-time', duration, {
        nodeCount: nodeCount.toString()
      });
      return result;
    } catch (error) {
      this.endTimer(operationId);
      throw error;
    }
  }

  // Real-time performance dashboard data
  getDashboardData() {
    const recentTimeRange = 10 * 60 * 1000; // 10 minutes

    return {
      metrics: {
        typeSuggestion: this.getMetricSummary('type-suggestion-time', recentTimeRange),
        classification: this.getMetricSummary('classification-time', recentTimeRange),
        apiResponse: this.getMetricSummary('api-response-time', recentTimeRange),
        memoryUsage: this.getMetricSummary('memory-usage', recentTimeRange),
      },
      budgets: Object.fromEntries(this.budgets),
      alerts: this.getAlerts().slice(-10), // Last 10 alerts
      suggestions: this.getOptimizationSuggestions(),
      regressions: this.detectRegressions()
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}