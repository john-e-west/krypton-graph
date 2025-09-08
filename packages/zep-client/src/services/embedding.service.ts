import { ZepConfig, RetryOptions } from '../types';
import { retryWithBackoff } from '../retry';
import { RateLimiter } from '../rate-limiter';

export interface EmbeddingRequest {
  text: string;
  chunkId: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  chunkId: string;
  embedding: number[];
  dimensions: number;
  model: string;
  success: boolean;
  error?: string;
}

export interface EmbeddingMetadata {
  chunkId: string;
  generatedAt: Date;
  modelVersion: string;
  qualityScore?: number;
  processingTime?: number;
}

export interface BatchEmbeddingRequest {
  requests: EmbeddingRequest[];
  batchId: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface BatchEmbeddingResponse {
  batchId: string;
  results: EmbeddingResponse[];
  success: boolean;
  processingTime: number;
  failedCount: number;
  successCount: number;
  errors?: string[];
}

export interface EmbeddingQueue {
  id: string;
  requests: EmbeddingRequest[];
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
}

export class EmbeddingService {
  private rateLimiter: RateLimiter;
  private retryOptions: RetryOptions;
  private queue: EmbeddingQueue[] = [];
  private processing = false;
  
  // ZEP embedding configuration
  private readonly MODEL = 'text-embedding-3-small';
  private readonly DIMENSIONS = 1536;
  private readonly MAX_TOKENS_PER_CHUNK = 8191;
  private readonly BATCH_SIZE = 20;
  private readonly MAX_CONCURRENT_REQUESTS = 3;

  constructor(private config: ZepConfig) {
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: config.requestsPerMinute || 60,
      burstSize: 10
    });
    
