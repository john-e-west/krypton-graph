import { DocumentChunk, ChunkMetadata } from './types';
import {
  countSentences,
  countParagraphs,
  extractHeadings,
  hasCodeBlocks,
  hasTables,
  hasLists,
  findNaturalBoundary
} from './boundaryDetection';

export class ChunkAdjustmentManager {
  private chunks: DocumentChunk[];
  private originalText: string;
  private documentId: string;

  constructor(chunks: DocumentChunk[], originalText: string, documentId: string) {
    this.chunks = [...chunks];
    this.originalText = originalText;
    this.documentId = documentId;
  }

  splitChunk(chunkId: string, splitPosition: number): DocumentChunk[] {
    const chunkIndex = this.chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    const chunk = this.chunks[chunkIndex];
    
    // Find natural boundary near split position
    const boundary = findNaturalBoundary(chunk.content, splitPosition);
    const actualSplitPosition = boundary.position;

    // Create two new chunks
    const firstContent = chunk.content.substring(0, actualSplitPosition);
    const secondContent = chunk.content.substring(actualSplitPosition);

    const firstChunk: DocumentChunk = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      content: firstContent,
      index: chunk.index,
      startChar: chunk.startChar,
      endChar: chunk.startChar + actualSplitPosition,
      metadata: this.generateMetadata(
        firstContent,
        chunk.index,
        this.chunks.length + 1
      )
    };

