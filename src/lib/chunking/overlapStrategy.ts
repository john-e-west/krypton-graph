import { findNaturalBoundary } from './boundaryDetection';

export interface OverlapConfig {
  percentage: number;  // 10-20%
  minOverlap: number;  // Minimum characters
  maxOverlap: number;  // Maximum characters
  preserveBoundaries: boolean;
}

export interface OverlapResult {
  overlapText: string;
  overlapSize: number;
  startInPrevious: number;
  endInNext: number;
}

export function calculateOverlap(
  previousChunk: string,
  nextChunk: string,
  config: OverlapConfig
): OverlapResult {
  const targetOverlapSize = Math.floor(
    Math.min(previousChunk.length, nextChunk.length) * (config.percentage / 100)
  );
  
  // Clamp to min/max values
  const overlapSize = Math.max(
    config.minOverlap,
    Math.min(config.maxOverlap, targetOverlapSize)
  );
  
  // Calculate initial positions
  let startInPrevious = previousChunk.length - overlapSize;
  let endInNext = overlapSize;
  
  // Adjust to natural boundaries if enabled
  if (config.preserveBoundaries) {
    // Find a natural boundary in the previous chunk
    const prevBoundary = findNaturalBoundary(
      previousChunk,
      startInPrevious,
      100
    );
    if (prevBoundary.confidence > 0.5) {
      startInPrevious = prevBoundary.position;
    }
    
    // Find a natural boundary in the next chunk
    const nextBoundary = findNaturalBoundary(
      nextChunk,
      endInNext,
      100
    );
    if (nextBoundary.confidence > 0.5) {
      endInNext = nextBoundary.position;
    }
  }
  
  // Extract overlap text
  const overlapFromPrevious = previousChunk.substring(startInPrevious);
  
  return {
    overlapText: overlapFromPrevious,
    overlapSize: overlapFromPrevious.length,
    startInPrevious,
    endInNext
  };
}

export function createOverlappingChunks(
  text: string,
  chunkSizes: number[],
  overlapConfig: OverlapConfig
): Array<{
  content: string;
  start: number;
  end: number;
  overlapStart?: number;
  overlapEnd?: number;
}> {
  const chunks: Array<{
    content: string;
    start: number;
    end: number;
    overlapStart?: number;
    overlapEnd?: number;
  }> = [];
  
  let currentPosition = 0;
  
  for (let i = 0; i < chunkSizes.length; i++) {
    const chunkSize = chunkSizes[i];
    let end = Math.min(currentPosition + chunkSize, text.length);
    
    // Find natural boundary near the end position, but enforce hard size limit
    if (i < chunkSizes.length - 1 && overlapConfig.preserveBoundaries) {
      const boundary = findNaturalBoundary(text, end, 200);
      if (boundary.confidence > 0) {
        // Ensure boundary respects the chunk size - don't allow expansion beyond intended size
        end = Math.min(boundary.position, currentPosition + chunkSize);
      }
    }
    
    const chunk = {
      content: text.substring(currentPosition, end),
      start: currentPosition,
      end: end,
      overlapStart: undefined as number | undefined,
      overlapEnd: undefined as number | undefined
    };
    
    // Calculate overlap with previous chunk
    if (i > 0 && chunks[i - 1]) {
      const prevChunk = chunks[i - 1];
      const overlap = calculateOverlap(
        prevChunk.content,
        chunk.content,
        overlapConfig
      );
      
      // Adjust current chunk to include overlap from previous
      const overlapStart = prevChunk.end - overlap.startInPrevious;
      chunk.start = overlapStart;
      chunk.content = text.substring(overlapStart, end);
      chunk.overlapStart = overlapStart;
      chunk.overlapEnd = prevChunk.end;
      
      // Update previous chunk's overlap info
      prevChunk.overlapEnd = end;
    }
    
    chunks.push(chunk);
    currentPosition = end;
  }
  
  return chunks;
}

export function validateOverlap(
  chunks: Array<{content: string; overlapStart?: number; overlapEnd?: number}>
): boolean {
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.overlapStart !== undefined && chunk.overlapEnd !== undefined) {
      const overlapSize = chunk.overlapEnd - chunk.overlapStart;
      if (overlapSize < 0) {
        return false;
      }
    }
  }
  return true;
}

export function getOverlapStatistics(
  chunks: Array<{
    content: string;
    overlapStart?: number;
    overlapEnd?: number;
  }>
): {
  averageOverlap: number;
  minOverlap: number;
  maxOverlap: number;
  totalOverlap: number;
} {
  const overlaps: number[] = [];
  
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.overlapStart !== undefined && chunk.overlapEnd !== undefined) {
      const overlapSize = chunk.overlapEnd - chunk.overlapStart;
      overlaps.push(overlapSize);
    }
  }
  
  if (overlaps.length === 0) {
    return {
      averageOverlap: 0,
      minOverlap: 0,
      maxOverlap: 0,
      totalOverlap: 0
    };
  }
  
  const totalOverlap = overlaps.reduce((sum, size) => sum + size, 0);
  
  return {
    averageOverlap: totalOverlap / overlaps.length,
    minOverlap: Math.min(...overlaps),
    maxOverlap: Math.max(...overlaps),
    totalOverlap
  };
}