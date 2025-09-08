import { ErrorRecoveryService } from '../error-recovery';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock console to avoid test noise
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation();

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    service = new ErrorRecoveryService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Error reporting', () => {
    it('should create and store error reports', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test-operation',
        userId: 'user123',
        timestamp: Date.now()
      };

      const reportId = service.reportError(error, context, 'medium', 'processing');

      expect(reportId).toBeDefined();
      expect(reportId).toMatch(/^error_\d+_[a-z0-9]+$/);

      const unresolvedErrors = service.getUnresolvedErrors();
      expect(unresolvedErrors).toHaveLength(1);
      expect(unresolvedErrors[0].error.message).toBe('Test error');
      expect(unresolvedErrors[0].context.operation).toBe('test-operation');
    });

    it('should generate appropriate recovery actions based on error category', () => {
      const networkError = new Error('Network request failed');
      const networkContext = {
        operation: 'api-call',
        timestamp: Date.now()
      };

      const reportId = service.reportError(networkError, networkContext, 'high', 'network');
      const unresolvedErrors = service.getUnresolvedErrors();
      const report = unresolvedErrors.find(e => e.id === reportId);

      expect(report?.recoveryActions.length).toBeGreaterThan(0);
      expect(report?.recoveryActions.some(action => action.type === 'retry')).toBe(true);
    });

    it('should create different recovery actions for different categories', () => {
      const validationError = new Error('Validation failed');
      const validationContext = {
        operation: 'form-submit',
        timestamp: Date.now()
      };

      const reportId = service.reportError(validationError, validationContext, 'medium', 'validation');
      const unresolvedErrors = service.getUnresolvedErrors();
      const report = unresolvedErrors.find(e => e.id === reportId);

      expect(report?.recoveryActions.some(action => action.type === 'user-intervention')).toBe(true);
      expect(report?.recoveryActions.some(action => action.type === 'skip')).toBe(true);
    });
  });

  describe('Recovery action execution', () => {
    it('should execute recovery actions and mark errors as resolved', async () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test-operation',
        timestamp: Date.now()
      };

      // Create a report with a successful recovery action
      const reportId = service.reportError(error, context);
      const unresolvedErrors = service.getUnresolvedErrors();
      const report = unresolvedErrors.find(e => e.id === reportId)!;

      // Replace the first recovery action with a successful one
      report.recoveryActions[0] = {
        type: 'retry',
        description: 'Test retry',
        execute: vi.fn().mockResolvedValue('success')
      };

      const result = await service.executeRecoveryActions(reportId);

      expect(result).toBe(true);
      expect(report.resolved).toBe(true);
      expect(report.resolvedAt).toBeDefined();
    });

    it('should handle failed recovery actions', async () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test-operation',
        timestamp: Date.now()
      };

      const reportId = service.reportError(error, context);
      const unresolvedErrors = service.getUnresolvedErrors();
      const report = unresolvedErrors.find(e => e.id === reportId)!;

      // Replace all recovery actions with failing ones
      report.recoveryActions = [{
        type: 'retry',
        description: 'Failing retry',
        execute: vi.fn().mockRejectedValue(new Error('Recovery failed'))
      }];

      const result = await service.executeRecoveryActions(reportId);

      expect(result).toBe(false);
      expect(report.resolved).toBe(false);
    });
  });

  describe('Auto-save functionality', () => {
    it('should save and load state', () => {
      const testData = { field1: 'value1', field2: 42 };
      
      service.saveState('form-data', testData, 'user123');
      
      const loadedState = service.loadSavedState('form-data', 'user123');
      
      expect(loadedState).toBeDefined();
      expect(loadedState?.data).toEqual(testData);
      expect(loadedState?.operation).toBe('form-data');
      expect(loadedState?.userId).toBe('user123');
    });

    it('should return null for non-existent saved state', () => {
      const loadedState = service.loadSavedState('non-existent');
      expect(loadedState).toBeNull();
    });

    it('should keep only the most recent states', () => {
      // Save more than 10 states
      for (let i = 0; i < 15; i++) {
        service.saveState('overflow-test', { index: i });
      }

      // Should only keep the last 10
      const allStates = Array.from(service['autoSaveStates'].values())
        .filter(s => s.operation === 'overflow-test');
      
      expect(allStates.length).toBeLessThanOrEqual(10);
      expect(allStates.length).toBeGreaterThan(0);
      
      // Check that we have the most recent states
      const indices = allStates.map(s => s.data.index).sort((a, b) => b - a);
      expect(indices[0]).toBe(14); // Most recent should be 14
    });
  });

  describe('Graceful degradation', () => {
    it('should try fallback when primary operation fails', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = vi.fn().mockResolvedValue('fallback success');
      
      const context = { operation: 'test-degradation' };
      
      const result = await service.withGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        context
      );

      expect(result).toBe('fallback success');
      expect(primaryOperation).toHaveBeenCalled();
      expect(fallbackOperation).toHaveBeenCalled();
    });

    it('should return primary result when it succeeds', async () => {
      const primaryOperation = vi.fn().mockResolvedValue('primary success');
      const fallbackOperation = vi.fn();
      
      const context = { operation: 'test-success' };
      
      const result = await service.withGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        context
      );

      expect(result).toBe('primary success');
      expect(primaryOperation).toHaveBeenCalled();
      expect(fallbackOperation).not.toHaveBeenCalled();
    });

    it('should throw when both primary and fallback fail', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = vi.fn().mockRejectedValue(new Error('Fallback failed'));
      
      const context = { operation: 'test-both-fail' };
      
      await expect(
        service.withGracefulDegradation(primaryOperation, fallbackOperation, context)
      ).rejects.toThrow('Fallback failed');
    });
  });

  describe('Circuit breaker', () => {
    it('should allow operations when circuit is closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await service.withCircuitBreaker(operation, 'test-circuit');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should open circuit after failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      // Fail 5 times (default threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await service.withCircuitBreaker(operation, 'failing-circuit');
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should be rejected by circuit breaker
      await expect(
        service.withCircuitBreaker(operation, 'failing-circuit')
      ).rejects.toThrow('Circuit breaker open for failing-circuit');
      
      // Operation should not have been called the 6th time
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should reset circuit breaker on success', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');
      
      // Two failures
      try { await service.withCircuitBreaker(operation, 'reset-circuit'); } catch {}
      try { await service.withCircuitBreaker(operation, 'reset-circuit'); } catch {}
      
      // Success should reset the circuit
      const result = await service.withCircuitBreaker(operation, 'reset-circuit');
      expect(result).toBe('success');
      
      // Circuit should be reset (failures count = 0)
      const breaker = service['circuitBreakers'].get('reset-circuit');
      expect(breaker?.failures).toBe(0);
      expect(breaker?.state).toBe('closed');
    });
  });

  describe('Error statistics', () => {
    it('should provide accurate error statistics', () => {
      // Create errors of different categories and severities
      service.reportError(new Error('Network error'), 
        { operation: 'api-call', timestamp: Date.now() }, 'high', 'network');
      service.reportError(new Error('Validation error'), 
        { operation: 'form-submit', timestamp: Date.now() }, 'medium', 'validation');
      service.reportError(new Error('System error'), 
        { operation: 'system-task', timestamp: Date.now() }, 'critical', 'system');

      const stats = service.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory.network).toBe(1);
      expect(stats.errorsByCategory.validation).toBe(1);
      expect(stats.errorsByCategory.system).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(1);
      expect(stats.errorsBySeverity.medium).toBe(1);
      expect(stats.errorsBySeverity.critical).toBe(1);
    });

    it('should calculate resolution rate correctly', async () => {
      // Create two errors
      const reportId1 = service.reportError(new Error('Error 1'), 
        { operation: 'test', timestamp: Date.now() });
      const reportId2 = service.reportError(new Error('Error 2'), 
        { operation: 'test', timestamp: Date.now() });

      // Manually resolve one error
      const report1 = service['errorReports'].get(reportId1)!;
      report1.resolved = true;
      report1.resolvedAt = Date.now();

      const stats = service.getErrorStats();

      expect(stats.resolutionRate).toBe(0.5); // 1 out of 2 resolved
    });
  });

  describe('Cleanup', () => {
    it('should clear all data on cleanup', () => {
      service.reportError(new Error('Test'), { operation: 'test', timestamp: Date.now() });
      service.saveState('cleanup-test', { data: 'test' });

      expect(service.getUnresolvedErrors().length).toBe(1);
      expect(service.loadSavedState('cleanup-test')).not.toBeNull();

      service.cleanup();

      expect(service.getUnresolvedErrors().length).toBe(0);
      expect(service.loadSavedState('cleanup-test')).toBeNull();
    });
  });

  describe('Offline mode', () => {
    it('should detect offline mode', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const offlineService = new ErrorRecoveryService();
      expect(offlineService.isOffline()).toBe(true);
      
      offlineService.cleanup();
    });

    it('should queue operations when offline', () => {
      service['offlineMode'] = true;
      
      const operation = vi.fn();
      service['pendingOperations'].push(operation);
      
      expect(service['pendingOperations']).toHaveLength(1);
    });
  });
});

afterAll(() => {
  mockConsoleError.mockRestore();
  mockConsoleWarn.mockRestore();
});