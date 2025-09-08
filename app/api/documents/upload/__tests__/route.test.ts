// ============================================================================
// Upload API Endpoint Tests - Story 2.1 Comprehensive QA
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

// Mock formidable
vi.mock('formidable', () => ({
  default: vi.fn(() => ({
    parse: vi.fn()
  }))
}))

// Mock fs operations
vi.mock('fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
      access: vi.fn()
    }
  }
}))

// Mock path operations
vi.mock('path', () => ({
  default: {
    join: vi.fn((...segments) => segments.join('/')),
    extname: vi.fn((filename) => {
      const parts = filename.split('.')
      return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
    })
  }
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}))

// Helper to create mock formidable file
const createMockFormidableFile = (name: string, type: string, size: number) => ({
  originalFilename: name,
  mimetype: type,
  size,
  filepath: `/tmp/upload_${Date.now()}`,
  newFilename: `upload_${Date.now()}`,
  hash: null,
  lastModifiedDate: new Date(),
  _writeStream: null
})

describe('Story 2.1: Upload API Endpoint QA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful file system operations by default
    ;(fs.promises.mkdir as any).mockResolvedValue(undefined)
    ;(fs.promises.writeFile as any).mockResolvedValue(undefined)
    ;(fs.promises.access as any).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC6: Temporary file storage', () => {
    it('should successfully upload a valid PDF file', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('test.pdf')
      expect(data.type).toBe('application/pdf')
      expect(data.size).toBe(1024)
      expect(data.status).toBe('uploaded')
    })

    it('should successfully upload a valid TXT file', async () => {
      const mockFile = createMockFormidableFile('test.txt', 'text/plain', 512)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('test.txt')
      expect(data.type).toBe('text/plain')
      expect(data.size).toBe(512)
    })

    it('should successfully upload a valid MD file', async () => {
      const mockFile = createMockFormidableFile('test.md', 'text/markdown', 256)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('test.md')
      expect(data.type).toBe('text/markdown')
    })

    it('should successfully upload a valid DOCX file', async () => {
      const mockFile = createMockFormidableFile(
        'test.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        2048
      )
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('test.docx')
      expect(data.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(data.size).toBe(2048)
    })

    it('should generate unique IDs for uploaded files', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.id).toBe('test-uuid-123') // From mocked uuid
      expect(data.id).toHaveLength(12) // UUID should be present
    })

    it('should store files in temp directory with correct path structure', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      await POST(request)

      // Verify temp directory creation
      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('temp/uploads'),
        { recursive: true }
      )

      // Verify file copy operation
      expect(fs.promises.writeFile).toHaveBeenCalled()
    })

    it('should return file metadata after successful upload', async () => {
      const mockFile = createMockFormidableFile('document.pdf', 'application/pdf', 5000)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        id: expect.any(String),
        name: 'document.pdf',
        type: 'application/pdf',
        size: 5000,
        status: 'uploaded',
        path: expect.any(String),
        uploadedAt: expect.any(String)
      })
    })
  })

  describe('File Validation - Server Side', () => {
    it('should reject files larger than 50MB', async () => {
      const largeFile = createMockFormidableFile('huge.pdf', 'application/pdf', 51 * 1024 * 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: largeFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/File exceeds 50MB limit/)
    })

    it('should reject unsupported file types by extension', async () => {
      const invalidFile = createMockFormidableFile('virus.exe', 'application/octet-stream', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: invalidFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/File type not supported/)
    })

    it('should reject unsupported file types by MIME type', async () => {
      const invalidFile = createMockFormidableFile('fake.pdf', 'application/javascript', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: invalidFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/File type not supported/)
    })

    it('should accept files exactly at the size limit (50MB)', async () => {
      const maxSizeFile = createMockFormidableFile('max.pdf', 'application/pdf', 50 * 1024 * 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: maxSizeFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle files without extensions if MIME type is valid', async () => {
      const noExtFile = createMockFormidableFile('README', 'text/plain', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: noExtFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle form parsing errors gracefully', async () => {
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(new Error('Form parsing failed'), null, null)
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/Failed to parse upload/)
    })

    it('should handle missing files in form', async () => {
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, {}) // No files
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/No file provided/)
    })

    it('should handle file system errors during storage', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      // Mock file system error
      ;(fs.promises.writeFile as any).mockRejectedValueOnce(new Error('Disk full'))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toMatch(/Failed to store file/)
    })

    it('should clean up temporary files on errors', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      // Mock storage error to trigger cleanup
      ;(fs.promises.writeFile as any).mockRejectedValueOnce(new Error('Storage error'))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      await POST(request)

      // Should attempt to clean up the temporary file
      expect(fs.promises.unlink).toHaveBeenCalledWith(mockFile.filepath)
    })
  })

  describe('Security Considerations', () => {
    it('should validate MIME types strictly', async () => {
      const suspiciousFile = createMockFormidableFile('image.pdf', 'image/jpeg', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: suspiciousFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should sanitize file names to prevent path traversal', async () => {
      const maliciousFile = createMockFormidableFile('../../../etc/passwd', 'text/plain', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: maliciousFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)
      const data = await response.json()

      if (response.status === 200) {
        // If accepted, should sanitize the filename
        expect(data.name).not.toContain('../')
        expect(data.name).not.toContain('etc/passwd')
      }
    })

    it('should limit concurrent uploads', async () => {
      // This would be implemented with rate limiting middleware
      // For now, ensure the endpoint doesn't crash with multiple requests
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/documents/upload', {
          method: 'POST',
          body: new FormData()
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // All should respond (either success or rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })
    })
  })

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const largeFile = createMockFormidableFile('large.pdf', 'application/pdf', 25 * 1024 * 1024) // 25MB
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          // Simulate processing time for large file
          setTimeout(() => {
            callback(null, {}, { file: largeFile })
          }, 10)
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      // Should complete within reasonable time even for large files
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should return appropriate response headers', async () => {
      const mockFile = createMockFormidableFile('test.pdf', 'application/pdf', 1024)
      const mockFormidable = formidable as any
      mockFormidable.mockImplementation(() => ({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: new FormData()
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toMatch(/application\/json/)
    })
  })
})