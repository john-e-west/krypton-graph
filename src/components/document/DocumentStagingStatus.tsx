import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, Database, Loader2 } from 'lucide-react'
import { DocumentStatus, EpisodeStatus } from '@/lib/types/airtable'

export interface StagingStatus {
  documentId?: string
  documentName: string
  status: DocumentStatus
  episodeId?: string
  episodeStatus?: EpisodeStatus
  totalChunks: number
  processedChunks: number
  verificationChecks?: {
    name: string
    passed: boolean
    error?: string
  }[]
  error?: string
  startTime?: Date
  completionTime?: Date
}

interface DocumentStagingStatusProps {
  status: StagingStatus
  onRetry?: () => void
}

export function DocumentStagingStatus({ status, onRetry }: DocumentStagingStatusProps) {
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState<string>('')

  useEffect(() => {
    if (status.totalChunks > 0) {
      setProgress((status.processedChunks / status.totalChunks) * 100)
    }
  }, [status.processedChunks, status.totalChunks])

  useEffect(() => {
    if (status.startTime && !status.completionTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - status.startTime!.getTime()
        const seconds = Math.floor(elapsed / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        setElapsedTime(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`)
      }, 1000)

      return () => clearInterval(interval)
    } else if (status.startTime && status.completionTime) {
      const elapsed = status.completionTime.getTime() - status.startTime.getTime()
      const seconds = Math.floor(elapsed / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      setElapsedTime(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`)
    }
  }, [status.startTime, status.completionTime])

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
      case 'chunked':
      case 'staged':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'uploaded':
        return <Clock className="h-5 w-5 text-gray-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = (status: DocumentStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'processing':
      case 'chunked':
      case 'staged':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">{status.documentName}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge variant={getStatusBadgeVariant(status.status)}>
              {status.status}
            </Badge>
          </div>
        </div>
        {status.episodeId && (
          <CardDescription className="mt-2">
            Episode: {status.episodeId.substring(0, 8)}...
            {elapsedTime && <span className="ml-2">({elapsedTime})</span>}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {status.status !== 'uploaded' && status.totalChunks > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing Chunks</span>
              <span>{status.processedChunks} / {status.totalChunks}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Verification Checks */}
        {status.verificationChecks && status.verificationChecks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Verification Checks</h4>
            <div className="space-y-1">
              {status.verificationChecks.map((check, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  {check.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={check.passed ? 'text-green-700' : 'text-red-700'}>
                    {check.name}
                  </span>
                  {check.error && (
                    <span className="text-xs text-red-500">({check.error})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {status.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{status.error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Retry Staging
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {status.documentId && (
            <div>
              <span className="text-gray-500">Document ID:</span>
              <p className="font-mono text-xs mt-1">{status.documentId}</p>
            </div>
          )}
          {status.episodeStatus && (
            <div>
              <span className="text-gray-500">Episode Status:</span>
              <p className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {status.episodeStatus}
                </Badge>
              </p>
            </div>
          )}
        </div>

        {/* Database Icon for Airtable */}
        {status.status === 'staged' || status.status === 'completed' && (
          <div className="flex items-center justify-center pt-2">
            <Database className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-xs text-gray-600">Staged to Airtable</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}