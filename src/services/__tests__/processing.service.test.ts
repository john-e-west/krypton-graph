import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProcessingService } from '../processing.service'
import { ProcessingEvent, DocumentProcessingStatus } from '@/types/processing'

// Mock WebSocket
class MockWebSocket {
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  readyState: number = WebSocket.CONNECTING

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  send(data: string) {
    // Mock send
  }
}

global.WebSocket = MockWebSocket as any

// Mock fetch
global.fetch = vi.fn()

describe('ProcessingService', () => {
  let service: ProcessingService

  beforeEach(() => {
    service = new ProcessingService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    service.disconnect()
  })

  describe('WebSocket Connection', () => {
    it('connects to WebSocket server', (done) => {
      const onConnectionChange = vi.fn()

      service.connect(
        () => {},
        onConnectionChange
      )

      setTimeout(() => {
        expect(onConnectionChange).toHaveBeenCalledWith(true)
        done()
      }, 10)
    })

    it('handles WebSocket messages', (done) => {
      const onMessage = vi.fn()

      service.connect(onMessage, () => {})

      setTimeout(() => {
        const ws = (service as any).ws as MockWebSocket
        const messageData = {
          event: ProcessingEvent.PHASE_PROGRESS,
          payload: {
            documentId: 'doc-1',
            phase: 'chunking',
            progress: 50
          }
        }

        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify(messageData)
          }))
        }

        expect(onMessage).toHaveBeenCalledWith(
          ProcessingEvent.PHASE_PROGRESS,
          messageData.payload
        )
        done()
      }, 10)
    })

    it('reconnects on connection loss', (done) => {
      const onConnectionChange = vi.fn()

      service.connect(() => {}, onConnectionChange)

      setTimeout(() => {
        const ws = (service as any).ws as MockWebSocket
        ws.close()

        expect(onConnectionChange).toHaveBeenCalledWith(false)
        
        // Check that reconnect is scheduled
        expect((service as any).reconnectTimeout).toBeTruthy()
        done()
      }, 10)
    })
  })

  describe('API Methods', () => {
    it('fetches queue', async () => {
      const mockDocuments: DocumentProcessingStatus[] = [{
        documentId: 'doc-1',
        name: 'test.pdf',
        type: 'pdf',
        status: 'processing',
        currentPhase: 'chunking',
        phases: {
          upload: { status: 'completed', progress: 100 },
          conversion: { status: 'completed', progress: 100 },
          chunking: { status: 'in_progress', progress: 50 },
          staging: { status: 'pending', progress: 0 }
        },
        startedAt: new Date(),
        metrics: {
          fileSize: 1024,
          processingTime: 1000
        },
        retryCount: 0,
        canRetry: false
      }]

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      })

      const result = await service.fetchQueue()
      
      expect(fetch).toHaveBeenCalledWith('/api/processing/queue')
      expect(result.documents).toEqual(mockDocuments)
    })

    it('fetches document by ID', async () => {
      const mockDocument: DocumentProcessingStatus = {
        documentId: 'doc-1',
        name: 'test.pdf',
        type: 'pdf',
        status: 'completed',
        currentPhase: 'staging',
        phases: {
          upload: { status: 'completed', progress: 100 },
          conversion: { status: 'completed', progress: 100 },
          chunking: { status: 'completed', progress: 100 },
          staging: { status: 'completed', progress: 100 }
        },
        startedAt: new Date(),
        completedAt: new Date(),
        metrics: {
          fileSize: 1024,
          processingTime: 5000
        },
        retryCount: 0,
        canRetry: false
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      })

      const result = await service.fetchDocument('doc-1')
      
      expect(fetch).toHaveBeenCalledWith('/api/processing/documents/doc-1')
      expect(result).toEqual(mockDocument)
    })

    it('retries document', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await service.retryDocument('doc-1')
      
      expect(fetch).toHaveBeenCalledWith('/api/processing/retry/doc-1', {
        method: 'POST'
      })
    })

    it('retries all failed documents', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 })
      })

      const result = await service.retryAllFailed()
      
      expect(fetch).toHaveBeenCalledWith('/api/processing/retry-all', {
        method: 'POST'
      })
      expect(result.count).toBe(5)
    })

    it('fetches history with filters', async () => {
      const filters = {
        status: 'completed' as const,
        sortBy: 'date' as const,
        sortOrder: 'desc' as const,
        limit: 20,
        offset: 0
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [], total: 0 })
      })

      await service.fetchHistory(filters)
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/processing/history?')
      )
      const calledUrl = (fetch as any).mock.calls[0][0]
      expect(calledUrl).toContain('status=completed')
      expect(calledUrl).toContain('sortBy=date')
      expect(calledUrl).toContain('sortOrder=desc')
    })
  })

  describe('CSV Export', () => {
    it('generates CSV from documents', () => {
      const documents: DocumentProcessingStatus[] = [{
        documentId: 'doc-1',
        name: 'test.pdf',
        type: 'pdf',
        status: 'completed',
        currentPhase: 'staging',
        phases: {
          upload: { status: 'completed', progress: 100 },
          conversion: { status: 'completed', progress: 100 },
          chunking: { status: 'completed', progress: 100 },
          staging: { status: 'completed', progress: 100 }
        },
        startedAt: new Date('2024-01-01T10:00:00'),
        completedAt: new Date('2024-01-01T10:05:00'),
        metrics: {
          fileSize: 1048576,
          pageCount: 10,
          chunkCount: 20,
          processingTime: 300000,
          conversionTime: 120000,
          chunkingTime: 60000,
          stagingTime: 30000
        },
        retryCount: 0,
        canRetry: false
      }]

      const csv = service.generateCSV(documents)
      
      expect(csv).toContain('Document ID,Document Name')
      expect(csv).toContain('doc-1,"test.pdf"')
      expect(csv).toContain('completed')
      expect(csv).toContain('1 MB')
    })

    it('downloads CSV file', () => {
      const createElementSpy = vi.spyOn(document, 'createElement')
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')

      service.downloadCSV('test,data', 'test.csv')
      
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
    })
  })

  describe('Retry Logic', () => {
    it('respects max retries', async () => {
      // Set up retry count
      ;(service as any).retryQueue.set('doc-1', {
        attempt: 3,
        lastRetry: new Date(),
        documentId: 'doc-1'
      })

      await expect(service.retryDocument('doc-1')).rejects.toThrow('Max retries exceeded')
    })

    it('implements exponential backoff', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep')
      
      ;(fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      // First retry
      await service.retryDocument('doc-1')
      expect(sleepSpy).toHaveBeenCalledWith(1000)

      // Second retry
      await service.retryDocument('doc-1')
      expect(sleepSpy).toHaveBeenCalledWith(2000)
    })
  })
})