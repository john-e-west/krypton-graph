import { performanceMonitor } from '../server/services/performance-monitor';

export interface ErrorContext {
  operation: string;
  userId?: string;
  documentId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'user-intervention' | 'auto-save';
  description: string;
  execute: () => Promise<any>;
  maxAttempts?: number;
  backoffDelay?: number;
}

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'processing' | 'validation' | 'system' | 'user';
  recoveryActions: RecoveryAction[];
  resolved: boolean;
  attempts: number;
  resolvedAt?: number;
}

export interface AutoSaveState {
  id: string;
  operation: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export class ErrorRecoveryService {
  private errorReports: Map<string, ErrorReport> = new Map();
  private autoSaveStates: Map<string, AutoSaveState> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private offlineMode: boolean = false;
  private pendingOperations: Array<() => Promise<any>> = [];

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupOfflineDetection();
    this.initializeAutoSave();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleGlobalError(new Error(event.message), {
          operation: 'global-error',
          timestamp: Date.now(),
          url: event.filename,
          additionalData: {
            lineNumber: event.lineno,
            columnNumber: event.colno
          }
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleGlobalError(
          new Error(event.reason?.message || 'Unhandled promise rejection'),
          {
            operation: 'unhandled-promise',
            timestamp: Date.now(),
            additionalData: {
              reason: event.reason
            }
          }
        );
      });
    }

