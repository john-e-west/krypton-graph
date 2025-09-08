import Bull, { Job, Queue } from 'bull';
import { DocumentChunker, DocumentChunk } from '../services/document-chunker';
import { EventEmitter } from 'events';

export interface ProcessingJob {
  id: string;
  documentId: string;
  content: string;
  userId: string;
  options?: {
    maxChunkSize?: number;
    overlapSize?: number;
    preserveSemanticBoundaries?: boolean;
  };
}

export interface ProcessingProgress {
  jobId: string;
  documentId: string;
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  estimatedTimeRemaining: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  chunks?: DocumentChunk[];
}

export class DocumentProcessor extends EventEmitter {
  private queue: Queue<ProcessingJob>;
  private chunker: DocumentChunker;
  private activeJobs: Map<string, ProcessingProgress> = new Map();

  constructor() {
    super();
    
    // Initialize Bull queue with Redis connection
    this.queue = new Bull<ProcessingJob>('document-processing', {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.chunker = new DocumentChunker();
    this.setupJobProcessing();
    this.setupEventHandlers();
  }

  private setupJobProcessing(): void {
    // Process jobs with concurrency of 3
    this.queue.process('chunk-document', 3, async (job: Job<ProcessingJob>) => {
      return this.processDocument(job);
    });
  }

  private setupEventHandlers(): void {
    this.queue.on('active', (job: Job<ProcessingJob>) => {
      const progress: ProcessingProgress = {
        jobId: job.id.toString(),
        documentId: job.data.documentId,
        totalChunks: 0,
        processedChunks: 0,
        currentChunk: 0,
        estimatedTimeRemaining: 0,
        status: 'processing',
      };

      this.activeJobs.set(job.id.toString(), progress);
      this.emit('job-started', progress);
    });

    this.queue.on('progress', (job: Job<ProcessingJob>, progress: number) => {
      const jobProgress = this.activeJobs.get(job.id.toString());
      if (jobProgress) {
        jobProgress.processedChunks = Math.floor((progress / 100) * jobProgress.totalChunks);
        this.emit('job-progress', jobProgress);
      }
    });

    this.queue.on('completed', (job: Job<ProcessingJob>, result: DocumentChunk[]) => {
      const jobProgress = this.activeJobs.get(job.id.toString());
      if (jobProgress) {
        jobProgress.status = 'completed';
        jobProgress.processedChunks = jobProgress.totalChunks;
        jobProgress.chunks = result;
        this.emit('job-completed', jobProgress);
      }
    });

    this.queue.on('failed', (job: Job<ProcessingJob>, error: Error) => {
      const jobProgress = this.activeJobs.get(job.id.toString());
      if (jobProgress) {
        jobProgress.status = 'failed';
        jobProgress.error = error.message;
        this.emit('job-failed', jobProgress);
      }
    });

    this.queue.on('stalled', (job: Job<ProcessingJob>) => {
      console.warn(`Job ${job.id} stalled and will be retried`);
    });
  }

  async addDocumentProcessingJob(jobData: ProcessingJob): Promise<string> {
    const job = await this.queue.add('chunk-document', jobData, {
      priority: 10,
      delay: 0,
    });

    // Initialize progress tracking
    const progress: ProcessingProgress = {
      jobId: job.id.toString(),
      documentId: jobData.documentId,
      totalChunks: 0,
      processedChunks: 0,
      currentChunk: 0,
      estimatedTimeRemaining: 0,
      status: 'queued',
    };

    this.activeJobs.set(job.id.toString(), progress);
    this.emit('job-queued', progress);

    return job.id.toString();
  }

  private async processDocument(job: Job<ProcessingJob>): Promise<DocumentChunk[]> {
    const { documentId, content, options } = job.data;
    const startTime = Date.now();

    try {
      // Configure chunker with job-specific options
      if (options) {
        this.chunker = new DocumentChunker(options);
      }

      // Estimate total chunks for progress tracking
      const estimatedChunks = Math.ceil(
        content.length / (options?.maxChunkSize || 10000)
      );

      const jobProgress = this.activeJobs.get(job.id.toString());
      if (jobProgress) {
        jobProgress.totalChunks = estimatedChunks;
      }

      // Update progress at 10% - starting chunking
      await job.progress(10);

      // Perform chunking
      const chunks = await this.chunker.chunkDocument(documentId, content);

      // Update actual chunk count
      if (jobProgress) {
        jobProgress.totalChunks = chunks.length;
      }

      // Simulate processing each chunk with progress updates
      for (let i = 0; i < chunks.length; i++) {
        // Check if job was cancelled
        if (await this.isJobCancelled(job.id.toString())) {
          throw new Error('Job cancelled by user');
        }

        const chunk = chunks[i];
        
        // Simulate processing time (remove in production)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Update progress
        const progressPercent = Math.floor(((i + 1) / chunks.length) * 90) + 10;
        await job.progress(progressPercent);

        // Update job progress tracking
        if (jobProgress) {
          jobProgress.currentChunk = i + 1;
          jobProgress.processedChunks = i + 1;
          
          // Calculate estimated time remaining
          const elapsed = Date.now() - startTime;
          const remaining = chunks.length - (i + 1);
          const avgTimePerChunk = elapsed / (i + 1);
          jobProgress.estimatedTimeRemaining = Math.floor(avgTimePerChunk * remaining / 1000);
        }

        // Emit progress for real-time updates
        if (jobProgress) {
          this.emit('chunk-processed', {
            ...jobProgress,
            processedChunk: chunk,
          });
        }
      }

      // Final progress update
      await job.progress(100);

      return chunks;

    } catch (error) {
      console.error(`Document processing failed for ${documentId}:`, error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return false;
      }

      const jobProgress = this.activeJobs.get(jobId);
      if (jobProgress) {
        jobProgress.status = 'cancelled';
        this.emit('job-cancelled', jobProgress);
      }

      // Remove job from queue
      await job.remove();
      return true;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  private async isJobCancelled(jobId: string): Promise<boolean> {
    const jobProgress = this.activeJobs.get(jobId);
    return jobProgress?.status === 'cancelled' || false;
  }

  getJobProgress(jobId: string): ProcessingProgress | null {
    return this.activeJobs.get(jobId) || null;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.retry();
      
      const jobProgress = this.activeJobs.get(jobId);
      if (jobProgress) {
        jobProgress.status = 'queued';
        jobProgress.error = undefined;
        this.emit('job-retried', jobProgress);
      }

      return true;
    } catch (error) {
      console.error(`Failed to retry job ${jobId}:`, error);
      return false;
    }
  }

  async getJobHistory(limit: number = 50): Promise<ProcessingProgress[]> {
    const [completed, failed] = await Promise.all([
      this.queue.getCompleted(0, limit / 2),
      this.queue.getFailed(0, limit / 2),
    ]);

    const history: ProcessingProgress[] = [];

    for (const job of [...completed, ...failed]) {
      const progress = this.activeJobs.get(job.id.toString());
      if (progress) {
        history.push(progress);
      }
    }

    return history.sort((a, b) => 
      new Date(b.jobId).getTime() - new Date(a.jobId).getTime()
    );
  }

  async cleanup(): Promise<void> {
    await this.queue.close();
    this.activeJobs.clear();
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const stats = await this.getQueueStats();
      return true;
    } catch (error) {
      console.error('Queue health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const documentProcessor = new DocumentProcessor();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down document processor...');
  await documentProcessor.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down document processor...');
  await documentProcessor.cleanup();
  process.exit(0);
});