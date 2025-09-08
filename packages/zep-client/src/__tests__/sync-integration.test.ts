import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService } from '../services/sync.service';
import { ZepEpisodeService } from '../services/zep-episode.service';
import { MetadataMapperService } from '../services/metadata-mapper.service';
import { ErrorRecoveryService } from '../services/error-recovery.service';
import { ChunkRepository } from '../repositories/chunk.repository';

// Mock environment variables
vi.mock('node:process', () => ({
  default: {
    env: {
      VITE_AIRTABLE_BASE_ID: 'test_base_id',
      VITE_AIRTABLE_API_KEY: 'test_api_key'
    }
  }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Sync Integration Tests', () => {
  let chunkRepository: ChunkRepository;
  let episodeService: ZepEpisodeService;
  let metadataMapper: MetadataMapperService;
  let errorRecoveryService: ErrorRecoveryService;

  const mockDocumentChunks = [
    {
      id: 'rec123',
      fields: {
        'Chunk ID': 'chunk1',
        'Content': 'This is the first chunk of the document content.',
        'Chunk Index': 0,
        'Document': ['doc1'],
        'Word Count': 10,
        'Character Count': 48,
        'Headings': 'Chapter 1: Introduction'
      }
    },
    {
      id: 'rec124',
      fields: {
        'Chunk ID': 'chunk2',
        'Content': 'This is the second chunk with more detailed information.',
        'Chunk Index': 1,
        'Document': ['doc1'],
        'Word Count': 9,
        'Character Count': 55,
        'Headings': 'Section 1.1: Overview'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    chunkRepository = new ChunkRepository();
    episodeService = new ZepEpisodeService();
    metadataMapper = new MetadataMapperService();
    errorRecoveryService = new ErrorRecoveryService(chunkRepository, episodeService);

    // Mock successful Airtable responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        records: mockDocumentChunks
      }),
      statusText: 'OK'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Sync Flow', () => {
    it('should complete full document sync successfully', async () => {
      // Mock Airtable fetch for unsynced chunks
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ records: mockDocumentChunks }),
          statusText: 'OK'
        })
        // Mock Airtable updates for chunk status changes
        .mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'updated' }),
          statusText: 'OK'
        });

      const chunks = await chunkRepository.fetchUnsyncedChunks('doc1');
      
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('This is the first chunk of the document content.');
      expect(chunks[1].content).toBe('This is the second chunk with more detailed information.');

      // Test metadata mapping
      const zepContent = metadataMapper.mapChunkBatchToZepFormat(
        chunks,
        'Test Document',
        'batch123'
      );

      expect(zepContent).toHaveLength(2);
      expect(zepContent[0].metadata.chunk_position).toBe(0);
      expect(zepContent[1].metadata.chunk_position).toBe(1);
      expect(zepContent[0].metadata.section).toBe('Chapter 1: Introduction');
      expect(zepContent[1].metadata.section).toBe('Section 1.1: Overview');

      // Test metadata validation
      const { valid, invalid } = metadataMapper.validateMetadataBatch(zepContent);
      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(0);

      // Test episode creation
      const episode = await episodeService.createOrGetEpisode(
        'user1',
        'doc1',
        'Test Document',
        chunks
      );

      expect(episode.id).toBeDefined();
      expect(episode.user_id).toBe('user1');
      expect(episode.metadata.document_id).toBe('doc1');
      expect(episode.metadata.document_title).toBe('Test Document');
      expect(episode.chunk_ids).toEqual(['rec123', 'rec124']);
      expect(episode.status).toBe('active');
    });

    it('should handle partial sync failures with recovery', async () => {
      // Mock one successful chunk and one failed chunk
      const chunks = await chunkRepository.fetchUnsyncedChunks('doc1');
      
      // Mock the first chunk update to succeed, second to fail
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ records: mockDocumentChunks }),
          statusText: 'OK'
        })
        // First chunk update (syncing) - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'updated' }),
          statusText: 'OK'
        })
        // First chunk update (synced) - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'updated' }),
          statusText: 'OK'
        })
        // Second chunk update (syncing) - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'updated' }),
          statusText: 'OK'
        })
        // Second chunk update (failed) - success (we're updating it to failed status)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'updated' }),
          statusText: 'OK'
        });

      // Simulate one chunk failing during sync
      let chunkSyncCount = 0;
      const originalUpdateChunk = chunkRepository.updateChunk;
      vi.spyOn(chunkRepository, 'updateChunk').mockImplementation(async (chunkId, updates) => {
        if (chunkId === 'rec124' && updates.syncStatus === 'syncing') {
          chunkSyncCount++;
          if (chunkSyncCount === 1) {
            throw new Error('Simulated sync failure');
          }
        }
        return originalUpdateChunk.call(chunkRepository, chunkId, updates);
      });

      // Create episode for recovery test
      const episode = await episodeService.createOrGetEpisode(
        'user1',
        'doc1',
        'Test Document',
        chunks
      );

      expect(episode.status).toBe('active');

      // Test error recovery
      const failedChunk = {
        ...chunks[1],
        syncStatus: 'failed' as const,
        syncAttemptCount: 1,
        lastSyncError: 'Simulated sync failure'
      };

      // Mock failed chunks fetch
      vi.spyOn(chunkRepository, 'fetchFailedChunks').mockResolvedValue([failedChunk]);

      const recoveryResult = await errorRecoveryService.retryFailedChunks('doc1', ['rec124']);

      expect(recoveryResult.operationId).toBeDefined();
      expect(recoveryResult.successful).toBe(1);
      expect(recoveryResult.failed).toBe(0);
      expect(recoveryResult.recoveredChunks).toContain('rec124');
    });

    it('should perform episode rollback correctly', async () => {
      const chunks = await chunkRepository.fetchUnsyncedChunks('doc1');
      
      const episode = await episodeService.createOrGetEpisode(
        'user1',
        'doc1',
        'Test Document',
        chunks
      );

      // Mock successful chunk updates for rollback
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'updated' }),
        statusText: 'OK'
      });

      const rollbackResult = await errorRecoveryService.rollbackEpisode(episode.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.episodeId).toBe(episode.id);
      expect(rollbackResult.chunksRolledBack).toBe(2);

      // Verify episode status was updated
      const updatedEpisode = await episodeService.getEpisodeById(episode.id);
      expect(updatedEpisode?.status).toBe('failed');
    });

    it('should handle metadata transformation edge cases', () => {
      const edgeCaseChunks = [
        {
          id: 'chunk_minimal',
          content: 'Short',
          chunkIndex: 0,
          documentId: 'doc1'
        },
        {
          id: 'chunk_malformed',
          content: 'Content with � bad characters and \x00 null bytes   excessive   spaces\n\n\n\nmultiple newlines',
          chunkIndex: 1,
          documentId: 'doc1',
          wordCount: 2
        },
        {
          id: 'chunk_large',
          content: 'A'.repeat(15000), // Very large chunk
          chunkIndex: 2,
          documentId: 'doc1',
          wordCount: 5000
        }
      ];

      const zepContents = metadataMapper.mapChunkBatchToZepFormat(edgeCaseChunks, 'Edge Case Document');
      
      // Test minimal chunk
      expect(zepContents[0].metadata.quality_score).toBeLessThan(1.0); // Penalized for short content
      expect(zepContents[0].metadata.word_count).toBe(1);
      
      // Test malformed chunk
      expect(zepContents[1].content).toBe('Content with bad characters and null bytes excessive spaces\n\nmultiple newlines');
      expect(zepContents[1].metadata.quality_score).toBeLessThan(1.0); // Penalized for malformed content
      
      // Test large chunk
      expect(zepContents[2].metadata.quality_score).toBeLessThan(1.0); // Penalized for excessive length
      expect(zepContents[2].content.length).toBe(15000);

      // Validate metadata
      const { valid, invalid } = metadataMapper.validateMetadataBatch(zepContents);
      expect(valid).toHaveLength(3); // All should be valid despite edge cases
      expect(invalid).toHaveLength(0);
    });

    it('should generate comprehensive transformation summary', () => {
      const chunks = [
        {
          id: 'chunk1',
          content: 'Chapter content with entities',
          chunkIndex: 0,
          documentId: 'doc1',
          hasEntities: true,
          headings: 'Chapter 1: Introduction'
        },
        {
          id: 'chunk2',
          content: 'Page content without entities',
          chunkIndex: 1,
          documentId: 'doc1',
          hasEntities: false,
          headings: 'Page 2\nSection A'
        },
        {
          id: 'chunk3',
          content: 'More chapter content with entities',
          chunkIndex: 2,
          documentId: 'doc1',
          hasEntities: true,
          headings: 'Chapter 2: Details'
        }
      ];

      const zepContents = metadataMapper.mapChunkBatchToZepFormat(chunks, 'Summary Test Doc');
      const summary = metadataMapper.createTransformationSummary(chunks, zepContents);

      expect(summary.totalChunks).toBe(3);
      expect(summary.successfulTransformations).toBe(3);
      expect(summary.chunksWithEntities).toBe(2);
      expect(summary.sectionsFound).toBeGreaterThan(0); // Should find different sections
      expect(summary.pagesFound).toBeGreaterThan(0); // Should find at least one page
      expect(summary.averageQualityScore).toBeGreaterThan(1.0); // Should be boosted due to entities and headings
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch processing efficiently', async () => {
      // Create a large number of chunks
      const largeChunkSet = Array.from({ length: 100 }, (_, i) => ({
        id: `chunk${i}`,
        content: `This is chunk number ${i} with some content to process.`,
        chunkIndex: i,
        documentId: 'large_doc',
        wordCount: 10,
        characterCount: 50,
        hasEntities: i % 3 === 0, // Every third chunk has entities
        headings: i % 5 === 0 ? `Section ${Math.floor(i / 5)}` : undefined // Every fifth chunk has headings
      }));

      const startTime = Date.now();
      
      // Test metadata mapping performance
      const zepContents = metadataMapper.mapChunkBatchToZepFormat(largeChunkSet, 'Large Document');
      
      const mappingTime = Date.now() - startTime;
      
      expect(zepContents).toHaveLength(100);
      expect(mappingTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test validation performance
      const validationStartTime = Date.now();
      const { valid, invalid } = metadataMapper.validateMetadataBatch(zepContents);
      const validationTime = Date.now() - validationStartTime;
      
      expect(valid).toHaveLength(100);
      expect(invalid).toHaveLength(0);
      expect(validationTime).toBeLessThan(500); // Should validate in under 0.5 seconds
      
      // Test summary generation
      const summaryStartTime = Date.now();
      const summary = metadataMapper.createTransformationSummary(largeChunkSet, zepContents);
      const summaryTime = Date.now() - summaryStartTime;
      
      expect(summary.totalChunks).toBe(100);
      expect(summary.chunksWithEntities).toBe(34); // Approximately every third chunk
      expect(summaryTime).toBeLessThan(100); // Should generate summary very quickly
    });

    it('should maintain quality score consistency across large batches', () => {
      const chunks = Array.from({ length: 50 }, (_, i) => ({
        id: `chunk${i}`,
        content: `Standard chunk content with ${i} references and good quality.`,
        chunkIndex: i,
        documentId: 'consistency_doc',
        wordCount: 10,
        characterCount: 50,
        hasEntities: true,
        headings: `Section ${i}`
      }));

      const zepContents = metadataMapper.mapChunkBatchToZepFormat(chunks);
      const qualityScores = zepContents.map(c => c.metadata.quality_score || 0);
      
      // All chunks should have similar quality scores since they're similar
      const avgScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      const variance = qualityScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / qualityScores.length;
      const standardDeviation = Math.sqrt(variance);
      
      expect(standardDeviation).toBeLessThan(0.1); // Low variance indicates consistency
      expect(avgScore).toBeGreaterThan(1.2); // Should be boosted due to entities and headings
    });
  });
});