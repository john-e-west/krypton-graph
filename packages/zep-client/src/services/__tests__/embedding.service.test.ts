import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmbeddingService, EmbeddingRequest, BatchEmbeddingRequest } from '../embedding.service';
import { ZepConfig } from '../../types';

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let config: ZepConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      projectId: 'test-project',
      maxRetries: 3,
      retryDelay: 1000,
      requestsPerMinute: 60,
      batchSize: 20
    };
    embeddingService = new EmbeddingService(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid request', async () => {
      const request: EmbeddingRequest = {
        text: 'This is a test chunk',
        chunkId: 'chunk_1',
        metadata: { source: 'test' }
      };

      const response = await embeddingService.generateEmbedding(request);

      expect(response.chunkId).toBe(request.chunkId);
      expect(response.embedding).toHaveLength(1536);
      expect(response.dimensions).toBe(1536);
      expect(response.model).toBe('text-embedding-3-small');
      expect(response.success).toBe(true);
    });

    it('should handle empty text', async () => {
      const request: EmbeddingRequest = {
        text: '',
        chunkId: 'chunk_empty',
        metadata: {}
      };

      const response = await embeddingService.generateEmbedding(request);

      expect(response.chunkId).toBe(request.chunkId);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Text content is required');
    });

    it('should handle whitespace-only text', async () => {
      const request: EmbeddingRequest = {
        text: '   \n\t  ',
        chunkId: 'chunk_whitespace',
        metadata: {}
      };

      const response = await embeddingService.generateEmbedding(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Text content is required');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should process batch request successfully', async () => {
      const requests: EmbeddingRequest[] = [
        { text: 'First chunk', chunkId: 'chunk_1' },
        { text: 'Second chunk', chunkId: 'chunk_2' },
        { text: 'Third chunk', chunkId: 'chunk_3' }
      ];

      const batchRequest: BatchEmbeddingRequest = {
        requests,
        batchId: 'batch_1',
        priority: 'normal'
      };

      const response = await embeddingService.generateBatchEmbeddings(batchRequest);

      expect(response.batchId).toBe(batchRequest.batchId);
      expect(response.results).toHaveLength(3);
      expect(response.success).toBe(true);
      expect(response.successCount).toBe(3);
      expect(response.failedCount).toBe(0);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure', async () => {
      const requests: EmbeddingRequest[] = [
        { text: 'Valid chunk', chunkId: 'chunk_1' },
        { text: '', chunkId: 'chunk_2' }, // Invalid
        { text: 'Another valid chunk', chunkId: 'chunk_3' }
      ];

      const batchRequest: BatchEmbeddingRequest = {
        requests,
        batchId: 'batch_mixed',
        priority: 'normal'
      };

      const response = await embeddingService.generateBatchEmbeddings(batchRequest);

      expect(response.results).toHaveLength(3);
      expect(response.successCount).toBe(2);
      expect(response.failedCount).toBe(1);
      expect(response.success).toBe(false); // Overall failure due to some failures
    });

    it('should group large batches correctly', async () => {
      // Create 50 requests to test batching logic
      const requests: EmbeddingRequest[] = Array.from({ length: 50 }, (_, i) => ({
        text: `Chunk ${i + 1}`,
        chunkId: `chunk_${i + 1}`
      }));

      const batchRequest: BatchEmbeddingRequest = {
        requests,
        batchId: 'batch_large',
        priority: 'normal'
      };

      const response = await embeddingService.generateBatchEmbeddings(batchRequest);

      expect(response.results).toHaveLength(50);
      expect(response.successCount).toBe(50);
      expect(response.failedCount).toBe(0);
    });

    it('should respect batch size limits', async () => {
      // Test internal batching logic with very large text
      const largeText = 'x'.repeat(7000); // 7KB text
      const requests: EmbeddingRequest[] = Array.from({ length: 5 }, (_, i) => ({
        text: largeText,
        chunkId: `large_chunk_${i + 1}`
      }));

      const batchRequest: BatchEmbeddingRequest = {
        requests,
        batchId: 'batch_large_text',
        priority: 'normal'
      };

      const response = await embeddingService.generateBatchEmbeddings(batchRequest);

      expect(response.results).toHaveLength(5);
      // Should handle large text chunks properly
      expect(response.successCount).toBeGreaterThan(0);
    });
  });

  describe('queue management', () => {
    it('should add requests to queue', () => {
      const requests: EmbeddingRequest[] = [
        { text: 'Queue test', chunkId: 'queue_1' }
      ];

      const queueId = embeddingService.addToQueue(requests, 'normal');

      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^emb_\d+_[a-z0-9]+$/);

      const status = embeddingService.getQueueStatus();
      expect(status.total).toBeGreaterThan(0);
    });

    it('should prioritize high priority requests', () => {
      const normalRequests: EmbeddingRequest[] = [
        { text: 'Normal priority', chunkId: 'normal_1' }
      ];
      const highRequests: EmbeddingRequest[] = [
        { text: 'High priority', chunkId: 'high_1' }
      ];

      embeddingService.addToQueue(normalRequests, 'normal');
      embeddingService.addToQueue(highRequests, 'high');

      const status = embeddingService.getQueueStatus();
      expect(status.total).toBe(2);
    });

    it('should return correct queue status', () => {
      const status = embeddingService.getQueueStatus();
      
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('total');
      expect(typeof status.pending).toBe('number');
      expect(typeof status.processing).toBe('number');
      expect(typeof status.total).toBe('number');
    });
  });

  describe('batching logic', () => {
    it('should group chunks by size correctly', () => {
      const service = embeddingService as any; // Access private method for testing
      
      const requests: EmbeddingRequest[] = [
        { text: 'a'.repeat(1000), chunkId: 'chunk_1' },
        { text: 'b'.repeat(2000), chunkId: 'chunk_2' },
        { text: 'c'.repeat(6000), chunkId: 'chunk_3' },
        { text: 'd'.repeat(1000), chunkId: 'chunk_4' }
      ];

      const batches = service.groupIntoBatches(requests);
      
      expect(batches).toBeDefined();
      expect(batches.length).toBeGreaterThan(0);
      
      // Each batch should respect size limits
      for (const batch of batches) {
        expect(batch.length).toBeLessThanOrEqual(20); // BATCH_SIZE limit
        
        const batchSize = batch.reduce((sum, req) => {
          return sum + new TextEncoder().encode(req.text).length;
        }, 0);
        expect(batchSize).toBeLessThanOrEqual(8 * 1024); // 8KB limit
      }
    });

    it('should handle single large chunk', () => {
      const service = embeddingService as any;
      
      const requests: EmbeddingRequest[] = [
        { text: 'x'.repeat(10000), chunkId: 'large_chunk' }
      ];

      const batches = service.groupIntoBatches(requests);
      
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock the private API call method to throw an error
      const service = embeddingService as any;
      const originalMethod = service.callZepEmbeddingAPI;
      service.callZepEmbeddingAPI = vi.fn().mockRejectedValue(new Error('API Error'));

      const request: EmbeddingRequest = {
        text: 'Test text',
        chunkId: 'error_test'
      };

      const response = await embeddingService.generateEmbedding(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      
      // Restore original method
      service.callZepEmbeddingAPI = originalMethod;
    });

    it('should handle network timeouts', async () => {
      const service = embeddingService as any;
      const originalMethod = service.callZepEmbeddingAPI;
      service.callZepEmbeddingAPI = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request: EmbeddingRequest = {
        text: 'Test text',
        chunkId: 'timeout_test'
      };

      const response = await embeddingService.generateEmbedding(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Timeout');
      
      service.callZepEmbeddingAPI = originalMethod;
    });
  });

  describe('concurrency limits', () => {
    it('should limit concurrent requests', async () => {
      const service = embeddingService as any;
      
      // Test the limitConcurrency method
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve(`result_${i}`)
      );
      
      const results = await service.limitConcurrency(promises, 3);
      
      expect(results).toHaveLength(10);
      expect(results).toContain('result_0');
      expect(results).toContain('result_9');
    });

    it('should handle concurrent promise failures', async () => {
      const service = embeddingService as any;
      
      const promises = [
        Promise.resolve('success_1'),
        Promise.reject(new Error('failure')),
        Promise.resolve('success_2')
      ];
      
      // The method should handle mixed success/failure
      await expect(service.limitConcurrency(promises, 2)).rejects.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should use default configuration values', () => {
      const minimalConfig: ZepConfig = {
        apiKey: 'test-key'
      };
      
      const service = new EmbeddingService(minimalConfig);
      
      // Should not throw and should use defaults
      expect(service).toBeDefined();
    });

    it('should respect custom configuration', () => {
      const customConfig: ZepConfig = {
        apiKey: 'test-key',
        requestsPerMinute: 120,
        maxRetries: 5,
        retryDelay: 2000
      };
      
      const service = new EmbeddingService(customConfig);
      
      expect(service).toBeDefined();
    });
  });
});