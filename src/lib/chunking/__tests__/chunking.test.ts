import { describe, it, expect, beforeEach } from 'vitest';
import { 
  findNaturalBoundary, 
  countSentences,
  countParagraphs,
  extractHeadings,
  hasCodeBlocks,
  hasTables,
  hasLists
} from '../boundaryDetection';
import { 
  calculateOverlap, 
  createOverlappingChunks,
  validateOverlap,
  getOverlapStatistics
} from '../overlapStrategy';
import { ChunkingService } from '../chunkingService';
import { ChunkAdjustmentManager } from '../chunkAdjustments';

describe('Boundary Detection', () => {
  describe('findNaturalBoundary', () => {
    it('should find section boundaries with highest priority', () => {
      const text = 'Some text here.\n\n## New Section\n\nMore content here.';
      const boundary = findNaturalBoundary(text, 20);
      expect(boundary.type).toBe('section');
      expect(boundary.confidence).toBeGreaterThan(0.9);
    });

    it('should find paragraph boundaries with medium priority', () => {
      const text = 'First paragraph here.\n\nSecond paragraph starts here.';
      const boundary = findNaturalBoundary(text, 25);
      expect(boundary.type).toBe('paragraph');
      expect(boundary.confidence).toBe(0.8);
    });

    it('should find sentence boundaries with lower priority', () => {
      const text = 'First sentence ends here. Second sentence starts here.';
      const boundary = findNaturalBoundary(text, 30);
      expect(boundary.type).toBe('sentence');
      expect(boundary.confidence).toBe(0.6);
    });

    it('should not break code blocks', () => {
      const text = 'Text before\n```javascript\nconst x = 1;\nconst y = 2;\n```\nText after';
      const codeBlockStart = text.indexOf('```');
      const codeBlockEnd = text.lastIndexOf('```') + 3;
      const boundary = findNaturalBoundary(text, codeBlockStart + 10);
      expect(boundary.position).toBe(codeBlockEnd);
    });

    it('should not break tables', () => {
      const text = 'Text before\n| Col1 | Col2 |\n|------|------|\n| A    | B    |\nText after';
      const tableStart = text.indexOf('|');
      const boundary = findNaturalBoundary(text, tableStart + 5);
      expect(boundary.position).toBeGreaterThan(text.indexOf('Text after') - 1);
    });
  });

  describe('Content Analysis', () => {
    it('should count sentences correctly', () => {
      const text = 'First sentence. Second one! Third? Fourth.';
      expect(countSentences(text)).toBe(4);
    });

    it('should count paragraphs correctly', () => {
      const text = 'Para 1\n\nPara 2\n\n\nPara 3';
      expect(countParagraphs(text)).toBe(3);
    });

    it('should extract headings correctly', () => {
      const text = '# H1 Title\n## H2 Subtitle\n### H3 Section\nContent';
      const headings = extractHeadings(text);
      expect(headings).toHaveLength(3);
      expect(headings[0]).toEqual({ level: 1, text: 'H1 Title' });
      expect(headings[1]).toEqual({ level: 2, text: 'H2 Subtitle' });
      expect(headings[2]).toEqual({ level: 3, text: 'H3 Section' });
    });

    it('should detect code blocks', () => {
      expect(hasCodeBlocks('```js\ncode\n```')).toBe(true);
      expect(hasCodeBlocks('no code here')).toBe(false);
    });

    it('should detect tables', () => {
      expect(hasTables('| Col |\n|-----|\n| Val |')).toBe(true);
      expect(hasTables('no table here')).toBe(false);
    });

    it('should detect lists', () => {
      expect(hasLists('- Item 1\n- Item 2')).toBe(true);
      expect(hasLists('1. First\n2. Second')).toBe(true);
      expect(hasLists('no list here')).toBe(false);
    });
  });
});

