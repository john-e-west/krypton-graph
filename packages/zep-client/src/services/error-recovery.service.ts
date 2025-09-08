import { ChunkData, SyncError } from './sync.service';
import { ChunkRepository } from '../repositories/chunk.repository';
import { ZepEpisodeService } from './zep-episode.service';

export interface RecoveryOperation {
  id: string;
  type: 'chunk_retry' | 'episode_rollback' | 'batch_recovery';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  documentId: string;
  episodeId?: string;
  chunkIds: string[];
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  backoffDelay: number;
  nextRetryAt: Date;
}

export interface RecoveryResult {
  operationId: string;
  successful: number;
  failed: number;
  recoveredChunks: string[];
  unrecoverableChunks: string[];
  totalDuration: number;
  errors: SyncError[];
}

export interface RollbackResult {
  episodeId: string;
  chunksRolledBack: number;
  success: boolean;
  error?: string;
  duration: number;
}

export class ErrorRecoveryService {
  private chunkRepository: ChunkRepository;
  private episodeService: ZepEpisodeService;
  private recoveryOperations: Map<string, RecoveryOperation> = new Map();
  private maxRetryAttempts: number = 3;
  private baseRetryDelay: number = 1000; // 1 second
  private maxRetryDelay: number = 30000; // 30 seconds
  private backoffMultiplier: number = 2;

  constructor(
    chunkRepository: ChunkRepository,
    episodeService: ZepEpisodeService
  ) {
    this.chunkRepository = chunkRepository;
    this.episodeService = episodeService;
    
    // Clean up completed operations every hour
    setInterval(() => this.cleanupCompletedOperations(), 60 * 60 * 1000);
  }

  /**
   * Retry failed chunks with exponential backoff
   */
  async retryFailedChunks(
    documentId: string,
    chunkIds?: string[]
  ): Promise<RecoveryResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      // Get failed chunks
      let failedChunks: ChunkData[];
      
      if (chunkIds && chunkIds.length > 0) {
        // Retry specific chunks
        const allChunks = await this.chunkRepository.fetchChunksByDocument(documentId);
        failedChunks = allChunks.filter(chunk => 
          chunkIds.includes(chunk.id) && chunk.syncStatus === 'failed'
        );
      } else {
        // Retry all failed chunks for document
        failedChunks = await this.chunkRepository.fetchFailedChunks(documentId);
      }

      if (failedChunks.length === 0) {
        return {
          operationId,
          successful: 0,
          failed: 0,
          recoveredChunks: [],
          unrecoverableChunks: [],
          totalDuration: Date.now() - startTime,
          errors: []
        };
      }

      // Filter chunks that haven't exceeded max retry attempts
      const retryableChunks = failedChunks.filter(chunk => 
        (chunk.syncAttemptCount || 0) < this.maxRetryAttempts
      );

      const unrecoverableChunks = failedChunks
        .filter(chunk => (chunk.syncAttemptCount || 0) >= this.maxRetryAttempts)
        .map(chunk => chunk.id);

      if (retryableChunks.length === 0) {
        return {
          operationId,
          successful: 0,
          failed: failedChunks.length,
          recoveredChunks: [],
          unrecoverableChunks,
          totalDuration: Date.now() - startTime,
          errors: failedChunks.map(chunk => ({
            chunkId: chunk.id,
            error: 'Max retry attempts exceeded',
            retryable: false,
            attempt: chunk.syncAttemptCount || 0
          }))
        };
      }

      // Create recovery operation
      const operation: RecoveryOperation = {
        id: operationId,
        type: 'chunk_retry',
        status: 'pending',
        documentId,
        chunkIds: retryableChunks.map(chunk => chunk.id),
        attempts: 0,
        maxAttempts: this.maxRetryAttempts,
        createdAt: new Date(),
        updatedAt: new Date(),
        backoffDelay: this.baseRetryDelay,
        nextRetryAt: new Date()
      };

      this.recoveryOperations.set(operationId, operation);

      // Execute recovery with exponential backoff
      const result = await this.executeRecoveryWithBackoff(operation, retryableChunks);

