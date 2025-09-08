import { useState, useEffect, useCallback } from 'react'
import { 
  DocumentProcessingStatus, 
  ProcessingMetricsSummary,
  HistoryFilters,
  ProcessingEvent,
  ProcessingEventData
} from '@/types/processing'
import { getProcessingService } from '@/services/processing.service'
import { useToast } from '@/components/ui/use-toast'

export function useProcessingDashboard() {
  const { toast } = useToast()
  const service = getProcessingService()
  
  const [documents, setDocuments] = useState<DocumentProcessingStatus[]>([])
  const [historicalDocuments, setHistoricalDocuments] = useState<DocumentProcessingStatus[]>([])
  const [metrics, setMetrics] = useState<ProcessingMetricsSummary>({
    totalDocuments: 0,
    successCount: 0,
    failureCount: 0,
    averageProcessingTime: 0,
    throughput: 0,
    successRate: 0,
    activeProcessing: 0,
    queuedCount: 0,
    peakThroughput: 0,
    estimatedTimeRemaining: 0
  })
  const [previousMetrics, setPreviousMetrics] = useState<ProcessingMetricsSummary>()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [totalHistoryCount, setTotalHistoryCount] = useState(0)

  // Calculate metrics from documents
  const calculateMetrics = useCallback((docs: DocumentProcessingStatus[]): ProcessingMetricsSummary => {
    const completed = docs.filter(d => d.status === 'completed')
    const failed = docs.filter(d => d.status === 'failed')
    const processing = docs.filter(d => d.status === 'processing')
    const queued = docs.filter(d => d.status === 'queued')
    
    const totalCompleted = completed.length + failed.length
    const avgTime = completed.length > 0
      ? completed.reduce((sum, d) => sum + d.metrics.processingTime, 0) / completed.length
      : 0
    
    // Calculate throughput (docs per hour) based on last hour
    const oneHourAgo = new Date(Date.now() - 3600000)
    const recentCompleted = completed.filter(d => 
      new Date(d.completedAt || d.startedAt) > oneHourAgo
    )
    const throughput = recentCompleted.length

    const successRate = totalCompleted > 0 
      ? (completed.length / totalCompleted) * 100 
      : 0

    const estimatedTimeRemaining = queued.length > 0 && avgTime > 0
      ? (queued.length * avgTime) / 60000 // Convert to minutes
      : 0

    return {
      totalDocuments: docs.length,
      successCount: completed.length,
      failureCount: failed.length,
      averageProcessingTime: avgTime,
      throughput,
      successRate,
      activeProcessing: processing.length,
      queuedCount: queued.length,
      peakThroughput: Math.max(throughput, metrics.peakThroughput || 0),
      estimatedTimeRemaining
    }
  }, [metrics.peakThroughput])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: ProcessingEvent, data: ProcessingEventData) => {
    switch (event) {
      case ProcessingEvent.DOCUMENT_QUEUED:
        // Add new document to queue
        service.fetchDocument(data.documentId).then(doc => {
          setDocuments(prev => [...prev, doc])
        })
        break

      case ProcessingEvent.PHASE_STARTED:
      case ProcessingEvent.PHASE_PROGRESS:
      case ProcessingEvent.PHASE_COMPLETED:
      case ProcessingEvent.PHASE_FAILED:
        // Update document phase
        setDocuments(prev => {
          const index = prev.findIndex(d => d.documentId === data.documentId)
          if (index === -1) return prev
          
          const updated = [...prev]
          const doc = { ...updated[index] }
          
          if (data.phase) {
            if (data.progress !== undefined) {
              doc.phases[data.phase].progress = data.progress
            }
            
            if (event === ProcessingEvent.PHASE_STARTED) {
              doc.phases[data.phase].status = 'in_progress'
              doc.phases[data.phase].startedAt = new Date()
            } else if (event === ProcessingEvent.PHASE_COMPLETED) {
              doc.phases[data.phase].status = 'completed'
              doc.phases[data.phase].completedAt = new Date()
              doc.phases[data.phase].progress = 100
            } else if (event === ProcessingEvent.PHASE_FAILED) {
              doc.phases[data.phase].status = 'failed'
              doc.status = 'failed'
            }
            
            if (data.message) {
              doc.phases[data.phase].message = data.message
            }
          }
          
          updated[index] = doc
          return updated
        })
        break

      case ProcessingEvent.DOCUMENT_COMPLETED:
        // Move document to completed
        setDocuments(prev => {
          const index = prev.findIndex(d => d.documentId === data.documentId)
          if (index === -1) return prev
          
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: 'completed',
            completedAt: new Date()
          }
          return updated
        })
        break

      case ProcessingEvent.DOCUMENT_FAILED:
        // Mark document as failed
        setDocuments(prev => {
          const index = prev.findIndex(d => d.documentId === data.documentId)
          if (index === -1) return prev
          
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: 'failed',
            error: data.error,
            completedAt: new Date()
          }
          return updated
        })
        break

      case ProcessingEvent.METRICS_UPDATE:
        // Update metrics directly
        if (data.metrics) {
          setPreviousMetrics(metrics)
          setMetrics(data.metrics as any)
        }
        break
    }
  }, [service, metrics])

  // Connect to WebSocket
  useEffect(() => {
    service.connect(
      handleWebSocketMessage,
      (connected) => {
        setIsConnected(connected)
        if (connected) {
          toast({
            title: 'Connected',
            description: 'Real-time updates connected',
          })
        } else {
          toast({
            title: 'Disconnected',
            description: 'Real-time updates disconnected',
            variant: 'destructive'
          })
        }
      }
    )

    return () => {
      service.disconnect()
    }
  }, [service, handleWebSocketMessage])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        const queueData = await service.fetchQueue()
        setDocuments(queueData.documents)
        setMetrics(calculateMetrics(queueData.documents))
      } catch (error) {
        console.error('Failed to load initial data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load processing queue',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [service, calculateMetrics])

  // Update metrics when documents change
  useEffect(() => {
    const newMetrics = calculateMetrics(documents)
    if (JSON.stringify(newMetrics) !== JSON.stringify(metrics)) {
      setPreviousMetrics(metrics)
      setMetrics(newMetrics)
    }
  }, [documents, calculateMetrics])

  // Load historical data
  const loadHistoricalData = useCallback(async (filters: HistoryFilters) => {
    try {
      const data = await service.fetchHistory(filters)
      setHistoricalDocuments(data.documents)
      setTotalHistoryCount(data.total)
    } catch (error) {
      console.error('Failed to load historical data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load processing history',
        variant: 'destructive'
      })
    }
  }, [service])

  // Retry a document
  const retryDocument = useCallback(async (documentId: string) => {
    try {
      await service.retryDocument(documentId)
      toast({
        title: 'Retry initiated',
        description: 'Document processing has been restarted'
      })
      
      // Update document status
      setDocuments(prev => {
        const index = prev.findIndex(d => d.documentId === documentId)
        if (index === -1) return prev
        
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status: 'retrying',
          retryCount: updated[index].retryCount + 1
        }
        return updated
      })
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Failed to retry document processing',
        variant: 'destructive'
      })
    }
  }, [service])

  // Retry all failed documents
  const retryAllFailed = useCallback(async () => {
    try {
      const result = await service.retryAllFailed()
      toast({
        title: 'Retry initiated',
        description: `Retrying ${result.count} failed documents`
      })
      
      // Update all failed documents to retrying
      setDocuments(prev => 
        prev.map(doc => 
          doc.status === 'failed' 
            ? { ...doc, status: 'retrying' as const, retryCount: doc.retryCount + 1 }
            : doc
        )
      )
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Failed to retry failed documents',
        variant: 'destructive'
      })
    }
  }, [service])

  // Export to CSV
  const exportToCSV = useCallback((documents: DocumentProcessingStatus[], filename?: string) => {
    const csv = service.generateCSV(documents)
    service.downloadCSV(csv, filename)
    toast({
      title: 'Export complete',
      description: `Downloaded ${filename || 'processing-report.csv'}`
    })
  }, [service])

  return {
    documents,
    historicalDocuments,
    metrics,
    previousMetrics,
    isConnected,
    isLoading,
    totalHistoryCount,
    loadHistoricalData,
    retryDocument,
    retryAllFailed,
    exportToCSV
  }
}