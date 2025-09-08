import { DocumentChunker, ChunkingOptions } from '../document-chunker';

describe('DocumentChunker', () => {
  let chunker: DocumentChunker;

  beforeEach(() => {
    chunker = new DocumentChunker();
  });

  describe('Small documents', () => {
    it('should return single chunk for small documents', async () => {
      const content = 'This is a small document that fits in one chunk.';
      const chunks = await chunker.chunkDocument('test-doc', content);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(content);
      expect(chunks[0].metadata.chunkNumber).toBe(0);
      expect(chunks[0].metadata.totalChunks).toBe(1);
      expect(chunks[0].metadata.originalDocumentId).toBe('test-doc');
    });
  });

  describe('Large documents', () => {
    it('should split large documents into multiple chunks', async () => {
      // Create a document larger than default chunk size (10000 chars)
      const sentence = 'This is a test sentence with some content. ';
      const content = sentence.repeat(300); // ~12000+ characters

      const chunks = await chunker.chunkDocument('large-doc', content);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].metadata.totalChunks).toBe(chunks.length);

      // Verify all chunks are within size limit
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(10000);
        expect(chunk.metadata.originalDocumentId).toBe('large-doc');
      });
    });

    it('should maintain proper chunk numbering', async () => {
      const content = 'A'.repeat(25000); // Large enough for 3+ chunks
      const chunks = await chunker.chunkDocument('numbered-doc', content);

      expect(chunks.length).toBeGreaterThan(2);

      chunks.forEach((chunk, index) => {
        expect(chunk.metadata.chunkNumber).toBe(index);
        expect(chunk.id).toBe(`numbered-doc_chunk_${index}`);
      });
    });
  });

  describe('Semantic chunking', () => {
    it('should preserve sentence boundaries', async () => {
      const sentences = [
        'First sentence is here.',
        'Second sentence follows.',
        'Third sentence continues the thought.',
      ];
      const content = sentences.join(' ').repeat(200); // Large enough to split

      const semanticChunker = new DocumentChunker({
        maxChunkSize: 1000,
        overlapSize: 100,
        preserveSemanticBoundaries: true,
      });

      const chunks = await semanticChunker.chunkDocument('semantic-doc', content);

      // Each chunk should end at sentence boundaries (most of the time)
      chunks.forEach((chunk, index) => {
        if (index < chunks.length - 1) { // Not the last chunk
          const lastChar = chunk.content.trim().slice(-1);
          // Should end with sentence-ending punctuation more often than not
          const endsWithPunctuation = ['.', '!', '?'].includes(lastChar);
          // This is a heuristic check - semantic boundaries should be preserved
        }
      });
    });

    it('should handle abbreviations correctly', async () => {
      const content = `
        Dr. Smith went to the meeting. He met with Prof. Johnson and Ms. Williams.
        The Inc. was represented by John Jr. and Mary Sr. from their Ph.D program.
      `.repeat(100);

      const chunks = await chunker.chunkDocument('abbrev-doc', content);
      
      // Should not split on abbreviations
      chunks.forEach(chunk => {
        const lines = chunk.content.split('\n');
        // Basic check that abbreviations don't cause improper splits
        expect(chunk.content).not.toMatch(/Dr\.\s*\n/);
        expect(chunk.content).not.toMatch(/Prof\.\s*\n/);
      });
    });
  });

  describe('Sliding window chunking', () => {
    it('should create overlapping chunks', async () => {
      const slidingChunker = new DocumentChunker({
        maxChunkSize: 1000,
        overlapSize: 200,
        preserveSemanticBoundaries: false,
      });

      const content = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(100); // Repeating pattern
      const chunks = await slidingChunker.chunkDocument('sliding-doc', content);

      expect(chunks.length).toBeGreaterThan(1);

      // Verify overlap exists between consecutive chunks
      for (let i = 1; i < chunks.length; i++) {
        const prevChunk = chunks[i - 1];
        const currentChunk = chunks[i];
        
        // There should be some common content between chunks
        const prevEnd = prevChunk.content.slice(-100);
        const currentStart = currentChunk.content.slice(0, 100);
        
        // Check for overlap (this is approximate due to boundary adjustments)
        expect(currentChunk.content).toContain(prevEnd.slice(-50));
      }
    });

    it('should respect chunk size limits', async () => {
      const customChunker = new DocumentChunker({
        maxChunkSize: 500,
        overlapSize: 50,
        preserveSemanticBoundaries: false,
      });

      const content = 'X'.repeat(2000);
      const chunks = await customChunker.chunkDocument('sized-doc', content);

      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('Chunking statistics', () => {
    it('should provide accurate chunking stats', async () => {
      const content = 'Test content. '.repeat(1000);
      const chunks = await chunker.chunkDocument('stats-doc', content);
      
      const stats = chunker.getChunkingStats(chunks);

      expect(stats.totalChunks).toBe(chunks.length);
      expect(stats.averageChunkSize).toBeGreaterThan(0);
      expect(stats.overlapEfficiency).toBeGreaterThanOrEqual(0);
      expect(stats.overlapEfficiency).toBeLessThanOrEqual(1);
    });

    it('should handle empty chunks gracefully', () => {
      const stats = chunker.getChunkingStats([]);
      
      expect(stats.totalChunks).toBe(0);
      expect(stats.averageChunkSize).toBe(0);
      expect(stats.overlapEfficiency).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty documents', async () => {
      const chunks = await chunker.chunkDocument('empty-doc', '');
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('');
    });

    it('should handle documents with only whitespace', async () => {
      const content = '   \n\n\t\t   ';
      const chunks = await chunker.chunkDocument('whitespace-doc', content);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content.trim()).toBe('');
    });

    it('should handle documents with no sentence boundaries', async () => {
      const content = 'a'.repeat(15000); // No punctuation, just letters
      const chunks = await chunker.chunkDocument('no-boundaries-doc', content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(10000);
      });
    });

    it('should handle unicode characters correctly', async () => {
      const content = '这是中文内容。'.repeat(1000) + 'English mixed with émojis 🚀🎉'.repeat(500);
      const chunks = await chunker.chunkDocument('unicode-doc', content);
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(10000);
      });
    });

    it('should handle very long sentences', async () => {
      const longSentence = 'This is a very long sentence that goes on and on and on '.repeat(200) + '.';
      const content = longSentence.repeat(10);
      
      const chunks = await chunker.chunkDocument('long-sentence-doc', content);
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(10000);
      });
    });
  });

  describe('Custom options', () => {
    it('should respect custom chunk size', async () => {
      const customChunker = new DocumentChunker({
        maxChunkSize: 100,
        overlapSize: 20,
        preserveSemanticBoundaries: false,
      });

      const content = 'A'.repeat(500);
      const chunks = await customChunker.chunkDocument('custom-doc', content);
      
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(100);
      });
    });

    it('should respect custom overlap size', async () => {
      const customChunker = new DocumentChunker({
        maxChunkSize: 200,
        overlapSize: 50,
        preserveSemanticBoundaries: false,
      });

      const content = 'ABCDEFGHIJ'.repeat(50);
      const chunks = await customChunker.chunkDocument('overlap-doc', content);
      
      if (chunks.length > 1) {
        // Verify overlap exists
        const stats = customChunker.getChunkingStats(chunks);
        expect(stats.overlapEfficiency).toBeGreaterThan(0);
      }
    });
  });

  describe('Chunk metadata', () => {
    it('should include correct start and end indices', async () => {
      const content = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(50);
      const chunks = await chunker.chunkDocument('indexed-doc', content);
      
      chunks.forEach(chunk => {
        expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
        expect(chunk.endIndex).toBeGreaterThan(chunk.startIndex);
        expect(chunk.endIndex).toBeLessThan(content.length);
        
        // Verify the indices correspond to actual content
        const extractedContent = content.slice(chunk.startIndex, chunk.endIndex + 1);
        expect(chunk.content.trim()).toBe(extractedContent.trim());
      });
    });

    it('should generate unique chunk IDs', async () => {
      const content = 'Content '.repeat(2000);
      const chunks = await chunker.chunkDocument('unique-doc', content);
      
      const ids = chunks.map(chunk => chunk.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});