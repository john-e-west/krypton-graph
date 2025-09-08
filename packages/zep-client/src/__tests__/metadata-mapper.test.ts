import { describe, it, expect } from 'vitest';
import { MetadataMapperService } from '../services/metadata-mapper.service';
import { ChunkData } from '../services/sync.service';

describe('MetadataMapperService', () => {
  let mapperService: MetadataMapperService;

  const mockChunk: ChunkData = {
    id: 'chunk1',
    content: 'This is a sample chunk content with multiple words and sentences.',
    chunkIndex: 2,
    documentId: 'doc1',
    wordCount: 12,
    characterCount: 65,
    startPosition: 100,
    endPosition: 165,
    overlapPrevious: 5,
    overlapNext: 3,
    headings: 'Chapter 1: Introduction\nSection 1.1: Overview',
    hasEntities: true
  };

  beforeEach(() => {
    mapperService = new MetadataMapperService();
  });

  describe('mapChunkToZepFormat', () => {
    it('should map chunk data to ZEP format correctly', () => {
      const result = mapperService.mapChunkToZepFormat(
        mockChunk,
        'Test Document',
        'batch123'
      );

      expect(result.content).toBe(mockChunk.content);
      expect(result.metadata.chunk_position).toBe(2);
      expect(result.metadata.document_id).toBe('doc1');
      expect(result.metadata.original_chunk_id).toBe('chunk1');
      expect(result.metadata.document_title).toBe('Test Document');
      expect(result.metadata.sync_batch_id).toBe('batch123');
      expect(result.metadata.word_count).toBe(12);
      expect(result.metadata.character_count).toBe(65);
      expect(result.metadata.start_position).toBe(100);
      expect(result.metadata.end_position).toBe(165);
      expect(result.metadata.overlap_previous).toBe(5);
      expect(result.metadata.overlap_next).toBe(3);
      expect(result.metadata.has_entities).toBe(true);
      expect(result.metadata.processing_timestamp).toBeDefined();
      expect(new Date(result.metadata.processing_timestamp)).toBeInstanceOf(Date);
    });

    it('should extract section title from headings', () => {
      const result = mapperService.mapChunkToZepFormat(mockChunk);

      expect(result.metadata.section).toBe('Section 1.1: Overview');
    });

    it('should estimate page number from chunk position', () => {
      const chunk = { ...mockChunk, chunkIndex: 5 };
      const result = mapperService.mapChunkToZepFormat(chunk);

      expect(result.metadata.source_page).toBe(3); // Math.ceil((5+1)/2)
    });

    it('should extract page number from headings', () => {
      const chunkWithPageInHeadings = {
        ...mockChunk,
        headings: 'Chapter 1\nPage 15\nSection A'
      };

      const result = mapperService.mapChunkToZepFormat(chunkWithPageInHeadings);

      expect(result.metadata.source_page).toBe(15);
    });

    it('should calculate quality score correctly', () => {
      const result = mapperService.mapChunkToZepFormat(mockChunk);

      expect(result.metadata.quality_score).toBeGreaterThan(1.0); // Should be boosted for entities and headings
      expect(result.metadata.quality_score).toBeLessThanOrEqual(2.0);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalChunk: ChunkData = {
        id: 'chunk2',
        content: 'Minimal content',
        chunkIndex: 0,
        documentId: 'doc2'
      };

      const result = mapperService.mapChunkToZepFormat(minimalChunk);

      expect(result.metadata.chunk_position).toBe(0);
      expect(result.metadata.document_id).toBe('doc2');
      expect(result.metadata.original_chunk_id).toBe('chunk2');
      expect(result.metadata.word_count).toBe(2); // Calculated from content
      expect(result.metadata.character_count).toBe(15);
      expect(result.metadata.has_entities).toBe(false); // Default
      expect(result.metadata.quality_score).toBe(1.0); // Default
    });

    it('should clean and normalize content', () => {
      const chunkWithBadContent: ChunkData = {
        id: 'chunk3',
        content: 'Content with   excessive   spaces\n\n\n\nand    newlines\x00\u0000',
        chunkIndex: 0,
        documentId: 'doc3'
      };

      const result = mapperService.mapChunkToZepFormat(chunkWithBadContent);

      expect(result.content).toBe('Content with excessive spaces\n\nand newlines');
    });
  });

  describe('mapChunkBatchToZepFormat', () => {
    it('should map multiple chunks correctly', () => {
      const chunks: ChunkData[] = [
        { ...mockChunk, id: 'chunk1', chunkIndex: 0 },
        { ...mockChunk, id: 'chunk2', chunkIndex: 1 },
        { ...mockChunk, id: 'chunk3', chunkIndex: 2 }
      ];

      const results = mapperService.mapChunkBatchToZepFormat(
        chunks,
        'Batch Document',
        'batch456'
      );

      expect(results).toHaveLength(3);
      expect(results[0].metadata.chunk_position).toBe(0);
      expect(results[1].metadata.chunk_position).toBe(1);
      expect(results[2].metadata.chunk_position).toBe(2);
      expect(results.every(r => r.metadata.document_title === 'Batch Document')).toBe(true);
      expect(results.every(r => r.metadata.sync_batch_id === 'batch456')).toBe(true);
    });
  });

  describe('validateMetadata', () => {
    it('should validate complete metadata as valid', () => {
      const validMetadata = {
        chunk_position: 1,
        document_id: 'doc1',
        original_chunk_id: 'chunk1',
        processing_timestamp: new Date().toISOString(),
        quality_score: 1.5,
        word_count: 50,
        has_entities: true,
        section: 'Chapter 1'
      };

      const result = mapperService.validateMetadata(validMetadata as any);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const invalidMetadata = {
        chunk_position: 1,
        // Missing document_id, original_chunk_id, processing_timestamp
        quality_score: 1.0
      };

      const result = mapperService.validateMetadata(invalidMetadata as any);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('document_id');
      expect(result.missingFields).toContain('original_chunk_id');
      expect(result.missingFields).toContain('processing_timestamp');
    });

    it('should generate warnings for low quality indicators', () => {
      const lowQualityMetadata = {
        chunk_position: 1,
        document_id: 'doc1',
        original_chunk_id: 'chunk1',
        processing_timestamp: new Date().toISOString(),
        quality_score: 0.3, // Low quality
        word_count: 5, // Very low word count
        content: 'x'.repeat(15000) // Very large chunk
      };

      const result = mapperService.validateMetadata(lowQualityMetadata as any);

      expect(result.warnings).toContain('Low quality score detected');
      expect(result.warnings).toContain('Very low word count - chunk might be too small');
      expect(result.warnings).toContain('Very large chunk - consider splitting');
    });

    it('should warn when section and page info are missing', () => {
      const metadataWithoutContext = {
        chunk_position: 1,
        document_id: 'doc1',
        original_chunk_id: 'chunk1',
        processing_timestamp: new Date().toISOString()
      };

      const result = mapperService.validateMetadata(metadataWithoutContext as any);

      expect(result.warnings).toContain('No section or page information available');
    });
  });

  describe('validateMetadataBatch', () => {
    it('should separate valid and invalid chunks', () => {
      const chunks = [
        {
          content: 'Valid chunk 1',
          metadata: {
            chunk_position: 1,
            document_id: 'doc1',
            original_chunk_id: 'chunk1',
            processing_timestamp: new Date().toISOString()
          }
        },
        {
          content: 'Invalid chunk',
          metadata: {
            chunk_position: 2,
            // Missing required fields
          }
        },
        {
          content: 'Valid chunk 2',
          metadata: {
            chunk_position: 3,
            document_id: 'doc1',
            original_chunk_id: 'chunk3',
            processing_timestamp: new Date().toISOString()
          }
        }
      ];

      const result = mapperService.validateMetadataBatch(chunks as any);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].errors).toContain('document_id');
      expect(result.invalid[0].errors).toContain('original_chunk_id');
      expect(result.invalid[0].errors).toContain('processing_timestamp');
    });
  });

  describe('createTransformationSummary', () => {
    it('should generate accurate transformation summary', () => {
      const chunks: ChunkData[] = [
        { ...mockChunk, id: 'chunk1', hasEntities: true },
        { ...mockChunk, id: 'chunk2', hasEntities: false },
        { ...mockChunk, id: 'chunk3', hasEntities: true }
      ];

      const zepContents = mapperService.mapChunkBatchToZepFormat(chunks);
      const summary = mapperService.createTransformationSummary(chunks, zepContents);

      expect(summary.totalChunks).toBe(3);
      expect(summary.successfulTransformations).toBe(3);
      expect(summary.averageQualityScore).toBeGreaterThan(0);
      expect(summary.chunksWithEntities).toBe(2);
      expect(summary.sectionsFound).toBeGreaterThan(0);
      expect(summary.pagesFound).toBeGreaterThan(0);
    });

    it('should handle empty batches', () => {
      const summary = mapperService.createTransformationSummary([], []);

      expect(summary.totalChunks).toBe(0);
      expect(summary.successfulTransformations).toBe(0);
      expect(summary.averageQualityScore).toBe(0);
      expect(summary.chunksWithEntities).toBe(0);
      expect(summary.sectionsFound).toBe(0);
      expect(summary.pagesFound).toBe(0);
    });
  });

  describe('quality score calculation', () => {
    it('should penalize very short chunks', () => {
      const shortChunk = { ...mockChunk, wordCount: 5 };
      const result = mapperService.mapChunkToZepFormat(shortChunk);

      expect(result.metadata.quality_score).toBeLessThan(1.0);
    });

    it('should penalize very long chunks', () => {
      const longChunk = { ...mockChunk, wordCount: 1500 };
      const result = mapperService.mapChunkToZepFormat(longChunk);

      expect(result.metadata.quality_score).toBeLessThan(1.5); // Less than max boost
    });

    it('should boost chunks with entities', () => {
      const chunkWithEntities = { ...mockChunk, hasEntities: true };
      const chunkWithoutEntities = { ...mockChunk, hasEntities: false };

      const resultWith = mapperService.mapChunkToZepFormat(chunkWithEntities);
      const resultWithout = mapperService.mapChunkToZepFormat(chunkWithoutEntities);

      expect(resultWith.metadata.quality_score).toBeGreaterThan(resultWithout.metadata.quality_score);
    });

    it('should boost chunks with section headings', () => {
      const chunkWithHeadings = { ...mockChunk, headings: 'Chapter 1' };
      const chunkWithoutHeadings = { ...mockChunk, headings: undefined };

      const resultWith = mapperService.mapChunkToZepFormat(chunkWithHeadings);
      const resultWithout = mapperService.mapChunkToZepFormat(chunkWithoutHeadings);

      expect(resultWith.metadata.quality_score).toBeGreaterThan(resultWithout.metadata.quality_score);
    });

    it('should penalize malformed content', () => {
      const malformedChunk = { 
        ...mockChunk, 
        content: 'Content with � replacement characters and \x00 null bytes'
      };
      
      const result = mapperService.mapChunkToZepFormat(malformedChunk);

      expect(result.metadata.quality_score).toBeLessThan(1.0);
    });

    it('should keep quality score within bounds', () => {
      // Test extreme case that would normally exceed bounds
      const extremeChunk = {
        ...mockChunk,
        wordCount: 50000, // Very long
        hasEntities: false,
        headings: undefined,
        content: 'Content with � bad characters'
      };

      const result = mapperService.mapChunkToZepFormat(extremeChunk);

      expect(result.metadata.quality_score).toBeGreaterThanOrEqual(0.1);
      expect(result.metadata.quality_score).toBeLessThanOrEqual(2.0);
    });
  });
});