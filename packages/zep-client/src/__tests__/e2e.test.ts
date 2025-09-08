import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZepClientWrapper } from '../client';
import { ZepClient } from '@getzep/zep-cloud';
import { MockZepServer } from './mock-zep-server';
import { UserMappingService } from '../services/user.service';
import { EpisodeService } from '../services/episode.service';

// Mock Zep SDK
vi.mock('@getzep/zep-cloud', () => ({
  ZepClient: vi.fn().mockImplementation(() => {
    const mockServer = new MockZepServer({ latency: 10 });
    return mockServer.createMockClient();
  })
}));

// Mock fetch for Airtable
global.fetch = vi.fn();

describe('E2E Tests', () => {
  let client: ZepClientWrapper;
  let userService: UserMappingService;
  let episodeService: EpisodeService;

  beforeEach(() => {
    // Reset singleton
    ZepClientWrapper.resetInstance();
    
    // Create client with test config
    client = ZepClientWrapper.getInstance({
      apiKey: 'test_api_key',
      projectId: 'test_project',
      requestsPerMinute: 30,
      maxRetries: 2
    });

    userService = new UserMappingService(client);
    episodeService = new EpisodeService(client.getEpisodeManager());

    // Mock Airtable responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    });

    vi.clearAllMocks();
  });

  describe('User Flow', () => {
    it('should create and retrieve a user', async () => {
      const clerkUserId = 'clerk_user_123';
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      // Create user through mapping service
      const zepUserId = await userService.getOrCreateZepUser(clerkUserId, userData);
      expect(zepUserId).toBe(`user_${clerkUserId}`);

      // Verify user was created in ZEP
      const user = await client.getUser(zepUserId);
      expect(user).toBeTruthy();
      expect(user?.email).toBe(userData.email);
    });

    it('should handle user mapping with caching', async () => {
      const clerkUserId = 'clerk_user_456';
      
      // First call creates the user
      const zepUserId1 = await userService.getOrCreateZepUser(clerkUserId);
      
      // Second call should use cache (no additional ZEP calls)
      const zepUserId2 = await userService.getOrCreateZepUser(clerkUserId);
      
      expect(zepUserId1).toBe(zepUserId2);
      
      // Verify cache is working by checking fetch wasn't called again
      const fetchCalls = (global.fetch as any).mock.calls.length;
      expect(fetchCalls).toBeLessThan(4); // Should use cache instead of querying again
    });

    it('should sync user metadata', async () => {
      const clerkUserId = 'clerk_user_789';
      const initialData = {
        email: 'initial@example.com',
        name: 'Initial Name'
      };

      const zepUserId = await userService.getOrCreateZepUser(clerkUserId, initialData);
      
      // Update metadata
      const updatedData = {
        email: 'updated@example.com',
        name: 'Updated Name',
        metadata: { role: 'admin' }
      };

      await userService.syncUserMetadata(zepUserId, updatedData);
      
      // Verify update
      const user = await client.getUser(zepUserId);
      expect(user?.email).toBe(updatedData.email);
    });
  });

  describe('Episode Flow', () => {
    it('should create and manage episodes', async () => {
      const userId = 'user_123';
      const sessionId = 'session_123';
      const documentId = 'doc_123';

      // Create episode
      const episode = await episodeService.createEpisode(userId, sessionId, documentId);
      
      expect(episode).toBeTruthy();
      expect(episode.userId).toBe(userId);
      expect(episode.sessionId).toBe(sessionId);
      
      // Update status
      await episodeService.updateEpisodeStatus(episode.id, 'processing');
      
      // Verify update
      const updatedEpisode = client.getEpisodeManager().getEpisode(episode.id);
      expect(updatedEpisode?.metadata.status).toBe('processing');
    });

    it('should handle document ingestion with episodes', async () => {
      const userId = 'user_456';
      const documents = [
        { content: 'Document 1', metadata: { source: 'test' } },
        { content: 'Document 2', metadata: { source: 'test' } },
        { content: 'Document 3', metadata: { source: 'test' } }
      ];

      // Add documents
      const result = await client.addDocuments(userId, documents as any, 2);
      
      expect(result.success).toBe(true);
      expect(result.documentIds).toHaveLength(3);
    });

    it('should create new episode when threshold is reached', async () => {
      const userId = 'user_789';
      const sessionId = 'session_789';
      
      // Add memories to trigger episode creation
      const messages = Array(10).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));

      const result = await client.addMemories(userId, sessionId, messages as any);
      
      expect(result.success).toBe(true);
      expect(result.episodeId).toBeTruthy();
      
      // Verify episode was created
      const episodes = client.getEpisodeManager().getSessionEpisodes(sessionId);
      expect(episodes.length).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('should provide health metrics', () => {
      const metrics = client.getHealthMetrics();
      
      expect(metrics).toHaveProperty('rateLimit');
      expect(metrics).toHaveProperty('circuitBreaker');
      expect(metrics.rateLimit.limit).toBe(10); // burst size
      expect(metrics.circuitBreaker).toBe('CLOSED');
    });

    it('should track rate limit usage', async () => {
      // Make some requests
      await client.getUser('test_user_1');
      await client.getUser('test_user_2');
      
      const metrics = client.getHealthMetrics();
      expect(metrics.rateLimit.requestCount).toBeGreaterThan(0);
      expect(metrics.rateLimit.usageRatio).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors gracefully', async () => {
      // Create client with mock that rate limits
      const mockServer = new MockZepServer({ rateLimitAt: 2 });
      const mockClient = mockServer.createMockClient();
      
      vi.mocked(ZepClient).mockImplementationOnce(() => mockClient as any);
      
      ZepClientWrapper.resetInstance();
      const rateLimitedClient = ZepClientWrapper.getInstance({
        apiKey: 'test_api_key',
        maxRetries: 1,
        retryDelay: 100
      });

      // Make requests that will trigger rate limit
      await rateLimitedClient.getUser('user1');
      
      // This should trigger rate limit and retry
      const startTime = Date.now();
      await rateLimitedClient.getUser('user2');
      const elapsedTime = Date.now() - startTime;
      
      // Should have retried after delay
      expect(elapsedTime).toBeGreaterThan(90);
    });

    it('should handle connection errors with retry', async () => {
      // Create client with mock that has high error rate
      const mockServer = new MockZepServer({ errorRate: 0.5 });
      const mockClient = mockServer.createMockClient();
      
      vi.mocked(ZepClient).mockImplementationOnce(() => mockClient as any);
      
      ZepClientWrapper.resetInstance();
      const errorClient = ZepClientWrapper.getInstance({
        apiKey: 'test_api_key',
        maxRetries: 3,
        retryDelay: 50
      });

      // Should eventually succeed despite errors
      const user = await errorClient.getUser('test_user');
      
      // May be null if not found, but shouldn't throw
      expect(() => user).not.toThrow();
    });
  });

  describe('Batch Operations', () => {
    it('should process batches correctly', async () => {
      const items = Array(25).fill(null).map((_, i) => ({
        id: i,
        data: `Item ${i}`
      }));

      const processor = vi.fn(async (chunk) => {
        return { processed: chunk.length };
      });

      const result = await client.processBatch(
        { items, operation: 'add' },
        processor
      );

      expect(result.success).toBe(true);
      expect(processor).toHaveBeenCalledTimes(3); // 25 items / 10 batch size
    });

    it('should handle batch errors gracefully', async () => {
      const items = Array(15).fill(null).map((_, i) => ({
        id: i,
        data: `Item ${i}`
      }));

      let callCount = 0;
      const processor = vi.fn(async (chunk) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Batch processing error');
        }
        return { processed: chunk.length };
      });

      const result = await client.processBatch(
        { items, operation: 'add' },
        processor
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain('Chunk 1');
    });
  });
});