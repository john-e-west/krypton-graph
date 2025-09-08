export type ProcessingPhase = 'upload' | 'conversion' | 'chunking' | 'staging'

export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'

export type PhaseStatusType = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface PhaseStatus {
  status: PhaseStatusType
  progress: number  // 0-100
  startedAt?: Date
  completedAt?: Date
  duration?: number
  message?: string
}

export interface ProcessingError {
  code: string
  message: string
  category: 'network' | 'format' | 'system' | 'validation'
  details?: any
  stack?: string
}

export interface ProcessingMetrics {
  fileSize: number
  pageCount?: number
  chunkCount?: number
  processingTime: number
  conversionTime?: number
  chunkingTime?: number
  stagingTime?: number
}

export interface DocumentProcessingStatus {
  documentId: string
  name: string
  type: string
  status: ProcessingStatus
  currentPhase: ProcessingPhase
  phases: {
    upload: PhaseStatus
    conversion: PhaseStatus
    chunking: PhaseStatus
    staging: PhaseStatus
  }
  startedAt: Date
  completedAt?: Date
  error?: ProcessingError
  metrics: ProcessingMetrics
  retryCount: number
  canRetry: boolean
}

export interface ProcessingMetricsSummary {
  totalDocuments: number
  successCount: number
  failureCount: number
  averageProcessingTime: number
  throughput: number  // docs per hour
  successRate: number  // percentage
  activeProcessing: number
  queuedCount: number
  peakThroughput: number
  estimatedTimeRemaining: number  // minutes
}

export enum ProcessingEvent {
  DOCUMENT_QUEUED = 'document:queued',
  PHASE_STARTED = 'phase:started',
  PHASE_PROGRESS = 'phase:progress',
  PHASE_COMPLETED = 'phase:completed',
  PHASE_FAILED = 'phase:failed',
  DOCUMENT_COMPLETED = 'document:completed',
  DOCUMENT_FAILED = 'document:failed',
  METRICS_UPDATE = 'metrics:update'
}

export interface ProcessingEventData {
  documentId: string
  phase?: ProcessingPhase
  progress?: number
  message?: string
  error?: ProcessingError
  metrics?: ProcessingMetrics
}

export interface HistoryFilters {
  status?: 'all' | 'completed' | 'failed'
  dateRange?: { start: Date, end: Date }
  searchQuery?: string
  sortBy?: 'date' | 'name' | 'duration' | 'status'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface ExportRow {
  documentId: string
  documentName: string
  fileType: string
  fileSize: string
  status: string
  startTime: string
  endTime: string
  duration: string
  pageCount: string
  chunkCount: string
  conversionTime: string
  chunkingTime: string
  stagingTime: string
  errorMessage: string
  retryCount: string
}

export interface RetryItem {
  attempt: number
  lastRetry: Date
  documentId: string
}