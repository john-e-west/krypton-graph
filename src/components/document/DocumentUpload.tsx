'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { DropZone } from './DropZone'
import { UploadQueue } from './UploadQueue'
import { UploadFile, UploadStatus } from './UploadQueueItem'
import { validateFileList } from './FileValidator'

export function DocumentUpload() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const uploadControllers = useRef<Map<string, AbortController>>(new Map())

  const addFiles = useCallback((newFiles: File[]) => {
    const validation = validateFileList([...files.map(f => f.file), ...newFiles])
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as UploadStatus,
      progress: 0
    }))

    setFiles(prev => [...prev, ...uploadFiles])
    setError(null)
  }, [files])

  const uploadFile = async (fileData: UploadFile) => {
    const controller = new AbortController()
    uploadControllers.current.set(fileData.id, controller)

    setFiles(prev => prev.map(f => 
      f.id === fileData.id 
        ? { ...f, status: 'uploading' as UploadStatus, progress: 0 }
        : f
    ))

    const formData = new FormData()
    formData.append('file', fileData.file)

    try {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, progress }
              : f
          ))
        }
      })

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev => prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'completed' as UploadStatus, progress: 100, uploadedAt: new Date() }
                : f
            ))
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        xhr.open('POST', '/api/documents/upload')
        xhr.send(formData)

        controller.signal.addEventListener('abort', () => {
          xhr.abort()
        })
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'failed' as UploadStatus, error: errorMessage }
          : f
      ))
    } finally {
      uploadControllers.current.delete(fileData.id)
    }
  }

  const handleUploadAll = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    const activeUploads = files.filter(f => f.status === 'uploading').length
    
    const filesToUpload = pendingFiles.slice(0, Math.max(0, 3 - activeUploads))
    
    filesToUpload.forEach(file => {
      uploadFile(file)
    })
  }, [files])

  const handleRemove = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleRetry = useCallback((id: string) => {
    const file = files.find(f => f.id === id)
    if (file) {
      setFiles(prev => prev.map(f => 
        f.id === id 
          ? { ...f, status: 'pending' as UploadStatus, progress: 0, error: undefined }
          : f
      ))
      uploadFile(file)
    }
  }, [files])

  const handleCancel = useCallback((id: string) => {
    const controller = uploadControllers.current.get(id)
    if (controller) {
      controller.abort()
      uploadControllers.current.delete(id)
      setFiles(prev => prev.map(f => 
        f.id === id 
          ? { ...f, status: 'failed' as UploadStatus, error: 'Upload cancelled' }
          : f
      ))
    }
  }, [])

  const handleClearAll = useCallback(() => {
    // Cancel any active uploads
    uploadControllers.current.forEach(controller => controller.abort())
    uploadControllers.current.clear()
    setFiles([])
    setError(null)
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone 
            onFilesAccepted={addFiles}
            onError={handleError}
            disabled={files.filter(f => f.status === 'uploading').length >= 3}
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <UploadQueue
              files={files}
              onRemove={handleRemove}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onUploadAll={handleUploadAll}
              onClearAll={handleClearAll}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}