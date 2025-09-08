import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AirtableStagingService, DocumentData } from '../staging.service'
import { AirtableClient } from '../../client'
import { DocumentRecord, DocumentChunkRecord, EpisodeRecord } from '../../../types/airtable'

// Mock the uuid module
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}))

describe('AirtableStagingService', () => {
  let service: AirtableStagingService
  let mockClient: Partial<AirtableClient>
  
  beforeEach(() => {
    // Create mock client
    mockClient = {
      createRecord: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
      listRecords: vi.fn(),
      isReady: vi.fn(() => true),
      getConfig: vi.fn(() => ({
        hasApiKey: true,
        hasBaseId: true,
        baseId: 'test-base-id',
        rateLimitStats: {
          queueLength: 0,
          processing: false,
          recentRequests: 0,
          requestsPerSecond: 0
        }
      }))
    }
    
    service = new AirtableStagingService(mockClient as AirtableClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('stageDocument', () => {
    const mockDocumentData: DocumentData = {
      name: 'Test Document.pdf',
      type: 'pdf',
      originalPath: '/path/to/document.pdf',
      markdownContent: '# Test Content',
      fileSize: 1024,
      pageCount: 5,
      wordCount: 500,
      chunks: [
        {
          content: 'Chunk 1 content',
          chunkIndex: 0,
          startPosition: 0,
          endPosition: 100,
          wordCount: 50,
          characterCount: 200,
          headings: ['Introduction'],
          hasEntities: true
        },
        {
          content: 'Chunk 2 content',
          chunkIndex: 1,
          startPosition: 100,
          endPosition: 200,
          wordCount: 45,
          characterCount: 180,
          headings: ['Main Content'],
          hasEntities: false
        }
      ]
    }

    it('should successfully stage a document with chunks', async () => {
      // Mock successful responses
      const mockDocRecord: DocumentRecord = {
        id: 'doc-123',
        fields: {
          Name: mockDocumentData.name,
          Type: 'pdf',
          Status: 'processing',
          'Episode ID': 'test-uuid-123'
        },
        createdTime: new Date().toISOString()
      }
      
      const mockChunkRecord1: DocumentChunkRecord = {
        id: 'chunk-1',
        fields: {
          'Chunk ID': 'test-uuid-123',
          Document: ['doc-123'],
          Content: 'Chunk 1 content',
          'Chunk Index': 0
        },
        createdTime: new Date().toISOString()
      }
      
      const mockChunkRecord2: DocumentChunkRecord = {
        id: 'chunk-2',
        fields: {
          'Chunk ID': 'test-uuid-123',
          Document: ['doc-123'],
          Content: 'Chunk 2 content',
          'Chunk Index': 1
        },
        createdTime: new Date().toISOString()
      }
      
      const mockEpisodeRecord: EpisodeRecord = {
        id: 'episode-123',
        fields: {
          'Episode ID': 'test-uuid-123',
          Type: 'document_import',
          Status: 'started'
        },
        createdTime: new Date().toISOString()
      }
      
      // Setup mocks
      vi.mocked(mockClient.createRecord!)
        .mockResolvedValueOnce(mockEpisodeRecord) // Episode creation
        .mockResolvedValueOnce(mockDocRecord) // Document creation
        .mockResolvedValueOnce({} as any) // Audit log for document
        .mockResolvedValueOnce(mockChunkRecord1) // Chunk 1
        .mockResolvedValueOnce({} as any) // Audit log for chunk 1
        .mockResolvedValueOnce(mockChunkRecord2) // Chunk 2
        .mockResolvedValueOnce({} as any) // Audit log for chunk 2
        .mockResolvedValue({} as any) // Other audit logs
      
      vi.mocked(mockClient.listRecords!)
        .mockResolvedValueOnce({ 
          records: [mockDocRecord] 
        }) // Document verification
        .mockResolvedValueOnce({ 
          records: [mockChunkRecord1, mockChunkRecord2] 
        }) // Chunks verification
        .mockResolvedValueOnce({ 
          records: [mockEpisodeRecord] 
        }) // Episode verification
        .mockResolvedValueOnce({ 
          records: [mockEpisodeRecord] 
        }) // Episode update
      
      const result = await service.stageDocument(mockDocumentData, 'user-123')
      
      expect(result.success).toBe(true)
      expect(result.episodeId).toBe('test-uuid-123')
      expect(result.documentId).toBe('doc-123')
      expect(result.chunkIds).toHaveLength(2)
      
      // Verify episode was created
      expect(mockClient.createRecord).toHaveBeenCalledWith('Episodes', {
        fields: expect.objectContaining({
          'Episode ID': 'test-uuid-123',
          Type: 'document_import',
          Status: 'started'
        })
      })
      
      // Verify document was created
      expect(mockClient.createRecord).toHaveBeenCalledWith('Documents', {
        fields: expect.objectContaining({
          Name: mockDocumentData.name,
          Type: 'pdf',
          Status: 'processing'
        })
      })
      
      // Verify chunks were created
      expect(mockClient.createRecord).toHaveBeenCalledWith('DocumentChunks', {
        fields: expect.objectContaining({
          Content: 'Chunk 1 content',
          'Chunk Index': 0
        })
      })
      
      expect(mockClient.createRecord).toHaveBeenCalledWith('DocumentChunks', {
        fields: expect.objectContaining({
          Content: 'Chunk 2 content',
          'Chunk Index': 1
        })
      })
    })

    it('should rollback on failure', async () => {
      // Mock document creation succeeds but chunk creation fails
      const mockDocRecord: DocumentRecord = {
        id: 'doc-456',
        fields: {
          Name: mockDocumentData.name,
          Type: 'pdf',
          Status: 'processing'
        },
        createdTime: new Date().toISOString()
      }
      
      const mockEpisodeRecord: EpisodeRecord = {
        id: 'episode-456',
        fields: {
          'Episode ID': 'test-uuid-123',
          Type: 'document_import',
          Status: 'started'
        },
        createdTime: new Date().toISOString()
      }
      
      vi.mocked(mockClient.createRecord!)
        .mockResolvedValueOnce(mockEpisodeRecord) // Episode creation
        .mockResolvedValueOnce(mockDocRecord) // Document creation
        .mockResolvedValueOnce({} as any) // Audit log
        .mockRejectedValueOnce(new Error('Chunk creation failed')) // Chunk creation fails
      
      vi.mocked(mockClient.listRecords!)
        .mockResolvedValue({ records: [mockEpisodeRecord] })
      
      const result = await service.stageDocument(mockDocumentData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.message).toContain('Chunk creation failed')
      
      // Verify rollback was called
      expect(mockClient.deleteRecord).toHaveBeenCalled()
    })
  })

  describe('validateReferentialIntegrity', () => {
    it('should validate existing references', async () => {
      vi.mocked(mockClient.listRecords!).mockResolvedValue({
        records: [{ id: 'doc-123' } as any]
      })
      
      const isValid = await service.validateReferentialIntegrity('DocumentChunks', {
        Document: ['doc-123']
      })
      
      expect(isValid).toBe(true)
      expect(mockClient.listRecords).toHaveBeenCalledWith('Documents', {
        filterByFormula: `RECORD_ID() = 'doc-123'`,
        maxRecords: 1
      })
    })

    it('should throw error for missing required references', async () => {
      vi.mocked(mockClient.listRecords!).mockResolvedValue({
        records: []
      })
      
      await expect(
        service.validateReferentialIntegrity('DocumentChunks', {
          Document: ['non-existent']
        })
      ).rejects.toThrow('Invalid reference: Document -> non-existent')
    })

    it('should validate table without integrity rules', async () => {
      const isValid = await service.validateReferentialIntegrity('Documents', {
        Name: 'Test Document'
      })
      
      expect(isValid).toBe(true)
      expect(mockClient.listRecords).not.toHaveBeenCalled()
    })
  })

  describe('verification', () => {
    it('should generate accurate verification report', async () => {
      const mockDoc: DocumentRecord = {
        id: 'doc-789',
        fields: {
          Name: 'Test Document',
          'Chunk Count': 2
        },
        createdTime: new Date().toISOString()
      }
      
      const mockChunks: DocumentChunkRecord[] = [
        {
          id: 'chunk-1',
          fields: {
            'Chunk ID': 'chunk-uuid-1',
            Document: ['doc-789'],
            Content: 'Content 1',
            'Chunk Index': 0
          },
          createdTime: new Date().toISOString()
        },
        {
          id: 'chunk-2',
          fields: {
            'Chunk ID': 'chunk-uuid-2',
            Document: ['doc-789'],
            Content: 'Content 2',
            'Chunk Index': 1
          },
          createdTime: new Date().toISOString()
        }
      ];
      
      // Set episodeId on the service
      (service as any).episodeId = 'test-episode-123'
      
      vi.mocked(mockClient.listRecords!)
        .mockResolvedValueOnce({ records: [mockDoc] })
        .mockResolvedValueOnce({ records: mockChunks })
        .mockResolvedValueOnce({ records: [{ id: 'episode-123' } as any] })
      
      // Access private method through type assertion
      const report = await (service as any).verifyStaging('doc-789', 2)
      
      expect(report).toBeDefined()
      expect(report.documentId).toBe('doc-789')
      expect(report.passed).toBe(true)
      expect(report.checks).toHaveLength(5)
      
      const documentCheck = report.checks.find((c: any) => c.name === 'Document exists')
      expect(documentCheck?.passed).toBe(true)
      
      const chunkCountCheck = report.checks.find((c: any) => c.name === 'Chunk count matches')
      expect(chunkCountCheck?.passed).toBe(true)
      expect(chunkCountCheck?.expected).toBe(2)
      expect(chunkCountCheck?.actual).toBe(2)
      
      const sequenceCheck = report.checks.find((c: any) => c.name === 'Chunk sequence valid')
      expect(sequenceCheck?.passed).toBe(true)
    })

    it('should fail verification when chunks are missing', async () => {
      const mockDoc: DocumentRecord = {
        id: 'doc-999',
        fields: {
          Name: 'Test Document',
          'Chunk Count': 3
        },
        createdTime: new Date().toISOString()
      }
      
      const mockChunks: DocumentChunkRecord[] = [
        {
          id: 'chunk-1',
          fields: {
            'Chunk ID': 'chunk-uuid-1',
            Document: ['doc-999'],
            Content: 'Content 1',
            'Chunk Index': 0
          },
          createdTime: new Date().toISOString()
        }
      ]
      
      vi.mocked(mockClient.listRecords!)
        .mockResolvedValueOnce({ records: [mockDoc] })
        .mockResolvedValueOnce({ records: mockChunks })
        .mockResolvedValueOnce({ records: [] })
      
      const report = await (service as any).verifyStaging('doc-999', 3)
      
      expect(report.passed).toBe(false)
      
      const chunkCountCheck = report.checks.find((c: any) => c.name === 'Chunk count matches')
      expect(chunkCountCheck?.passed).toBe(false)
      expect(chunkCountCheck?.expected).toBe(3)
      expect(chunkCountCheck?.actual).toBe(1)
    })
  })
})