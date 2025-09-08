import { 
  ChunkingConfig, 
  DocumentChunk, 
  ChunkMetadata,
  ChunkBoundary 
} from './types';
import { findNaturalBoundary } from './boundaryDetection';
import { createOverlappingChunks, OverlapConfig } from './overlapStrategy';
import { SmartBoundaryDetector } from './smartBoundaries';
import { MetadataGenerator } from './metadataGenerator';
import { ChunkAdjustmentManager } from './chunkAdjustments';

export interface ChunkingResult {
  chunks: DocumentChunk[];
  statistics: {
    totalChunks: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalOverlap: number;
    processingTime: number;
  };
  success: boolean;
  errors?: string[];
}

export interface ChunkingOptions {
  config?: Partial<ChunkingConfig>;
  useSmartBoundaries?: boolean;
  generateSemanticMetadata?: boolean;
  validateChunks?: boolean;
}

export class ChunkingService {
  private config: ChunkingConfig;
  private smartDetector: SmartBoundaryDetector;
  private metadataGenerator: MetadataGenerator;
  private maxConcurrent = 5;

  constructor(config?: Partial<ChunkingConfig>, openAiApiKey?: string) {
    this.config = {
      maxChunkSize: config?.maxChunkSize || 9500, // Leave room for metadata
      minChunkSize: config?.minChunkSize || 500,
      overlapPercentage: config?.overlapPercentage || 15,
      useSmartBoundaries: config?.useSmartBoundaries ?? true,
      preserveStructure: config?.preserveStructure ?? true,
      metadataOverhead: config?.metadataOverhead || 500
    };

    // Validate configuration
    if (this.config.maxChunkSize <= 0) {
      throw new Error('maxChunkSize must be positive');
    }
    if (this.config.minChunkSize <= 0) {
      throw new Error('minChunkSize must be positive');
    }
    if (this.config.maxChunkSize <= this.config.minChunkSize) {
      throw new Error('maxChunkSize must be greater than minChunkSize');
    }
    if (this.config.overlapPercentage < 0 || this.config.overlapPercentage > 100) {
      throw new Error('overlapPercentage must be between 0 and 100');
    }

    this.smartDetector = new SmartBoundaryDetector(openAiApiKey);
    this.metadataGenerator = new MetadataGenerator(openAiApiKey);
  }

