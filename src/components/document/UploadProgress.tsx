'use client'

import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'

interface UploadProgressProps {
  fileName: string
  progress: number
  uploadSpeed?: number
  timeRemaining?: number
  onCancel: () => void
  isProcessing?: boolean
}

export function UploadProgress({ 
  fileName, 
  progress, 
  uploadSpeed, 
  timeRemaining,
  onCancel,
  isProcessing = false
}: UploadProgressProps) {
  const formatSpeed = (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return ''
    const mbps = (bytesPerSecond / (1024 * 1024)).toFixed(1)
    return `${mbps} MB/s`
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return ''
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="text-sm font-medium truncate max-w-[200px]">
            {fileName}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{isProcessing ? 'Processing...' : `${Math.round(progress)}%`}</span>
        {!isProcessing && (
          <div className="flex items-center space-x-3">
            {uploadSpeed && <span>{formatSpeed(uploadSpeed)}</span>}
            {timeRemaining && <span>{formatTime(timeRemaining)} remaining</span>}
          </div>
        )}
      </div>
    </div>
  )
}