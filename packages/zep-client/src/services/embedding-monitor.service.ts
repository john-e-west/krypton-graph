import { EmbeddingValidatorService, QualityMetrics } from './embedding-validator.service';
import { BatchProcessor, ProcessingStats } from './batch-processor';
import { EmbeddingStorageService, CacheStats } from './embedding-storage.service';

export interface PerformanceMetrics {
  timestamp: Date;
  embeddingsGenerated: number;
  processingTime: number;
  throughputPerMinute: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  checks: HealthCheck[];
  lastUpdated: Date;
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: number;
  threshold?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Alert {
  id: string;
  type: 'performance' | 'quality' | 'system' | 'error';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  performanceThresholds: {
    maxLatency: number;
    maxErrorRate: number;
    minThroughput: number;
    minCacheHitRate: number;
    maxMemoryUsage: number;
  };
  qualityThresholds: {
    minAverageQualityScore: number;
    maxAnomalousRate: number;
    minValidationRate: number;
  };
  alerting: {
    enabled: boolean;
    emailNotifications: boolean;
    webhookUrl?: string;
  };
  metricsRetentionHours: number;
  healthCheckInterval: number;
}

export class EmbeddingMonitorService {
  private performanceHistory: PerformanceMetrics[] = [];
  private qualityHistory: QualityMetrics[] = [];
  private alerts: Alert[] = [];
  private systemHealth: SystemHealth;
  private config: MonitoringConfig;
  private startTime: Date;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(
    private validator: EmbeddingValidatorService,
    private batchProcessor: BatchProcessor,
    private storageService: EmbeddingStorageService,
    config?: Partial<MonitoringConfig>
  ) {
    this.startTime = new Date();
    this.config = {
      performanceThresholds: {
        maxLatency: 2000, // 2 seconds
        maxErrorRate: 0.05, // 5%
        minThroughput: 10, // 10 embeddings per minute
        minCacheHitRate: 0.7, // 70%
        maxMemoryUsage: 512 * 1024 * 1024 // 512MB
      },
      qualityThresholds: {
        minAverageQualityScore: 0.8,
        maxAnomalousRate: 0.1, // 10%
        minValidationRate: 0.95 // 95%
      },
      alerting: {
        enabled: true,
        emailNotifications: false
      },
      metricsRetentionHours: 24,
      healthCheckInterval: 30000, // 30 seconds
      ...config
    };

    this.systemHealth = this.initializeSystemHealth();
    this.startMonitoring();
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceMetrics: PerformanceMetrics = {
      timestamp: new Date(),
      ...metrics
    };

    this.performanceHistory.push(performanceMetrics);
    this.cleanupOldMetrics();
    this.checkPerformanceThresholds(performanceMetrics);
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  /**
   * Get performance metrics for a time range
   */
  getPerformanceMetrics(hoursBack: number = 1): PerformanceMetrics[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.performanceHistory.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get quality metrics trend
   */
  getQualityTrend(hoursBack: number = 1): {
    metrics: QualityMetrics[];
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
  } {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.qualityHistory.filter(m => 
      new Date(Date.now() - this.qualityHistory.indexOf(m) * 60000) >= cutoffTime
    );

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    const averageScore = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.averageQualityScore, 0) / recentMetrics.length
      : 0;

    if (recentMetrics.length >= 3) {
      const recent = recentMetrics.slice(-3).map(m => m.averageQualityScore);
      const older = recentMetrics.slice(0, 3).map(m => m.averageQualityScore);
      
      const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
      const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
      
      if (recentAvg > olderAvg + 0.05) trend = 'improving';
      else if (recentAvg < olderAvg - 0.05) trend = 'declining';
    }

    return { metrics: recentMetrics, trend, averageScore };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(hoursBack: number = 24): Alert[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, note?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (note) {
      alert.metadata = { ...alert.metadata, resolutionNote: note };
    }

    console.log(`Alert resolved: ${alert.title}`);
    return true;
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData(): {
    systemHealth: SystemHealth;
    recentPerformance: PerformanceMetrics[];
    qualityTrend: ReturnType<typeof this.getQualityTrend>;
    activeAlerts: Alert[];
    processingStats: ProcessingStats;
    cacheStats: CacheStats;
  } {
    const processingStats = this.batchProcessor.getStats();
    const cacheStats = this.storageService.getCacheStats();

    return {
      systemHealth: this.getSystemHealth(),
      recentPerformance: this.getPerformanceMetrics(1),
      qualityTrend: this.getQualityTrend(2),
      activeAlerts: this.getActiveAlerts(),
      processingStats,
      cacheStats
    };
  }

  /**
   * Force health check update
   */
  updateHealthCheck(): SystemHealth {
    this.performHealthChecks();
    return this.getSystemHealth();
  }

  /**
   * Shutdown monitoring
   */
  shutdown(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    console.log('Embedding monitoring service shutdown');
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const data = this.getDashboardData();

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Private: Initialize system health
   */
  private initializeSystemHealth(): SystemHealth {
    return {
      status: 'healthy',
      score: 100,
      checks: [],
      lastUpdated: new Date(),
      uptime: 0
    };
  }

  /**
   * Private: Start monitoring timer
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performHealthChecks();
      this.collectMetrics();
    }, this.config.healthCheckInterval);

    console.log(`Embedding monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Private: Perform comprehensive health checks
   */
  private performHealthChecks(): void {
    const checks: HealthCheck[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Performance checks
    const recentPerformance = this.getPerformanceMetrics(0.5); // Last 30 minutes
    if (recentPerformance.length > 0) {
      const avgLatency = recentPerformance.reduce((sum, m) => sum + m.averageLatency, 0) / recentPerformance.length;
      const avgErrorRate = recentPerformance.reduce((sum, m) => sum + m.errorRate, 0) / recentPerformance.length;
      const avgThroughput = recentPerformance.reduce((sum, m) => sum + m.throughputPerMinute, 0) / recentPerformance.length;

      checks.push({
        name: 'Average Latency',
        status: avgLatency <= this.config.performanceThresholds.maxLatency ? 'pass' : 'fail',
        message: `Average latency: ${avgLatency.toFixed(0)}ms`,
        value: avgLatency,
        threshold: this.config.performanceThresholds.maxLatency,
        severity: avgLatency > this.config.performanceThresholds.maxLatency * 1.5 ? 'high' : 'medium'
      });

      checks.push({
        name: 'Error Rate',
        status: avgErrorRate <= this.config.performanceThresholds.maxErrorRate ? 'pass' : 'fail',
        message: `Error rate: ${(avgErrorRate * 100).toFixed(1)}%`,
        value: avgErrorRate,
        threshold: this.config.performanceThresholds.maxErrorRate,
        severity: avgErrorRate > this.config.performanceThresholds.maxErrorRate * 2 ? 'high' : 'medium'
      });

      checks.push({
        name: 'Throughput',
        status: avgThroughput >= this.config.performanceThresholds.minThroughput ? 'pass' : 'warn',
        message: `Throughput: ${avgThroughput.toFixed(1)}/min`,
        value: avgThroughput,
        threshold: this.config.performanceThresholds.minThroughput,
        severity: 'medium'
      });
    }

    // Quality checks
    const qualityMetrics = this.validator.getOverallQualityMetrics();
    if (qualityMetrics.totalEmbeddings > 0) {
      const anomalousRate = qualityMetrics.anomalousEmbeddings / qualityMetrics.totalEmbeddings;
      const validationRate = qualityMetrics.validEmbeddings / qualityMetrics.totalEmbeddings;

      checks.push({
        name: 'Quality Score',
        status: qualityMetrics.averageQualityScore >= this.config.qualityThresholds.minAverageQualityScore ? 'pass' : 'warn',
        message: `Quality score: ${qualityMetrics.averageQualityScore.toFixed(3)}`,
        value: qualityMetrics.averageQualityScore,
        threshold: this.config.qualityThresholds.minAverageQualityScore,
        severity: 'medium'
      });

      checks.push({
        name: 'Anomalous Rate',
        status: anomalousRate <= this.config.qualityThresholds.maxAnomalousRate ? 'pass' : 'warn',
        message: `Anomalous embeddings: ${(anomalousRate * 100).toFixed(1)}%`,
        value: anomalousRate,
        threshold: this.config.qualityThresholds.maxAnomalousRate,
        severity: 'low'
      });

      checks.push({
        name: 'Validation Rate',
        status: validationRate >= this.config.qualityThresholds.minValidationRate ? 'pass' : 'fail',
        message: `Validation rate: ${(validationRate * 100).toFixed(1)}%`,
        value: validationRate,
        threshold: this.config.qualityThresholds.minValidationRate,
        severity: 'high'
      });
    }

    // Cache performance checks
    const cacheStats = this.storageService.getCacheStats();
    checks.push({
      name: 'Cache Hit Rate',
      status: cacheStats.hitRate >= this.config.performanceThresholds.minCacheHitRate ? 'pass' : 'warn',
      message: `Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
      value: cacheStats.hitRate,
      threshold: this.config.performanceThresholds.minCacheHitRate,
      severity: 'low'
    });

    checks.push({
      name: 'Memory Usage',
      status: cacheStats.memoryUsage <= this.config.performanceThresholds.maxMemoryUsage ? 'pass' : 'warn',
      message: `Memory usage: ${(cacheStats.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
      value: cacheStats.memoryUsage,
      threshold: this.config.performanceThresholds.maxMemoryUsage,
      severity: 'medium'
    });

    // Calculate overall health score
    for (const check of checks) {
      maxScore += 100;
      if (check.status === 'pass') totalScore += 100;
      else if (check.status === 'warn') totalScore += 70;
      else totalScore += 0;
    }

    const score = maxScore > 0 ? Math.round(totalScore / maxScore * 100) : 100;
    const status = score >= 90 ? 'healthy' : score >= 70 ? 'warning' : 'critical';

    this.systemHealth = {
      status,
      score,
      checks,
      lastUpdated: new Date(),
      uptime: Date.now() - this.startTime.getTime()
    };

    // Generate alerts for failed checks
    this.generateHealthAlerts(checks);
  }

  /**
   * Private: Collect current metrics
   */
  private collectMetrics(): void {
    const processingStats = this.batchProcessor.getStats();
    const cacheStats = this.storageService.getCacheStats();
    const qualityMetrics = this.validator.getOverallQualityMetrics();

    // Add quality metrics to history
    if (qualityMetrics.totalEmbeddings > 0) {
      this.qualityHistory.push(qualityMetrics);
      if (this.qualityHistory.length > 100) {
        this.qualityHistory = this.qualityHistory.slice(-100);
      }
    }

    // Calculate performance metrics
    const errorRate = processingStats.totalJobs > 0 
      ? processingStats.failedJobs / processingStats.totalJobs 
      : 0;

    this.recordPerformanceMetrics({
      embeddingsGenerated: processingStats.completedJobs,
      processingTime: processingStats.averageProcessingTime,
      throughputPerMinute: processingStats.throughputPerMinute,
      averageLatency: processingStats.averageProcessingTime,
      errorRate,
      cacheHitRate: cacheStats.hitRate,
      memoryUsage: cacheStats.memoryUsage
    });
  }

  /**
   * Private: Check performance thresholds and generate alerts
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    if (metrics.averageLatency > this.config.performanceThresholds.maxLatency) {
      this.createAlert({
        type: 'performance',
        severity: 'warning',
        title: 'High Latency Detected',
        message: `Average latency ${metrics.averageLatency.toFixed(0)}ms exceeds threshold of ${this.config.performanceThresholds.maxLatency}ms`,
        metadata: { latency: metrics.averageLatency, threshold: this.config.performanceThresholds.maxLatency }
      });
    }

    if (metrics.errorRate > this.config.performanceThresholds.maxErrorRate) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'High Error Rate',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds threshold of ${(this.config.performanceThresholds.maxErrorRate * 100).toFixed(1)}%`,
        metadata: { errorRate: metrics.errorRate, threshold: this.config.performanceThresholds.maxErrorRate }
      });
    }

    if (metrics.throughputPerMinute < this.config.performanceThresholds.minThroughput) {
      this.createAlert({
        type: 'performance',
        severity: 'warning',
        title: 'Low Throughput',
        message: `Throughput ${metrics.throughputPerMinute.toFixed(1)}/min below threshold of ${this.config.performanceThresholds.minThroughput}/min`,
        metadata: { throughput: metrics.throughputPerMinute, threshold: this.config.performanceThresholds.minThroughput }
      });
    }
  }

  /**
   * Private: Generate alerts from health checks
   */
  private generateHealthAlerts(checks: HealthCheck[]): void {
    for (const check of checks) {
      if (check.status === 'fail' || (check.status === 'warn' && check.severity === 'high')) {
        this.createAlert({
          type: 'system',
          severity: check.status === 'fail' ? 'critical' : 'warning',
          title: `Health Check Failed: ${check.name}`,
          message: check.message,
          metadata: { 
            checkName: check.name, 
            value: check.value, 
            threshold: check.threshold,
            severity: check.severity
          }
        });
      }
    }
  }

  /**
   * Private: Create a new alert
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.type === alertData.type && 
      alert.title === alertData.title &&
      Date.now() - alert.timestamp.getTime() < 60000 // Within last minute
    );

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      existingAlert.message = alertData.message;
      existingAlert.metadata = { ...existingAlert.metadata, ...alertData.metadata };
      return;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    console.warn(`Alert created: [${alert.severity.toUpperCase()}] ${alert.title} - ${alert.message}`);

    // Send notification if enabled
    if (this.config.alerting.enabled) {
      this.sendNotification(alert);
    }
  }

  /**
   * Private: Send alert notification
   */
  private sendNotification(alert: Alert): void {
    // In a real implementation, this would send email/webhook notifications
    if (this.config.alerting.webhookUrl) {
      // Send webhook notification
      console.log(`Would send webhook to ${this.config.alerting.webhookUrl}:`, alert);
    }

    if (this.config.alerting.emailNotifications) {
      // Send email notification
      console.log('Would send email notification for alert:', alert.title);
    }
  }

  /**
   * Private: Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.metricsRetentionHours * 60 * 60 * 1000);
    this.performanceHistory = this.performanceHistory.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Private: Format metrics for Prometheus
   */
  private formatPrometheusMetrics(data: ReturnType<typeof this.getDashboardData>): string {
    const metrics: string[] = [];
    
    metrics.push(`# HELP embedding_system_health_score System health score (0-100)`);
    metrics.push(`# TYPE embedding_system_health_score gauge`);
    metrics.push(`embedding_system_health_score ${data.systemHealth.score}`);
    
    metrics.push(`# HELP embedding_processing_jobs_total Total number of processing jobs`);
    metrics.push(`# TYPE embedding_processing_jobs_total counter`);
    metrics.push(`embedding_processing_jobs_total ${data.processingStats.totalJobs}`);
    
    metrics.push(`# HELP embedding_cache_hit_rate Cache hit rate (0-1)`);
    metrics.push(`# TYPE embedding_cache_hit_rate gauge`);
    metrics.push(`embedding_cache_hit_rate ${data.cacheStats.hitRate}`);
    
    metrics.push(`# HELP embedding_active_alerts Number of active alerts`);
    metrics.push(`# TYPE embedding_active_alerts gauge`);
    metrics.push(`embedding_active_alerts ${data.activeAlerts.length}`);

    return metrics.join('\n');
  }
}