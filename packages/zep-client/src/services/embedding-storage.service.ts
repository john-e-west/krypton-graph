import { EmbeddingResponse, EmbeddingMetadata, ZepConfig } from '../types';
import { retryWithBackoff } from '../retry';
import { EpisodeService } from './episode.service';

export interface EmbeddingCacheItem {
  chunkId: string;
  embedding: number[];
  dimensions: number;
  model: string;
  cachedAt: Date;
  metadata?: Record<string, any>;
}

export interface EmbeddingStorageResult {
  chunkId: string;
  success: boolean;
  episodeId?: string;
  embeddingId?: string;
  cached: boolean;
  error?: string;
  processingTime: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export class EmbeddingStorageService {
  private episodeService: EpisodeService;
  private cache: Map<string, EmbeddingCacheItem> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };
  
  // Cache configuration
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly MAX_CACHE_SIZE = 10000; // Maximum number of cached embeddings
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
  
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private config: ZepConfig) {
    this.episodeService = new EpisodeService(config);
    this.startCacheCleanup();
  }

  /**
   * Store embeddings in ZEP and update cache
   */
  async storeEmbeddings(
    embeddings: EmbeddingResponse[],
    episodeId: string
  ): Promise<EmbeddingStorageResult[]> {
    const results: EmbeddingStorageResult[] = [];

    for (const embedding of embeddings) {
      const startTime = Date.now();
      
      try {
        if (!embedding.success || embedding.embedding.length === 0) {
          results.push({
            chunkId: embedding.chunkId,
            success: false,
            cached: false,
            error: embedding.error || 'Invalid embedding data',
            processingTime: Date.now() - startTime
          });
          continue;
        }

        // Check if already in cache
        const cached = this.getFromCache(embedding.chunkId);
        if (cached) {
          this.cacheStats.hits++;
          this.cacheStats.totalRequests++;
          
          results.push({
            chunkId: embedding.chunkId,
            success: true,
            episodeId,
            cached: true,
            processingTime: Date.now() - startTime
          });
          continue;
        }

        this.cacheStats.misses++;
        this.cacheStats.totalRequests++;

        // Store embedding in ZEP
        const embeddingId = await this.storeInZep(embedding, episodeId);
        
        // Cache the embedding
        this.addToCache({
          chunkId: embedding.chunkId,
          embedding: embedding.embedding,
          dimensions: embedding.dimensions,
          model: embedding.model,
          cachedAt: new Date(),
          metadata: { episodeId, embeddingId }
        });

        results.push({
          chunkId: embedding.chunkId,
          success: true,
          episodeId,
          embeddingId,
          cached: false,
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        results.push({
          chunkId: embedding.chunkId,
          success: false,
          cached: false,
          error: error instanceof Error ? error.message : 'Storage failed',
          processingTime: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Update Airtable chunk records with embedding metadata
   */
  async updateAirtableTracking(
    chunkId: string,
    metadata: {
      hasEmbedding: boolean;
      embeddingGeneratedAt: Date;
      embeddingModelVersion: string;
      embeddingQualityScore?: number;
    }
  ): Promise<boolean> {
    try {
      // This would integrate with the Airtable service
      // For now, we'll simulate the update
      console.log(`Updating Airtable for chunk ${chunkId}:`, metadata);
      
      // TODO: Implement actual Airtable update using existing Airtable service
      // await airtableService.updateChunk(chunkId, {
      //   has_embedding: metadata.hasEmbedding,
      //   embedding_generated_at: metadata.embeddingGeneratedAt,
      //   embedding_model_version: metadata.embeddingModelVersion,
      //   embedding_quality_score: metadata.embeddingQualityScore
      // });
      
      return true;
    } catch (error) {
      console.error(`Failed to update Airtable tracking for chunk ${chunkId}:`, error);
      return false;
    }
  }

  /**
   * Batch update multiple chunks in Airtable
   */
  async batchUpdateAirtableTracking(
    updates: Array<{
      chunkId: string;
      hasEmbedding: boolean;
      embeddingGeneratedAt: Date;
      embeddingModelVersion: string;
      embeddingQualityScore?: number;
    }>
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process in batches of 10 (Airtable API limit)
    const batchSize = 10;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        // TODO: Implement batch update to Airtable
        console.log(`Batch updating ${batch.length} chunk records in Airtable`);
        
        results.successful += batch.length;
      } catch (error) {
        results.failed += batch.length;
        results.errors.push(`Batch ${i / batchSize + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get embedding from cache
   */
  getFromCache(chunkId: string): EmbeddingCacheItem | null {
    const cached = this.cache.get(chunkId);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.cachedAt.getTime() > this.CACHE_TTL) {
      this.cache.delete(chunkId);
      return null;
    }

    return cached;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const hitRate = this.cacheStats.totalRequests > 0 
      ? this.cacheStats.hits / this.cacheStats.totalRequests 
      : 0;
    
    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round((1 - hitRate) * 100) / 100,
      memoryUsage: this.estimateCacheMemoryUsage(),
      oldestEntry: entries.length > 0 
        ? new Date(Math.min(...entries.map(e => e.cachedAt.getTime()))) 
        : undefined,
      newestEntry: entries.length > 0 
        ? new Date(Math.max(...entries.map(e => e.cachedAt.getTime()))) 
        : undefined
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, totalRequests: 0 };
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(chunkId: string): boolean {
    return this.cache.delete(chunkId);
  }

  /**
   * Shutdown service and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clearCache();
  }

  /**
   * Private: Store embedding in ZEP
   */
  private async storeInZep(
    embedding: EmbeddingResponse, 
    episodeId: string
  ): Promise<string> {
    return retryWithBackoff(async () => {
      // TODO: Replace with actual ZEP SDK call to store embedding
      // This is a placeholder implementation
      
      console.log(`Storing embedding for chunk ${embedding.chunkId} in episode ${episodeId}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In real implementation, this would call ZEP API to:
      // 1. Link embedding to the specific chunk/document in the episode
      // 2. Update episode with embedding metadata
      // 3. Return the embedding ID from ZEP
      
      // await this.episodeService.addEmbeddingToEpisode(episodeId, {
      //   chunkId: embedding.chunkId,
      //   embedding: embedding.embedding,
      //   dimensions: embedding.dimensions,
      //   model: embedding.model
      // });
      
      return `zep_emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
    }, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    });
  }

  /**
   * Private: Add item to cache with size management
   */
  private addToCache(item: EmbeddingCacheItem): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheItems(Math.floor(this.MAX_CACHE_SIZE * 0.1)); // Remove 10%
    }

    this.cache.set(item.chunkId, item);
  }

  /**
   * Private: Evict oldest cache items
   */
  private evictOldestCacheItems(count: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.cachedAt.getTime() - b.cachedAt.getTime());
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Private: Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Private: Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache) {
      if (now - item.cachedAt.getTime() > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
    
    console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
  }

  /**
   * Private: Estimate cache memory usage in bytes
   */
  private estimateCacheMemoryUsage(): number {
    let totalSize = 0;
    
    for (const item of this.cache.values()) {
      // Rough estimation:
      // - embedding array: dimensions * 8 bytes (float64)
      // - strings and metadata: ~200 bytes average
      totalSize += (item.dimensions * 8) + 200;
    }
    
    return totalSize;
  }
}