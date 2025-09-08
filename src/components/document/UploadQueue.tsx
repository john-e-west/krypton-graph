'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Upload, Trash2 } from 'lucide-react'
import { UploadQueueItem, UploadFile } from './UploadQueueItem'
import { Progress } from '@/components/ui/progress'

interface UploadQueueProps {
  files: UploadFile[]
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  onUploadAll: () => void
  onClearAll: () => void
}

export function UploadQueue({ 
  files, 
  onRemove, 
  onRetry, 
  onCancel,
  onUploadAll,
  onClearAll
}: UploadQueueProps) {
  const activeUploads = files.filter(f => f.status === 'uploading').length
  const pendingFiles = files.filter(f => f.status === 'pending').length
  const completedFiles = files.filter(f => f.status === 'completed').length
  const failedFiles = files.filter(f => f.status === 'failed').length

  const calculateTotalProgress = () => {
    if (files.length === 0) return 0
    const totalProgress = files.reduce((acc, file) => {
      if (file.status === 'completed') return acc + 100
      if (file.status === 'uploading' || file.status === 'processing') return acc + file.progress
      return acc
    }, 0)
    return totalProgress / files.length
  }

  const totalProgress = calculateTotalProgress()

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No files in queue</p>
        <p className="text-sm">Drop files above to start uploading</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-medium">Upload Queue</h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
            {activeUploads > 0 && <span className="text-primary">{activeUploads} uploading</span>}
            {pendingFiles > 0 && <span>{pendingFiles} pending</span>}
            {completedFiles > 0 && <span className="text-success">{completedFiles} completed</span>}
            {failedFiles > 0 && <span className="text-destructive">{failedFiles} failed</span>}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {pendingFiles > 0 && (
            <Button
              size="sm"
              onClick={onUploadAll}
              disabled={activeUploads >= 3}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload All
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onClearAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {files.length > 3 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      )}

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {files.map(file => (
            <UploadQueueItem
              key={file.id}
              file={file}
              onRemove={onRemove}
              onRetry={onRetry}
              onCancel={onCancel}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}