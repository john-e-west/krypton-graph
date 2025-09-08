import { EventEmitter } from 'events'
import path from 'path'
import { readFile } from 'fs/promises'
import crypto from 'crypto'

export interface AnalysisProgress {
  stage: 'uploading' | 'converting' | 'analyzing' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
  documentId?: string
  jobId?: string
}

export interface DocumentMetadata {
  id: string
  name: string
  size: number
  type: string
  path: string
  hash?: string
  uploadedAt: string
}

export interface AnalysisResult {
  documentId: string
  content: string
  markdown: string
  metadata: DocumentMetadata
  processingTime: number
  timestamp: string
}

export class DocumentAnalyzer extends EventEmitter {
  private static instance: DocumentAnalyzer
  private analysisQueue: Map<string, AnalysisResult> = new Map()
  private activeJobs: Map<string, AbortController> = new Map()
  
  private constructor() {
    super()
  }

  static getInstance(): DocumentAnalyzer {
    if (!DocumentAnalyzer.instance) {
      DocumentAnalyzer.instance = new DocumentAnalyzer()
    }
    return DocumentAnalyzer.instance
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath)
    const hashSum = crypto.createHash('sha256')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  }

  async analyzeDocument(
    documentId: string,
    filePath: string,
    metadata: Omit<DocumentMetadata, 'hash'>
  ): Promise<AnalysisResult> {
    const startTime = Date.now()
    const controller = new AbortController()
    this.activeJobs.set(documentId, controller)

    try {
      // Emit progress: uploading
      this.emitProgress(documentId, {
        stage: 'uploading',
        progress: 10,
        message: 'Processing uploaded document...',
        documentId
      })

      // Calculate file hash for caching
      const fileHash = await this.calculateFileHash(filePath)
      
      // Emit progress: converting
      this.emitProgress(documentId, {
        stage: 'converting',
        progress: 30,
        message: 'Converting document to markdown...',
        documentId
      })

      // Convert document using Docling
      const markdown = await this.convertToMarkdown(filePath, metadata.type)
      
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled')
      }

      // Emit progress: analyzing
      this.emitProgress(documentId, {
        stage: 'analyzing',
        progress: 60,
        message: 'Analyzing document structure...',
        documentId
      })

      // Extract text content for analysis
      const content = await this.extractContent(markdown)
      
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled')
      }

      // Emit progress: complete
      this.emitProgress(documentId, {
        stage: 'complete',
        progress: 100,
        message: 'Document analysis complete',
        documentId
      })

      const result: AnalysisResult = {
        documentId,
        content,
        markdown,
        metadata: {
          ...metadata,
          hash: fileHash
        },
        processingTime: (Date.now() - startTime) / 1000,
        timestamp: new Date().toISOString()
      }

      this.analysisQueue.set(documentId, result)
      return result

    } catch (error) {
      this.emitProgress(documentId, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Analysis failed',
        documentId
      })
      throw error
    } finally {
      this.activeJobs.delete(documentId)
    }
  }

  private async convertToMarkdown(filePath: string, fileType: string): Promise<string> {
    // Integration point for Docling service
    // This would call the Python Docling service via API or subprocess
    
    const fileExtension = path.extname(filePath).toLowerCase()
    
    // For now, handle simple text files directly
    if (fileExtension === '.txt' || fileExtension === '.md') {
      const content = await readFile(filePath, 'utf-8')
      return content
    }

    // For PDF, DOCX, etc., call Docling service
    // This is a placeholder - actual implementation would call the Python service
    return await this.callDoclingService(filePath, fileType)
  }

  private async callDoclingService(filePath: string, fileType: string): Promise<string> {
    // Placeholder for Docling integration
    // In production, this would:
    // 1. Send file to Docling Python service via HTTP or subprocess
    // 2. Wait for conversion result
    // 3. Return markdown content
    
    // For now, return a placeholder
    return `# Document Content\n\nProcessing ${fileType} document at ${filePath}\n\n[Content would be extracted here by Docling]`
  }

  private async extractContent(markdown: string): Promise<string> {
    // Extract plain text from markdown for analysis
    // Remove markdown formatting but preserve structure
    
    let content = markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers but keep text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return content
  }

  private emitProgress(documentId: string, progress: AnalysisProgress) {
    this.emit('progress', { documentId, ...progress })
  }

  async getAnalysisResult(documentId: string): Promise<AnalysisResult | null> {
    return this.analysisQueue.get(documentId) || null
  }

  async cancelAnalysis(documentId: string): Promise<void> {
    const controller = this.activeJobs.get(documentId)
    if (controller) {
      controller.abort()
      this.activeJobs.delete(documentId)
    }
  }

  async checkCache(fileHash: string): Promise<AnalysisResult | null> {
    // Check if we've already analyzed this file
    for (const result of this.analysisQueue.values()) {
      if (result.metadata.hash === fileHash) {
        return result
      }
    }
    return null
  }

  clearCache(): void {
    this.analysisQueue.clear()
  }

  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys())
  }
}