import { ChunkMetadata } from './types';
import {
  countSentences,
  countParagraphs,
  extractHeadings,
  hasCodeBlocks,
  hasTables,
  hasLists
} from './boundaryDetection';
import OpenAI from 'openai';

export class MetadataGenerator {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.VITE_OPENAI_API_KEY;
    if (key) {
      this.openai = new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true
      });
    }
  }

  async generateMetadata(
    content: string,
    documentId: string,
    chunkIndex: number,
    totalChunks: number,
    startPosition: number,
    endPosition: number,
    previousChunkId?: string,
    nextChunkId?: string,
    overlapWithPrevious?: number,
    overlapWithNext?: number
  ): Promise<ChunkMetadata> {
    // Basic metadata
    const basicMetadata: ChunkMetadata = {
      documentId,
      chunkIndex,
      totalChunks,
      startPosition,
      endPosition,
      wordCount: this.countWords(content),
      characterCount: content.length,
      sentenceCount: countSentences(content),
      paragraphCount: countParagraphs(content),
      headings: extractHeadings(content),
      hasCodeBlocks: hasCodeBlocks(content),
      hasTables: hasTables(content),
      hasLists: hasLists(content),
      previousChunkId,
      nextChunkId,
      overlapWithPrevious,
      overlapWithNext
    };

    // Add semantic metadata if OpenAI is available
    if (this.openai) {
      try {
        const semanticData = await this.generateSemanticMetadata(content);
        return {
          ...basicMetadata,
          ...semanticData
        };
      } catch (error) {
        console.error('Failed to generate semantic metadata:', error);
      }
    }

    return basicMetadata;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private async generateSemanticMetadata(
    content: string
  ): Promise<Partial<ChunkMetadata>> {
    if (!this.openai) {
      return {};
    }

    try {
      const prompt = `Analyze this text chunk and provide:
1. A brief summary (max 100 words)
2. Main topics (max 5)
3. Key entities mentioned (people, places, organizations, technologies)

Text:
${content.substring(0, 2000)}${content.length > 2000 ? '...[truncated]' : ''}

Respond in JSON format:
{
  "summary": "brief summary",
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        const parsed = JSON.parse(result);
        return {
          summary: parsed.summary,
          topics: parsed.topics,
          entities: parsed.entities
        };
      }
    } catch (error) {
      console.error('Error generating semantic metadata:', error);
    }

    return {};
  }

  generateBatchMetadata(
    chunks: Array<{
      content: string;
      start: number;
      end: number;
      overlapStart?: number;
      overlapEnd?: number;
    }>,
    documentId: string
  ): ChunkMetadata[] {
    return chunks.map((chunk, index) => {
      const previousChunkId = index > 0 ? `chunk-${index - 1}` : undefined;
      const nextChunkId = index < chunks.length - 1 ? `chunk-${index + 1}` : undefined;
      
      let overlapWithPrevious: number | undefined;
      let overlapWithNext: number | undefined;

      if (chunk.overlapStart !== undefined && chunk.overlapEnd !== undefined) {
        overlapWithPrevious = chunk.overlapEnd - chunk.overlapStart;
      }

      if (index < chunks.length - 1) {
        const nextChunk = chunks[index + 1];
        if (nextChunk.overlapStart !== undefined) {
          overlapWithNext = chunk.end - nextChunk.overlapStart;
        }
      }

      return {
        documentId,
        chunkIndex: index,
        totalChunks: chunks.length,
        startPosition: chunk.start,
        endPosition: chunk.end,
        wordCount: this.countWords(chunk.content),
        characterCount: chunk.content.length,
        sentenceCount: countSentences(chunk.content),
        paragraphCount: countParagraphs(chunk.content),
        headings: extractHeadings(chunk.content),
        hasCodeBlocks: hasCodeBlocks(chunk.content),
        hasTables: hasTables(chunk.content),
        hasLists: hasLists(chunk.content),
        previousChunkId,
        nextChunkId,
        overlapWithPrevious,
        overlapWithNext
      };
    });
  }

  async enhanceMetadataWithSemantics(
    metadata: ChunkMetadata[],
    chunks: Array<{ content: string }>
  ): Promise<ChunkMetadata[]> {
    if (!this.openai) {
      return metadata;
    }

    const enhancedMetadata: ChunkMetadata[] = [];

    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      const chunk = chunks[i];

      try {
        const semanticData = await this.generateSemanticMetadata(chunk.content);
        enhancedMetadata.push({
          ...meta,
          ...semanticData
        });
      } catch (error) {
        console.error(`Failed to enhance metadata for chunk ${i}:`, error);
        enhancedMetadata.push(meta);
      }

      // Add a small delay to avoid rate limiting
      if (i < metadata.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enhancedMetadata;
  }

  generateChunkStatistics(metadata: ChunkMetadata[]): {
    totalCharacters: number;
    totalWords: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalOverlap: number;
    averageOverlap: number;
    headingCount: number;
    codeBlockCount: number;
    tableCount: number;
    listCount: number;
  } {
    let totalOverlap = 0;
    let overlapCount = 0;

    const stats = {
      totalCharacters: 0,
      totalWords: 0,
      averageChunkSize: 0,
      minChunkSize: Number.MAX_VALUE,
      maxChunkSize: 0,
      totalOverlap: 0,
      averageOverlap: 0,
      headingCount: 0,
      codeBlockCount: 0,
      tableCount: 0,
      listCount: 0
    };

    metadata.forEach(meta => {
      stats.totalCharacters += meta.characterCount;
      stats.totalWords += meta.wordCount;
      stats.minChunkSize = Math.min(stats.minChunkSize, meta.characterCount);
      stats.maxChunkSize = Math.max(stats.maxChunkSize, meta.characterCount);
      stats.headingCount += meta.headings.length;
      
      if (meta.hasCodeBlocks) stats.codeBlockCount++;
      if (meta.hasTables) stats.tableCount++;
      if (meta.hasLists) stats.listCount++;

      if (meta.overlapWithNext !== undefined) {
        totalOverlap += meta.overlapWithNext;
        overlapCount++;
      }
    });

    stats.averageChunkSize = metadata.length > 0 
      ? Math.round(stats.totalCharacters / metadata.length)
      : 0;
    
    stats.totalOverlap = totalOverlap;
    stats.averageOverlap = overlapCount > 0
      ? Math.round(totalOverlap / overlapCount)
      : 0;

    return stats;
  }
}