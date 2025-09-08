import { ChunkData } from './sync.service';

export interface ZepChunkMetadata {
  chunk_position: number;
  source_page?: number;
  section?: string;
  quality_score?: number;
  document_id: string;
  document_title?: string;
  word_count?: number;
  character_count?: number;
  start_position?: number;
  end_position?: number;
  overlap_previous?: number;
  overlap_next?: number;
  has_entities?: boolean;
  processing_timestamp: string;
  sync_batch_id?: string;
  original_chunk_id: string;
}

export interface ZepDocumentContent {
  content: string;
  metadata: ZepChunkMetadata;
}

export interface MetadataValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export class MetadataMapperService {
  private requiredFields: (keyof ZepChunkMetadata)[] = [
    'chunk_position',
    'document_id',
    'processing_timestamp',
    'original_chunk_id'
  ];

  private defaultValues: Partial<ZepChunkMetadata> = {
    quality_score: 1.0,
    has_entities: false,
    word_count: 0,
    character_count: 0
  };

  /**
   * Maps Airtable chunk data to ZEP format
   */
  mapChunkToZepFormat(
    chunk: ChunkData,
    documentTitle?: string,
    batchId?: string
  ): ZepDocumentContent {
    const metadata: ZepChunkMetadata = {
      chunk_position: chunk.chunkIndex,
      document_id: chunk.documentId,
      original_chunk_id: chunk.id,
      processing_timestamp: new Date().toISOString(),
      
      // Map optional fields
      source_page: this.extractPageNumber(chunk),
      section: this.extractSectionTitle(chunk),
      quality_score: this.calculateQualityScore(chunk),
      document_title: documentTitle,
      word_count: chunk.wordCount || this.calculateWordCount(chunk.content),
      character_count: chunk.characterCount || chunk.content.length,
      start_position: chunk.startPosition,
      end_position: chunk.endPosition,
      overlap_previous: chunk.overlapPrevious,
      overlap_next: chunk.overlapNext,
      has_entities: chunk.hasEntities || false,
      sync_batch_id: batchId
    };

    // Apply defaults for missing values
    Object.keys(this.defaultValues).forEach(key => {
      if (metadata[key as keyof ZepChunkMetadata] === undefined) {
        (metadata as any)[key] = this.defaultValues[key as keyof typeof this.defaultValues];
      }
    });

    return {
      content: this.cleanAndNormalizeContent(chunk.content),
      metadata
    };
  }

  /**
   * Maps multiple chunks to ZEP format with batch processing
   */
  mapChunkBatchToZepFormat(
    chunks: ChunkData[],
    documentTitle?: string,
    batchId?: string
  ): ZepDocumentContent[] {
    return chunks.map(chunk => 
      this.mapChunkToZepFormat(chunk, documentTitle, batchId)
    );
  }

  /**
   * Validates metadata completeness
   */
  validateMetadata(metadata: ZepChunkMetadata): MetadataValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    this.requiredFields.forEach(field => {
      if (metadata[field] === undefined || metadata[field] === null) {
        missingFields.push(field);
      }
    });

    // Check for warnings
    if (!metadata.quality_score || metadata.quality_score < 0.5) {
      warnings.push('Low quality score detected');
    }

    if (!metadata.word_count || metadata.word_count < 10) {
      warnings.push('Very low word count - chunk might be too small');
    }

    if (metadata.content && metadata.content.length > 10000) {
      warnings.push('Very large chunk - consider splitting');
    }

    if (!metadata.section && !metadata.source_page) {
      warnings.push('No section or page information available');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Validates batch of metadata
   */
  validateMetadataBatch(
    contents: ZepDocumentContent[]
  ): { valid: ZepDocumentContent[], invalid: { content: ZepDocumentContent, errors: string[] }[] } {
    const valid: ZepDocumentContent[] = [];
    const invalid: { content: ZepDocumentContent, errors: string[] }[] = [];

    contents.forEach(content => {
      const validation = this.validateMetadata(content.metadata);
      
      if (validation.isValid) {
        valid.push(content);
      } else {
        invalid.push({
          content,
          errors: validation.missingFields
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * Creates metadata transformation summary
   */
  createTransformationSummary(
    chunks: ChunkData[],
    zepContents: ZepDocumentContent[]
  ): {
    totalChunks: number;
    successfulTransformations: number;
    averageQualityScore: number;
    sectionsFound: number;
    pagesFound: number;
    chunksWithEntities: number;
  } {
    const totalChunks = chunks.length;
    const successfulTransformations = zepContents.length;
    
    const qualityScores = zepContents
      .map(content => content.metadata.quality_score || 0)
      .filter(score => score > 0);
    
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    const sectionsFound = new Set(
      zepContents
        .map(content => content.metadata.section)
        .filter(Boolean)
    ).size;

    const pagesFound = new Set(
      zepContents
        .map(content => content.metadata.source_page)
        .filter(Boolean)
    ).size;

    const chunksWithEntities = zepContents.filter(
      content => content.metadata.has_entities
    ).length;

    return {
      totalChunks,
      successfulTransformations,
      averageQualityScore,
      sectionsFound,
      pagesFound,
      chunksWithEntities
    };
  }

  private extractPageNumber(chunk: ChunkData): number | undefined {
    // Try to extract page number from headings or content
    if (chunk.headings) {
      const pageMatch = chunk.headings.match(/page\s*(\d+)/i);
      if (pageMatch) {
        return parseInt(pageMatch[1], 10);
      }
    }

    // Try to extract from content
    const contentPageMatch = chunk.content.match(/(?:^|\n)(?:page|p\.?)\s*(\d+)/i);
    if (contentPageMatch) {
      return parseInt(contentPageMatch[1], 10);
    }

    // Estimate based on chunk position (assuming ~2 chunks per page)
    return Math.ceil((chunk.chunkIndex + 1) / 2);
  }

  private extractSectionTitle(chunk: ChunkData): string | undefined {
    if (!chunk.headings) {
      return undefined;
    }

    // Split headings and get the most relevant one
    const headings = chunk.headings.split('\n').filter(h => h.trim().length > 0);
    
    if (headings.length === 0) {
      return undefined;
    }

    // Return the last heading (most specific)
    return headings[headings.length - 1].trim();
  }

  private calculateQualityScore(chunk: ChunkData): number {
    let score = 1.0;

    // Reduce score for very short or very long chunks
    if (chunk.wordCount) {
      if (chunk.wordCount < 10) {
        score *= 0.5; // Very short
      } else if (chunk.wordCount > 1000) {
        score *= 0.8; // Very long
      }
    }

    // Boost score if chunk has entities
    if (chunk.hasEntities) {
      score *= 1.2;
    }

    // Boost score if chunk has section information
    if (chunk.headings && chunk.headings.trim().length > 0) {
      score *= 1.1;
    }

    // Reduce score if content seems malformed
    if (chunk.content.includes('�') || chunk.content.includes('\x00')) {
      score *= 0.6; // Encoding issues
    }

    // Ensure score stays within bounds
    return Math.max(0.1, Math.min(2.0, score));
  }

  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private cleanAndNormalizeContent(content: string): string {
    return content
      // Remove null bytes and replacement characters
      .replace(/\x00/g, '')
      .replace(/�/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Trim
      .trim();
  }
}