import { RateLimiter } from '../rate-limiter';
import { RetryManager } from '../retry';
import { EpisodeService } from './episode.service';
import { UserService } from './user.service';
import { ChunkRepository } from '../repositories/chunk.repository';

export interface ChunkData {
  id: string;
  content: string;
  chunkIndex: number;
  startPosition?: number;
  endPosition?: number;
  wordCount?: number;
  characterCount?: number;
  headings?: string;
  documentId: string;
  episodeId?: string;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  syncAttemptCount?: number;
  lastSyncAttempt?: string;
  lastSyncError?: string;
  zepChunkId?: string;
}

export interface SyncBatchResult {
  batchId: string;
  totalChunks: number;
  processedChunks: number;
  successfulChunks: number;
  failedChunks: number;
  episodeId?: string;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  chunkId: string;
  error: string;
  retryable: boolean;
  attempt: number;
}

export interface SyncQueue {
  id: string;
  documentId: string;
  userId: string;
  chunkIds: string[];
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export class SyncService {
  private rateLimiter: RateLimiter;
  private retryManager: RetryManager;
  private episodeService: EpisodeService;
  private userService: UserService;
  private chunkRepository: ChunkRepository;
  private maxConcurrency: number = 5;
  private batchSize: number = 20;
  private activeSyncs: Set<string> = new Set();

  constructor(
    rateLimiter: RateLimiter,
    retryManager: RetryManager,
    episodeService: EpisodeService,
    userService: UserService
  ) {
    this.rateLimiter = rateLimiter;
    this.retryManager = retryManager;
    this.episodeService = episodeService;
    this.userService = userService;
    this.chunkRepository = new ChunkRepository();
  }

  async syncDocumentChunks(
    documentId: string,
    userId: string
  ): Promise<SyncBatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    console.log(`Starting sync batch ${batchId} for document ${documentId}`);

    try {
      // Check if already syncing this document
      if (this.activeSyncs.has(documentId)) {
        throw new Error(`Document ${documentId} is already being synced`);
      }

      this.activeSyncs.add(documentId);

      // Fetch unsynced chunks from Airtable
      const chunks = await this.chunkRepository.fetchUnsyncedChunks(documentId);
      
      if (chunks.length === 0) {
        console.log(`No unsynced chunks found for document ${documentId}`);
        return {
          batchId,
          totalChunks: 0,
          processedChunks: 0,
          successfulChunks: 0,
          failedChunks: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      // Group chunks into batches
      const batches = this.createBatches(chunks, this.batchSize);
      
      // Get or create episode for this document
      const episode = await this.episodeService.createEpisode(
        userId,
        `sync_session_${batchId}`,
        documentId
      );

      // Process batches with concurrency control
      const results = await this.processBatches(batches, episode.id, userId);

      const totalChunks = chunks.length;
      const processedChunks = results.reduce((sum, r) => sum + r.processedChunks, 0);
      const successfulChunks = results.reduce((sum, r) => sum + r.successfulChunks, 0);
      const failedChunks = results.reduce((sum, r) => sum + r.failedChunks, 0);
      const errors = results.flatMap(r => r.errors);

      // Update episode status
      if (failedChunks === 0) {
        await this.episodeService.updateEpisodeStatus(episode.id, 'completed');
      } else if (successfulChunks > 0) {
        await this.episodeService.updateEpisodeStatus(episode.id, 'processing');
      } else {
        await this.episodeService.updateEpisodeStatus(episode.id, 'failed');
      }

      console.log(`Sync batch ${batchId} completed: ${successfulChunks}/${totalChunks} chunks synced`);

      return {
        batchId,
        totalChunks,
        processedChunks,
        successfulChunks,
        failedChunks,
        episodeId: episode.id,
        errors,
        duration: Date.now() - startTime
      };

    } finally {
      this.activeSyncs.delete(documentId);
    }
  }

  async retryFailedChunks(
    documentId: string,
    userId: string
  ): Promise<SyncBatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    console.log(`Retrying failed chunks for document ${documentId}`);

    const failedChunks = await this.chunkRepository.fetchFailedChunks(documentId);
    
    if (failedChunks.length === 0) {
      return {
        batchId,
        totalChunks: 0,
        processedChunks: 0,
        successfulChunks: 0,
        failedChunks: 0,
        errors: [],
        duration: Date.now() - startTime
      };
    }

    // Filter chunks that haven't exceeded max retry attempts
    const retryableChunks = failedChunks.filter(chunk => 
      (chunk.syncAttemptCount || 0) < 3
    );

    if (retryableChunks.length === 0) {
      console.log(`No retryable chunks found for document ${documentId}`);
      return {
        batchId,
        totalChunks: failedChunks.length,
        processedChunks: 0,
        successfulChunks: 0,
        failedChunks: failedChunks.length,
        errors: failedChunks.map(chunk => ({
          chunkId: chunk.id,
          error: 'Max retry attempts exceeded',
          retryable: false,
          attempt: chunk.syncAttemptCount || 0
        })),
        duration: Date.now() - startTime
      };
    }

    return this.syncDocumentChunks(documentId, userId);
  }

  private async fetchUnsyncedChunks(documentId: string): Promise<ChunkData[]> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    const params = new URLSearchParams({
      filterByFormula: `AND({Document}="${documentId}", OR({Sync Status}="", {Sync Status}="pending"))`,
      sort: JSON.stringify([{field: "Chunk Index", direction: "asc"}])
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chunks: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records.map((record: any) => this.mapAirtableToChunk(record));
    } catch (error) {
      console.error('Error fetching unsynced chunks:', error);
      throw error;
    }
  }

  private async fetchFailedChunks(documentId: string): Promise<ChunkData[]> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    const params = new URLSearchParams({
      filterByFormula: `AND({Document}="${documentId}", {Sync Status}="failed")`,
      sort: JSON.stringify([{field: "Chunk Index", direction: "asc"}])
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch failed chunks: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records.map((record: any) => this.mapAirtableToChunk(record));
    } catch (error) {
      console.error('Error fetching failed chunks:', error);
      throw error;
    }
  }

  private mapAirtableToChunk(record: any): ChunkData {
    return {
      id: record.id,
      content: record.fields['Content'] || '',
      chunkIndex: record.fields['Chunk Index'] || 0,
      startPosition: record.fields['Start Position'],
      endPosition: record.fields['End Position'],
      wordCount: record.fields['Word Count'],
      characterCount: record.fields['Character Count'],
      headings: record.fields['Headings'],
      documentId: record.fields['Document']?.[0] || '',
      episodeId: record.fields['Episode ID'],
      syncStatus: record.fields['Sync Status'],
      syncAttemptCount: record.fields['Sync Attempt Count'],
      lastSyncAttempt: record.fields['Last Sync Attempt'],
      lastSyncError: record.fields['Last Sync Error'],
      zepChunkId: record.fields['ZEP Chunk ID']
    };
  }

  private createBatches(chunks: ChunkData[], batchSize: number): ChunkData[][] {
    const batches: ChunkData[][] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private async processBatches(
    batches: ChunkData[][],
    episodeId: string,
    userId: string
  ): Promise<SyncBatchResult[]> {
    const results: SyncBatchResult[] = [];
    const semaphore = new Array(Math.min(this.maxConcurrency, batches.length)).fill(null);

    await Promise.all(
      semaphore.map(async (_, index) => {
        for (let i = index; i < batches.length; i += semaphore.length) {
          const batch = batches[i];
          const result = await this.processBatch(batch, episodeId, userId);
          results.push(result);
        }
      })
    );

    return results;
  }

  private async processBatch(
    chunks: ChunkData[],
    episodeId: string,
    userId: string
  ): Promise<SyncBatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let successfulChunks = 0;
    let failedChunks = 0;

    console.log(`Processing batch ${batchId} with ${chunks.length} chunks`);

    for (const chunk of chunks) {
      try {
        await this.syncChunk(chunk, episodeId, userId);
        successfulChunks++;
      } catch (error) {
        console.error(`Failed to sync chunk ${chunk.id}:`, error);
        
        const syncError: SyncError = {
          chunkId: chunk.id,
          error: error instanceof Error ? error.message : String(error),
          retryable: this.isRetryableError(error),
          attempt: (chunk.syncAttemptCount || 0) + 1
        };
        
        errors.push(syncError);
        failedChunks++;

        // Update chunk with failure info
        await this.chunkRepository.updateChunk(chunk.id, {
          syncStatus: 'failed',
          lastSyncError: syncError.error,
          syncAttemptCount: syncError.attempt,
          lastSyncAttempt: new Date().toISOString()
        });
      }
    }

    return {
      batchId,
      totalChunks: chunks.length,
      processedChunks: chunks.length,
      successfulChunks,
      failedChunks,
      episodeId,
      errors,
      duration: Date.now() - startTime
    };
  }

  private async syncChunk(
    chunk: ChunkData,
    episodeId: string,
    userId: string
  ): Promise<void> {
    // Update status to syncing
    await this.chunkRepository.updateChunk(chunk.id, {
      syncStatus: 'syncing',
      syncAttemptCount: (chunk.syncAttemptCount || 0) + 1,
      lastSyncAttempt: new Date().toISOString()
    });

    // Rate limit the request
    await this.rateLimiter.waitForToken();

    try {
      // Here we would call the actual ZEP API to add the chunk to the episode
      // For now, simulating with a delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate a mock ZEP chunk ID
      const zepChunkId = `zep_chunk_${chunk.id}_${Date.now()}`;

      // Update chunk with success
      await this.chunkRepository.updateChunk(chunk.id, {
        syncStatus: 'synced',
        syncAttemptCount: (chunk.syncAttemptCount || 0) + 1,
        lastSyncAttempt: new Date().toISOString(),
        zepChunkId: zepChunkId
      });

      console.log(`Successfully synced chunk ${chunk.id} to ZEP as ${zepChunkId}`);
    } catch (error) {
      console.error(`ZEP API error for chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  private async updateChunkSyncStatus(
    chunkId: string,
    status: 'pending' | 'syncing' | 'synced' | 'failed',
    error: string = '',
    attemptCount: number,
    zepChunkId?: string
  ): Promise<void> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks/${chunkId}`;
    
    const updateFields: any = {
      'Sync Status': status,
      'Sync Attempt Count': attemptCount,
      'Last Sync Attempt': new Date().toISOString()
    };

    if (error) {
      updateFields['Last Sync Error'] = error;
    }

    if (zepChunkId) {
      updateFields['ZEP Chunk ID'] = zepChunkId;
    }

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updateFields
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update chunk status: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error updating chunk ${chunkId} status:`, error);
      // Don't throw here to avoid cascading failures
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Rate limit errors are retryable
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return true;
      }
      
      // Network errors are retryable
      if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
        return true;
      }
      
      // Server errors are retryable
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return true;
      }
    }
    
    return false;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSyncStatus(documentId: string): Promise<{
    totalChunks: number;
    syncedChunks: number;
    failedChunks: number;
    pendingChunks: number;
    syncingChunks: number;
  }> {
    return this.chunkRepository.getSyncStatistics(documentId);
  }
}