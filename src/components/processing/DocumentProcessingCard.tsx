import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  RefreshCw,
  XCircle,
  Upload,
  FileCheck,
  Scissors,
  Database
} from 'lucide-react'
import { DocumentProcessingStatus, PhaseStatus, ProcessingPhase } from '@/types/processing'
import { cn } from '@/lib/utils'

interface DocumentProcessingCardProps {
  document: DocumentProcessingStatus
  onRetry?: (documentId: string) => void
  onViewDetails?: (documentId: string) => void
}

const phaseIcons: Record<ProcessingPhase, React.ComponentType<any>> = {
  upload: Upload,
  conversion: FileCheck,
  chunking: Scissors,
  staging: Database
}

const phaseLabels: Record<ProcessingPhase, string> = {
  upload: 'Upload',
  conversion: 'Convert',
  chunking: 'Chunk',
  staging: 'Stage'
}

function getStatusIcon(status: DocumentProcessingStatus['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'processing':
    case 'retrying':
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    case 'queued':
      return <Clock className="h-5 w-5 text-gray-500" />
    default:
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }
}

function getStatusBadgeVariant(status: DocumentProcessingStatus['status']): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'processing':
    case 'retrying':
      return 'secondary'
    default:
      return 'outline'
  }
}

function PhaseIndicator({ phase, status }: { phase: ProcessingPhase; status: PhaseStatus }) {
  const Icon = phaseIcons[phase]
  
  const getPhaseColor = () => {
    switch (status.status) {
      case 'completed':
        return 'text-green-500 bg-green-50'
      case 'in_progress':
        return 'text-blue-500 bg-blue-50'
      case 'failed':
        return 'text-red-500 bg-red-50'
      case 'skipped':
        return 'text-gray-300 bg-gray-50'
      default:
        return 'text-gray-400 bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("p-2 rounded-full", getPhaseColor())}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs text-muted-foreground">{phaseLabels[phase]}</span>
      {status.status === 'in_progress' && status.progress > 0 && (
        <span className="text-xs font-medium">{status.progress}%</span>
      )}
    </div>
  )
}

export function DocumentProcessingCard({ 
  document, 
  onRetry, 
  onViewDetails 
}: DocumentProcessingCardProps) {
  const overallProgress = useMemo(() => {
    const phases = Object.values(document.phases)
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0)
    return Math.round(totalProgress / phases.length)
  }, [document.phases])

  const processingTime = useMemo(() => {
    if (!document.completedAt) {
      const now = new Date()
      const elapsed = now.getTime() - new Date(document.startedAt).getTime()
      return Math.round(elapsed / 1000)
    }
    return Math.round(document.metrics.processingTime / 1000)
  }, [document])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-medium">
                {document.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {document.type.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(document.metrics.fileSize)}
                </span>
                {document.metrics.pageCount && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {document.metrics.pageCount} pages
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(document.status)}
            <Badge variant={getStatusBadgeVariant(document.status)}>
              {document.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Phase Indicators */}
        <div className="flex justify-between items-center px-2">
          {(Object.keys(document.phases) as ProcessingPhase[]).map((phase) => (
            <PhaseIndicator
              key={phase}
              phase={phase}
              status={document.phases[phase]}
            />
          ))}
        </div>

        {/* Progress Bar */}
        {document.status === 'processing' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Metrics */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Processing Time</span>
          <span className="font-medium">{formatTime(processingTime)}</span>
        </div>

        {/* Error Message */}
        {document.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {document.error.message}
                </p>
                {document.error.details && (
                  <p className="text-xs text-red-600 mt-1">
                    {JSON.stringify(document.error.details)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {document.canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(document.documentId)}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry ({document.retryCount}/3)
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(document.documentId)}
              className="flex-1"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}