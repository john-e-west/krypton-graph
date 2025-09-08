import { BoundaryMarkers, ChunkBoundary } from './types';

export const BOUNDARY_MARKERS: BoundaryMarkers = {
  section: /^#{1,6}\s/m,        // Markdown headings
  paragraph: /\n\n/,             // Double newline
  sentence: /[.!?]\s+/,         // Sentence endings
  codeBlock: /```[\s\S]*?```/,  // Code blocks (keep intact)
  table: /\|.*\|[\s\S]*?\n\n/,  // Markdown tables
  list: /^[\s]*[-*+][\s]|^[\s]*\d+[.)]\s/m     // List items: bullets (-,*,+) or numbered (1.)
};

export function findNaturalBoundary(
  text: string, 
  targetPosition: number,
  windowSize = 200
): ChunkBoundary {
  // Never break in the middle of code blocks or tables
  const codeBlocks = findCodeBlocks(text);
  const tables = findTables(text);
  
  // Check if target position is within a protected block
  for (const block of [...codeBlocks, ...tables]) {
    if (targetPosition >= block.start && targetPosition <= block.end) {
      // Move to the end of the protected block
      return {
        position: block.end,
        type: 'forced',
        confidence: 1.0
      };
    }
  }
  
  // Search for natural boundaries near the target position
  const searchStart = Math.max(0, targetPosition - windowSize);
  const searchEnd = Math.min(text.length, targetPosition + windowSize);
  const searchText = text.substring(searchStart, searchEnd);
  
  // Priority: section > paragraph > sentence
  const boundaries: ChunkBoundary[] = [];
  
  // Find section boundaries (headings)
  const sectionMatches = [...searchText.matchAll(/\n(#{1,6}\s)/g)];
  for (const match of sectionMatches) {
    if (match.index !== undefined) {
      boundaries.push({
        position: searchStart + match.index,
        type: 'section',
        confidence: 1.0
      });
    }
  }
  
  // Find paragraph boundaries
  const paragraphMatches = [...searchText.matchAll(/\n\n/g)];
  for (const match of paragraphMatches) {
    if (match.index !== undefined) {
      boundaries.push({
        position: searchStart + match.index + 2, // After the double newline
        type: 'paragraph',
        confidence: 0.8
      });
    }
  }
  
  // Find sentence boundaries
  const sentenceMatches = [...searchText.matchAll(/[.!?]\s+/g)];
  for (const match of sentenceMatches) {
    if (match.index !== undefined && match[0]) {
      boundaries.push({
        position: searchStart + match.index + match[0].length,
        type: 'sentence',
        confidence: 0.6
      });
    }
  }
  
  // Find the best boundary closest to the target
  if (boundaries.length === 0) {
    return {
      position: targetPosition,
      type: 'forced',
      confidence: 0
    };
  }
  
  // Sort by confidence and proximity to target
  boundaries.sort((a, b) => {
    const scoreA = a.confidence * 1000 - Math.abs(a.position - targetPosition);
    const scoreB = b.confidence * 1000 - Math.abs(b.position - targetPosition);
    return scoreB - scoreA;
  });
  
  // Return the best boundary, but never go beyond our window
  const bestBoundary = boundaries[0];
  const maxPosition = targetPosition + windowSize;
  
  if (bestBoundary.position > maxPosition) {
    return {
      position: targetPosition,
      type: 'forced',
      confidence: 0
    };
  }
  
  return bestBoundary;
}

function findCodeBlocks(text: string): Array<{start: number; end: number}> {
  const blocks: Array<{start: number; end: number}> = [];
  const regex = /```[\s\S]*?```/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return blocks;
}

function findTables(text: string): Array<{start: number; end: number}> {
  const tables: Array<{start: number; end: number}> = [];
  const lines = text.split('\n');
  let inTable = false;
  let tableStart = 0;
  let currentPos = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = /^\|.*\|$/.test(line.trim());
    
    if (isTableRow && !inTable) {
      inTable = true;
      tableStart = currentPos;
    } else if (!isTableRow && inTable) {
      inTable = false;
      tables.push({
        start: tableStart,
        end: currentPos
      });
    }
    
    currentPos += line.length + 1; // +1 for newline
  }
  
  if (inTable) {
    tables.push({
      start: tableStart,
      end: text.length
    });
  }
  
  return tables;
}

export function countSentences(text: string): number {
  const sentences = text.match(/[.!?]+[\s]+/g);
  return sentences ? sentences.length + 1 : 1;
}

export function countParagraphs(text: string): number {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  return paragraphs.length;
}

export function extractHeadings(text: string): Array<{level: number; text: string}> {
  const headings: Array<{level: number; text: string}> = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }
  
  return headings;
}

export function hasCodeBlocks(text: string): boolean {
  return BOUNDARY_MARKERS.codeBlock.test(text);
}

export function hasTables(text: string): boolean {
  return /^\|.*\|$/m.test(text);
}

export function hasLists(text: string): boolean {
  return BOUNDARY_MARKERS.list.test(text);
}