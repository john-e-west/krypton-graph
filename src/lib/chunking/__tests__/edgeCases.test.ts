import { describe, it, expect, vi } from 'vitest';
import { ChunkingService } from '../chunkingService';
import { ChunkingConfig } from '../types';
import { findNaturalBoundary } from '../boundaryDetection';
import { calculateOverlap } from '../overlapStrategy';

describe('Chunking Edge Cases', () => {
  let chunkingService: ChunkingService;
  const defaultConfig: ChunkingConfig = {
    maxChunkSize: 10000,
    minChunkSize: 500,
    overlapPercentage: 15,
    useSmartBoundaries: false,
    preserveStructure: true,
    metadataOverhead: 500
  };

  beforeEach(() => {
    chunkingService = new ChunkingService(defaultConfig);
  });

  describe('Document Size Edge Cases', () => {
    it('should handle empty documents', async () => {
      const result = await chunkingService.chunkDocument('doc-empty', '');
      expect(result.chunks).toHaveLength(0);
    });

    it('should handle very small documents', async () => {
      const smallText = 'Short text.';
      const result = await chunkingService.chunkDocument('doc-small', smallText);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(smallText);
    });

    it('should handle documents exactly at max size', async () => {
      const exactSizeText = 'x'.repeat(9500); // Leave room for metadata
      const result = await chunkingService.chunkDocument('doc-exact', exactSizeText);
      expect(result.chunks).toHaveLength(1);
    });

    it('should handle very large documents', async () => {
      const largeText = 'x'.repeat(100000); // 10x max size
      const result = await chunkingService.chunkDocument('doc-large', largeText);
      expect(result.chunks.length).toBeGreaterThan(10);
      
      // Verify all chunks are within size limits
      result.chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(defaultConfig.maxChunkSize);
        expect(chunk.content.length).toBeGreaterThanOrEqual(defaultConfig.minChunkSize);
      });
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle Unicode characters correctly', async () => {
      const unicodeText = '你好世界 🌍 مرحبا بالعالم\n\nEmoji: 😀🎉🚀\n\nSpecial: €£¥';
      const result = await chunkingService.chunkDocument('doc-unicode', unicodeText);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(unicodeText);
    });

    it('should handle mixed line endings', async () => {
      const mixedLineEndings = 'Line 1\nLine 2\r\nLine 3\rLine 4';
      const result = await chunkingService.chunkDocument('doc-mixed', mixedLineEndings);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.paragraphCount).toBeGreaterThan(0);
    });

    it('should handle special markdown characters', async () => {
      const specialMd = '**bold** *italic* `code` [link](url) ![image](src)';
      const result = await chunkingService.chunkDocument('doc-special', specialMd);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(specialMd);
    });
  });

  describe('Code Block Preservation', () => {
    it('should never split code blocks', async () => {
      const codeDoc = 'Text before\n\n```javascript\n' + 
        'const veryLongCode = {\n' +
        '  '.repeat(1000) + 'nested: "deeply"\n' +
        '};\n```\n\nText after';
      
      const result = await chunkingService.chunkDocument('doc-code', codeDoc);
      
      // Verify code block is intact
      const codeBlockChunk = result.chunks.find(c => c.content.includes('```javascript'));
      expect(codeBlockChunk?.content).toContain('```\n');
      
      // Count opening and closing backticks
      const openCount = (codeBlockChunk?.content.match(/```/g) || []).length;
      expect(openCount % 2).toBe(0); // Should be even (paired)
    });

    it('should handle nested code blocks', async () => {
      const nestedCode = '````markdown\n```javascript\ncode\n```\n````';
      const result = await chunkingService.chunkDocument('doc-nested', nestedCode);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.hasCodeBlocks).toBe(true);
    });
  });

  describe('Table Preservation', () => {
    it('should never split tables', async () => {
      const tableDoc = 'Text before\n\n' +
        '| Header 1 | Header 2 | Header 3 |\n' +
        '|----------|----------|----------|\n' +
        '| Cell 1   | Cell 2   | Cell 3   |\n'.repeat(50) +
        '\nText after';
      
      const result = await chunkingService.chunkDocument('doc-table', tableDoc);
      
      // Verify table is intact
      const tableChunk = result.chunks.find(c => c.content.includes('| Header 1'));
      const pipeCount = (tableChunk?.content.match(/\|/g) || []).length;
      expect(pipeCount % 3).toBe(0); // Should have complete rows
    });
  });

  describe('Overlap Edge Cases', () => {
    it('should handle overlap when chunks are too small', () => {
      const chunk1 = 'Short';
      const chunk2 = 'Text';
      
      const overlap = calculateOverlap(chunk1, chunk2, 50); // 50% overlap
      expect(overlap.overlapSize).toBeLessThanOrEqual(chunk1.length);
    });

    it('should handle overlap at document boundaries', async () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const config = { ...defaultConfig, overlapPercentage: 20 };
      
      const service = new ChunkingService(config);
      const result = await service.chunkDocument('doc-overlap', text);
      
      // First chunk should not have previous overlap
      expect(result.chunks[0].overlapStart).toBeUndefined();
      
      // Last chunk should not have next overlap
      expect(result.chunks[result.chunks.length - 1].overlapEnd).toBeUndefined();
    });
  });

  describe('Boundary Detection Edge Cases', () => {
    it('should handle documents with no natural boundaries', () => {
      const noBoundaries = 'x'.repeat(1000); // No punctuation or breaks
      const boundary = findNaturalBoundary(noBoundaries, 500);
      
      expect(boundary.position).toBe(500); // Should fall back to position
      expect(boundary.confidence).toBeLessThan(0.5);
    });

    it('should prioritize heading boundaries', () => {
      const withHeadings = 'text\n## Heading\nmore text';
      const boundary = findNaturalBoundary(withHeadings, 10);
      
      expect(boundary.type).toBe('section');
      expect(boundary.position).toBe(withHeadings.indexOf('## Heading'));
    });

    it('should handle multiple consecutive boundaries', () => {
      const multiBoundaries = 'End.\n\n## New Section\n\nStart.';
      const boundary = findNaturalBoundary(multiBoundaries, 10);
      
      // Should pick the highest priority boundary
      expect(boundary.type).toBe('section');
    });
  });

  describe('Metadata Generation Edge Cases', () => {
    it('should handle documents with no headings', async () => {
      const noHeadings = 'Just plain text without any headings.';
      const result = await chunkingService.chunkDocument('doc-no-headings', noHeadings);
      
      expect(result.chunks[0].metadata.headings).toHaveLength(0);
    });

    it('should extract deeply nested headings', async () => {
      const deepHeadings = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      const result = await chunkingService.chunkDocument('doc-deep', deepHeadings);
      
      expect(result.chunks[0].metadata.headings).toHaveLength(6);
      expect(result.chunks[0].metadata.headings[5].level).toBe(6);
    });

    it('should count entities correctly', async () => {
      const withLists = '- Item 1\n- Item 2\n* Item 3\n1. Numbered\n2. List';
      const result = await chunkingService.chunkDocument('doc-lists', withLists);
      
      expect(result.chunks[0].metadata.hasLists).toBe(true);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle rapid successive chunking', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        chunkingService.chunkDocument(`doc-${i}`, `Document ${i}`)
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });

    it('should respect minimum chunk size', async () => {
      const text = 'a'.repeat(400); // Below minimum
      const result = await chunkingService.chunkDocument('doc-tiny', text);
      
      // Should still create a chunk even if below minimum
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content.length).toBe(400);
    });

    it('should handle chunk size with metadata overhead', async () => {
      const config = { ...defaultConfig, metadataOverhead: 1000 };
      const service = new ChunkingService(config);
      
      const text = 'x'.repeat(9500); // Max - overhead = 9000 for content
      const result = await service.chunkDocument('doc-overhead', text);
      
      // Should split because of metadata overhead
      expect(result.chunks.length).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle null document gracefully', async () => {
      const result = await chunkingService.chunkDocument('doc-null', null as any);
      expect(result.chunks).toHaveLength(0);
    });

    it('should handle undefined document gracefully', async () => {
      const result = await chunkingService.chunkDocument('doc-undefined', undefined as any);
      expect(result.chunks).toHaveLength(0);
    });

    it('should handle invalid configuration', () => {
      const invalidConfig = { ...defaultConfig, maxChunkSize: -100 };
      expect(() => new ChunkingService(invalidConfig)).toThrow();
    });

    it('should handle circular references in metadata', async () => {
      const text = 'Normal text';
      const result = await chunkingService.chunkDocument('doc-circular', text);
      
      // Should not throw when stringifying
      expect(() => JSON.stringify(result.chunks)).not.toThrow();
    });
  });
});