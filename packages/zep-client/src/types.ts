import type * as Zep from '@getzep/zep-cloud/api';

export interface ZepConfig {
  apiKey: string;
  projectId?: string;
  maxRetries?: number;
  retryDelay?: number;
  requestsPerMinute?: number;
  batchSize?: number;
}

export interface SearchQuery {
  userId: string;
  text: string;
  limit?: number;
  searchType?: 'similarity' | 'mmr' | 'reranked';
  searchScope?: 'messages' | 'facts' | 'documents';
  minScore?: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: Record<string, any>;
  episodeId?: string;
  factUuid?: string;
  documentId?: string;
}

export interface Episode {
  id: string;
  userId: string;
  sessionId: string;
  messages: Zep.Message[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingResult {
  success: boolean;
  episodeId?: string;
  documentIds?: string[];
  factIds?: string[];
  errors?: string[];
}

export interface BatchOperation<T> {
  items: T[];
  operation: 'add' | 'update' | 'delete';
  metadata?: Record<string, any>;
}

export interface RateLimiterOptions {
  requestsPerMinute: number;
  burstSize?: number;
  retryAfter?: number;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Define simplified types matching ZEP API
export interface Document {
  content: string;
  metadata?: Record<string, any>;
  documentId?: string;
  uuid?: string;
}

export interface Fact {
  name: string;
  fact: string;
  context?: string;
  createdAt?: string;
  uuid?: string;
}

export interface Graph {
  nodes: any[];
  edges: any[];
  userId: string;
}

export interface Memory {
  messages: Zep.Message[];
  metadata?: Record<string, any>;
  summary?: string;
}

export interface User {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
}

// Embedding-related types
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