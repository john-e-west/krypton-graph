import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DocumentAnalyzer } from '../document-analyzer'
import * as fs from 'fs/promises'
import path from 'path'

// Mock fs/promises
vi.mock('fs/promises')

describe('DocumentAnalyzer', () => {
  let analyzer: DocumentAnalyzer
  const testDocumentId = 'test-doc-123'
  const testFilePath = '/test/path/document.txt'
  const testMetadata = {
    id: testDocumentId,
    name: 'test.txt',
    size: 1024,
    type: 'text/plain',
    path: testFilePath,
    uploadedAt: new Date().toISOString()
  }

  beforeEach(() => {
    analyzer = DocumentAnalyzer.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    analyzer.clearCache()
  })

  describe('analyzeDocument', () => {
    it('should analyze a text document successfully', async () => {
      const mockContent = 'This is test content for analysis.'
      
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(mockContent))
        .mockResolvedValueOnce(mockContent)

      const result = await analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      expect(result).toMatchObject({
        documentId: testDocumentId,
        content: mockContent,
        markdown: mockContent,
        metadata: expect.objectContaining({
          ...testMetadata,
          hash: expect.any(String)
        }),
        processingTime: expect.any(Number),
        timestamp: expect.any(String)
      })
    })

    it('should emit progress events during analysis', async () => {
      const mockContent = 'Test content'
      const progressEvents: any[] = []
      
      analyzer.on('progress', (event) => {
        progressEvents.push(event)
      })

      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(mockContent))
        .mockResolvedValueOnce(mockContent)

      await analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      expect(progressEvents).toHaveLength(4)
      expect(progressEvents[0]).toMatchObject({
        documentId: testDocumentId,
        stage: 'uploading',
        progress: 10
      })
      expect(progressEvents[3]).toMatchObject({
        documentId: testDocumentId,
        stage: 'complete',
        progress: 100
      })
    })

    it('should handle analysis errors', async () => {
      const errorMessage = 'File read error'
      vi.mocked(fs.readFile).mockRejectedValue(new Error(errorMessage))

      await expect(
        analyzer.analyzeDocument(testDocumentId, testFilePath, testMetadata)
      ).rejects.toThrow(errorMessage)
    })
  })

  describe('getAnalysisResult', () => {
    it('should retrieve cached analysis result', async () => {
      const mockContent = 'Cached content'
      
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(mockContent))
        .mockResolvedValueOnce(mockContent)

      const analysisResult = await analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      const retrieved = await analyzer.getAnalysisResult(testDocumentId)
      expect(retrieved).toEqual(analysisResult)
    })

    it('should return null for non-existent document', async () => {
      const result = await analyzer.getAnalysisResult('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('cancelAnalysis', () => {
    it('should cancel active analysis', async () => {
      const mockContent = 'Content to analyze'
      let analysisPromise: Promise<any>
      
      vi.mocked(fs.readFile).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve(Buffer.from(mockContent)), 1000)
        })
      )

      analysisPromise = analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      // Cancel immediately
      await analyzer.cancelAnalysis(testDocumentId)

      await expect(analysisPromise).rejects.toThrow()
    })
  })

  describe('checkCache', () => {
    it('should find document by hash', async () => {
      const mockContent = 'Content for hashing'
      
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(mockContent))
        .mockResolvedValueOnce(mockContent)

      const result = await analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      const cachedResult = await analyzer.checkCache(result.metadata.hash!)
      expect(cachedResult).toEqual(result)
    })

    it('should return null for non-existent hash', async () => {
      const result = await analyzer.checkCache('non-existent-hash')
      expect(result).toBeNull()
    })
  })

  describe('extractContent', () => {
    it('should extract plain text from markdown', async () => {
      const markdown = `
# Header
This is **bold** and *italic* text.
[Link](http://example.com)
\`\`\`code block\`\`\`
> Quote
`
      const expectedContent = 'Header\nThis is bold and italic text.\nLink\n\nQuote'
      
      vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(markdown))
        .mockResolvedValueOnce(markdown)

      const result = await analyzer.analyzeDocument(
        testDocumentId,
        testFilePath,
        testMetadata
      )

      // Content should have markdown formatting removed
      expect(result.content).not.toContain('#')
      expect(result.content).not.toContain('**')
      expect(result.content).not.toContain('[Link]')
      expect(result.content).not.toContain('```')
    })
  })

  describe('getActiveJobs', () => {
    it('should track active analysis jobs', () => {
      const activeJobs = analyzer.getActiveJobs()
      expect(activeJobs).toEqual([])
    })
  })
})