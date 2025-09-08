// ============================================================================
// File Validator Tests - Story 2.1 QA (Enhanced with Real Files)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { validateFile, validateFileList, FILE_VALIDATION, ERROR_MESSAGES } from '../FileValidator'
import fs from 'fs'
import path from 'path'

describe('Story 2.1: File Validator QA', () => {
  // Helper function to create mock File objects
  const createMockFile = (name: string, type: string, size: number): File => {
    // For large files, create content that matches the specified size
    const content = size > 1000 ? 'x'.repeat(size) : 'content'
    return new File([content], name, { type })
  }

  // Helper function to create File objects from real files
  const createRealFile = (filename: string, type: string): File => {
    const testFilePath = path.join(process.cwd(), 'DocUploadTest', filename)
    if (fs.existsSync(testFilePath)) {
      const content = fs.readFileSync(testFilePath, 'utf8')
      const buffer = Buffer.from(content, 'utf8')
      return new File([buffer], filename, { type })
    }
    throw new Error(`Test file not found: ${testFilePath}`)
  }

  describe('validateFile', () => {
    it('should accept valid PDF files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid TXT files', () => {
      const file = createMockFile('test.txt', 'text/plain', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid MD files', () => {
      const file = createMockFile('test.md', 'text/markdown', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid DOCX files', () => {
      const file = createMockFile('test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', () => {
      const file = createMockFile('large.pdf', 'application/pdf', FILE_VALIDATION.maxSize + 1)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(ERROR_MESSAGES.FILE_TOO_LARGE)
    })

    it('should reject files with invalid extensions', () => {
      const file = createMockFile('test.exe', 'application/octet-stream', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_TYPE)
    })

    it('should reject files with invalid MIME types', () => {
      const file = createMockFile('test.pdf', 'application/octet-stream', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_TYPE)
    })

    it('should handle markdown files without MIME type', () => {
      // Some browsers don't set MIME type for markdown files
      const file = createMockFile('test.md', '', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle case-insensitive extensions', () => {
      const file = createMockFile('TEST.PDF', 'application/pdf', 1024)
      const result = validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('validateFileList', () => {
    it('should accept valid file lists', () => {
      const files = [
        createMockFile('test1.pdf', 'application/pdf', 1024),
        createMockFile('test2.txt', 'text/plain', 1024),
        createMockFile('test3.md', 'text/markdown', 1024)
      ]
      
      const result = validateFileList(files)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject file lists exceeding max files limit', () => {
      const files = Array.from({ length: FILE_VALIDATION.maxFiles + 1 }, (_, i) => 
        createMockFile(`test${i}.pdf`, 'application/pdf', 1024)
      )
      
      const result = validateFileList(files)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(ERROR_MESSAGES.QUEUE_FULL)
    })

    it('should reject file lists containing invalid files', () => {
      const files = [
        createMockFile('test1.pdf', 'application/pdf', 1024),
        createMockFile('test2.exe', 'application/octet-stream', 1024) // Invalid
      ]
      
      const result = validateFileList(files)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_TYPE)
    })

    it('should handle empty file lists', () => {
      const result = validateFileList([])
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('File Validation Constants', () => {
    it('should have correct max file size (50MB)', () => {
      expect(FILE_VALIDATION.maxSize).toBe(50 * 1024 * 1024)
    })

    it('should have correct max files limit (10)', () => {
      expect(FILE_VALIDATION.maxFiles).toBe(10)
    })

    it('should have all required file extensions', () => {
      const expectedExtensions = ['.pdf', '.txt', '.md', '.docx']
      expect(FILE_VALIDATION.allowedExtensions).toEqual(expectedExtensions)
    })

    it('should have all required MIME types', () => {
      const expectedTypes = [
        'application/pdf',
        'text/plain', 
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      expect(FILE_VALIDATION.allowedTypes).toEqual(expectedTypes)
    })
  })

  describe('Error Messages', () => {
    it('should have user-friendly error messages', () => {
      expect(ERROR_MESSAGES.FILE_TOO_LARGE).toMatch(/50MB/)
      expect(ERROR_MESSAGES.INVALID_TYPE).toMatch(/PDF, TXT, MD, or DOCX/)
      expect(ERROR_MESSAGES.QUEUE_FULL).toMatch(/10 files/)
      expect(ERROR_MESSAGES.UPLOAD_FAILED).toMatch(/connection/)
      expect(ERROR_MESSAGES.SERVER_ERROR).toMatch(/Server error/)
    })
  })

  describe('Real File Upload Testing', () => {
    describe('Markdown Files', () => {
      it('should validate small real markdown file', () => {
        const file = createRealFile('small-test.md', 'text/markdown')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.size).toBeLessThan(1024) // Should be small file
      })

      it('should validate medium real markdown file', () => {
        const file = createRealFile('sample-knowledge-base.md', 'text/markdown')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.size).toBeGreaterThan(1000)
        expect(file.size).toBeLessThan(10000)
      })

      it('should validate large real markdown file', () => {
        const file = createRealFile('large-content-sample.md', 'text/markdown')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.size).toBeGreaterThan(10000)
        expect(file.size).toBeLessThan(FILE_VALIDATION.maxSize)
      })

      it('should validate API documentation markdown file', () => {
        const file = createRealFile('api-documentation.md', 'text/markdown')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.name).toBe('api-documentation.md')
      })

      it('should validate project requirements markdown file', () => {
        const file = createRealFile('project-requirements.md', 'text/markdown')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.name).toBe('project-requirements.md')
      })
    })

    describe('Text Files', () => {
      it('should validate real text file (meeting notes)', () => {
        const file = createRealFile('meeting-notes.txt', 'text/plain')
        const result = validateFile(file)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(file.name).toBe('meeting-notes.txt')
        expect(file.type).toBe('text/plain')
      })
    })

    describe('Batch Upload with Real Files', () => {
      it('should validate multiple real files together', () => {
        const files = [
          createRealFile('small-test.md', 'text/markdown'),
          createRealFile('meeting-notes.txt', 'text/plain'),
          createRealFile('api-documentation.md', 'text/markdown')
        ]
        
        const result = validateFileList(files)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(files.length).toBe(3)
      })

      it('should handle all available test files (within limit)', () => {
        const files = [
          createRealFile('small-test.md', 'text/markdown'),
          createRealFile('sample-knowledge-base.md', 'text/markdown'),
          createRealFile('api-documentation.md', 'text/markdown'),
          createRealFile('project-requirements.md', 'text/markdown'),
          createRealFile('large-content-sample.md', 'text/markdown'),
          createRealFile('meeting-notes.txt', 'text/plain')
        ]
        
        const result = validateFileList(files)
        
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(files.length).toBe(6)
        expect(files.length).toBeLessThanOrEqual(FILE_VALIDATION.maxFiles)
      })
    })

    describe('Real File Size Validation', () => {
      it('should confirm all test files are under size limit', () => {
        const testFiles = [
          'small-test.md',
          'sample-knowledge-base.md', 
          'api-documentation.md',
          'project-requirements.md',
          'large-content-sample.md',
          'meeting-notes.txt'
        ]

        testFiles.forEach(filename => {
          const file = createRealFile(filename, filename.endsWith('.md') ? 'text/markdown' : 'text/plain')
          const result = validateFile(file)
          
          expect(result.isValid).toBe(true)
          expect(file.size).toBeLessThan(FILE_VALIDATION.maxSize)
        })
      })

      it('should provide accurate size information for real files', () => {
        const largeFile = createRealFile('large-content-sample.md', 'text/markdown')
        
        expect(largeFile.size).toBeGreaterThan(10000) // Should be substantial content
        expect(largeFile.size).toBeLessThan(FILE_VALIDATION.maxSize) // But under limit
        
        const smallFile = createRealFile('small-test.md', 'text/markdown')
        expect(smallFile.size).toBeLessThan(1000) // Should be small
        expect(smallFile.size).toBeGreaterThan(0) // But not empty
      })
    })

    describe('Real File Content Validation', () => {
      it('should handle files with various content types', () => {
        // Technical documentation
        const apiDoc = createRealFile('api-documentation.md', 'text/markdown')
        expect(validateFile(apiDoc).isValid).toBe(true)
        
        // Requirements document
        const requirements = createRealFile('project-requirements.md', 'text/markdown')
        expect(validateFile(requirements).isValid).toBe(true)
        
        // Meeting notes (plain text)
        const notes = createRealFile('meeting-notes.txt', 'text/plain')
        expect(validateFile(notes).isValid).toBe(true)
        
        // Knowledge base content
        const knowledge = createRealFile('sample-knowledge-base.md', 'text/markdown')
        expect(validateFile(knowledge).isValid).toBe(true)
      })

      it('should maintain file integrity during validation', () => {
        const originalFile = createRealFile('api-documentation.md', 'text/markdown')
        const originalSize = originalFile.size
        const originalName = originalFile.name
        
        const result = validateFile(originalFile)
        
        expect(result.isValid).toBe(true)
        expect(originalFile.size).toBe(originalSize) // Size unchanged
        expect(originalFile.name).toBe(originalName) // Name unchanged
      })
    })
  })
})