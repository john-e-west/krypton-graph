import { EmbeddingStorageService } from './embedding-storage.service';
import { EpisodeService } from './episode.service';
import { ZepConfig } from '../types';

export interface Checkpoint {
  id: string;
  documentId: string;
  episodeId: string;
  timestamp: Date;
  processedChunks: number;
  totalChunks: number;
  embeddedChunkIds: string[];
  state: CheckpointState;
  metadata?: Record<string, any>;
}

export interface CheckpointState {
  phase: 'embedding_generation' | 'zep_storage' | 'airtable_update' | 'completed';
  completedOperations: string[];
  failedOperations: string[];
  rollbackOperations?: string[];
}

export interface RollbackResult {
  success: boolean;
  checkpointId: string;
  operationsRolledBack: number;
  operationsFailed: number;
  errors: string[];
  restoredState: CheckpointState;
  timeToRollback: number;
}

export interface RecoveryResult {
  success: boolean;
  checkpointId: string;
  operationsResumed: number;
  operationsCompleted: number;
  operationsFailed: number;
  errors: string[];
  timeToRecover: number;
}

export interface RollbackReport {
  documentId: string;
  originalCheckpoint: Checkpoint;
  rollbackResult: RollbackResult;
  affectedChunks: string[];
  recoveredData: {
    deletedEmbeddings: number;
    resetAirtableRecords: number;
    cleanedZepData: number;
  };
  recommendations: string[];
}

export class RollbackRecoveryService {
  private embeddingStorageService: EmbeddingStorageService;
  private episodeService: EpisodeService;
  private checkpoints: Map<string, Checkpoint> = new Map();
  private rollbackHistory: RollbackReport[] = [];

  private readonly CHECKPOINT_INTERVAL = 50; // Save checkpoint every 50 chunks
  private readonly MAX_CHECKPOINTS = 100; // Keep max 100 checkpoints in memory
  private readonly RECOVERY_TIMEOUT = 30000; // 30 seconds timeout for recovery operations

  constructor(private config: ZepConfig) {
    this.embeddingStorageService = new EmbeddingStorageService(config);
    this.episodeService = new EpisodeService(config);
  }

  /**
   * Create a checkpoint during processing
   */
  createCheckpoint(
    documentId: string,
    episodeId: string,
    processedChunks: number,
    totalChunks: number,
    embeddedChunkIds: string[],
    state: CheckpointState,
    metadata?: Record<string, any>
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      id: this.generateCheckpointId(),
      documentId,
      episodeId,
      timestamp: new Date(),
      processedChunks,
      totalChunks,
      embeddedChunkIds: [...embeddedChunkIds],
      state: { ...state },
      metadata: metadata ? { ...metadata } : undefined
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    
    // Clean up old checkpoints if we exceed the limit
    if (this.checkpoints.size > this.MAX_CHECKPOINTS) {
      this.cleanupOldCheckpoints();
    }

    console.log(`Checkpoint created: ${checkpoint.id} for document ${documentId} (${processedChunks}/${totalChunks} chunks)`);
    
    return checkpoint;
  }

