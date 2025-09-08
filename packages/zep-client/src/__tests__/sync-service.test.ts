import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService, ChunkData } from '../services/sync.service';
import { RateLimiter } from '../rate-limiter';
import { RetryManager } from '../retry';
import { EpisodeService } from '../services/episode.service';
import { UserService } from '../services/user.service';
import { ChunkRepository } from '../repositories/chunk.repository';

// Mock dependencies
vi.mock('../rate-limiter');
vi.mock('../retry');
vi.mock('../services/episode.service');
vi.mock('../services/user.service');
vi.mock('../repositories/chunk.repository');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockRateLimiter: vi.Mocked<RateLimiter>;
  let mockRetryManager: vi.Mocked<RetryManager>;
  let mockEpisodeService: vi.Mocked<EpisodeService>;
  let mockUserService: vi.Mocked<UserService>;
  let mockChunkRepository: vi.Mocked<ChunkRepository>;

  const mockChunks: ChunkData[] = [
    {
      id: 'chunk1',
      content: 'This is the first chunk content',
      chunkIndex: 0,
      documentId: 'doc1',
      wordCount: 6,
      characterCount: 32
    },
    {
      id: 'chunk2',
      content: 'This is the second chunk content',
      chunkIndex: 1,
      documentId: 'doc1',
      wordCount: 6,
      characterCount: 33
    }
  ];

  const mockEpisode = {
    id: 'episode1',
    userId: 'user1',
    sessionId: 'session1',
    messages: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock instances
    mockRateLimiter = {
      waitForToken: vi.fn().mockResolvedValue(undefined),
      getCurrentUsage: vi.fn().mockReturnValue({ current: 10, limit: 30 }),
      reset: vi.fn()
    } as any;

    mockRetryManager = {
      executeWithRetry: vi.fn(),
      shouldRetry: vi.fn().mockReturnValue(true),
      getNextDelay: vi.fn().mockReturnValue(1000)
    } as any;

    mockEpisodeService = {
      createEpisode: vi.fn().mockResolvedValue(mockEpisode),
      updateEpisodeStatus: vi.fn().mockResolvedValue(undefined),
      linkChunksToEpisode: vi.fn().mockResolvedValue(undefined),
      listEpisodesByUser: vi.fn().mockResolvedValue([]),
      deleteEpisode: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockUserService = {
      getOrCreateUser: vi.fn().mockResolvedValue({ userId: 'user1' }),
      getUserMapping: vi.fn().mockResolvedValue({ zepUserId: 'zep_user1' })
    } as any;

    mockChunkRepository = {
      fetchUnsyncedChunks: vi.fn().mockResolvedValue(mockChunks),
      fetchFailedChunks: vi.fn().mockResolvedValue([]),
      updateChunk: vi.fn().mockResolvedValue(undefined),
      getSyncStatistics: vi.fn().mockResolvedValue({
        totalChunks: 2,
        syncedChunks: 0,
        failedChunks: 0,
        pendingChunks: 2,
        syncingChunks: 0
      })
    } as any;

    // Create service instance
    syncService = new SyncService(
      mockRateLimiter,
      mockRetryManager,
      mockEpisodeService,
      mockUserService
    );

    // Mock the chunk repository (private property)
    (syncService as any).chunkRepository = mockChunkRepository;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncDocumentChunks', () => {
    it('should successfully sync document chunks', async () => {
      const result = await syncService.syncDocumentChunks('doc1', 'user1');

      expect(result.batchId).toBeDefined();
      expect(result.totalChunks).toBe(2);
      expect(result.successfulChunks).toBe(2);
      expect(result.failedChunks).toBe(0);
      expect(result.episodeId).toBe('episode1');
      expect(result.errors).toHaveLength(0);

      // Verify repository calls
      expect(mockChunkRepository.fetchUnsyncedChunks).toHaveBeenCalledWith('doc1');
      expect(mockEpisodeService.createEpisode).toHaveBeenCalledWith('user1', expect.any(String), 'doc1');
      expect(mockEpisodeService.updateEpisodeStatus).toHaveBeenCalledWith('episode1', 'completed');
      
      // Verify chunks were updated
      expect(mockChunkRepository.updateChunk).toHaveBeenCalledTimes(4); // 2 chunks × 2 updates each (syncing + synced)
    });

    it('should handle empty chunk list', async () => {
      mockChunkRepository.fetchUnsyncedChunks.mockResolvedValue([]);

      const result = await syncService.syncDocumentChunks('doc1', 'user1');

      expect(result.totalChunks).toBe(0);
      expect(result.successfulChunks).toBe(0);
      expect(result.failedChunks).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockEpisodeService.createEpisode).not.toHaveBeenCalled();
    });

    it('should handle concurrent sync prevention', async () => {
      // Start first sync
      const firstSync = syncService.syncDocumentChunks('doc1', 'user1');
      
      // Try to start second sync for same document
      await expect(syncService.syncDocumentChunks('doc1', 'user1')).rejects.toThrow(
        'Document doc1 is already being synced'
      );

      // Wait for first sync to complete
      await firstSync;
    });

    it('should handle rate limiting', async () => {
      let rateLimitCallCount = 0;
      mockRateLimiter.waitForToken.mockImplementation(async () => {
        rateLimitCallCount++;
        if (rateLimitCallCount <= 2) {
          // Simulate rate limit delay
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const result = await syncService.syncDocumentChunks('doc1', 'user1');

      expect(result.successfulChunks).toBe(2);
      expect(mockRateLimiter.waitForToken).toHaveBeenCalledTimes(2); // Once per chunk
    });
  });

  describe('retryFailedChunks', () => {
    it('should retry failed chunks successfully', async () => {
      const failedChunks = [
        {
          ...mockChunks[0],
          syncStatus: 'failed' as const,
          syncAttemptCount: 1
        }
      ];

      mockChunkRepository.fetchFailedChunks.mockResolvedValue(failedChunks);

      const result = await syncService.retryFailedChunks('doc1', 'user1');

      expect(result.totalChunks).toBe(1);
      expect(result.successfulChunks).toBe(1);
      expect(result.failedChunks).toBe(0);
    });

    it('should handle chunks that exceeded max retries', async () => {
      const exhaustedChunks = [
        {
          ...mockChunks[0],
          syncStatus: 'failed' as const,
          syncAttemptCount: 3
        }
      ];

      mockChunkRepository.fetchFailedChunks.mockResolvedValue(exhaustedChunks);

      const result = await syncService.retryFailedChunks('doc1', 'user1');

      expect(result.totalChunks).toBe(1);
      expect(result.successfulChunks).toBe(0);
      expect(result.failedChunks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Max retry attempts exceeded');
    });

    it('should return early when no failed chunks exist', async () => {
      mockChunkRepository.fetchFailedChunks.mockResolvedValue([]);

      const result = await syncService.retryFailedChunks('doc1', 'user1');

      expect(result.totalChunks).toBe(0);
      expect(result.successfulChunks).toBe(0);
      expect(result.failedChunks).toBe(0);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync statistics for document', async () => {
      const mockStats = {
        totalChunks: 10,
        syncedChunks: 7,
        failedChunks: 2,
        pendingChunks: 1,
        syncingChunks: 0
      };

      mockChunkRepository.getSyncStatistics.mockResolvedValue(mockStats);

      const result = await syncService.getSyncStatus('doc1');

      expect(result).toEqual(mockStats);
      expect(mockChunkRepository.getSyncStatistics).toHaveBeenCalledWith('doc1');
    });
  });

  describe('batch processing', () => {
    it('should handle large number of chunks in batches', async () => {
      // Create 50 chunks to test batch processing
      const largeChunkSet = Array.from({ length: 50 }, (_, i) => ({
        id: `chunk${i}`,
        content: `Content for chunk ${i}`,
        chunkIndex: i,
        documentId: 'doc1',
        wordCount: 5,
        characterCount: 20
      }));

      mockChunkRepository.fetchUnsyncedChunks.mockResolvedValue(largeChunkSet);

      const result = await syncService.syncDocumentChunks('doc1', 'user1');

      expect(result.totalChunks).toBe(50);
      expect(result.successfulChunks).toBe(50);
      expect(result.failedChunks).toBe(0);

      // Verify all chunks were processed
      expect(mockChunkRepository.updateChunk).toHaveBeenCalledTimes(100); // 50 chunks × 2 updates each
    });

    it('should respect concurrency limits', async () => {
      // This test verifies that no more than 5 chunks are processed concurrently
      let concurrentCount = 0;
      let maxConcurrent = 0;

      mockRateLimiter.waitForToken.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
        
        concurrentCount--;
      });

      const largeChunkSet = Array.from({ length: 15 }, (_, i) => ({
        id: `chunk${i}`,
        content: `Content for chunk ${i}`,
        chunkIndex: i,
        documentId: 'doc1',
        wordCount: 5,
        characterCount: 20
      }));

      mockChunkRepository.fetchUnsyncedChunks.mockResolvedValue(largeChunkSet);

      await syncService.syncDocumentChunks('doc1', 'user1');

      // Should not exceed max concurrency of 5
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });
  });
});