    // Handle process errors in Node.js
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleGlobalError(error, {
          operation: 'uncaught-exception',
          timestamp: Date.now()
        });
      });

      process.on('unhandledRejection', (reason) => {
        this.handleGlobalError(
          new Error(`Unhandled rejection: ${reason}`),
          {
            operation: 'unhandled-rejection',
            timestamp: Date.now()
          }
        );
      });
    }
  }

  private setupOfflineDetection(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.offlineMode = false;
        this.processOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.offlineMode = true;
      });

      this.offlineMode = !navigator.onLine;
    }
  }

  private initializeAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      this.performAutoSave();
    }, 30000);

    // Save on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.performAutoSave(true);
      });
    }
  }

  private handleGlobalError(error: Error, context: ErrorContext): void {
    const report = this.createErrorReport(error, context, 'high', 'system');
    this.processErrorReport(report);
  }

  public reportError(
    error: Error,
    context: ErrorContext,
    severity: ErrorReport['severity'] = 'medium',
    category: ErrorReport['category'] = 'system'
  ): string {
    const report = this.createErrorReport(error, context, severity, category);
    return this.processErrorReport(report);
  }

  private createErrorReport(
    error: Error,
    context: ErrorContext,
    severity: ErrorReport['severity'],
    category: ErrorReport['category']
  ): ErrorReport {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: ErrorReport = {
      id,
      error,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      },
      severity,
      category,
      recoveryActions: this.generateRecoveryActions(error, context, category),
      resolved: false,
      attempts: 0
    };

    return report;
  }

  private generateRecoveryActions(
    error: Error,
    context: ErrorContext,
    category: ErrorReport['category']
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Network-related errors
    if (category === 'network' || error.message.includes('fetch') || error.message.includes('network')) {
      actions.push({
        type: 'retry',
        description: 'Retry the network request',
        execute: async () => {
          // Retry logic will be provided by the calling code
          throw new Error('Retry function not implemented');
        },
        maxAttempts: 3,
        backoffDelay: 1000
      });

      if (this.offlineMode) {
        actions.push({
          type: 'fallback',
          description: 'Use offline mode',
          execute: async () => {
            this.pendingOperations.push(async () => {
              // Operation will be retried when online
            });
          }
        });
      }
    }

    // Processing errors
    if (category === 'processing') {
      actions.push({
        type: 'auto-save',
        description: 'Save current progress',
        execute: async () => {
          this.saveState(context.operation, context.additionalData);
        }
      });

      actions.push({
        type: 'fallback',
        description: 'Use simplified processing',
        execute: async () => {
          // Fallback to simpler algorithm
        }
      });
    }

    // Validation errors
    if (category === 'validation') {
      actions.push({
        type: 'user-intervention',
        description: 'Request user to fix validation issues',
        execute: async () => {
          // Show user-friendly validation message
        }
      });

      actions.push({
        type: 'skip',
        description: 'Skip invalid data and continue',
        execute: async () => {
          // Continue with valid data only
        }
      });
    }

    // System errors
    if (category === 'system') {
      actions.push({
        type: 'auto-save',
        description: 'Save current state before recovery',
        execute: async () => {
          this.performAutoSave(true);
        }
      });

      actions.push({
        type: 'retry',
        description: 'Retry with exponential backoff',
        execute: async () => {
          // Retry implementation
        },
        maxAttempts: 2,
        backoffDelay: 2000
      });
    }

    return actions;
  }

  private processErrorReport(report: ErrorReport): string {
    this.errorReports.set(report.id, report);

    // Log to performance monitor
    performanceMonitor.recordMetric('error-count', 1, {
      category: report.category,
      severity: report.severity
    });

    // Send to external monitoring (Sentry, etc.)
    this.sendToMonitoring(report);

    // Auto-execute recovery actions based on severity
    if (report.severity === 'critical') {
      this.executeRecoveryActions(report.id);
    }

    return report.id;
  }

  private sendToMonitoring(report: ErrorReport): void {
    // In production, this would send to Sentry or similar service
    console.error('Error Report:', {
      id: report.id,
      message: report.error.message,
      stack: report.error.stack,
      context: report.context,
      severity: report.severity,
      category: report.category
    });
  }

  public async executeRecoveryActions(reportId: string): Promise<boolean> {
    const report = this.errorReports.get(reportId);
    if (!report || report.resolved) return false;

    report.attempts++;

    for (const action of report.recoveryActions) {
      try {
        await this.executeRecoveryAction(action, reportId);
        
        // If we get here, the action succeeded
        report.resolved = true;
        report.resolvedAt = Date.now();
        return true;

      } catch (error) {
        console.warn(`Recovery action '${action.type}' failed:`, error);
        continue;
      }
    }

    // If all actions failed, mark as unresolved
    return false;
  }

  private async executeRecoveryAction(action: RecoveryAction, reportId: string): Promise<void> {
    const maxAttempts = action.maxAttempts || 1;
    const backoffDelay = action.backoffDelay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await action.execute();
        return; // Success
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error; // Final attempt failed
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, backoffDelay * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  // Auto-save functionality
  public saveState(operation: string, data: any, userId?: string): void {
    const id = `autosave_${operation}_${Date.now()}`;
    const state: AutoSaveState = {
      id,
      operation,
      data,
      timestamp: Date.now(),
      userId
    };

    this.autoSaveStates.set(id, state);

    // Keep only the last 10 auto-save states per operation
    const operationStates = Array.from(this.autoSaveStates.values())
      .filter(s => s.operation === operation)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (operationStates.length > 10) {
      operationStates.slice(10).forEach(oldState => {
        this.autoSaveStates.delete(oldState.id);
      });
    }

    // Persist to localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedStates = Object.fromEntries(
          Array.from(this.autoSaveStates.entries())
            .filter(([, state]) => state.operation === operation)
            .slice(0, 5) // Keep only 5 most recent in localStorage
        );
        localStorage.setItem(`autosave_${operation}`, JSON.stringify(savedStates));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }

  public loadSavedState(operation: string, userId?: string): AutoSaveState | null {
    // First try in-memory states
    const memoryStates = Array.from(this.autoSaveStates.values())
      .filter(s => s.operation === operation && (!userId || s.userId === userId))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (memoryStates.length > 0) {
      return memoryStates[0];
    }

    // Try localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(`autosave_${operation}`);
        if (saved) {
          const savedStates = JSON.parse(saved);
          const states = Object.values(savedStates) as AutoSaveState[];
          const userStates = states.filter(s => !userId || s.userId === userId);
          
          if (userStates.length > 0) {
            return userStates.sort((a, b) => b.timestamp - a.timestamp)[0];
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }

    return null;
  }

  private performAutoSave(force: boolean = false): void {
    // This would be called by components to save their current state
    // Implementation depends on the specific use case
  }

  // Offline mode support
  private async processOfflineQueue(): Promise<void> {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        // Re-queue if still failing
        this.pendingOperations.push(operation);
      }
    }
  }

  public isOffline(): boolean {
    return this.offlineMode;
  }

  // Error analysis and reporting
  public getErrorStats(timeRange?: number): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    resolutionRate: number;
    averageResolutionTime: number;
  } {
    const cutoff = timeRange ? Date.now() - timeRange : 0;
    const recentErrors = Array.from(this.errorReports.values())
      .filter(report => report.context.timestamp >= cutoff);

    const stats = {
      totalErrors: recentErrors.length,
      errorsByCategory: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      resolutionRate: 0,
      averageResolutionTime: 0
    };

    if (recentErrors.length === 0) return stats;

    // Count by category and severity
    recentErrors.forEach(report => {
      stats.errorsByCategory[report.category] = (stats.errorsByCategory[report.category] || 0) + 1;
      stats.errorsBySeverity[report.severity] = (stats.errorsBySeverity[report.severity] || 0) + 1;
    });

    // Calculate resolution metrics
    const resolvedErrors = recentErrors.filter(report => report.resolved && report.resolvedAt);
    stats.resolutionRate = resolvedErrors.length / recentErrors.length;

    if (resolvedErrors.length > 0) {
      const totalResolutionTime = resolvedErrors.reduce((sum, report) => {
        return sum + (report.resolvedAt! - report.context.timestamp);
      }, 0);
      stats.averageResolutionTime = totalResolutionTime / resolvedErrors.length;
    }

    return stats;
  }

  public getUnresolvedErrors(): ErrorReport[] {
    return Array.from(this.errorReports.values()).filter(report => !report.resolved);
  }

  public clearResolvedErrors(): void {
    for (const [id, report] of this.errorReports.entries()) {
      if (report.resolved) {
        this.errorReports.delete(id);
      }
    }
  }

  // Graceful degradation
  public async withGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: Omit<ErrorContext, 'timestamp'>
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      const reportId = this.reportError(
        error as Error,
        { ...context, timestamp: Date.now() },
        'medium',
        'processing'
      );

      try {
        const result = await fallbackOperation();
        
        // Mark the error as resolved through fallback
        const report = this.errorReports.get(reportId);
        if (report) {
          report.resolved = true;
          report.resolvedAt = Date.now();
        }

        return result;
      } catch (fallbackError) {
        // Both primary and fallback failed
        this.reportError(
          fallbackError as Error,
          { ...context, timestamp: Date.now(), operation: `${context.operation}-fallback` },
          'high',
          'processing'
        );
        throw fallbackError;
      }
    }
  }

  // Circuit breaker pattern
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  public async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    failureThreshold: number = 5,
    timeout: number = 60000
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(operationName);
    
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, state: 'closed' };
      this.circuitBreakers.set(operationName, breaker);
    }

    const now = Date.now();

    // Check circuit breaker state
    if (breaker.state === 'open') {
      if (now - breaker.lastFailure < timeout) {
        throw new Error(`Circuit breaker open for ${operationName}`);
      } else {
        breaker.state = 'half-open';
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      breaker.failures = 0;
      breaker.state = 'closed';
      
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;
      
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
      }
      
      throw error;
    }
  }

  public cleanup(): void {
    this.errorReports.clear();
    this.autoSaveStates.clear();
    this.retryAttempts.clear();
    this.pendingOperations = [];
    this.circuitBreakers.clear();

    // Also clear localStorage in test environments
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clear all autosave entries from localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('autosave_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Helper decorators and utilities
export function withErrorRecovery(
  context: Omit<ErrorContext, 'timestamp'>,
  severity: ErrorReport['severity'] = 'medium'
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const reportId = errorRecoveryService.reportError(
          error as Error,
          { ...context, timestamp: Date.now() },
          severity
        );
        
        // Try to recover automatically for non-critical errors
        if (severity !== 'critical') {
          const recovered = await errorRecoveryService.executeRecoveryActions(reportId);
          if (recovered) {
            // Retry the operation
            return await method.apply(this, args);
          }
        }
        
        throw error;
      }
    };
  };
}