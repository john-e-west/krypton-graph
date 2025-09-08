// Airtable Schema Types
export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface DocumentRecord extends AirtableRecord {
  fields: {
    title: string;
    content: string;
    source: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    episodeId?: string;
    chunkCount?: number;
    metadata?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ChunkRecord extends AirtableRecord {
  fields: {
    documentId: string[];
    content: string;
    chunkIndex: number;
    chunkSize: number;
    embedding?: number[];
    metadata?: string;
  };
}

export interface EntityRecord extends AirtableRecord {
  fields: {
    name: string;
    type: string;
    description?: string;
    documentIds?: string[];
    factIds?: string[];
    metadata?: string;
  };
}

export interface RelationshipRecord extends AirtableRecord {
  fields: {
    sourceEntity: string[];
    targetEntity: string[];
    relationshipType: string;
    strength?: number;
    documentIds?: string[];
    metadata?: string;
  };
}

export interface FactRecord extends AirtableRecord {
  fields: {
    subject: string;
    predicate: string;
    object: string;
    confidence?: number;
    sourceDocuments?: string[];
    zepFactId?: string;
    metadata?: string;
  };
}

export interface EpisodeRecord extends AirtableRecord {
  fields: {
    episodeId: string;
    userId: string;
    sessionId: string;
    documentIds?: string[];
    messageCount: number;
    startTime: string;
    endTime?: string;
    metadata?: string;
  };
}

export interface QueueRecord extends AirtableRecord {
  fields: {
    type: 'document' | 'search' | 'graph_update';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    priority: number;
    payload: string;
    result?: string;
    error?: string;
    attempts: number;
    createdAt: string;
    processedAt?: string;
  };
}

export interface AuditRecord extends AirtableRecord {
  fields: {
    action: string;
    entityType: string;
    entityId: string;
    userId?: string;
    changes?: string;
    timestamp: string;
    metadata?: string;
  };
}

// Graph Types
export interface GraphNode {
  id: string;
  label: string;
  type: 'entity' | 'document' | 'concept' | 'fact';
  properties: Record<string, any>;
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  weight?: number;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: Record<string, any>;
}

// Processing Types
export interface ProcessingConfig {
  chunkSize: number;
  chunkOverlap: number;
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface ProcessingStatus {
  documentId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunksProcessed: number;
  totalChunks: number;
  errors?: string[];
  startTime: Date;
  endTime?: Date;
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface SearchRequest {
  query: string;
  userId: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets?: Record<string, FacetValue[]>;
  queryTime: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  type: 'document' | 'fact' | 'entity';
  metadata: Record<string, any>;
  highlights?: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

// User Types
export interface KryptonUser {
  id: string;
  clerkId: string;
  zepUserId: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// System Types
export interface SystemMetrics {
  documentsProcessed: number;
  averageProcessingTime: number;
  queueLength: number;
  activeUsers: number;
  errorRate: number;
  timestamp: Date;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    zep: boolean;
    airtable: boolean;
    database: boolean;
    queue: boolean;
  };
  timestamp: Date;
}