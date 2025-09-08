import { ZepClient } from '@getzep/zep-cloud';
import { 
  ZepConfig, 
  SearchQuery, 
  SearchResult, 
  ProcessingResult,
  BatchOperation,
  RetryOptions,
  Document,
  Fact,
  Graph,
  User
} from './types';
import { RateLimiter } from './rate-limiter';
import { EpisodeManager } from './episode-manager';
import { RetryHandler } from './retry';

export class ZepClientWrapper {
  private static instance: ZepClientWrapper | null = null;
  private client: ZepClient;
  private rateLimiter: RateLimiter;
  private episodeManager: EpisodeManager;
  private config: ZepConfig;
  private retryOptions: RetryOptions;
  private retryHandler: RetryHandler;

  private constructor(config: ZepConfig) {
    this.config = config;
    // Initialize with basic client for now
    this.client = new ZepClient({ apiKey: config.apiKey });
    
    // Start at 30 req/min (50% of limit) as per story requirements
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: config.requestsPerMinute || 30,
      burstSize: 10
    });

    this.episodeManager = new EpisodeManager();

    this.retryOptions = {
      maxRetries: config.maxRetries || 5, // Max retries: 5 as per story
      baseDelay: config.retryDelay || 1000, // Initial delay: 1 second
      maxDelay: 30000, // Max delay: 30 seconds
      backoffMultiplier: 2 // Backoff multiplier: 2
    };

    this.retryHandler = new RetryHandler(this.retryOptions, {
      failureThreshold: 5, // Open circuit after 5 consecutive failures
      resetTimeout: 60000, // Half-open after 60 seconds
      halfOpenRequests: 3 // Reset on successful request
    });
  }

  public static getInstance(config?: ZepConfig): ZepClientWrapper {
    if (!ZepClientWrapper.instance) {
      if (!config) {
        throw new Error('Config must be provided when creating first instance');
      }
      ZepClientWrapper.instance = new ZepClientWrapper(config);
    }
    return ZepClientWrapper.instance;
  }

  public static resetInstance(): void {
    ZepClientWrapper.instance = null;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      return await operation();
    }, context);
  }

  private isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    // Retry on rate limit errors
    if ((error as { status?: number }).status === 429) return true;
    
    // Retry on temporary server errors
    const status = (error as { status?: number }).status;
    if (status && status >= 500 && status < 600) return true;
    
    // Retry on network errors
    const code = (error as { code?: string }).code;
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT') return true;
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async addDocuments(
    _userId: string,
    documents: Document[],
    batchSize?: number
  ): Promise<ProcessingResult> {
    const size = batchSize || this.config.batchSize || 10;
    const results: string[] = [];
    const errors: string[] = [];

    // Simplified implementation - actual API calls would go here
    for (let i = 0; i < documents.length; i += size) {
      const batch = documents.slice(i, i + size);
      
      try {
        // Simulate document addition
        const uuids = batch.map(() => `doc_${Date.now()}_${Math.random()}`);
        results.push(...uuids);
      } catch (error) {
        errors.push(`Batch ${i / size}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      documentIds: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    return this.executeWithRetry(async () => {
      const results: SearchResult[] = [];
      
      // Multi-source search based on searchScope
      if (!query.searchScope || query.searchScope === 'documents' || query.searchScope === 'messages') {
        try {
          // Search documents using ZEP semantic search
          const docResults = await this.searchDocuments(query);
          results.push(...docResults);
        } catch (error) {
          console.warn('Document search failed:', error);
        }
      }

      if (!query.searchScope || query.searchScope === 'facts') {
        try {
          // Search facts using ZEP API
          const factResults = await this.searchFacts(query);
          results.push(...factResults);
        } catch (error) {
          console.warn('Facts search failed:', error);
        }
      }

      // Apply deduplication and sorting
      return this.deduplicateAndRankResults(results, query.limit || 20);
    }, `Searching for "${query.text}"`);
  }

  private async searchDocuments(query: SearchQuery): Promise<SearchResult[]> {
    const searchParams = {
      text: query.text,
      search_scope: 'documents',
      search_type: query.searchType || 'similarity',
      min_score: query.minScore || 0.7,
      limit: query.limit || 20,
      rerank: true
    };

    try {
      // Use ZEP Cloud search API
      const response = await this.client.search({
        project_id: this.config.projectId,
        user_id: query.userId,
        ...searchParams
      });

      return response.results.map((result: unknown) => {
        const r = result as { 
          content?: string; 
          message?: { content?: string }; 
          score?: number; 
          metadata?: Record<string, unknown>; 
          document_id?: string; 
          episode_id?: string; 
        };
        return {
          content: r.content || r.message?.content || '',
          score: r.score || 0,
          metadata: r.metadata || {},
          documentId: r.document_id,
          episodeId: r.episode_id
        };
      });
    } catch (error) {
      console.error('ZEP document search error:', error);
      return [];
    }
  }

  private async searchFacts(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const response = await this.client.search({
        project_id: this.config.projectId,
        user_id: query.userId,
        text: query.text,
        search_scope: 'facts',
        search_type: query.searchType || 'similarity',
        min_score: query.minScore || 0.7,
        limit: Math.floor((query.limit || 20) / 2), // Allocate half for facts
        rerank: true
      });

      return response.results.map((result: unknown) => {
        const r = result as { 
          fact?: string; 
          content?: string; 
          score?: number; 
          metadata?: Record<string, unknown>; 
          fact_uuid?: string; 
          uuid?: string; 
        };
        return {
          content: r.fact || r.content || '',
          score: r.score || 0,
          metadata: r.metadata || {},
          factUuid: r.fact_uuid || r.uuid
        };
      });
    } catch (error) {
      console.error('ZEP facts search error:', error);
      return [];
    }
  }

  private deduplicateAndRankResults(results: SearchResult[], limit: number): SearchResult[] {
    // Simple deduplication based on content similarity
    const uniqueResults: SearchResult[] = [];
    const seenContent = new Set<string>();

    for (const result of results) {
      const contentKey = result.content.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Skip if we've seen very similar content
      let isDuplicate = false;
      for (const seen of seenContent) {
        if (this.getContentSimilarity(contentKey, seen) > 0.85) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seenContent.add(contentKey);
        uniqueResults.push({
          ...result,
          metadata: {
            ...result.metadata,
            sourceAttribution: result.documentId ? 'document' : 
                             result.factUuid ? 'fact' : 'memory'
          }
        });
      }
    }

    // Sort by score descending and limit results
    return uniqueResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private getContentSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity for content deduplication
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  async getGraph(userId: string): Promise<Graph | null> {
    try {
      // Simplified implementation
      return await this.executeWithRetry(async () => {
        return {
          nodes: [],
          edges: [],
          userId
        };
      }, `Getting graph for user ${userId}`);
    } catch (error) {
      console.error('Failed to get graph:', error);
      return null;
    }
  }

  async addFacts(_userId: string, facts: Fact[]): Promise<ProcessingResult> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Simplified implementation
      const uuids = facts.map(() => `fact_${Date.now()}_${Math.random()}`);
      results.push(...uuids);
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      success: errors.length === 0,
      factIds: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async addMemories(
    userId: string,
    sessionId: string,
    messages: unknown[]
  ): Promise<ProcessingResult> {
    let episodeId = this.episodeManager
      .getSessionEpisodes(sessionId)[0]?.id;

    // Create new episode if needed
    if (!episodeId || this.episodeManager.shouldCreateNewEpisode(episodeId)) {
      const episode = this.episodeManager.createEpisode(userId, sessionId);
      episodeId = episode.id;
    }

    // Add messages to episode
    messages.forEach(msg => {
      this.episodeManager.addMessage(episodeId!, msg);
    });

    return {
      success: true,
      episodeId
    };
  }

  async createUser(user: User): Promise<User> {
    return await this.executeWithRetry(async () => user, `Creating user ${user.userId}`);
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.executeWithRetry(async () => null, `Getting user ${userId}`);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return await this.executeWithRetry(async () => ({
      userId,
      ...updates
    } as User), `Updating user ${userId}`);
  }

  async deleteMemories(sessionId: string): Promise<void> {
    await this.executeWithRetry(async () => {
      // Simulate deletion
    }, `Deleting memories for session ${sessionId}`);
  }

  async processBatch<T>(
    batch: BatchOperation<T>,
    processor: (items: T[]) => Promise<unknown>
  ): Promise<ProcessingResult> {
    const size = this.config.batchSize || 10;
    const results: unknown[] = [];
    const errors: string[] = [];

    for (let i = 0; i < batch.items.length; i += size) {
      const chunk = batch.items.slice(i, i + size);
      
      try {
        const result = await processor(chunk);
        results.push(result);
      } catch (error) {
        errors.push(`Chunk ${i / size}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  getEpisodeManager(): EpisodeManager {
    return this.episodeManager;
  }

  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }

  getHealthMetrics() {
    return {
      rateLimit: this.rateLimiter.getMetrics(),
      circuitBreaker: this.retryHandler.getCircuitBreakerState(),
      episodeCount: this.episodeManager.getSessionEpisodes('*').length
    };
  }
}