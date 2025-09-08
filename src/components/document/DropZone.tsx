'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateFileList, ERROR_MESSAGES } from './FileValidator'

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
}

export function DropZone({ 
  onFilesAccepted, 
  onError, 
  disabled = false,
  className 
}: DropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      onError(ERROR_MESSAGES.INVALID_TYPE)
      return
    }

    const validation = validateFileList(acceptedFiles)
    if (!validation.isValid) {
      onError(validation.error!)
      return
    }

    onFilesAccepted(acceptedFiles)
  }, [onFilesAccepted, onError])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 10,
    disabled
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed",
        !isDragActive && !isDragReject && "border-muted-foreground/25 hover:border-muted-foreground/50",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        {isDragReject ? (
          <>
            <FileText className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="text-lg font-medium text-destructive">
                Invalid file type
              </p>
              <p className="text-sm text-muted-foreground">
                Only PDF, TXT, MD, and DOCX files are accepted
              </p>
            </div>
          </>
        ) : isDragActive ? (
          <>
            <Upload className="h-12 w-12 text-primary animate-pulse" />
            <div className="text-center">
              <p className="text-lg font-medium">Drop files here</p>
              <p className="text-sm text-muted-foreground">
                Release to upload your documents
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">
                Drag & drop files here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              PDF, TXT, MD, DOCX (max 50MB per file, up to 10 files)
            </div>
          </>
        )}
      </div>
    </div>
  )
}