import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingService } from '../embedding.service';
import { BatchProcessor } from '../batch-processor';
import { EmbeddingValidatorService } from '../embedding-validator.service';
import { EmbeddingStorageService } from '../embedding-storage.service';
import { RollbackRecoveryService } from '../rollback-recovery.service';
import { ZepConfig } from '../../types';

describe('Embedding Pipeline Integration Tests', () => {
  let config: ZepConfig;
  let embeddingService: EmbeddingService;
  let batchProcessor: BatchProcessor;
  let validator: EmbeddingValidatorService;
  let storageService: EmbeddingStorageService;
  let rollbackService: RollbackRecoveryService;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      projectId: 'test-project',
      maxRetries: 3,
      retryDelay: 500,
      requestsPerMinute: 120
    };

    embeddingService = new EmbeddingService(config);
    batchProcessor = new BatchProcessor(config, {
      maxConcurrentJobs: 2,
      maxBatchSize: 10,
      maxBatchSizeBytes: 8 * 1024,
      priorityWeights: { high: 3, normal: 2, low: 1 },
      healthCheckInterval: 10000,
      metricsRetentionDays: 1
    });
    validator = new EmbeddingValidatorService();
    storageService = new EmbeddingStorageService(config);
    rollbackService = new RollbackRecoveryService(config);
  });

  afterEach(async () => {
    await batchProcessor.shutdown();
    storageService.shutdown();
    rollbackService.cleanup();
    vi.clearAllMocks();
  });

  describe('Full Pipeline Integration', () => {
    it('should process document chunks end-to-end', async () => {
      const documentId = 'integration_test_doc';
      const episodeId = 'test_episode_123';
      
      // Step 1: Create sample chunks
      const chunks = Array.from({ length: 15 }, (_, i) => ({
        text: `This is test chunk number ${i + 1}. It contains sample content for embedding generation.`,
        chunkId: `chunk_${documentId}_${i + 1}`,
        metadata: { documentId, sequence: i + 1 }
      }));

      // Step 2: Submit for batch processing
      const jobId = await batchProcessor.submitJob(documentId, chunks, 'normal');
      expect(jobId).toBeDefined();

      // Step 3: Wait for initial processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const job = batchProcessor.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.documentId).toBe(documentId);
      expect(job?.chunks.length).toBe(15);

      // Step 4: Generate embeddings using service directly (simulating batch processor)
      const batchRequest = {
        requests: chunks,
        batchId: `batch_${jobId}`,
        priority: 'normal' as const
      };

      const embeddingResults = await embeddingService.generateBatchEmbeddings(batchRequest);
      expect(embeddingResults.success).toBe(true);
      expect(embeddingResults.results.length).toBe(15);
      expect(embeddingResults.successCount).toBe(15);

      // Step 5: Validate embeddings
      const validationResults = validator.validateBatch(embeddingResults.results);
      expect(validationResults.results.length).toBe(15);
      expect(validationResults.batchMetrics.totalEmbeddings).toBe(15);
      
      const validEmbeddings = validationResults.results.filter(r => r.isValid);
      expect(validEmbeddings.length).toBeGreaterThan(10); // Most should be valid

      // Step 6: Store embeddings
      const storageResults = await storageService.storeEmbeddings(
        embeddingResults.results,
        episodeId
      );
      expect(storageResults.length).toBe(15);
      
      const successfulStorage = storageResults.filter(r => r.success);
      expect(successfulStorage.length).toBeGreaterThan(10);

      // Step 7: Verify cache functionality
      const cacheStats = storageService.getCacheStats();
      expect(cacheStats.totalEntries).toBeGreaterThan(0);

      console.log('Integration test completed successfully');
    });

    it('should handle processing failures with rollback', async () => {
      const documentId = 'failure_test_doc';
      const episodeId = 'failure_episode_123';
      
      // Create chunks including some problematic ones
      const chunks = [
        { text: 'Valid chunk 1', chunkId: 'valid_1' },
        { text: '', chunkId: 'invalid_empty' }, // Invalid - empty
        { text: 'Valid chunk 2', chunkId: 'valid_2' },
        { text: '   ', chunkId: 'invalid_whitespace' }, // Invalid - whitespace only
        { text: 'Valid chunk 3', chunkId: 'valid_3' }
      ];

      // Process embeddings
      const batchRequest = {
        requests: chunks,
        batchId: 'failure_batch',
        priority: 'normal' as const
      };

      const embeddingResults = await embeddingService.generateBatchEmbeddings(batchRequest);
      expect(embeddingResults.successCount).toBe(3); // Only valid chunks
      expect(embeddingResults.failedCount).toBe(2); // Invalid chunks

      // Validate results
      const validationResults = validator.validateBatch(embeddingResults.results);
      const failedValidations = validationResults.results.filter(r => !r.isValid);

      // Create checkpoint before storage
      const checkpoint = rollbackService.createCheckpoint(
        documentId,
        episodeId,
        3, // processed
        5, // total
        ['valid_1', 'valid_2', 'valid_3'], // successful chunks
        {
          phase: 'zep_storage',
          completedOperations: ['embedding_generation'],
          failedOperations: ['invalid_empty', 'invalid_whitespace']
        }
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.processedChunks).toBe(3);
      expect(checkpoint.totalChunks).toBe(5);

      // Simulate a failure requiring rollback
      const rollbackResult = await rollbackService.rollbackToCheckpoint(checkpoint.id);
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.operationsRolledBack).toBeGreaterThan(0);

      console.log('Failure handling and rollback test completed');
    });

    it('should handle recovery from checkpoint', async () => {
      const documentId = 'recovery_test_doc';
      const episodeId = 'recovery_episode_123';
      
      // Create checkpoint simulating partial processing
      const checkpoint = rollbackService.createCheckpoint(
        documentId,
        episodeId,
        50, // processed
        100, // total
        Array.from({ length: 50 }, (_, i) => `chunk_${i + 1}`),
        {
          phase: 'embedding_generation',
          completedOperations: ['batch_1', 'batch_2'],
          failedOperations: []
        },
        { batchSize: 25 }
      );

      // Test recovery
      const recoveryResult = await rollbackService.resumeFromCheckpoint(checkpoint.id);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.operationsResumed).toBe(50); // Remaining chunks

      console.log('Recovery from checkpoint test completed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large document processing efficiently', async () => {
      const documentId = 'large_doc_test';
      const chunkCount = 200;
      
      // Create large number of chunks
      const chunks = Array.from({ length: chunkCount }, (_, i) => ({
        text: `Large document chunk ${i + 1} with substantial content to test processing performance and scalability of the embedding pipeline.`,
        chunkId: `large_chunk_${i + 1}`,
        metadata: { documentId, section: Math.floor(i / 50) + 1 }
      }));

      const startTime = Date.now();
      
      // Submit for batch processing
      const jobId = await batchProcessor.submitJob(documentId, chunks, 'normal');
      expect(jobId).toBeDefined();

      // Check queue status
      const queueStatus = batchProcessor.getQueueStatus();
      expect(queueStatus.queueLength).toBeGreaterThan(0);

      // Get processing statistics
      const stats = batchProcessor.getStats();
      expect(stats.totalJobs).toBeGreaterThan(0);

      const processingTime = Date.now() - startTime;
      console.log(`Large document processing setup completed in ${processingTime}ms`);

      // Verify job was created properly
      const job = batchProcessor.getJobStatus(jobId);
      expect(job?.chunks.length).toBe(chunkCount);
      expect(job?.progress.total).toBe(chunkCount);
    }, 10000); // 10 second timeout for large test

    it('should maintain performance under concurrent load', async () => {
      const concurrentJobs = 5;
      const chunksPerJob = 20;
      
      const promises = Array.from({ length: concurrentJobs }, async (_, jobIndex) => {
        const documentId = `concurrent_doc_${jobIndex}`;
        const chunks = Array.from({ length: chunksPerJob }, (_, chunkIndex) => ({
          text: `Concurrent job ${jobIndex} chunk ${chunkIndex}`,
          chunkId: `concurrent_${jobIndex}_${chunkIndex}`,
          metadata: { jobIndex, chunkIndex }
        }));

        return batchProcessor.submitJob(documentId, chunks, 'normal');
      });

      const jobIds = await Promise.all(promises);
      expect(jobIds).toHaveLength(concurrentJobs);
      
      // Verify all jobs were created
      for (const jobId of jobIds) {
        const job = batchProcessor.getJobStatus(jobId);
        expect(job).toBeDefined();
        expect(job?.chunks.length).toBe(chunksPerJob);
      }

      // Check overall system state
      const queueStatus = batchProcessor.getQueueStatus();
      expect(queueStatus.queueLength).toBe(concurrentJobs);
      
      console.log(`Concurrent load test completed with ${concurrentJobs} jobs`);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle mixed content types gracefully', async () => {
      const mixedChunks = [
        { text: 'Normal text content', chunkId: 'normal_1' },
        { text: '123456789', chunkId: 'numeric' },
        { text: '!@#$%^&*()', chunkId: 'special_chars' },
        { text: 'Text with\nnewlines\tand\ttabs', chunkId: 'formatted' },
        { text: 'Very'.repeat(1000), chunkId: 'very_long' }, // Very long text
        { text: 'Ü', chunkId: 'unicode' }, // Unicode
        { text: '', chunkId: 'empty' } // Empty (should fail)
      ];

      const batchRequest = {
        requests: mixedChunks,
        batchId: 'mixed_content_batch',
        priority: 'normal' as const
      };

      const results = await embeddingService.generateBatchEmbeddings(batchRequest);
      
      // Should handle most content types
      expect(results.successCount).toBeGreaterThan(4);
      expect(results.failedCount).toBeGreaterThan(0); // Empty text should fail
      
      // Validate the results
      const validation = validator.validateBatch(results.results);
      expect(validation.results.length).toBe(mixedChunks.length);
      
      console.log(`Mixed content test: ${results.successCount} successful, ${results.failedCount} failed`);
    });

    it('should handle service unavailability gracefully', async () => {
      // Mock service failure
      const originalMethod = (embeddingService as any).callZepEmbeddingAPI;
      (embeddingService as any).callZepEmbeddingAPI = vi.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const chunks = [{ text: 'Test chunk', chunkId: 'test_unavailable' }];
      
      const result = await embeddingService.generateEmbedding(chunks[0]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');

      // Restore original method
      (embeddingService as any).callZepEmbeddingAPI = originalMethod;
    });

    it('should handle memory pressure scenarios', async () => {
      // Create many large embeddings to test memory handling
      const largeEmbeddings = Array.from({ length: 1000 }, (_, i) => ({
        chunkId: `memory_test_${i}`,
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      }));

      // Store in cache to test memory management
      const storageResults = await storageService.storeEmbeddings(
        largeEmbeddings,
        'memory_test_episode'
      );

      expect(storageResults.length).toBe(1000);

      // Check cache stats - should handle large volume
      const cacheStats = storageService.getCacheStats();
      expect(cacheStats.totalEntries).toBeGreaterThan(0);
      expect(cacheStats.memoryUsage).toBeGreaterThan(0);

      console.log(`Memory test: ${cacheStats.totalEntries} entries, ${cacheStats.memoryUsage} bytes`);
    });
  });

  describe('Quality and Validation', () => {
    it('should maintain consistent quality across batches', async () => {
      const validator = new EmbeddingValidatorService();
      
      // Process multiple batches
      for (let batch = 0; batch < 5; batch++) {
        const chunks = Array.from({ length: 10 }, (_, i) => ({
          text: `Quality test batch ${batch} chunk ${i}`,
          chunkId: `quality_${batch}_${i}`,
          metadata: { batch }
        }));

        const batchRequest = {
          requests: chunks,
          batchId: `quality_batch_${batch}`,
          priority: 'normal' as const
        };

        const results = await embeddingService.generateBatchEmbeddings(batchRequest);
        const validation = validator.validateBatch(results.results);

        expect(validation.batchMetrics.totalEmbeddings).toBe(10);
        expect(validation.batchMetrics.averageQualityScore).toBeGreaterThan(0.5);
        expect(validation.batchMetrics.dimensionConsistency).toBe(true);
      }

      // Check overall quality trends
      const overallMetrics = validator.getOverallQualityMetrics();
      expect(overallMetrics.totalEmbeddings).toBe(50);
      expect(overallMetrics.averageQualityScore).toBeGreaterThan(0.5);
      
      const qualityTrend = validator.getQualityTrend(5);
      expect(qualityTrend.batches.length).toBe(5);
      expect(qualityTrend.trend).toMatch(/^(improving|declining|stable)$/);

      console.log(`Quality consistency test: ${overallMetrics.averageQualityScore} average quality, ${qualityTrend.trend} trend`);
    });

    it('should detect and handle quality degradation', async () => {
      const validator = new EmbeddingValidatorService();
      
      // Add some known good embeddings for comparison
      const goodEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      validator.addKnownEmbedding('reference_embedding', goodEmbedding);

      // Create embeddings with intentional quality issues
      const problematicEmbeddings = [
        {
          chunkId: 'zero_vector',
          embedding: Array.from({ length: 1536 }, () => 0),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        },
        {
          chunkId: 'wrong_dimensions',
          embedding: Array.from({ length: 768 }, () => Math.random()),
          dimensions: 768,
          model: 'text-embedding-3-small',
          success: true
        },
        {
          chunkId: 'extreme_values',
          embedding: Array.from({ length: 1536 }, () => Math.random() * 1000),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        }
      ];

      const validation = validator.validateBatch(problematicEmbeddings);
      
      expect(validation.batchMetrics.validEmbeddings).toBe(0); // All should be invalid
      expect(validation.anomalousEmbeddings.length).toBe(3);
      
      // Check that issues were properly identified
      const issues = validation.results.flatMap(r => r.issues);
      expect(issues.some(i => i.type === 'zero_vector')).toBe(true);
      expect(issues.some(i => i.type === 'dimension_mismatch')).toBe(true);
      expect(issues.some(i => i.type === 'abnormal_norm')).toBe(true);

      console.log(`Quality degradation test: identified ${validation.anomalousEmbeddings.length} anomalous embeddings`);
    });
  });
});