      return {
        operationId,
        successful: result.successful,
        failed: result.failed,
        recoveredChunks: result.recoveredChunks,
        unrecoverableChunks: [...unrecoverableChunks, ...result.unrecoverableChunks],
        totalDuration: Date.now() - startTime,
        errors: result.errors
      };

    } catch (error) {
      console.error('Error during chunk recovery:', error);
      return {
        operationId,
        successful: 0,
        failed: 0,
        recoveredChunks: [],
        unrecoverableChunks: chunkIds || [],
        totalDuration: Date.now() - startTime,
        errors: [{
          chunkId: 'unknown',
          error: error instanceof Error ? error.message : String(error),
          retryable: false,
          attempt: 0
        }]
      };
    }
  }

  /**
   * Rollback episode and reset chunk statuses
   */
  async rollbackEpisode(episodeId: string): Promise<RollbackResult> {
    const startTime = Date.now();

    try {
      const episode = await this.episodeService.getEpisodeById(episodeId);
      
      if (!episode) {
        return {
          episodeId,
          chunksRolledBack: 0,
          success: false,
          error: `Episode ${episodeId} not found`,
          duration: Date.now() - startTime
        };
      }

      console.log(`Starting rollback for episode ${episodeId} with ${episode.chunk_ids.length} chunks`);

      // Reset chunk sync statuses to pending
      const resetPromises = episode.chunk_ids.map(chunkId =>
        this.chunkRepository.updateChunk(chunkId, {
          syncStatus: 'pending',
          syncAttemptCount: 0,
          lastSyncError: '',
          zepChunkId: undefined,
          lastSyncAttempt: undefined
        }).catch(error => {
          console.error(`Failed to reset chunk ${chunkId}:`, error);
          return null;
        })
      );

      await Promise.all(resetPromises);

      // Mark episode as failed/rolled back
      await this.episodeService.updateEpisodeStatus(episodeId, 'failed', 'Episode rolled back due to sync failures');

      // Delete episode from ZEP (when ZEP integration is implemented)
      await this.episodeService.rollbackEpisode(episodeId);

      console.log(`Successfully rolled back episode ${episodeId}`);

      return {
        episodeId,
        chunksRolledBack: episode.chunk_ids.length,
        success: true,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Error rolling back episode ${episodeId}:`, error);
      
      return {
        episodeId,
        chunksRolledBack: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Perform batch recovery for multiple failed documents
   */
  async performBatchRecovery(documentIds: string[]): Promise<RecoveryResult[]> {
    const results: RecoveryResult[] = [];

    // Process documents sequentially to avoid overwhelming the system
    for (const documentId of documentIds) {
      try {
        const result = await this.retryFailedChunks(documentId);
        results.push(result);
        
        // Add delay between documents to prevent rate limiting
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`Batch recovery failed for document ${documentId}:`, error);
        
        results.push({
          operationId: this.generateOperationId(),
          successful: 0,
          failed: 1,
          recoveredChunks: [],
          unrecoverableChunks: [documentId],
          totalDuration: 0,
          errors: [{
            chunkId: documentId,
            error: error instanceof Error ? error.message : String(error),
            retryable: false,
            attempt: 0
          }]
        });
      }
    }

    return results;
  }

  /**
   * Get recovery operation status
   */
  async getRecoveryStatus(operationId: string): Promise<RecoveryOperation | null> {
    return this.recoveryOperations.get(operationId) || null;
  }

  /**
   * Get all active recovery operations
   */
  async getActiveRecoveryOperations(): Promise<RecoveryOperation[]> {
    return Array.from(this.recoveryOperations.values()).filter(op => 
      op.status === 'pending' || op.status === 'in_progress'
    );
  }

  /**
   * Cancel recovery operation
   */
  async cancelRecoveryOperation(operationId: string): Promise<boolean> {
    const operation = this.recoveryOperations.get(operationId);
    
    if (!operation) {
      return false;
    }

    if (operation.status === 'in_progress') {
      console.warn(`Cannot cancel in-progress operation ${operationId}`);
      return false;
    }

    operation.status = 'failed';
    operation.lastError = 'Operation cancelled by user';
    operation.updatedAt = new Date();

    return true;
  }

  private async executeRecoveryWithBackoff(
    operation: RecoveryOperation,
    chunks: ChunkData[]
  ): Promise<{
    successful: number;
    failed: number;
    recoveredChunks: string[];
    unrecoverableChunks: string[];
    errors: SyncError[];
  }> {
    operation.status = 'in_progress';
    operation.updatedAt = new Date();

    const recoveredChunks: string[] = [];
    const unrecoverableChunks: string[] = [];
    const errors: SyncError[] = [];
    let successful = 0;
    let failed = 0;

    for (const chunk of chunks) {
      const currentAttempt = (chunk.syncAttemptCount || 0) + 1;
      
      if (currentAttempt > this.maxRetryAttempts) {
        unrecoverableChunks.push(chunk.id);
        failed++;
        continue;
      }

      try {
        // Calculate backoff delay
        const delay = Math.min(
          this.baseRetryDelay * Math.pow(this.backoffMultiplier, currentAttempt - 1),
          this.maxRetryDelay
        );

        console.log(`Retrying chunk ${chunk.id} (attempt ${currentAttempt}/${this.maxRetryAttempts}) after ${delay}ms delay`);
        
        // Wait for backoff delay
        await this.sleep(delay);

        // Mark chunk as syncing and increment attempt count
        await this.chunkRepository.updateChunk(chunk.id, {
          syncStatus: 'syncing',
          syncAttemptCount: currentAttempt,
          lastSyncAttempt: new Date().toISOString(),
          lastSyncError: ''
        });

        // Simulate successful sync (replace with actual ZEP API call)
        await this.simulateChunkSync(chunk);

        // Mark chunk as synced
        await this.chunkRepository.updateChunk(chunk.id, {
          syncStatus: 'synced',
          zepChunkId: `zep_chunk_retry_${chunk.id}_${Date.now()}`
        });

        recoveredChunks.push(chunk.id);
        successful++;

        console.log(`Successfully recovered chunk ${chunk.id} on attempt ${currentAttempt}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to recover chunk ${chunk.id} on attempt ${currentAttempt}:`, errorMessage);

        // Update chunk with failure info
        await this.chunkRepository.updateChunk(chunk.id, {
          syncStatus: 'failed',
          lastSyncError: errorMessage,
          syncAttemptCount: currentAttempt
        });

        const syncError: SyncError = {
          chunkId: chunk.id,
          error: errorMessage,
          retryable: this.isRetryableError(error) && currentAttempt < this.maxRetryAttempts,
          attempt: currentAttempt
        };

        errors.push(syncError);

        if (currentAttempt >= this.maxRetryAttempts) {
          unrecoverableChunks.push(chunk.id);
        }

        failed++;
      }
    }

    operation.status = 'completed';
    operation.updatedAt = new Date();

    return {
      successful,
      failed,
      recoveredChunks,
      unrecoverableChunks,
      errors
    };
  }

  private async simulateChunkSync(chunk: ChunkData): Promise<void> {
    // Simulate network delay and potential failure
    await this.sleep(100 + Math.random() * 200);
    
    // Simulate 10% failure rate for testing
    if (Math.random() < 0.1) {
      throw new Error(`Simulated sync failure for chunk ${chunk.id}`);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors are retryable
      if (message.includes('econnreset') || 
          message.includes('etimedout') || 
          message.includes('enotfound')) {
        return true;
      }
      
      // Rate limit errors are retryable
      if (message.includes('rate limit') || message.includes('429')) {
        return true;
      }
      
      // Server errors are retryable
      if (message.includes('500') || 
          message.includes('502') || 
          message.includes('503') || 
          message.includes('504')) {
        return true;
      }
    }
    
    return false;
  }

  private generateOperationId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupCompletedOperations(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const operationsToDelete: string[] = [];

    for (const [id, operation] of this.recoveryOperations.entries()) {
      if ((operation.status === 'completed' || operation.status === 'failed') &&
          operation.updatedAt < cutoffTime) {
        operationsToDelete.push(id);
      }
    }

    operationsToDelete.forEach(id => this.recoveryOperations.delete(id));

    if (operationsToDelete.length > 0) {
      console.log(`Cleaned up ${operationsToDelete.length} completed recovery operations`);
    }
  }
}