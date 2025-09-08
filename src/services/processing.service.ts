import { 
  DocumentProcessingStatus, 
  ProcessingEvent, 
  ProcessingEventData,
  HistoryFilters,
  RetryItem
} from '@/types/processing'

export class ProcessingService {
  private ws: WebSocket | null = null
  private wsUrl: string
  private apiUrl: string
  private reconnectTimeout: NodeJS.Timeout | null = null
  private retryQueue: Map<string, RetryItem> = new Map()
  private maxRetries = 3
  private baseDelay = 1000

  constructor(wsUrl: string = 'ws://localhost:3001/processing', apiUrl: string = '/api/processing') {
    this.wsUrl = wsUrl
    this.apiUrl = apiUrl
  }

  // WebSocket connection management
  connect(
    onMessage: (event: ProcessingEvent, data: ProcessingEventData) => void,
    onConnectionChange?: (connected: boolean) => void
  ): void {
    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        onConnectionChange?.(true)
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        onConnectionChange?.(false)
        this.reconnect(onMessage, onConnectionChange)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        onConnectionChange?.(false)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data.event, data.payload)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      onConnectionChange?.(false)
      this.reconnect(onMessage, onConnectionChange)
    }
  }

  private reconnect(
    onMessage: (event: ProcessingEvent, data: ProcessingEventData) => void,
    onConnectionChange?: (connected: boolean) => void
  ): void {
    if (this.reconnectTimeout) return

    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...')
      this.reconnectTimeout = null
      this.connect(onMessage, onConnectionChange)
    }, 3000)
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // API methods
  async fetchQueue(): Promise<{ documents: DocumentProcessingStatus[] }> {
    const response = await fetch(`${this.apiUrl}/queue`)
    if (!response.ok) {
      throw new Error('Failed to fetch queue')
    }
    return response.json()
  }

  async fetchDocument(documentId: string): Promise<DocumentProcessingStatus> {
    const response = await fetch(`${this.apiUrl}/documents/${documentId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch document')
    }
    return response.json()
  }

  async fetchHistory(filters: HistoryFilters): Promise<{
    documents: DocumentProcessingStatus[]
    total: number
  }> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString())
      }
    })

    const response = await fetch(`${this.apiUrl}/history?${params}`)
    if (!response.ok) {
      throw new Error('Failed to fetch history')
    }
    return response.json()
  }

  async retryDocument(documentId: string): Promise<void> {
    const retryItem = this.retryQueue.get(documentId)
    const attempt = retryItem?.attempt || 0
    
    if (attempt >= this.maxRetries) {
      throw new Error('Max retries exceeded')
    }
    
    const delay = this.baseDelay * Math.pow(2, attempt)
    await this.sleep(delay)
    
    const response = await fetch(`${this.apiUrl}/retry/${documentId}`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error('Failed to retry document')
    }
    
    this.retryQueue.set(documentId, { 
      attempt: attempt + 1, 
      lastRetry: new Date(),
      documentId 
    })
  }

  async retryAllFailed(): Promise<{ count: number }> {
    const response = await fetch(`${this.apiUrl}/retry-all`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error('Failed to retry all documents')
    }
    return response.json()
  }

  async getFailedDocuments(): Promise<DocumentProcessingStatus[]> {
    const response = await fetch(`${this.apiUrl}/failed`)
    if (!response.ok) {
      throw new Error('Failed to fetch failed documents')
    }
    return response.json()
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Export functionality
  generateCSV(documents: DocumentProcessingStatus[]): string {
    const headers = [
      'Document ID',
      'Document Name',
      'File Type',
      'File Size',
      'Status',
      'Start Time',
      'End Time',
      'Duration',
      'Page Count',
      'Chunk Count',
      'Conversion Time',
      'Chunking Time',
      'Staging Time',
      'Error Message',
      'Retry Count'
    ]

    const rows = documents.map(doc => {
      const formatFileSize = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB']
        if (bytes === 0) return '0 B'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
      }

      const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000)
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}m ${remainingSeconds}s`
      }

      const formatDate = (date: Date | undefined) => {
        if (!date) return ''
        return new Date(date).toISOString().replace('T', ' ').slice(0, -5)
      }

      return [
        doc.documentId,
        `"${doc.name}"`,
        doc.type,
        formatFileSize(doc.metrics.fileSize),
        doc.status,
        formatDate(doc.startedAt),
        formatDate(doc.completedAt),
        formatDuration(doc.metrics.processingTime),
        doc.metrics.pageCount?.toString() || '',
        doc.metrics.chunkCount?.toString() || '',
        doc.metrics.conversionTime ? formatDuration(doc.metrics.conversionTime) : '',
        doc.metrics.chunkingTime ? formatDuration(doc.metrics.chunkingTime) : '',
        doc.metrics.stagingTime ? formatDuration(doc.metrics.stagingTime) : '',
        doc.error ? `"${doc.error.message}"` : '',
        doc.retryCount.toString()
      ]
    })

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  downloadCSV(csvContent: string, filename?: string): void {
    const finalFilename = filename || `processing-report-${new Date().toISOString().slice(0, 10)}.csv`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', finalFilename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Singleton instance
let processingServiceInstance: ProcessingService | null = null

export function getProcessingService(): ProcessingService {
  if (!processingServiceInstance) {
    processingServiceInstance = new ProcessingService()
  }
  return processingServiceInstance
}

export default ProcessingService