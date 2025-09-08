export interface ChunkingOptions {
  maxChunkSize: number;
  overlapSize: number;
  preserveSemanticBoundaries: boolean;
}

export interface DocumentChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: {
    chunkNumber: number;
    totalChunks: number;
    originalDocumentId: string;
  };
}

export class DocumentChunker {
  private readonly defaultOptions: ChunkingOptions = {
    maxChunkSize: 10000, // Zep v3 limit
    overlapSize: 500,
    preserveSemanticBoundaries: true,
  };

  constructor(private options: ChunkingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async chunkDocument(
    documentId: string,
    content: string
  ): Promise<DocumentChunk[]> {
    if (content.length <= this.options.maxChunkSize) {
      return [
        {
          id: `${documentId}_chunk_0`,
          content,
          startIndex: 0,
          endIndex: content.length - 1,
          metadata: {
            chunkNumber: 0,
            totalChunks: 1,
            originalDocumentId: documentId,
          },
        },
      ];
    }

    return this.options.preserveSemanticBoundaries
      ? this.semanticChunking(documentId, content)
      : this.slidingWindowChunking(documentId, content);
  }

  private semanticChunking(
    documentId: string,
    content: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(content);
    
    // If no proper sentences found, fall back to sliding window
    if (sentences.length <= 1 && content.length > this.options.maxChunkSize) {
      return this.slidingWindowChunking(documentId, content);
    }
    
    let currentChunk = "";
    let currentStartIndex = 0;
    let chunkNumber = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

      if (potentialChunk.length > this.options.maxChunkSize && currentChunk) {
        // Create chunk with current content
        chunks.push(this.createChunk(
          documentId,
          currentChunk,
          currentStartIndex,
          chunkNumber
        ));

        // Start new chunk with overlap
        const overlapContent = this.getOverlapContent(currentChunk);
        currentChunk = overlapContent + (overlapContent ? " " : "") + sentence;
        currentStartIndex = this.findStartIndex(content, currentChunk, chunks);
        chunkNumber++;
      } else {
        currentChunk = potentialChunk;
        if (chunkNumber === 0) {
          currentStartIndex = content.indexOf(sentence);
        }
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        documentId,
        currentChunk,
        currentStartIndex,
        chunkNumber
      ));
    }

    // If still only one chunk but content is too large, force split
    if (chunks.length === 1 && content.length > this.options.maxChunkSize) {
      return this.slidingWindowChunking(documentId, content);
    }

    // Update total chunks metadata
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks: chunks.length,
      },
    }));
  }

  private slidingWindowChunking(
    documentId: string,
    content: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkNumber = 0;
    const stepSize = this.options.maxChunkSize - this.options.overlapSize;

    while (startIndex < content.length) {
      const endIndex = Math.min(
        startIndex + this.options.maxChunkSize,
        content.length
      );
      const chunkContent = content.slice(startIndex, endIndex);

      chunks.push({
        id: `${documentId}_chunk_${chunkNumber}`,
        content: chunkContent,
        startIndex,
        endIndex: endIndex - 1,
        metadata: {
          chunkNumber,
          totalChunks: 0, // Will be updated after all chunks are created
          originalDocumentId: documentId,
        },
      });

      startIndex += stepSize;
      chunkNumber++;
    }

    // Update total chunks metadata
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks: chunks.length,
      },
    }));
  }

  private splitIntoSentences(content: string): string[] {
    // Enhanced sentence splitting that handles common abbreviations
    const abbreviations = new Set([
      "Dr", "Mr", "Mrs", "Ms", "Prof", "vs", "etc", "Inc", "Corp", "Ltd",
      "Jr", "Sr", "Ph.D", "M.D", "B.A", "M.A", "Ph.D"
    ]);

    return content
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .reduce<string[]>((acc, current) => {
        if (acc.length === 0) {
          acc.push(current);
          return acc;
        }

        const lastSentence = acc[acc.length - 1];
        const lastWord = lastSentence.split(/\s+/).pop();
        
        // Check if the last sentence ends with an abbreviation
        if (lastWord && abbreviations.has(lastWord.replace(/\.$/, ""))) {
          acc[acc.length - 1] = lastSentence + " " + current;
        } else {
          acc.push(current);
        }

        return acc;
      }, []);
  }

  private getOverlapContent(content: string): string {
    if (content.length <= this.options.overlapSize) {
      return content;
    }

    const overlap = content.slice(-this.options.overlapSize);
    
    // Try to find a sentence boundary for better overlap
    const sentenceEnd = overlap.lastIndexOf(". ");
    if (sentenceEnd > this.options.overlapSize * 0.5) {
      return overlap.slice(sentenceEnd + 2);
    }

    return overlap;
  }

  private findStartIndex(
    content: string,
    chunkContent: string,
    existingChunks: DocumentChunk[]
  ): number {
    if (existingChunks.length === 0) {
      return 0;
    }

    const lastChunk = existingChunks[existingChunks.length - 1];
    const searchStart = Math.max(0, lastChunk.endIndex - this.options.overlapSize);
    
    return content.indexOf(chunkContent.trim(), searchStart);
  }

  private createChunk(
    documentId: string,
    content: string,
    startIndex: number,
    chunkNumber: number
  ): DocumentChunk {
    return {
      id: `${documentId}_chunk_${chunkNumber}`,
      content: content.trim(),
      startIndex,
      endIndex: startIndex + content.length - 1,
      metadata: {
        chunkNumber,
        totalChunks: 0, // Will be updated later
        originalDocumentId: documentId,
      },
    };
  }

  getChunkingStats(chunks: DocumentChunk[]): {
    totalChunks: number;
    averageChunkSize: number;
    overlapEfficiency: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageChunkSize: 0,
        overlapEfficiency: 0,
      };
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const averageChunkSize = totalSize / chunks.length;
    
    // Calculate overlap efficiency (how much content is actually overlapping)
    let totalOverlapSize = 0;
    let expectedTotalOverlap = 0;
    
    for (let i = 1; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      const previousChunk = chunks[i - 1];
      
      // Find common content between consecutive chunks
      const commonContent = this.findCommonContent(
        previousChunk.content,
        currentChunk.content
      );
      totalOverlapSize += commonContent.length;
      expectedTotalOverlap += this.options.overlapSize;
    }

    // Avoid division by zero and cap efficiency at 1.0
    const overlapEfficiency = expectedTotalOverlap > 0 ? 
      Math.min(1.0, totalOverlapSize / expectedTotalOverlap) : 0;

    return {
      totalChunks: chunks.length,
      averageChunkSize,
      overlapEfficiency,
    };
  }

  private findCommonContent(content1: string, content2: string): string {
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);
    
    let maxOverlap = "";
    
    for (let i = 0; i < words1.length; i++) {
      for (let j = 0; j < words2.length; j++) {
        let overlap = "";
        let k = 0;
        
        while (
          i + k < words1.length &&
          j + k < words2.length &&
          words1[i + k] === words2[j + k]
        ) {
          overlap += (overlap ? " " : "") + words1[i + k];
          k++;
        }
        
        if (overlap.length > maxOverlap.length) {
          maxOverlap = overlap;
        }
      }
    }
    
    return maxOverlap;
  }
}