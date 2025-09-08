import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DocumentProcessingStatus, ExportRow } from '@/types/processing'
import { Download, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documents: DocumentProcessingStatus[]
  onExport: (data: string, filename: string) => void
}

export function ExportDialog({ 
  open, 
  onOpenChange, 
  documents,
  onExport 
}: ExportDialogProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all')
  const [includeMetrics, setIncludeMetrics] = useState(true)
  const [includeErrors, setIncludeErrors] = useState(true)

  const formatDocumentForExport = (doc: DocumentProcessingStatus): ExportRow => {
    return {
      documentId: doc.documentId,
      documentName: doc.name,
      fileType: doc.type,
      fileSize: formatFileSize(doc.metrics.fileSize),
      status: doc.status,
      startTime: format(new Date(doc.startedAt), 'yyyy-MM-dd HH:mm:ss'),
      endTime: doc.completedAt ? format(new Date(doc.completedAt), 'yyyy-MM-dd HH:mm:ss') : '',
      duration: formatDuration(doc.metrics.processingTime),
      pageCount: doc.metrics.pageCount?.toString() || '',
      chunkCount: doc.metrics.chunkCount?.toString() || '',
      conversionTime: doc.metrics.conversionTime ? formatDuration(doc.metrics.conversionTime) : '',
      chunkingTime: doc.metrics.chunkingTime ? formatDuration(doc.metrics.chunkingTime) : '',
      stagingTime: doc.metrics.stagingTime ? formatDuration(doc.metrics.stagingTime) : '',
      errorMessage: doc.error?.message || '',
      retryCount: doc.retryCount.toString()
    }
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const generateCSV = (documents: DocumentProcessingStatus[]): string => {
    // Filter documents based on criteria
    let filtered = [...documents]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter)
    }

    // Apply date range filter
    if (dateRange.from) {
      const fromDate = startOfDay(dateRange.from).getTime()
      const toDate = dateRange.to ? endOfDay(dateRange.to).getTime() : endOfDay(dateRange.from).getTime()
      
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.startedAt).getTime()
        return docDate >= fromDate && docDate <= toDate
      })
    }

    // Convert to export format
    const rows = filtered.map(formatDocumentForExport)

    // Build headers based on options
    let headers = [
      'Document ID',
      'Document Name',
      'File Type',
      'File Size',
      'Status',
      'Start Time',
      'End Time',
      'Duration'
    ]

    if (includeMetrics) {
      headers.push(
        'Page Count',
        'Chunk Count',
        'Conversion Time',
        'Chunking Time',
        'Staging Time'
      )
    }

    if (includeErrors) {
      headers.push('Error Message', 'Retry Count')
    }

    // Build CSV content
    const csvHeaders = headers.join(',')
    const csvRows = rows.map(row => {
      let values = [
        `"${row.documentId}"`,
        `"${row.documentName}"`,
        row.fileType,
        row.fileSize,
        row.status,
        row.startTime,
        row.endTime,
        row.duration
      ]

      if (includeMetrics) {
        values.push(
          row.pageCount,
          row.chunkCount,
          row.conversionTime,
          row.chunkingTime,
          row.stagingTime
        )
      }

      if (includeErrors) {
        values.push(
          `"${row.errorMessage}"`,
          row.retryCount
        )
      }

      return values.join(',')
    })

    return [csvHeaders, ...csvRows].join('\n')
  }

  const handleExport = () => {
    const csv = generateCSV(documents)
    const filename = `processing-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    onExport(csv, filename)
    onOpenChange(false)
  }

  const filteredCount = () => {
    let count = documents.length

    if (statusFilter !== 'all') {
      count = documents.filter(d => d.status === statusFilter).length
    }

    if (dateRange.from) {
      const fromDate = startOfDay(dateRange.from).getTime()
      const toDate = dateRange.to ? endOfDay(dateRange.to).getTime() : endOfDay(dateRange.from).getTime()
      
      count = documents.filter(doc => {
        const docDate = new Date(doc.startedAt).getTime()
        return docDate >= fromDate && docDate <= toDate && 
               (statusFilter === 'all' || doc.status === statusFilter)
      }).length
    }

    return count
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Export Processing Report</DialogTitle>
          <DialogDescription>
            Configure export options for the processing report CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to
                  }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status Filter</Label>
            <RadioGroup value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Documents</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed">Completed Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="failed" id="failed" />
                <Label htmlFor="failed">Failed Only</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Include Options */}
          <div className="space-y-2">
            <Label>Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metrics"
                  checked={includeMetrics}
                  onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
                />
                <Label htmlFor="metrics">Processing Metrics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="errors"
                  checked={includeErrors}
                  onCheckedChange={(checked) => setIncludeErrors(checked as boolean)}
                />
                <Label htmlFor="errors">Error Details</Label>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              Export will include <span className="font-medium text-foreground">{filteredCount()}</span> documents
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}