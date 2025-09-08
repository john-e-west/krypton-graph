import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchProcessor, ProcessingJob } from '../batch-processor';
import { EmbeddingRequest } from '../embedding.service';
import { ZepConfig } from '../../types';

// Mock the EmbeddingService
vi.mock('../embedding.service', () => ({
  EmbeddingService: vi.fn().mockImplementation(() => ({
    generateBatchEmbeddings: vi.fn().mockResolvedValue({
      batchId: 'test-batch',
      results: [],
      success: true,
      processingTime: 100,
      successCount: 5,
      failedCount: 0
    })
  }))
}));

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let config: ZepConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      projectId: 'test-project',
      maxRetries: 3,
      retryDelay: 1000,
      requestsPerMinute: 60
    };
    
    batchProcessor = new BatchProcessor(config, {
      maxConcurrentJobs: 2,
      maxBatchSize: 10,
      maxBatchSizeBytes: 4 * 1024, // 4KB for testing
      priorityWeights: { high: 3, normal: 2, low: 1 },
      healthCheckInterval: 5000,
      metricsRetentionDays: 1
    });
  });

  afterEach(async () => {
    await batchProcessor.shutdown();
    vi.clearAllMocks();
  });

  describe('job submission', () => {
    it('should submit a processing job', async () => {
      const chunks: EmbeddingRequest[] = [
        { text: 'Test chunk 1', chunkId: 'chunk_1' },
        { text: 'Test chunk 2', chunkId: 'chunk_2' }
      ];

      const jobId = await batchProcessor.submitJob('doc_1', chunks, 'normal');

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);

      const job = batchProcessor.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.documentId).toBe('doc_1');
      expect(job?.chunks).toHaveLength(2);
      expect(job?.priority).toBe('normal');
    });

    it('should handle different priority levels', async () => {
      const chunks: EmbeddingRequest[] = [
        { text: 'High priority chunk', chunkId: 'high_1' }
      ];

      const lowJobId = await batchProcessor.submitJob('doc_low', chunks, 'low');
      const normalJobId = await batchProcessor.submitJob('doc_normal', chunks, 'normal');
      const highJobId = await batchProcessor.submitJob('doc_high', chunks, 'high');

      const lowJob = batchProcessor.getJobStatus(lowJobId);
      const normalJob = batchProcessor.getJobStatus(normalJobId);
      const highJob = batchProcessor.getJobStatus(highJobId);

      expect(lowJob?.priority).toBe('low');
      expect(normalJob?.priority).toBe('normal');
      expect(highJob?.priority).toBe('high');
    });

    it('should estimate completion time', async () => {
      const chunks: EmbeddingRequest[] = Array.from({ length: 100 }, (_, i) => ({
        text: `Chunk ${i}`,
        chunkId: `chunk_${i}`
      }));

      const jobId = await batchProcessor.submitJob('doc_large', chunks, 'normal');
      const job = batchProcessor.getJobStatus(jobId);

      expect(job?.estimatedCompletionTime).toBeDefined();
      expect(job?.estimatedCompletionTime?.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('job management', () => {
    it('should get job status', async () => {
      const chunks: EmbeddingRequest[] = [
        { text: 'Status test', chunkId: 'status_1' }
      ];

      const jobId = await batchProcessor.submitJob('doc_status', chunks);
      const job = batchProcessor.getJobStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.status).toMatch(/^(queued|processing|completed|failed)$/);
      expect(job?.progress.total).toBe(1);
      expect(job?.createdAt).toBeDefined();
    });

    it('should get all jobs for a document', async () => {
      const chunks1: EmbeddingRequest[] = [{ text: 'Job 1', chunkId: 'j1' }];
      const chunks2: EmbeddingRequest[] = [{ text: 'Job 2', chunkId: 'j2' }];

      await batchProcessor.submitJob('doc_multi', chunks1);
      await batchProcessor.submitJob('doc_multi', chunks2);
      await batchProcessor.submitJob('doc_other', chunks1);

      const docJobs = batchProcessor.getDocumentJobs('doc_multi');

      expect(docJobs).toHaveLength(2);
      expect(docJobs.every(job => job.documentId === 'doc_multi')).toBe(true);
    });

    it('should cancel a job', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Cancel test', chunkId: 'cancel_1' }];
      
      const jobId = await batchProcessor.submitJob('doc_cancel', chunks);
      const cancelled = await batchProcessor.cancelJob(jobId);

      expect(cancelled).toBe(true);

      const job = batchProcessor.getJobStatus(jobId);
      expect(job?.status).toBe('cancelled');
      expect(job?.completedAt).toBeDefined();
    });

    it('should not cancel completed jobs', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Already done', chunkId: 'done_1' }];
      
      const jobId = await batchProcessor.submitJob('doc_done', chunks);
      
      // Manually set job as completed for testing
      const job = batchProcessor.getJobStatus(jobId);
      if (job) {
        (job as any).status = 'completed';
      }

      const cancelled = await batchProcessor.cancelJob(jobId);
      expect(cancelled).toBe(false);
    });
  });

  describe('queue management', () => {
    it('should return correct queue status', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Queue test', chunkId: 'queue_1' }];
      
      await batchProcessor.submitJob('doc_queue1', chunks);
      await batchProcessor.submitJob('doc_queue2', chunks, 'high');

      const queueStatus = batchProcessor.getQueueStatus();

      expect(queueStatus.queueLength).toBeGreaterThan(0);
      expect(queueStatus.activeJobs).toBeGreaterThanOrEqual(0);
      expect(queueStatus.highPriorityJobs).toBeGreaterThanOrEqual(0);
      expect(queueStatus.estimatedWaitTime).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize high priority jobs', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Priority test', chunkId: 'pri_1' }];
      
      // Submit normal priority first, then high priority
      await batchProcessor.submitJob('doc_normal', chunks, 'normal');
      await batchProcessor.submitJob('doc_high', chunks, 'high');

      const queueStatus = batchProcessor.getQueueStatus();
      expect(queueStatus.highPriorityJobs).toBe(1);
    });

    it('should handle concurrent job limits', async () => {
      // Submit more jobs than concurrent limit (2)
      const chunks: EmbeddingRequest[] = [{ text: 'Concurrent test', chunkId: 'conc_1' }];
      
      await batchProcessor.submitJob('doc_1', chunks);
      await batchProcessor.submitJob('doc_2', chunks);
      await batchProcessor.submitJob('doc_3', chunks);

      const queueStatus = batchProcessor.getQueueStatus();
      expect(queueStatus.activeJobs).toBeLessThanOrEqual(2);
    });
  });

  describe('batch optimization', () => {
    it('should create optimal batches', async () => {
      const processor = batchProcessor as any; // Access private methods
      
      const chunks: EmbeddingRequest[] = [
        { text: 'a'.repeat(1000), chunkId: 'chunk_1' },
        { text: 'b'.repeat(2000), chunkId: 'chunk_2' },
        { text: 'c'.repeat(1500), chunkId: 'chunk_3' },
        { text: 'd'.repeat(800), chunkId: 'chunk_4' }
      ];

      const batches = processor.createOptimalBatches(chunks);

      expect(batches).toBeDefined();
      expect(batches.length).toBeGreaterThan(0);
      
      // Verify batch size constraints
      for (const batch of batches) {
        expect(batch.length).toBeLessThanOrEqual(10); // maxBatchSize
        
        const batchSizeBytes = batch.reduce((sum, chunk) => {
          return sum + new TextEncoder().encode(chunk.text).length;
        }, 0);
        expect(batchSizeBytes).toBeLessThanOrEqual(4 * 1024); // 4KB limit
      }
    });

    it('should handle oversized individual chunks', async () => {
      const processor = batchProcessor as any;
      
      const chunks: EmbeddingRequest[] = [
        { text: 'x'.repeat(6000), chunkId: 'huge_chunk' }, // Larger than batch limit
        { text: 'small', chunkId: 'small_chunk' }
      ];

      const batches = processor.createOptimalBatches(chunks);
      
      expect(batches.length).toBe(2); // Should split into separate batches
      expect(batches[0][0].chunkId).toBe('huge_chunk');
      expect(batches[1][0].chunkId).toBe('small_chunk');
    });
  });

  describe('statistics and monitoring', () => {
    it('should calculate processing statistics', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Stats test', chunkId: 'stats_1' }];
      
      await batchProcessor.submitJob('doc_stats', chunks);

      const stats = batchProcessor.getStats();

      expect(stats.totalJobs).toBeGreaterThan(0);
      expect(stats.queuedJobs).toBeGreaterThanOrEqual(0);
      expect(stats.processingJobs).toBeGreaterThanOrEqual(0);
      expect(stats.completedJobs).toBeGreaterThanOrEqual(0);
      expect(stats.failedJobs).toBeGreaterThanOrEqual(0);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.throughputPerMinute).toBeGreaterThanOrEqual(0);
    });

    it('should track job progress', async () => {
      const chunks: EmbeddingRequest[] = Array.from({ length: 5 }, (_, i) => ({
        text: `Progress chunk ${i}`,
        chunkId: `prog_${i}`
      }));

      const jobId = await batchProcessor.submitJob('doc_progress', chunks);
      const job = batchProcessor.getJobStatus(jobId);

      expect(job?.progress).toBeDefined();
      expect(job?.progress.total).toBe(5);
      expect(job?.progress.processed).toBe(0);
      expect(job?.progress.successful).toBe(0);
      expect(job?.progress.failed).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Mock the embedding service to throw an error
      const mockService = (batchProcessor as any).embeddingService;
      mockService.generateBatchEmbeddings.mockRejectedValueOnce(new Error('Processing failed'));

      const chunks: EmbeddingRequest[] = [{ text: 'Error test', chunkId: 'error_1' }];
      const jobId = await batchProcessor.submitJob('doc_error', chunks);

      // Allow some time for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const job = batchProcessor.getJobStatus(jobId);
      // Job should handle the error without crashing
      expect(job).toBeDefined();
    });

    it('should handle invalid job IDs', () => {
      const job = batchProcessor.getJobStatus('invalid_job_id');
      expect(job).toBeNull();
    });

    it('should handle cancelling non-existent jobs', async () => {
      const cancelled = await batchProcessor.cancelJob('non_existent_job');
      expect(cancelled).toBe(false);
    });
  });

  describe('cleanup and shutdown', () => {
    it('should cleanup old jobs', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Cleanup test', chunkId: 'cleanup_1' }];
      
      await batchProcessor.submitJob('doc_cleanup', chunks);
      
      // Run cleanup (normally triggered by timer)
      (batchProcessor as any).cleanupOldJobs();
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should shutdown gracefully', async () => {
      const chunks: EmbeddingRequest[] = [{ text: 'Shutdown test', chunkId: 'shutdown_1' }];
      
      await batchProcessor.submitJob('doc_shutdown', chunks);
      
      await expect(batchProcessor.shutdown()).resolves.not.toThrow();
    });

    it('should handle shutdown timeout', async () => {
      const processor = new BatchProcessor(config, {
        maxConcurrentJobs: 1,
        maxBatchSize: 10,
        maxBatchSizeBytes: 4 * 1024,
        priorityWeights: { high: 3, normal: 2, low: 1 },
        healthCheckInterval: 5000,
        metricsRetentionDays: 1
      });

      // Submit a job but don't let it complete
      const chunks: EmbeddingRequest[] = [{ text: 'Long running', chunkId: 'long_1' }];
      await processor.submitJob('doc_long', chunks);

      // Shutdown should timeout and cancel remaining jobs
      await expect(processor.shutdown()).resolves.not.toThrow();
    });
  });

  describe('time estimation', () => {
    it('should estimate completion time based on chunk count', async () => {
      const processor = batchProcessor as any;
      
      const smallJobTime = processor.estimateCompletionTime(10, 'normal');
      const largeJobTime = processor.estimateCompletionTime(100, 'normal');
      const highPriorityTime = processor.estimateCompletionTime(50, 'high');
      const lowPriorityTime = processor.estimateCompletionTime(50, 'low');

      expect(largeJobTime.getTime()).toBeGreaterThan(smallJobTime.getTime());
      expect(highPriorityTime.getTime()).toBeLessThan(lowPriorityTime.getTime());
    });

    it('should estimate queue wait time', async () => {
      const processor = batchProcessor as any;
      
      // Submit several jobs to create a queue
      const chunks: EmbeddingRequest[] = [{ text: 'Wait test', chunkId: 'wait_1' }];
      
      await batchProcessor.submitJob('doc_1', chunks);
      await batchProcessor.submitJob('doc_2', chunks);
      await batchProcessor.submitJob('doc_3', chunks);

      const waitTime = processor.estimateQueueWaitTime();
      expect(waitTime).toBeGreaterThanOrEqual(0);
    });
  });
});