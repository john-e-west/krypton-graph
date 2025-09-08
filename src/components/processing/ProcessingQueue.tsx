import { useState, useMemo } from 'react'
import { DocumentProcessingCard } from './DocumentProcessingCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { DocumentProcessingStatus } from '@/types/processing'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ProcessingQueueProps {
  documents: DocumentProcessingStatus[]
  onRetry?: (documentId: string) => void
  onRetryAll?: () => void
  onViewDetails?: (documentId: string) => void
  showCompleted?: boolean
}

export function ProcessingQueue({ 
  documents, 
  onRetry, 
  onRetryAll,
  onViewDetails,
  showCompleted = false 
}: ProcessingQueueProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date')

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents]

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter)
    }

    // Filter out completed unless explicitly shown
    if (!showCompleted) {
      filtered = filtered.filter(doc => doc.status !== 'completed')
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'date':
        default:
          return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      }
    })

    return filtered
  }, [documents, statusFilter, searchQuery, sortBy, showCompleted])

  const failedCount = documents.filter(d => d.status === 'failed').length
  const processingCount = documents.filter(d => d.status === 'processing').length
  const queuedCount = documents.filter(d => d.status === 'queued').length

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="retrying">Retrying</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {failedCount > 0 && onRetryAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            className="whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry All Failed ({failedCount})
          </Button>
        )}
      </div>

      {/* Queue Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">
          Queued: <span className="font-medium text-foreground">{queuedCount}</span>
        </span>
        <span className="text-muted-foreground">
          Processing: <span className="font-medium text-foreground">{processingCount}</span>
        </span>
        <span className="text-muted-foreground">
          Failed: <span className="font-medium text-red-500">{failedCount}</span>
        </span>
      </div>

      {/* Document Cards */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <DocumentProcessingCard
                key={document.documentId}
                document={document}
                onRetry={onRetry}
                onViewDetails={onViewDetails}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No documents match your filters'
                : 'No documents in the processing queue'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}