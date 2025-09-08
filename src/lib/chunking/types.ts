export interface ChunkingConfig {
  maxChunkSize: number;          // characters including metadata
  minChunkSize: number;          // minimum viable chunk
  overlapPercentage: number;     // 10-20% configurable
  useSmartBoundaries: boolean;  // OpenAI enhancement
  preserveStructure: boolean;   // keep sections intact
  metadataOverhead: number;      // reserved for metadata
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  overlapStart?: number;
  overlapEnd?: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  // Position metadata
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  startPosition: number;
  endPosition: number;
  
  // Content metadata
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  
  // Structural metadata
  headings: Array<{level: number; text: string}>;
  hasCodeBlocks: boolean;
  hasTables: boolean;
  hasLists: boolean;
  
  // Semantic metadata (from OpenAI)
  summary?: string;
  topics?: string[];
  entities?: string[];
  
  // Navigation
  previousChunkId?: string;
  nextChunkId?: string;
  overlapWithPrevious?: number;
  overlapWithNext?: number;
}

export interface BoundaryMarkers {
  section: RegExp;
  paragraph: RegExp;
  sentence: RegExp;
  codeBlock: RegExp;
  table: RegExp;
  list: RegExp;
}

export interface ChunkBoundary {
  position: number;
  type: 'section' | 'paragraph' | 'sentence' | 'forced';
  confidence: number;
}