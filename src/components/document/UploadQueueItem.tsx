'use client'

import { X, RotateCcw, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'

export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: UploadStatus
  progress: number
  error?: string
  uploadedAt?: Date
}

interface UploadQueueItemProps {
  file: UploadFile
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onCancel?: (id: string) => void
}

export function UploadQueueItem({ 
  file, 
  onRemove, 
  onRetry,
  onCancel 
}: UploadQueueItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-muted-foreground" />
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusBadge = () => {
    const variants: Record<UploadStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      uploading: "default",
      processing: "default",
      completed: "outline",
      failed: "destructive"
    }

    return (
      <Badge variant={variants[file.status]} className="text-xs">
        {file.status}
      </Badge>
    )
  }

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg border",
      file.status === 'failed' && "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          {getStatusBadge()}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {file.status === 'uploading' && (
            <span>{Math.round(file.progress)}%</span>
          )}
        </div>
        
        {(file.status === 'uploading' || file.status === 'processing') && (
          <Progress value={file.progress} className="h-1 mt-2" />
        )}
        
        {file.error && (
          <p className="text-xs text-destructive mt-1">{file.error}</p>
        )}
      </div>
      
      <div className="flex-shrink-0 flex items-center space-x-1">
        {file.status === 'failed' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onRetry(file.id)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        
        {file.status === 'uploading' && onCancel && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onCancel(file.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {(file.status === 'pending' || file.status === 'completed' || file.status === 'failed') && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onRemove(file.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}