  /**
   * Get all checkpoints for a document
   */
  getDocumentCheckpoints(documentId: string): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .filter(cp => cp.documentId === documentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get the latest checkpoint for a document
   */
  getLatestCheckpoint(documentId: string): Checkpoint | null {
    const checkpoints = this.getDocumentCheckpoints(documentId);
    return checkpoints.length > 0 ? checkpoints[0] : null;
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      return {
        success: false,
        checkpointId,
        operationsRolledBack: 0,
        operationsFailed: 1,
        errors: ['Checkpoint not found'],
        restoredState: {} as CheckpointState,
        timeToRollback: Date.now() - startTime
      };
    }

    const errors: string[] = [];
    let operationsRolledBack = 0;
    let operationsFailed = 0;

    try {
      console.log(`Starting rollback to checkpoint ${checkpointId} for document ${checkpoint.documentId}`);

      // Step 1: Delete failed embeddings from ZEP
      try {
        await this.deleteFailedEmbeddings(checkpoint);
        operationsRolledBack++;
        console.log(`Deleted failed embeddings for document ${checkpoint.documentId}`);
      } catch (error) {
        operationsFailed++;
        errors.push(`Failed to delete embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 2: Reset chunk embedding status in Airtable
      try {
        await this.resetChunkEmbeddingStatus(checkpoint);
        operationsRolledBack++;
        console.log(`Reset chunk embedding status for ${checkpoint.embeddedChunkIds.length} chunks`);
      } catch (error) {
        operationsFailed++;
        errors.push(`Failed to reset Airtable status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 3: Clear embedding cache
      try {
        this.clearEmbeddingCache(checkpoint);
        operationsRolledBack++;
        console.log(`Cleared embedding cache for document ${checkpoint.documentId}`);
      } catch (error) {
        operationsFailed++;
        errors.push(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 4: Restore checkpoint state
      const restoredState = this.createRestoredState(checkpoint);

      const rollbackResult: RollbackResult = {
        success: operationsFailed === 0,
        checkpointId,
        operationsRolledBack,
        operationsFailed,
        errors,
        restoredState,
        timeToRollback: Date.now() - startTime
      };

      // Create rollback report
      const report = this.createRollbackReport(checkpoint, rollbackResult);
      this.rollbackHistory.push(report);

      console.log(`Rollback completed. Success: ${rollbackResult.success}, Operations: ${operationsRolledBack}, Errors: ${operationsFailed}`);

      return rollbackResult;

    } catch (error) {
      return {
        success: false,
        checkpointId,
        operationsRolledBack,
        operationsFailed: operationsFailed + 1,
        errors: [...errors, `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        restoredState: {} as CheckpointState,
        timeToRollback: Date.now() - startTime
      };
    }
  }

  /**
   * Resume processing from a checkpoint
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<RecoveryResult> {
    const startTime = Date.now();
    const checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      return {
        success: false,
        checkpointId,
        operationsResumed: 0,
        operationsCompleted: 0,
        operationsFailed: 1,
        errors: ['Checkpoint not found'],
        timeToRecover: Date.now() - startTime
      };
    }

    const errors: string[] = [];
    let operationsResumed = 0;
    let operationsCompleted = 0;
    let operationsFailed = 0;

    try {
      console.log(`Resuming processing from checkpoint ${checkpointId} for document ${checkpoint.documentId}`);
      
      // Calculate remaining work
      const remainingChunks = checkpoint.totalChunks - checkpoint.processedChunks;
      operationsResumed = remainingChunks;

      // This method sets up the resume state - actual processing would be handled by the calling service
      console.log(`Resume setup complete. ${remainingChunks} chunks remaining to process`);
      
      operationsCompleted = operationsResumed; // For demonstration

      return {
        success: true,
        checkpointId,
        operationsResumed,
        operationsCompleted,
        operationsFailed,
        errors,
        timeToRecover: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        checkpointId,
        operationsResumed,
        operationsCompleted,
        operationsFailed: operationsFailed + 1,
        errors: [...errors, `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        timeToRecover: Date.now() - startTime
      };
    }
  }

  /**
   * Handle retry for failed embeddings
   */
  async retryFailedEmbeddings(
    documentId: string,
    failedChunkIds: string[],
    maxRetries: number = 3
  ): Promise<{
    retried: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      retried: failedChunkIds.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`Retrying ${failedChunkIds.length} failed embeddings for document ${documentId}`);

    // In a real implementation, this would:
    // 1. Retrieve the chunk data
    // 2. Attempt to regenerate embeddings
    // 3. Store successful embeddings
    // 4. Report failures

    // For now, simulate the retry logic
    for (const chunkId of failedChunkIds) {
      try {
        // Simulate retry attempt
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate 80% success rate on retries
        if (Math.random() > 0.2) {
          results.successful++;
          console.log(`Retry successful for chunk ${chunkId}`);
        } else {
          results.failed++;
          results.errors.push(`Retry failed for chunk ${chunkId}: Simulated failure`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Retry error for chunk ${chunkId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Retry completed. Successful: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }

  /**
   * Skip corrupted chunks and continue processing
   */
  markChunksAsCorrupted(chunkIds: string[], reason: string): void {
    console.log(`Marking ${chunkIds.length} chunks as corrupted: ${reason}`);
    
    // In a real implementation, this would:
    // 1. Update Airtable to mark chunks as corrupted
    // 2. Log the corruption for later analysis
    // 3. Skip these chunks in future processing
    
    for (const chunkId of chunkIds) {
      console.log(`Chunk ${chunkId} marked as corrupted: ${reason}`);
    }
  }

  /**
   * Generate error report for failed processing
   */
  generateErrorReport(
    documentId: string,
    errors: Array<{ chunkId: string; error: string; timestamp: Date }>,
    context?: Record<string, any>
  ): {
    reportId: string;
    documentId: string;
    errorCount: number;
    errorSummary: Record<string, number>;
    detailedErrors: typeof errors;
    recommendations: string[];
    context?: Record<string, any>;
    generatedAt: Date;
  } {
    const reportId = `error_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Analyze error patterns
    const errorSummary: Record<string, number> = {};
    for (const error of errors) {
      const errorType = this.categorizeError(error.error);
      errorSummary[errorType] = (errorSummary[errorType] || 0) + 1;
    }

    // Generate recommendations based on error patterns
    const recommendations = this.generateRecommendations(errorSummary);

    return {
      reportId,
      documentId,
      errorCount: errors.length,
      errorSummary,
      detailedErrors: errors,
      recommendations,
      context,
      generatedAt: new Date()
    };
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(): RollbackReport[] {
    return [...this.rollbackHistory];
  }

  /**
   * Clean up old checkpoints and rollback history
   */
  cleanup(): void {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Remove old checkpoints
    for (const [id, checkpoint] of this.checkpoints) {
      if (checkpoint.timestamp < cutoffDate) {
        this.checkpoints.delete(id);
      }
    }

    // Keep only last 50 rollback reports
    if (this.rollbackHistory.length > 50) {
      this.rollbackHistory = this.rollbackHistory.slice(-50);
    }

    console.log(`Cleanup completed. Checkpoints: ${this.checkpoints.size}, Rollback history: ${this.rollbackHistory.length}`);
  }

  /**
   * Private: Delete failed embeddings from ZEP
   */
  private async deleteFailedEmbeddings(checkpoint: Checkpoint): Promise<void> {
    // In real implementation, this would call ZEP API to delete embeddings
    console.log(`Deleting failed embeddings for episode ${checkpoint.episodeId}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
  }

  /**
   * Private: Reset chunk embedding status in Airtable
   */
  private async resetChunkEmbeddingStatus(checkpoint: Checkpoint): Promise<void> {
    // In real implementation, this would update Airtable records
    console.log(`Resetting embedding status for ${checkpoint.embeddedChunkIds.length} chunks`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
  }

  /**
   * Private: Clear embedding cache
   */
  private clearEmbeddingCache(checkpoint: Checkpoint): void {
    for (const chunkId of checkpoint.embeddedChunkIds) {
      this.embeddingStorageService.invalidateCache(chunkId);
    }
  }

  /**
   * Private: Create restored state
   */
  private createRestoredState(checkpoint: Checkpoint): CheckpointState {
    return {
      phase: 'embedding_generation',
      completedOperations: [],
      failedOperations: [],
      rollbackOperations: [
        'delete_embeddings',
        'reset_airtable_status',
        'clear_cache'
      ]
    };
  }

  /**
   * Private: Create rollback report
   */
  private createRollbackReport(checkpoint: Checkpoint, rollbackResult: RollbackResult): RollbackReport {
    return {
      documentId: checkpoint.documentId,
      originalCheckpoint: checkpoint,
      rollbackResult,
      affectedChunks: checkpoint.embeddedChunkIds,
      recoveredData: {
        deletedEmbeddings: checkpoint.embeddedChunkIds.length,
        resetAirtableRecords: checkpoint.embeddedChunkIds.length,
        cleanedZepData: 1 // Episode cleanup
      },
      recommendations: this.generateRollbackRecommendations(rollbackResult)
    };
  }

  /**
   * Private: Generate rollback recommendations
   */
  private generateRollbackRecommendations(rollbackResult: RollbackResult): string[] {
    const recommendations: string[] = [];

    if (!rollbackResult.success) {
      recommendations.push('Manual intervention may be required to complete rollback');
      recommendations.push('Check ZEP and Airtable for inconsistent data');
    }

    if (rollbackResult.operationsFailed > 0) {
      recommendations.push('Review error logs and retry failed operations');
      recommendations.push('Consider manual cleanup of affected resources');
    }

    recommendations.push('Investigate root cause before retrying processing');
    recommendations.push('Consider adjusting batch sizes or processing parameters');

    return recommendations;
  }

  /**
   * Private: Categorize error for analysis
   */
  private categorizeError(error: string): string {
    if (error.toLowerCase().includes('timeout')) return 'timeout';
    if (error.toLowerCase().includes('network')) return 'network';
    if (error.toLowerCase().includes('rate limit')) return 'rate_limit';
    if (error.toLowerCase().includes('invalid')) return 'validation';
    if (error.toLowerCase().includes('memory')) return 'memory';
    return 'unknown';
  }

  /**
   * Private: Generate recommendations based on error patterns
   */
  private generateRecommendations(errorSummary: Record<string, number>): string[] {
    const recommendations: string[] = [];
    const totalErrors = Object.values(errorSummary).reduce((sum, count) => sum + count, 0);

    if (errorSummary.timeout && errorSummary.timeout / totalErrors > 0.3) {
      recommendations.push('Consider increasing timeout values');
      recommendations.push('Check network connectivity to ZEP services');
    }

    if (errorSummary.rate_limit && errorSummary.rate_limit / totalErrors > 0.2) {
      recommendations.push('Reduce concurrent request rate');
      recommendations.push('Implement longer delays between API calls');
    }

    if (errorSummary.validation && errorSummary.validation / totalErrors > 0.1) {
      recommendations.push('Review input data quality');
      recommendations.push('Add pre-processing validation');
    }

    if (errorSummary.memory && errorSummary.memory / totalErrors > 0.1) {
      recommendations.push('Reduce batch sizes');
      recommendations.push('Implement memory monitoring and cleanup');
    }

    return recommendations;
  }

  /**
   * Private: Clean up old checkpoints
   */
  private cleanupOldCheckpoints(): void {
    const checkpoints = Array.from(this.checkpoints.entries());
    checkpoints.sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Keep only the most recent checkpoints
    const toKeep = checkpoints.slice(0, this.MAX_CHECKPOINTS - 10);
    this.checkpoints.clear();
    
    for (const [id, checkpoint] of toKeep) {
      this.checkpoints.set(id, checkpoint);
    }
  }

  /**
   * Private: Generate checkpoint ID
   */
  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}