  async chunkDocument(
    documentId: string,
    text: string,
    options: ChunkingOptions = {}
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Apply options to config
      const effectiveConfig = { ...this.config, ...options.config };
      
      // Step 1: Determine chunk boundaries
      let boundaries: ChunkBoundary[];
      if (effectiveConfig.useSmartBoundaries && options.useSmartBoundaries !== false) {
        boundaries = await this.smartDetector.getSmartBoundaries(
          text,
          effectiveConfig.maxChunkSize - effectiveConfig.metadataOverhead
        );
      } else {
        boundaries = this.getRuleBasedBoundaries(
          text,
          effectiveConfig.maxChunkSize - effectiveConfig.metadataOverhead
        );
      }

      // Step 2: Create initial chunks with overlap
      const overlapConfig: OverlapConfig = {
        percentage: effectiveConfig.overlapPercentage,
        minOverlap: 100,
        maxOverlap: 2000,
        preserveBoundaries: effectiveConfig.preserveStructure
      };

      const chunkSizes = this.calculateChunkSizes(text, boundaries);
      let rawChunks = createOverlappingChunks(text, chunkSizes, overlapConfig);
      
      // FAILSAFE: Split any chunks that exceed max size
      rawChunks = this.enforceSizeLimits(rawChunks, effectiveConfig.maxChunkSize);

      // Step 3: Generate metadata for each chunk
      const chunks: DocumentChunk[] = [];
      for (let i = 0; i < rawChunks.length; i++) {
        const rawChunk = rawChunks[i];
        const chunkId = crypto.randomUUID();
        
        let metadata: ChunkMetadata;
        if (options.generateSemanticMetadata) {
          metadata = await this.metadataGenerator.generateMetadata(
            rawChunk.content,
            documentId,
            i,
            rawChunks.length,
            rawChunk.start,
            rawChunk.end,
            i > 0 ? chunks[i - 1].id : undefined,
            i < rawChunks.length - 1 ? `pending-${i + 1}` : undefined,
            rawChunk.overlapStart,
            rawChunk.overlapEnd
          );
        } else {
          // Generate basic metadata without semantic analysis
          const metadataArray = this.metadataGenerator.generateBatchMetadata(
            [rawChunk],
            documentId
          );
          metadata = metadataArray[0];
        }

        chunks.push({
          id: chunkId,
          documentId,
          content: rawChunk.content,
          index: i,
          startChar: rawChunk.start,
          endChar: rawChunk.end,
          overlapStart: rawChunk.overlapStart,
          overlapEnd: rawChunk.overlapEnd,
          metadata
        });
      }

      // Update next chunk IDs
      chunks.forEach((chunk, i) => {
        if (i < chunks.length - 1) {
          chunk.metadata.nextChunkId = chunks[i + 1].id;
        }
      });

      // Step 4: Validate chunks if requested
      if (options.validateChunks) {
        const manager = new ChunkAdjustmentManager(chunks, text, documentId);
        const validation = manager.validateChunks();
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(chunks, Date.now() - startTime);

      return {
        chunks,
        statistics,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Chunking failed:', error);
      return {
        chunks: [],
        statistics: {
          totalChunks: 0,
          averageChunkSize: 0,
          minChunkSize: 0,
          maxChunkSize: 0,
          totalOverlap: 0,
          processingTime: Date.now() - startTime
        },
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  async batchChunkDocuments(
    documents: Array<{ id: string; text: string }>,
    options: ChunkingOptions = {}
  ): Promise<Map<string, ChunkingResult>> {
    const results = new Map<string, ChunkingResult>();
    const queue = [...documents];
    const processing: Promise<void>[] = [];

    // Process documents in batches
    while (queue.length > 0 || processing.length > 0) {
      // Start new processing tasks up to max concurrent
      while (processing.length < this.maxConcurrent && queue.length > 0) {
        const doc = queue.shift()!;
        const task = this.chunkDocument(doc.id, doc.text, options)
          .then(result => {
            results.set(doc.id, result);
          })
          .catch(error => {
            results.set(doc.id, {
              chunks: [],
              statistics: {
                totalChunks: 0,
                averageChunkSize: 0,
                minChunkSize: 0,
                maxChunkSize: 0,
                totalOverlap: 0,
                processingTime: 0
              },
              success: false,
              errors: [error.message]
            });
          });
        
        processing.push(task);
      }

      // Wait for at least one task to complete
      if (processing.length > 0) {
        await Promise.race(processing);
        // Remove completed tasks
        await Promise.allSettled(processing);
        processing.length = 0;
        // All settled promises are complete, nothing to re-add
      }
    }

    return results;
  }

  private getRuleBasedBoundaries(text: string, targetChunkSize: number): ChunkBoundary[] {
    const boundaries: ChunkBoundary[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length - targetChunkSize) {
      const targetPosition = currentPosition + targetChunkSize;
      const boundary = findNaturalBoundary(text, targetPosition);
      boundaries.push(boundary);
      currentPosition = boundary.position;
    }

    return boundaries;
  }

  private calculateChunkSizes(text: string, boundaries: ChunkBoundary[]): number[] {
    const sizes: number[] = [];
    let lastPosition = 0;

    for (const boundary of boundaries) {
      sizes.push(boundary.position - lastPosition);
      lastPosition = boundary.position;
    }

    // Add the final chunk
    if (lastPosition < text.length) {
      sizes.push(text.length - lastPosition);
    }

    return sizes;
  }

  private calculateStatistics(
    chunks: DocumentChunk[],
    processingTime: number
  ): ChunkingResult['statistics'] {
    let minSize = Number.MAX_VALUE;
    let maxSize = 0;
    let totalSize = 0;
    let totalOverlap = 0;

    chunks.forEach(chunk => {
      const size = chunk.content.length;
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);
      totalSize += size;

      if (chunk.overlapStart !== undefined && chunk.overlapEnd !== undefined) {
        totalOverlap += chunk.overlapEnd - chunk.overlapStart;
      }
    });

    return {
      totalChunks: chunks.length,
      averageChunkSize: chunks.length > 0 ? Math.round(totalSize / chunks.length) : 0,
      minChunkSize: chunks.length > 0 ? minSize : 0,
      maxChunkSize: maxSize,
      totalOverlap,
      processingTime
    };
  }

  private enforceSizeLimits(
    chunks: Array<{
      content: string;
      start: number;
      end: number;
      overlapStart?: number;
      overlapEnd?: number;
    }>,
    maxSize: number
  ): Array<{
    content: string;
    start: number;
    end: number;
    overlapStart?: number;
    overlapEnd?: number;
  }> {
    const result: Array<{
      content: string;
      start: number;
      end: number;
      overlapStart?: number;
      overlapEnd?: number;
    }> = [];

    for (const chunk of chunks) {
      if (chunk.content.length <= maxSize) {
        result.push(chunk);
      } else {
        // Split oversized chunk into smaller chunks
        let position = chunk.start;
        const text = chunk.content;
        
        while (position < chunk.end) {
          const remainingLength = chunk.end - position;
          const chunkSize = Math.min(maxSize, remainingLength);
          const chunkEnd = position + chunkSize;
          
          result.push({
            content: chunk.content.substring(position - chunk.start, chunkEnd - chunk.start),
            start: position,
            end: chunkEnd,
            // Clear overlap info for split chunks
            overlapStart: undefined,
            overlapEnd: undefined
          });
          
          position = chunkEnd;
        }
      }
    }

    return result;
  }

  updateConfig(config: Partial<ChunkingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChunkingConfig {
    return { ...this.config };
  }

  createAdjustmentManager(
    chunks: DocumentChunk[],
    originalText: string,
    documentId: string
  ): ChunkAdjustmentManager {
    return new ChunkAdjustmentManager(chunks, originalText, documentId);
  }

  async rechunkWithBoundaries(
    text: string, 
    documentId: string, 
    boundaries: number[]
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let lastPosition = 0;
    
    // Sort boundaries to ensure they're in order
    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    
    for (let i = 0; i <= sortedBoundaries.length; i++) {
      const endPosition = i < sortedBoundaries.length ? sortedBoundaries[i] : text.length;
      const chunkContent = text.substring(lastPosition, endPosition);
      
      if (chunkContent.trim()) {
        // Generate basic metadata using batch method
        const rawChunkData = {
          content: chunkContent,
          start: lastPosition,
          end: endPosition
        };
        
        const metadataArray = this.metadataGenerator.generateBatchMetadata(
          [rawChunkData],
          documentId
        );
        const metadata = metadataArray[0];
        
        const chunk: DocumentChunk = {
          id: `${documentId}-chunk-${i}`,
          documentId,
          content: chunkContent,
          index: i,
          startChar: lastPosition,
          endChar: endPosition,
          metadata
        };
        
        // Add overlap information if applicable
        if (i > 0 && this.config.overlapPercentage > 0) {
          const overlapSize = Math.floor(chunkContent.length * (this.config.overlapPercentage / 100));
          chunk.overlapStart = Math.max(lastPosition - overlapSize, 0);
          chunk.overlapEnd = lastPosition;
        }
        
        chunks.push(chunk);
      }
      
      lastPosition = endPosition;
    }
    
    // Update navigation references
    chunks.forEach((chunk, index) => {
      if (index > 0) {
        chunk.metadata.previousChunkId = chunks[index - 1].id;
      }
      if (index < chunks.length - 1) {
        chunk.metadata.nextChunkId = chunks[index + 1].id;
      }
    });
    
    return chunks;
  }
}