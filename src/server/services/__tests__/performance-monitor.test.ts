import { PerformanceMonitor } from '../performance-monitor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock performance API for testing
const mockPerformanceNow = vi.fn();
const mockPerformanceObserver = vi.fn();

global.performance = {
  now: mockPerformanceNow,
  ...global.performance
} as any;

global.PerformanceObserver = mockPerformanceObserver as any;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(1000);
    mockPerformanceObserver.mockImplementation((callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));
    
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.cleanup();
  });

  describe('Timer functionality', () => {
    it('should start and end timers correctly', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      monitor.startTimer('test-operation');
      const duration = monitor.endTimer('test-operation');

      expect(duration).toBe(500);
    });

    it('should handle non-existent timer gracefully', () => {
      const duration = monitor.endTimer('non-existent');
      expect(duration).toBe(0);
    });

    it('should record metrics when ending timer', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

      monitor.startTimer('api-call');
      monitor.endTimer('api-call');

      const metrics = monitor.getMetrics('api-call');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(200);
    });
  });

  describe('Metric recording', () => {
    it('should record metrics correctly', () => {
      monitor.recordMetric('test-metric', 100, { tag: 'value' });

      const metrics = monitor.getMetrics('test-metric');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(100);
      expect(metrics[0].tags).toEqual({ tag: 'value' });
    });

    it('should limit stored metrics to 100 per type', () => {
      // Record 150 metrics
      for (let i = 0; i < 150; i++) {
        monitor.recordMetric('overflow-test', i);
      }

      const metrics = monitor.getMetrics('overflow-test');
      expect(metrics).toHaveLength(100);
      expect(metrics[0].value).toBe(50); // Should start from the 51st metric
    });
  });

  describe('Budget management', () => {
    it('should set and get budgets', () => {
      const budget = {
        metric: 'custom-metric',
        target: 1000,
        warning: 1500,
        critical: 2000,
        unit: 'ms'
      };

      monitor.setBudget('custom-metric', budget);
      const retrieved = monitor.getBudget('custom-metric');

      expect(retrieved).toEqual(budget);
    });

    it('should trigger alerts when exceeding budget thresholds', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      // This should trigger a warning alert
      monitor.recordMetric('type-suggestion-time', 4500);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Alert [WARNING]:'),
        expect.stringContaining('type-suggestion-time exceeded warning threshold')
      );

      consoleSpy.mockRestore();
    });

    it('should trigger critical alerts', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      // This should trigger a critical alert
      monitor.recordMetric('type-suggestion-time', 6000);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Alert [CRITICAL]:'),
        expect.stringContaining('type-suggestion-time exceeded critical threshold')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Metric analysis', () => {
    beforeEach(() => {
      // Record some test metrics
      [100, 200, 300, 400, 500].forEach(value => {
        monitor.recordMetric('analysis-test', value);
      });
    });

    it('should calculate average correctly', () => {
      const avg = monitor.getAverageMetric('analysis-test');
      expect(avg).toBe(300);
    });

    it('should calculate percentiles correctly', () => {
      const p50 = monitor.getPercentile('analysis-test', 50);
      const p95 = monitor.getPercentile('analysis-test', 95);

      expect(p50).toBe(300);
      expect(p95).toBe(500);
    });

    it('should provide metric summary', () => {
      const summary = monitor.getMetricSummary('analysis-test');

      expect(summary.count).toBe(5);
      expect(summary.avg).toBe(300);
      expect(summary.min).toBe(100);
      expect(summary.max).toBe(500);
      expect(summary.p50).toBe(300);
    });

    it('should handle empty metrics gracefully', () => {
      const summary = monitor.getMetricSummary('non-existent');

      expect(summary.count).toBe(0);
      expect(summary.avg).toBe(0);
    });
  });

  describe('Convenience methods', () => {
    it('should measure type suggestions', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1800);

      const mockOperation = vi.fn().mockResolvedValue('result');
      
      const result = await monitor.measureTypeSuggestion(mockOperation);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      
      const metrics = monitor.getMetrics('type-suggestion-time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(800);
    });

    it('should measure classification with throughput', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const mockOperation = vi.fn().mockResolvedValue('classified');
      
      await monitor.measureClassification(mockOperation, 10);

      const timeMetrics = monitor.getMetrics('classification-time');
      const throughputMetrics = monitor.getMetrics('classification-throughput');

      expect(timeMetrics).toHaveLength(1);
      expect(timeMetrics[0].value).toBe(1000);
      
      expect(throughputMetrics).toHaveLength(1);
      expect(throughputMetrics[0].value).toBe(10); // 10 items / 1 second
    });

    it('should measure graph rendering', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const mockOperation = vi.fn().mockReturnValue('rendered');
      
      const result = monitor.measureGraphRender(mockOperation, 50);

      expect(result).toBe('rendered');
      
      const metrics = monitor.getMetrics('graph-render-time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(500);
      expect(metrics[0].tags).toEqual({ nodeCount: '50' });
    });
  });

  describe('Optimization suggestions', () => {
    it('should provide suggestions for slow operations', () => {
      // Record slow type suggestions
      monitor.recordMetric('type-suggestion-time', 4500);
      monitor.recordMetric('type-suggestion-time', 4800);

      const suggestions = monitor.getOptimizationSuggestions();

      expect(suggestions.length).toBeGreaterThan(0);
      const typeSuggestion = suggestions.find(s => s.metric === 'type-suggestion-time');
      expect(typeSuggestion).toBeDefined();
      expect(typeSuggestion?.impact).toBe('high');
    });

    it('should suggest memory optimization for high usage', () => {
      // Record high memory usage
      monitor.recordMetric('memory-usage', 250);
      monitor.recordMetric('memory-usage', 280);

      const suggestions = monitor.getOptimizationSuggestions();

      const memorySuggestion = suggestions.find(s => s.metric === 'memory-usage');
      expect(memorySuggestion).toBeDefined();
      expect(memorySuggestion?.suggestion).toContain('memory');
    });
  });

  describe('Regression detection', () => {
    it('should detect performance regressions', () => {
      const now = Date.now();
      
      // Set up a budget for the test metric
      monitor.setBudget('test-metric', {
        metric: 'test-metric',
        target: 100,
        warning: 150,
        critical: 200,
        unit: 'ms'
      });
      
      // Simulate baseline metrics (1 hour ago)
      const baselineTime = now - 60 * 60 * 1000 - 10 * 60 * 1000;
      monitor['metrics'].set('test-metric', [
        { name: 'test-metric', value: 100, timestamp: baselineTime, unit: 'ms' },
        { name: 'test-metric', value: 110, timestamp: baselineTime + 1000, unit: 'ms' },
        { name: 'test-metric', value: 90, timestamp: baselineTime + 2000, unit: 'ms' }
      ]);

      // Simulate current metrics (last 10 minutes) - significantly slower
      const currentTime = now - 5 * 60 * 1000;
      monitor.recordMetric('test-metric', 200);
      monitor.recordMetric('test-metric', 220);
      monitor['metrics'].get('test-metric')!.forEach(m => {
        if (m.value >= 200) m.timestamp = currentTime;
      });

      const regressions = monitor.detectRegressions();

      expect(regressions.length).toBeGreaterThan(0);
      const regression = regressions.find(r => r.metric === 'test-metric');
      expect(regression).toBeDefined();
      expect(regression?.regressionPercent).toBeGreaterThan(50);
      expect(regression?.severity).toBe('critical');
    });
  });

  describe('Dashboard data', () => {
    it('should provide comprehensive dashboard data', () => {
      // Add some test data
      monitor.recordMetric('type-suggestion-time', 1500);
      monitor.recordMetric('classification-time', 800);
      monitor.recordMetric('api-response-time', 600);
      monitor.recordMetric('memory-usage', 150);

      const dashboardData = monitor.getDashboardData();

      expect(dashboardData).toHaveProperty('metrics');
      expect(dashboardData).toHaveProperty('budgets');
      expect(dashboardData).toHaveProperty('alerts');
      expect(dashboardData).toHaveProperty('suggestions');
      expect(dashboardData).toHaveProperty('regressions');

      expect(dashboardData.metrics.typeSuggestion.count).toBe(1);
      expect(dashboardData.metrics.classification.count).toBe(1);
    });
  });

  describe('Data export', () => {
    it('should export metrics correctly', () => {
      monitor.recordMetric('export-test-1', 100);
      monitor.recordMetric('export-test-2', 200);

      const exported = monitor.exportMetrics();

      expect(exported['export-test-1']).toHaveLength(1);
      expect(exported['export-test-2']).toHaveLength(1);
      expect(exported['export-test-1'][0].value).toBe(100);
      expect(exported['export-test-2'][0].value).toBe(200);
    });

    it('should export metrics within time range', () => {
      const now = Date.now();
      
      // Add old metrics
      monitor['metrics'].set('time-range-test', [
        { name: 'time-range-test', value: 100, timestamp: now - 20000, unit: 'ms' },
        { name: 'time-range-test', value: 200, timestamp: now - 5000, unit: 'ms' }
      ]);

      const exported = monitor.exportMetrics(10000); // Last 10 seconds

      expect(exported['time-range-test']).toHaveLength(1);
      expect(exported['time-range-test'][0].value).toBe(200);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources', () => {
      monitor.startTimer('cleanup-test');
      monitor.recordMetric('cleanup-metric', 100);

      monitor.cleanup();

      expect(monitor['timers'].size).toBe(0);
      expect(monitor['metrics'].size).toBe(0);
      expect(monitor['alerts'].length).toBe(0);
    });
  });
});