    const secondChunk: DocumentChunk = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      content: secondContent,
      index: chunk.index + 0.5, // Temporary index
      startChar: chunk.startChar + actualSplitPosition,
      endChar: chunk.endChar,
      metadata: this.generateMetadata(
        secondContent,
        chunk.index + 1,
        this.chunks.length + 1
      )
    };

    // Update navigation links
    if (chunk.metadata.previousChunkId) {
      firstChunk.metadata.previousChunkId = chunk.metadata.previousChunkId;
    }
    firstChunk.metadata.nextChunkId = secondChunk.id;
    secondChunk.metadata.previousChunkId = firstChunk.id;
    if (chunk.metadata.nextChunkId) {
      secondChunk.metadata.nextChunkId = chunk.metadata.nextChunkId;
    }

    // Replace original chunk with two new chunks
    this.chunks.splice(chunkIndex, 1, firstChunk, secondChunk);
    
    // Reindex chunks
    this.reindexChunks();
    
    return this.chunks;
  }

  mergeChunks(chunk1Id: string, chunk2Id: string): DocumentChunk[] {
    const index1 = this.chunks.findIndex(c => c.id === chunk1Id);
    const index2 = this.chunks.findIndex(c => c.id === chunk2Id);

    if (index1 === -1 || index2 === -1) {
      throw new Error('One or both chunks not found');
    }

    // Ensure chunks are adjacent
    const [firstIndex, secondIndex] = [index1, index2].sort((a, b) => a - b);
    if (secondIndex - firstIndex !== 1) {
      throw new Error('Chunks must be adjacent to merge');
    }

    const firstChunk = this.chunks[firstIndex];
    const secondChunk = this.chunks[secondIndex];

    // Check if merged chunk would exceed size limit
    const mergedContent = firstChunk.content + secondChunk.content;
    if (mergedContent.length > 10000) {
      throw new Error('Merged chunk would exceed maximum size limit (10,000 characters)');
    }

    // Create merged chunk
    const mergedChunk: DocumentChunk = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      content: mergedContent,
      index: firstChunk.index,
      startChar: firstChunk.startChar,
      endChar: secondChunk.endChar,
      metadata: this.generateMetadata(
        mergedContent,
        firstChunk.index,
        this.chunks.length - 1
      )
    };

    // Update navigation links
    if (firstChunk.metadata.previousChunkId) {
      mergedChunk.metadata.previousChunkId = firstChunk.metadata.previousChunkId;
      const prevChunk = this.chunks.find(c => c.id === firstChunk.metadata.previousChunkId);
      if (prevChunk) {
        prevChunk.metadata.nextChunkId = mergedChunk.id;
      }
    }
    if (secondChunk.metadata.nextChunkId) {
      mergedChunk.metadata.nextChunkId = secondChunk.metadata.nextChunkId;
      const nextChunk = this.chunks.find(c => c.id === secondChunk.metadata.nextChunkId);
      if (nextChunk) {
        nextChunk.metadata.previousChunkId = mergedChunk.id;
      }
    }

    // Replace two chunks with merged chunk
    this.chunks.splice(firstIndex, 2, mergedChunk);
    
    // Reindex chunks
    this.reindexChunks();
    
    return this.chunks;
  }

  adjustBoundary(chunkId: string, newEndPosition: number): DocumentChunk[] {
    const chunkIndex = this.chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    const chunk = this.chunks[chunkIndex];
    const nextChunk = this.chunks[chunkIndex + 1];

    if (!nextChunk) {
      throw new Error('Cannot adjust boundary of last chunk');
    }

    // Find natural boundary near the new position
    const absolutePosition = chunk.startChar + newEndPosition;
    const boundary = findNaturalBoundary(this.originalText, absolutePosition);
    const adjustedPosition = boundary.position;

    // Validate the new boundary
    if (adjustedPosition <= chunk.startChar || adjustedPosition >= nextChunk.endChar) {
      throw new Error('Invalid boundary position');
    }

    // Update chunk boundaries
    chunk.endChar = adjustedPosition;
    chunk.content = this.originalText.substring(chunk.startChar, chunk.endChar);
    chunk.metadata = this.generateMetadata(
      chunk.content,
      chunk.index,
      this.chunks.length
    );

    nextChunk.startChar = adjustedPosition;
    nextChunk.content = this.originalText.substring(nextChunk.startChar, nextChunk.endChar);
    nextChunk.metadata = this.generateMetadata(
      nextChunk.content,
      nextChunk.index,
      this.chunks.length
    );

    return this.chunks;
  }

  private reindexChunks(): void {
    this.chunks.forEach((chunk, index) => {
      chunk.index = index;
      chunk.metadata.chunkIndex = index;
      chunk.metadata.totalChunks = this.chunks.length;

      // Update navigation links
      if (index > 0) {
        chunk.metadata.previousChunkId = this.chunks[index - 1].id;
      } else {
        chunk.metadata.previousChunkId = undefined;
      }

      if (index < this.chunks.length - 1) {
        chunk.metadata.nextChunkId = this.chunks[index + 1].id;
      } else {
        chunk.metadata.nextChunkId = undefined;
      }
    });
  }

  private generateMetadata(
    content: string,
    index: number,
    totalChunks: number
  ): ChunkMetadata {
    return {
      documentId: this.documentId,
      chunkIndex: index,
      totalChunks,
      startPosition: 0, // Will be set by caller
      endPosition: content.length,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: content.length,
      sentenceCount: countSentences(content),
      paragraphCount: countParagraphs(content),
      headings: extractHeadings(content),
      hasCodeBlocks: hasCodeBlocks(content),
      hasTables: hasTables(content),
      hasLists: hasLists(content)
    };
  }

  validateChunks(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check size limits
    this.chunks.forEach((chunk, index) => {
      if (chunk.content.length > 10000) {
        errors.push(`Chunk ${index + 1} exceeds maximum size (${chunk.content.length} > 10000)`);
      }
      if (chunk.content.length < 500) {
        errors.push(`Chunk ${index + 1} is below minimum size (${chunk.content.length} < 500)`);
      }
    });

    // Check continuity
    for (let i = 1; i < this.chunks.length; i++) {
      const prevChunk = this.chunks[i - 1];
      const currentChunk = this.chunks[i];
      
      // Account for overlap
      const hasOverlap = currentChunk.overlapStart !== undefined;
      if (!hasOverlap && prevChunk.endChar !== currentChunk.startChar) {
        errors.push(`Gap or overlap detected between chunks ${i} and ${i + 1}`);
      }
    }

    // Check navigation links
    this.chunks.forEach((chunk, index) => {
      if (index > 0 && !chunk.metadata.previousChunkId) {
        errors.push(`Chunk ${index + 1} missing previous link`);
      }
      if (index < this.chunks.length - 1 && !chunk.metadata.nextChunkId) {
        errors.push(`Chunk ${index + 1} missing next link`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  exportChunks(): string {
    return JSON.stringify(this.chunks, null, 2);
  }
}