    this.retryOptions = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.retryDelay || 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    };
  }

  /**
   * Generate embeddings for a single chunk
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return retryWithBackoff(async () => {
      await this.rateLimiter.acquire();
      
      try {
        // Validate input
        if (!request.text || request.text.trim().length === 0) {
          throw new Error('Text content is required');
        }

        // Simulate ZEP API call (replace with actual ZEP SDK call)
        const startTime = Date.now();
        const embedding = await this.callZepEmbeddingAPI([request.text]);
        const processingTime = Date.now() - startTime;

        return {
          chunkId: request.chunkId,
          embedding: embedding[0],
          dimensions: this.DIMENSIONS,
          model: this.MODEL,
          success: true,
          metadata: {
            processingTime
          }
        } as EmbeddingResponse;

      } catch (error) {
        return {
          chunkId: request.chunkId,
          embedding: [],
          dimensions: 0,
          model: this.MODEL,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }, this.retryOptions);
  }

  /**
   * Generate embeddings for multiple chunks in batches
   */
  async generateBatchEmbeddings(batchRequest: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const results: EmbeddingResponse[] = [];
    const errors: string[] = [];
    
    try {
      // Group requests into optimal batches
      const batches = this.groupIntoBatches(batchRequest.requests);
      
      // Process batches with concurrency limit
      const promises = batches.map(batch => this.processBatch(batch));
      const batchResults = await Promise.allSettled(promises);
      
      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(...result.value.results);
          if (result.value.errors) {
            errors.push(...result.value.errors);
          }
        } else {
          errors.push(`Batch failed: ${result.reason}`);
        }
      }

      const processingTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      return {
        batchId: batchRequest.batchId,
        results,
        success: failedCount === 0,
        processingTime,
        successCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        batchId: batchRequest.batchId,
        results: [],
        success: false,
        processingTime: Date.now() - startTime,
        successCount: 0,
        failedCount: batchRequest.requests.length,
        errors: [error instanceof Error ? error.message : 'Unknown batch error']
      };
    }
  }

  /**
   * Add requests to processing queue
   */
  addToQueue(requests: EmbeddingRequest[], priority: 'high' | 'normal' | 'low' = 'normal'): string {
    const queueItem: EmbeddingQueue = {
      id: this.generateQueueId(),
      requests,
      priority,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(queueItem);
    } else {
      this.queue.push(queueItem);
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; processing: number; total: number } {
    return {
      pending: this.queue.filter(q => q.status === 'pending').length,
      processing: this.queue.filter(q => q.status === 'processing').length,
      total: this.queue.length
    };
  }

  /**
   * Private method to process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.find(q => q.status === 'pending');
        if (!item) break;

        item.status = 'processing';
        item.processedAt = new Date();

        try {
          const batchRequest: BatchEmbeddingRequest = {
            requests: item.requests,
            batchId: item.id,
            priority: item.priority
          };

          await this.generateBatchEmbeddings(batchRequest);
          item.status = 'completed';
          
          // Remove completed item from queue
          this.queue = this.queue.filter(q => q.id !== item.id);

        } catch (error) {
          item.status = 'failed';
          item.retryCount++;

          if (item.retryCount < this.retryOptions.maxRetries) {
            item.status = 'pending';
            // Move to end of queue for retry
            this.queue.push(this.queue.splice(this.queue.indexOf(item), 1)[0]);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Group requests into optimal batches
   */
  private groupIntoBatches(requests: EmbeddingRequest[]): EmbeddingRequest[][] {
    const batches: EmbeddingRequest[][] = [];
    let currentBatch: EmbeddingRequest[] = [];
    let currentBatchSize = 0;

    for (const request of requests) {
      const textSize = new TextEncoder().encode(request.text).length;
      
      // If adding this request would exceed batch limits, start new batch
      if (currentBatch.length >= this.BATCH_SIZE || 
          (currentBatchSize + textSize) > (8 * 1024)) { // 8KB limit
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
        }
        currentBatch = [request];
        currentBatchSize = textSize;
      } else {
        currentBatch.push(request);
        currentBatchSize += textSize;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Process a single batch
   */
  private async processBatch(requests: EmbeddingRequest[]): Promise<BatchEmbeddingResponse> {
    const batchId = this.generateQueueId();
    const startTime = Date.now();
    
    try {
      const texts = requests.map(r => r.text);
      const embeddings = await this.callZepEmbeddingAPI(texts);
      
      const results: EmbeddingResponse[] = requests.map((request, index) => {
        // Check for invalid input
        if (!request.text || request.text.trim().length === 0) {
          return {
            chunkId: request.chunkId,
            embedding: [],
            dimensions: 0,
            model: this.MODEL,
            success: false,
            error: 'Text content is required'
          };
        }
        
        return {
          chunkId: request.chunkId,
          embedding: embeddings[index] || [],
          dimensions: this.DIMENSIONS,
          model: this.MODEL,
          success: embeddings[index] && embeddings[index].length > 0
        };
      });

      return {
        batchId,
        results,
        success: true,
        processingTime: Date.now() - startTime,
        successCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length
      };

    } catch (error) {
      return {
        batchId,
        results: [],
        success: false,
        processingTime: Date.now() - startTime,
        successCount: 0,
        failedCount: requests.length,
        errors: [error instanceof Error ? error.message : 'Batch processing failed']
      };
    }
  }

  /**
   * Limit concurrent promises
   */
  private async limitConcurrency<T>(promises: Promise<T>[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
        executing.splice(executing.indexOf(p), 1);
      });

      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Call ZEP Embedding API (placeholder - replace with actual SDK call)
   */
  private async callZepEmbeddingAPI(texts: string[]): Promise<number[][]> {
    // TODO: Replace with actual ZEP SDK embedding call
    // This is a placeholder that returns mock embeddings
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
    
    return texts.map(() => 
      Array.from({ length: this.DIMENSIONS }, () => Math.random() - 0.5)
    );
  }

  /**
   * Generate unique queue ID
   */
  private generateQueueId(): string {
    return `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}