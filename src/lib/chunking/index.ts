export * from './types';
export * from './boundaryDetection';
export * from './overlapStrategy';
export * from './smartBoundaries';
export * from './metadataGenerator';
export * from './chunkAdjustments';
export * from './chunkingService';

// Re-export main service class for convenience
export { ChunkingService as default } from './chunkingService';