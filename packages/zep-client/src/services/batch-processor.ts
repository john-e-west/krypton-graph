import { EmbeddingService, EmbeddingRequest, BatchEmbeddingRequest, BatchEmbeddingResponse } from './embedding.service';
import { ZepConfig } from '../types';

export interface ProcessingJob {
  id: string;
  documentId: string;
  chunks: EmbeddingRequest[];
  priority: 'high' | 'normal' | 'low';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errors?: string[];
  estimatedCompletionTime?: Date;
}

export interface ProcessingStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
}

export interface BatchProcessorConfig {
  maxConcurrentJobs: number;
  maxBatchSize: number;
  maxBatchSizeBytes: number;
  priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };
  healthCheckInterval: number;
  metricsRetentionDays: number;
}

export class BatchProcessor {
  private embeddingService: EmbeddingService;
  private jobs: Map<string, ProcessingJob> = new Map();
  private processingQueue: ProcessingJob[] = [];
  private activeJobs: Set<string> = new Set();
  private metrics: ProcessingStats;
  private config: BatchProcessorConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(zepConfig: ZepConfig, config?: Partial<BatchProcessorConfig>) {
    this.embeddingService = new EmbeddingService(zepConfig);
    this.config = {
      maxConcurrentJobs: 3,
      maxBatchSize: 20,
      maxBatchSizeBytes: 8 * 1024, // 8KB
      priorityWeights: { high: 3, normal: 2, low: 1 },
      healthCheckInterval: 30000, // 30 seconds
      metricsRetentionDays: 7,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.startHealthCheck();
  }

  /**
   * Submit a processing job for a document's chunks
   */
  async submitJob(
    documentId: string, 
    chunks: EmbeddingRequest[], 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: ProcessingJob = {
      id: jobId,
      documentId,
      chunks: [...chunks],
      priority,
      status: 'queued',
      progress: {
        total: chunks.length,
        processed: 0,
        successful: 0,
        failed: 0
      },
      createdAt: new Date(),
      estimatedCompletionTime: this.estimateCompletionTime(chunks.length, priority)
    };

    this.jobs.set(jobId, job);
    this.addToProcessingQueue(job);
    
    // Start processing if we have capacity
    this.processQueue();
    
    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a document
   */
  getDocumentJobs(documentId: string): ProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.documentId === documentId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();

    // Remove from queue if not yet processing
    if (job.status === 'queued') {
      this.processingQueue = this.processingQueue.filter(j => j.id !== jobId);
    }

    this.activeJobs.delete(jobId);
    return true;
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeJobs: number;
    highPriorityJobs: number;
    estimatedWaitTime: number;
  } {
    return {
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs.size,
      highPriorityJobs: this.processingQueue.filter(j => j.priority === 'high').length,
      estimatedWaitTime: this.estimateQueueWaitTime()
    };
  }

  /**
   * Clean up completed jobs older than retention period
   */
  cleanupOldJobs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    for (const [jobId, job] of this.jobs) {
      if (job.completedAt && job.completedAt < cutoffDate) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Shutdown processor gracefully
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for active jobs to complete or timeout after 30 seconds
    const timeout = Date.now() + 30000;
    while (this.activeJobs.size > 0 && Date.now() < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cancel remaining jobs
    for (const jobId of this.activeJobs) {
      await this.cancelJob(jobId);
    }
  }

  /**
   * Private: Add job to processing queue with priority sorting
   */
  private addToProcessingQueue(job: ProcessingJob): void {
    // Insert job based on priority
    const insertIndex = this.findInsertionIndex(job);
    this.processingQueue.splice(insertIndex, 0, job);
  }

  /**
   * Private: Find insertion index for priority-based sorting
   */
  private findInsertionIndex(newJob: ProcessingJob): number {
    const newJobWeight = this.config.priorityWeights[newJob.priority];
    
    for (let i = 0; i < this.processingQueue.length; i++) {
      const existingJobWeight = this.config.priorityWeights[this.processingQueue[i].priority];
      if (newJobWeight > existingJobWeight) {
        return i;
      }
    }
    
    return this.processingQueue.length;
  }

  /**
   * Private: Process the job queue
   */
  private async processQueue(): Promise<void> {
    // Start new jobs if we have capacity
    while (
      this.activeJobs.size < this.config.maxConcurrentJobs && 
      this.processingQueue.length > 0
    ) {
      const job = this.processingQueue.shift();
      if (!job || job.status !== 'queued') continue;

      this.activeJobs.add(job.id);
      job.status = 'processing';
      job.startedAt = new Date();

      // Process job in background
      this.processJob(job).finally(() => {
        this.activeJobs.delete(job.id);
        
        // Continue processing queue
        if (this.processingQueue.length > 0) {
          this.processQueue();
        }
      });
    }
  }

  /**
   * Private: Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    try {
      // Group chunks into optimal batches
      const batches = this.createOptimalBatches(job.chunks);
      
      for (const [batchIndex, batch] of batches.entries()) {
        if (job.status === 'cancelled') {
          return;
        }

        const batchRequest: BatchEmbeddingRequest = {
          requests: batch,
          batchId: `${job.id}_batch_${batchIndex}`,
          priority: job.priority
        };

        try {
          const response = await this.embeddingService.generateBatchEmbeddings(batchRequest);
          
          // Update job progress
          job.progress.processed += batch.length;
          job.progress.successful += response.successCount;
          job.progress.failed += response.failedCount;

          if (!response.success && response.errors) {
            job.errors = (job.errors || []).concat(response.errors);
          }

        } catch (error) {
          job.progress.processed += batch.length;
          job.progress.failed += batch.length;
          job.errors = job.errors || [];
          job.errors.push(`Batch ${batchIndex} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Mark job as completed or failed
      job.status = job.progress.failed === 0 ? 'completed' : 'failed';
      job.completedAt = new Date();

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors = [`Job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }

  /**
   * Private: Create optimal batches from chunks
   */
  private createOptimalBatches(chunks: EmbeddingRequest[]): EmbeddingRequest[][] {
    const batches: EmbeddingRequest[][] = [];
    let currentBatch: EmbeddingRequest[] = [];
    let currentBatchSize = 0;

    for (const chunk of chunks) {
      const chunkSize = new TextEncoder().encode(chunk.text).length;
      
      // Check if adding this chunk would exceed limits
      if (
        currentBatch.length >= this.config.maxBatchSize ||
        (currentBatchSize + chunkSize) > this.config.maxBatchSizeBytes
      ) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
        }
        currentBatch = [chunk];
        currentBatchSize = chunkSize;
      } else {
        currentBatch.push(chunk);
        currentBatchSize += chunkSize;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Private: Estimate completion time for a job
   */
  private estimateCompletionTime(chunkCount: number, priority: 'high' | 'normal' | 'low'): Date {
    // Base processing rate: ~50 chunks per minute
    const baseRatePerMinute = 50;
    const priorityMultiplier = priority === 'high' ? 1.5 : priority === 'normal' ? 1.0 : 0.7;
    const adjustedRate = baseRatePerMinute * priorityMultiplier;
    
    const estimatedMinutes = chunkCount / adjustedRate;
    const queueDelay = this.estimateQueueWaitTime();
    
    const completion = new Date();
    completion.setTime(completion.getTime() + (estimatedMinutes * 60 * 1000) + queueDelay);
    
    return completion;
  }

  /**
   * Private: Estimate queue wait time in milliseconds
   */
  private estimateQueueWaitTime(): number {
    if (this.processingQueue.length === 0) return 0;
    
    // Rough estimate based on queue length and current processing rate
    const avgJobTime = 2 * 60 * 1000; // 2 minutes average
    const jobsAhead = this.processingQueue.length;
    const concurrentCapacity = this.config.maxConcurrentJobs;
    
    return (jobsAhead / concurrentCapacity) * avgJobTime;
  }

  /**
   * Private: Initialize metrics
   */
  private initializeMetrics(): ProcessingStats {
    return {
      totalJobs: 0,
      queuedJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      throughputPerMinute: 0
    };
  }

  /**
   * Private: Update current metrics
   */
  private updateMetrics(): void {
    const allJobs = Array.from(this.jobs.values());
    
    this.metrics.totalJobs = allJobs.length;
    this.metrics.queuedJobs = allJobs.filter(j => j.status === 'queued').length;
    this.metrics.processingJobs = allJobs.filter(j => j.status === 'processing').length;
    this.metrics.completedJobs = allJobs.filter(j => j.status === 'completed').length;
    this.metrics.failedJobs = allJobs.filter(j => j.status === 'failed').length;

    // Calculate average processing time for completed jobs
    const completedJobs = allJobs.filter(j => j.status === 'completed' && j.startedAt && j.completedAt);
    if (completedJobs.length > 0) {
      const totalProcessingTime = completedJobs.reduce((sum, job) => {
        const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
        return sum + processingTime;
      }, 0);
      
      this.metrics.averageProcessingTime = totalProcessingTime / completedJobs.length;
    }

    // Calculate throughput (jobs completed in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCompletedJobs = completedJobs.filter(j => j.completedAt! > oneHourAgo);
    this.metrics.throughputPerMinute = recentCompletedJobs.length;
  }

  /**
   * Private: Start health check timer
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.cleanupOldJobs();
      this.updateMetrics();
    }, this.config.healthCheckInterval);
  }

  /**
   * Private: Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}