describe('Overlap Strategy', () => {
  describe('calculateOverlap', () => {
    it('should calculate overlap with correct percentage', () => {
      const prev = 'A'.repeat(1000);
      const next = 'B'.repeat(1000);
      const config = {
        percentage: 10,
        minOverlap: 50,
        maxOverlap: 200,
        preserveBoundaries: false
      };
      
      const result = calculateOverlap(prev, next, config);
      expect(result.overlapSize).toBeGreaterThanOrEqual(50);
      expect(result.overlapSize).toBeLessThanOrEqual(200);
    });

    it('should respect min and max overlap limits', () => {
      const prev = 'A'.repeat(100);
      const next = 'B'.repeat(100);
      const config = {
        percentage: 50, // Would be 50 chars
        minOverlap: 60,
        maxOverlap: 80,
        preserveBoundaries: false
      };
      
      const result = calculateOverlap(prev, next, config);
      expect(result.overlapSize).toBe(60); // Clamped to minimum
    });
  });

  describe('createOverlappingChunks', () => {
    it('should create chunks with proper overlap', () => {
      const text = 'A'.repeat(3000);
      const chunkSizes = [1000, 1000, 1000];
      const config = {
        percentage: 10,
        minOverlap: 50,
        maxOverlap: 200,
        preserveBoundaries: false
      };
      
      const chunks = createOverlappingChunks(text, chunkSizes, config);
      expect(chunks).toHaveLength(3);
      
      // Check that chunks have overlap
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].overlapStart).toBeDefined();
        expect(chunks[i].overlapEnd).toBeDefined();
      }
    });
  });

  describe('validateOverlap', () => {
    it('should validate correct overlaps', () => {
      const chunks = [
        { content: 'chunk1', overlapStart: undefined, overlapEnd: undefined },
        { content: 'chunk2', overlapStart: 900, overlapEnd: 1000 },
        { content: 'chunk3', overlapStart: 1900, overlapEnd: 2000 }
      ];
      
      expect(validateOverlap(chunks)).toBe(true);
    });

    it('should detect invalid overlaps', () => {
      const chunks = [
        { content: 'chunk1', overlapStart: undefined, overlapEnd: undefined },
        { content: 'chunk2', overlapStart: 1100, overlapEnd: 1000 } // Invalid
      ];
      
      expect(validateOverlap(chunks)).toBe(false);
    });
  });

  describe('getOverlapStatistics', () => {
    it('should calculate overlap statistics correctly', () => {
      const chunks = [
        { content: 'chunk1', overlapStart: undefined, overlapEnd: undefined },
        { content: 'chunk2', overlapStart: 900, overlapEnd: 1000 },
        { content: 'chunk3', overlapStart: 1850, overlapEnd: 2000 }
      ];
      
      const stats = getOverlapStatistics(chunks);
      expect(stats.totalOverlap).toBe(250); // 100 + 150
      expect(stats.averageOverlap).toBe(125);
      expect(stats.minOverlap).toBe(100);
      expect(stats.maxOverlap).toBe(150);
    });
  });
});

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService({
      maxChunkSize: 1000,
      minChunkSize: 100,
      overlapPercentage: 15,
      useSmartBoundaries: false, // Use rule-based for predictable tests
      preserveStructure: true,
      metadataOverhead: 100
    });
  });

  describe('chunkDocument', () => {
    it('should chunk a simple document', async () => {
      const text = 'A'.repeat(500) + '\n\n' + 'B'.repeat(500) + '\n\n' + 'C'.repeat(500);
      const result = await service.chunkDocument('doc1', text);
      
      expect(result.success).toBe(true);
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.statistics.totalChunks).toBe(result.chunks.length);
    });

    it('should respect max chunk size', async () => {
      const text = 'A'.repeat(3000);
      const result = await service.chunkDocument('doc1', text);
      
      expect(result.success).toBe(true);
      result.chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(1000);
      });
    });

    it('should generate metadata for each chunk', async () => {
      const text = '# Title\n\nParagraph 1.\n\n## Section\n\nParagraph 2.';
      const result = await service.chunkDocument('doc1', text);
      
      expect(result.success).toBe(true);
      result.chunks.forEach(chunk => {
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata.wordCount).toBeGreaterThan(0);
        expect(chunk.metadata.characterCount).toBe(chunk.content.length);
      });
    });

    it('should handle documents with code blocks', async () => {
      const text = 'Text before\n\n```javascript\nconst x = 1;\nconst y = 2;\n```\n\nText after';
      const result = await service.chunkDocument('doc1', text);
      
      expect(result.success).toBe(true);
      const hasCodeChunk = result.chunks.some(c => c.metadata.hasCodeBlocks);
      expect(hasCodeChunk).toBe(true);
    });

    it('should validate chunks when requested', async () => {
      const text = 'A'.repeat(1500);
      const result = await service.chunkDocument('doc1', text, {
        validateChunks: true
      });
      
      expect(result.success).toBe(true);
      if (result.errors) {
        expect(result.errors.length).toBe(0);
      }
    });
  });

  describe('batchChunkDocuments', () => {
    it('should process multiple documents', async () => {
      const documents = [
        { id: 'doc1', text: 'A'.repeat(1000) },
        { id: 'doc2', text: 'B'.repeat(1500) },
        { id: 'doc3', text: 'C'.repeat(800) }
      ];
      
      const results = await service.batchChunkDocuments(documents);
      
      expect(results.size).toBe(3);
      expect(results.has('doc1')).toBe(true);
      expect(results.has('doc2')).toBe(true);
      expect(results.has('doc3')).toBe(true);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('ChunkAdjustmentManager', () => {
  const createTestChunks = () => {
    return [
      {
        id: 'chunk1',
        documentId: 'doc1',
        content: 'First chunk content',
        index: 0,
        startChar: 0,
        endChar: 19,
        metadata: {
          documentId: 'doc1',
          chunkIndex: 0,
          totalChunks: 3,
          startPosition: 0,
          endPosition: 19,
          wordCount: 3,
          characterCount: 19,
          sentenceCount: 1,
          paragraphCount: 1,
          headings: [],
          hasCodeBlocks: false,
          hasTables: false,
          hasLists: false,
          nextChunkId: 'chunk2'
        }
      },
      {
        id: 'chunk2',
        documentId: 'doc1',
        content: 'Second chunk content',
        index: 1,
        startChar: 19,
        endChar: 39,
        metadata: {
          documentId: 'doc1',
          chunkIndex: 1,
          totalChunks: 3,
          startPosition: 19,
          endPosition: 39,
          wordCount: 3,
          characterCount: 20,
          sentenceCount: 1,
          paragraphCount: 1,
          headings: [],
          hasCodeBlocks: false,
          hasTables: false,
          hasLists: false,
          previousChunkId: 'chunk1',
          nextChunkId: 'chunk3'
        }
      },
      {
        id: 'chunk3',
        documentId: 'doc1',
        content: 'Third chunk content',
        index: 2,
        startChar: 39,
        endChar: 58,
        metadata: {
          documentId: 'doc1',
          chunkIndex: 2,
          totalChunks: 3,
          startPosition: 39,
          endPosition: 58,
          wordCount: 3,
          characterCount: 19,
          sentenceCount: 1,
          paragraphCount: 1,
          headings: [],
          hasCodeBlocks: false,
          hasTables: false,
          hasLists: false,
          previousChunkId: 'chunk2'
        }
      }
    ];
  };

  describe('mergeChunks', () => {
    it('should merge adjacent chunks', () => {
      const chunks = createTestChunks();
      const originalText = chunks.map(c => c.content).join('');
      const manager = new ChunkAdjustmentManager(chunks, originalText, 'doc1');
      
      const result = manager.mergeChunks('chunk1', 'chunk2');
      expect(result.length).toBe(2); // 3 chunks merged to 2
    });

    it('should throw error for non-adjacent chunks', () => {
      const chunks = createTestChunks();
      const originalText = chunks.map(c => c.content).join('');
      const manager = new ChunkAdjustmentManager(chunks, originalText, 'doc1');
      
      expect(() => manager.mergeChunks('chunk1', 'chunk3')).toThrow();
    });
  });

  describe('validateChunks', () => {
    it('should validate correct chunk structure', () => {
      const chunks = createTestChunks();
      const originalText = chunks.map(c => c.content).join('');
      const manager = new ChunkAdjustmentManager(chunks, originalText, 'doc1');
      
      const validation = manager.validateChunks();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});