import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { DocumentProcessingStatus, HistoryFilters } from '@/types/processing'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { format } from 'date-fns'

interface ProcessingHistoryProps {
  documents: DocumentProcessingStatus[]
  totalCount: number
  currentPage: number
  pageSize: number
  filters: HistoryFilters
  onFiltersChange: (filters: HistoryFilters) => void
  onPageChange: (page: number) => void
  onViewDetails?: (documentId: string) => void
}

export function ProcessingHistory({
  documents,
  totalCount,
  currentPage,
  pageSize,
  filters,
  onFiltersChange,
  onPageChange,
  onViewDetails
}: ProcessingHistoryProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '')

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleSearch = () => {
    onFiltersChange({ ...filters, searchQuery: searchInput })
  }

  const handleStatusFilter = (status: string) => {
    onFiltersChange({ 
      ...filters, 
      status: status as HistoryFilters['status'] 
    })
  }

  const handleSort = (field: HistoryFilters['sortBy']) => {
    if (filters.sortBy === field) {
      // Toggle sort order
      onFiltersChange({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // New sort field
      onFiltersChange({
        ...filters,
        sortBy: field,
        sortOrder: 'asc'
      })
    }
  }

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

  const getStatusBadgeVariant = (status: DocumentProcessingStatus['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const SortButton = ({ field, children }: { field: HistoryFilters['sortBy'], children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      {filters.sortBy === field && (
        filters.sortOrder === 'asc' ? 
          <SortAsc className="ml-1 h-3 w-3" /> : 
          <SortDesc className="ml-1 h-3 w-3" />
      )}
    </Button>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>

        <Select 
          value={filters.status || 'all'} 
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <Calendar className="h-4 w-4" />
        </Button>

        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {documents.length} of {totalCount} documents
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton field="name">Document</SortButton>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="date">Processed</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="duration">Duration</SortButton>
              </TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.documentId}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.documentId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{doc.type.toUpperCase()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">
                        {format(new Date(doc.startedAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(doc.startedAt), 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDuration(doc.metrics.processingTime)}
                  </TableCell>
                  <TableCell>
                    {formatFileSize(doc.metrics.fileSize)}
                  </TableCell>
                  <TableCell>
                    {doc.metrics.chunkCount || '-'}
                  </TableCell>
                  <TableCell>
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(doc.documentId)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}