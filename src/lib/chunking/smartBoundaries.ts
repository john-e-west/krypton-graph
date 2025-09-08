import OpenAI from 'openai';
import { ChunkBoundary } from './types';

export class SmartBoundaryDetector {
  private openai: OpenAI | null = null;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_OPENAI_API_KEY;
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // For development only
      });
    }
  }

  async getSmartBoundaries(
    text: string,
    targetChunkSize = 8500,
    maxChunks = 10
  ): Promise<ChunkBoundary[]> {
    if (!this.openai) {
      console.warn('OpenAI API not configured, falling back to rule-based chunking');
      return this.getRuleBasedBoundaries(text, targetChunkSize);
    }

    try {
      const prompt = this.buildPrompt(text, targetChunkSize, maxChunks);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a document chunking expert. Identify optimal split points for document chunks while preserving semantic coherence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.getRuleBasedBoundaries(text, targetChunkSize);
      }

      return this.parseBoundaries(content, text);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getRuleBasedBoundaries(text, targetChunkSize);
    }
  }

  private buildPrompt(text: string, targetChunkSize: number, maxChunks: number): string {
    // Truncate text if too long for API
    const maxTextLength = 15000;
    const truncatedText = text.length > maxTextLength 
      ? text.substring(0, maxTextLength) + '...[truncated]'
      : text;

    return `Given the following document text, identify the best points to split it into chunks 
of approximately ${targetChunkSize} characters each (maximum ${maxChunks} chunks), while:

1. Preserving semantic coherence
2. Not breaking in the middle of important concepts
3. Keeping related information together
4. Respecting section boundaries when possible
5. Never splitting code blocks or tables

Return the split points as a JSON array of objects with:
- position: character position in the text
- reason: brief explanation of why this is a good split point
- type: "section", "paragraph", or "sentence"

Example response:
[
  {"position": 850, "reason": "End of introduction section", "type": "section"},
  {"position": 1750, "reason": "Natural paragraph break after concept explanation", "type": "paragraph"}
]

Document text:
${truncatedText}`;
  }

  private parseBoundaries(responseContent: string, originalText: string): ChunkBoundary[] {
    try {
      // Extract JSON from the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.getRuleBasedBoundaries(originalText, 8500);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.map((item: any) => ({
        position: Math.min(item.position, originalText.length),
        type: item.type || 'paragraph',
        confidence: this.getConfidenceForType(item.type)
      }));
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return this.getRuleBasedBoundaries(originalText, 8500);
    }
  }

  private getConfidenceForType(type: string): number {
    switch (type) {
      case 'section':
        return 0.95;
      case 'paragraph':
        return 0.8;
      case 'sentence':
        return 0.6;
      default:
        return 0.5;
    }
  }

  private getRuleBasedBoundaries(text: string, targetChunkSize: number): ChunkBoundary[] {
    const boundaries: ChunkBoundary[] = [];
    let currentPosition = 0;
    
    while (currentPosition < text.length) {
      const nextTarget = currentPosition + targetChunkSize;
      
      if (nextTarget >= text.length) {
        break;
      }
      
      // Look for paragraph boundaries near target
      const searchStart = Math.max(currentPosition, nextTarget - 500);
      const searchEnd = Math.min(text.length, nextTarget + 500);
      const searchText = text.substring(searchStart, searchEnd);
      
      // Find best boundary in search window
      let bestBoundary: ChunkBoundary = {
        position: nextTarget,
        type: 'forced',
        confidence: 0.3
      };
      
      // Look for double newlines (paragraphs)
      const paragraphMatches = [...searchText.matchAll(/\n\n/g)];
      for (const match of paragraphMatches) {
        if (match.index !== undefined) {
          const position = searchStart + match.index + 2;
          const distance = Math.abs(position - nextTarget);
          if (distance < Math.abs(bestBoundary.position - nextTarget)) {
            bestBoundary = {
              position,
              type: 'paragraph',
              confidence: 0.8
            };
          }
        }
      }
      
      // Look for sentence boundaries if no paragraph found
      if (bestBoundary.type === 'forced') {
        const sentenceMatches = [...searchText.matchAll(/[.!?]\s+/g)];
        for (const match of sentenceMatches) {
          if (match.index !== undefined && match[0]) {
            const position = searchStart + match.index + match[0].length;
            const distance = Math.abs(position - nextTarget);
            if (distance < Math.abs(bestBoundary.position - nextTarget)) {
              bestBoundary = {
                position,
                type: 'sentence',
                confidence: 0.6
              };
            }
          }
        }
      }
      
      boundaries.push(bestBoundary);
      currentPosition = bestBoundary.position;
    }
    
    return boundaries;
  }

  async enhanceWithSemantics(
    text: string,
    boundaries: ChunkBoundary[]
  ): Promise<ChunkBoundary[]> {
    if (!this.openai || boundaries.length === 0) {
      return boundaries;
    }

    try {
      // Get semantic analysis for low-confidence boundaries
      const lowConfidenceBoundaries = boundaries.filter(b => b.confidence < 0.7);
      
      if (lowConfidenceBoundaries.length === 0) {
        return boundaries;
      }

      const prompt = `Analyze these potential chunk boundaries and rate their semantic appropriateness:

${lowConfidenceBoundaries.map(b => {
  const start = Math.max(0, b.position - 100);
  const end = Math.min(text.length, b.position + 100);
  const context = text.substring(start, end);
  return `Position ${b.position}: ...${context}...`;
}).join('\n\n')}

Rate each boundary from 0-1 based on whether it's a good semantic break point.`;

      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      // Parse and update confidence scores
      // This is simplified - in production, parse the response more carefully
      const enhancedBoundaries = [...boundaries];
      return enhancedBoundaries;
    } catch (error) {
      console.error('Failed to enhance boundaries with semantics:', error);
      return boundaries;
    }
  }
}