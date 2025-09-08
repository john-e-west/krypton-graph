import { useState, useEffect, useCallback, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ProcessingQueue } from './ProcessingQueue'
import { ProcessingMetrics } from './ProcessingMetrics'
import { ProcessingHistory } from './ProcessingHistory'
import { ExportDialog } from './ExportDialog'
import { 
  DocumentProcessingStatus, 
  ProcessingMetricsSummary,
  HistoryFilters,
  ProcessingEvent,
  ProcessingEventData
} from '@/types/processing'
import { Download, RefreshCw, Activity, History, BarChart3 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface ProcessingDashboardProps {
  wsUrl?: string
  apiUrl?: string
}

export function ProcessingDashboard({ 
  wsUrl = 'ws://localhost:3001/processing',
  apiUrl = '/api/processing'
}: ProcessingDashboardProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('queue')
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
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    limit: 100,
    offset: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalHistoryCount, setTotalHistoryCount] = useState(0)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

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

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
          setIsConnected(true)
          toast({
            title: 'Connected',
            description: 'Real-time updates connected',
          })
        }

        websocket.onclose = () => {
          setIsConnected(false)
          toast({
            title: 'Disconnected',
            description: 'Real-time updates disconnected. Retrying...',
            variant: 'destructive'
          })
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            handleWebSocketMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        setWs(websocket)
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        // Fallback to polling
        startPolling()
      }
    }

    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [wsUrl])

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: { event: ProcessingEvent, payload: ProcessingEventData }) => {
    const { event, payload } = data

    switch (event) {
      case ProcessingEvent.DOCUMENT_QUEUED:
      case ProcessingEvent.PHASE_STARTED:
      case ProcessingEvent.PHASE_PROGRESS:
      case ProcessingEvent.PHASE_COMPLETED:
      case ProcessingEvent.PHASE_FAILED:
      case ProcessingEvent.DOCUMENT_COMPLETED:
      case ProcessingEvent.DOCUMENT_FAILED:
        // Update document in state
        updateDocument(payload.documentId, payload)
        break
      case ProcessingEvent.METRICS_UPDATE:
        // Update metrics
        if (payload.metrics) {
          setPreviousMetrics(metrics)
          setMetrics(payload.metrics as any)
        }
        break
    }
  }

  // Update a specific document
  const updateDocument = (documentId: string, updates: Partial<ProcessingEventData>) => {
    setDocuments(prev => {
      const index = prev.findIndex(d => d.documentId === documentId)
      if (index === -1) {
        // Document not found, might need to fetch it
        fetchDocument(documentId)
        return prev
      }

      const updated = [...prev]
      const doc = updated[index]

      // Update based on event data
      if (updates.phase && updates.progress !== undefined) {
        doc.phases[updates.phase].progress = updates.progress
        if (updates.progress === 100) {
          doc.phases[updates.phase].status = 'completed'
        } else if (updates.progress > 0) {
          doc.phases[updates.phase].status = 'in_progress'
        }
      }

      if (updates.error) {
        doc.error = updates.error
        doc.status = 'failed'
      }

      return updated
    })
  }

  // Fetch a specific document
  const fetchDocument = async (documentId: string) => {
    try {
      const response = await fetch(`${apiUrl}/documents/${documentId}`)
      if (response.ok) {
        const doc = await response.json()
        setDocuments(prev => [...prev, doc])
      }
    } catch (error) {
      console.error('Failed to fetch document:', error)
    }
  }

  // Polling fallback
  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/queue`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents)
          setPreviousMetrics(metrics)
          setMetrics(calculateMetrics(data.documents))
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load active queue
        const queueResponse = await fetch(`${apiUrl}/queue`)
        if (queueResponse.ok) {
          const queueData = await queueResponse.json()
          setDocuments(queueData.documents)
          setMetrics(calculateMetrics(queueData.documents))
        }

        // Load historical data
        await loadHistoricalData()
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }

    loadInitialData()
  }, [])

  // Load historical data
  const loadHistoricalData = async () => {
    try {
      const params = new URLSearchParams({
        ...historyFilters,
        offset: ((currentPage - 1) * 20).toString(),
        limit: '20'
      } as any)

      const response = await fetch(`${apiUrl}/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHistoricalDocuments(data.documents)
        setTotalHistoryCount(data.total)
      }
    } catch (error) {
      console.error('Failed to load historical data:', error)
    }
  }

  // Retry a document
  const handleRetry = async (documentId: string) => {
    try {
      const response = await fetch(`${apiUrl}/retry/${documentId}`, {
        method: 'POST'
      })
      if (response.ok) {
        toast({
          title: 'Retry initiated',
          description: 'Document processing has been restarted'
        })
      } else {
        throw new Error('Retry failed')
      }
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Failed to retry document processing',
        variant: 'destructive'
      })
    }
  }

  // Retry all failed documents
  const handleRetryAll = async () => {
    try {
      const response = await fetch(`${apiUrl}/retry-all`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Retry initiated',
          description: `Retrying ${data.count} failed documents`
        })
      } else {
        throw new Error('Retry all failed')
      }
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Failed to retry failed documents',
        variant: 'destructive'
      })
    }
  }

  // Export CSV
  const handleExport = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Export complete',
      description: `Downloaded ${filename}`
    })
  }

  // Update metrics when documents change
  useEffect(() => {
    const newMetrics = calculateMetrics(documents)
    if (JSON.stringify(newMetrics) !== JSON.stringify(metrics)) {
      setPreviousMetrics(metrics)
      setMetrics(newMetrics)
    }
  }, [documents])

  // Reload historical data when filters change
  useEffect(() => {
    loadHistoricalData()
  }, [historyFilters, currentPage])

  const allDocuments = useMemo(() => {
    return [...documents, ...historicalDocuments]
  }, [documents, historicalDocuments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Processing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor document processing in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue">
            <Activity className="h-4 w-4 mr-2" />
            Processing Queue
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <ProcessingQueue
            documents={documents}
            onRetry={handleRetry}
            onRetryAll={handleRetryAll}
            onViewDetails={(id) => console.log('View details:', id)}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <ProcessingMetrics
            metrics={metrics}
            previousMetrics={previousMetrics}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ProcessingHistory
            documents={historicalDocuments}
            totalCount={totalHistoryCount}
            currentPage={currentPage}
            pageSize={20}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            onPageChange={setCurrentPage}
            onViewDetails={(id) => console.log('View details:', id)}
          />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        documents={allDocuments}
        onExport={handleExport}
      />
    </div>
  )
}