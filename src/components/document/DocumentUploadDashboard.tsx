'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertCircle, 
  Upload, 
  FileText, 
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Brain
} from 'lucide-react'
import { DropZone } from './DropZone'
import { UploadQueue } from './UploadQueue'
import { UploadFile, UploadStatus } from './UploadQueueItem'
import { validateFileList } from './FileValidator'

interface AnalysisProgress {
  stage: 'uploading' | 'converting' | 'analyzing' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
  documentId?: string
  jobId?: string
}

interface TypeSuggestion {
  id: string
  name: string
  description: string
  examples: string[]
  confidence: number
  category: 'entity' | 'edge'
}

interface AnalysisResult {
  documentId: string
  entityTypes: TypeSuggestion[]
  edgeTypes: TypeSuggestion[]
  classificationRate: number
  processingTime: number
  cached: boolean
}

export function DocumentUploadDashboard() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null)

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

  const uploadAndAnalyze = async (fileData: UploadFile) => {
    setIsAnalyzing(true)
    setSelectedFile(fileData)
    setAnalysisProgress({
      stage: 'uploading',
      progress: 0,
      message: 'Uploading document...'
    })

    const formData = new FormData()
    formData.append('file', fileData.file)

    try {
      // Upload file
      setAnalysisProgress({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading document...'
      })

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const { documentId } = await uploadResponse.json()

      // Start analysis
      setAnalysisProgress({
        stage: 'converting',
        progress: 40,
        message: 'Converting document to text...',
        documentId
      })

      const analyzeResponse = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed')
      }

      const { jobId } = await analyzeResponse.json()

      setAnalysisProgress({
        stage: 'analyzing',
        progress: 60,
        message: 'Analyzing document patterns...',
        documentId,
        jobId
      })

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const suggestionsResponse = await fetch(`/api/documents/${documentId}/suggestions`)
          
          if (suggestionsResponse.ok) {
            const results = await suggestionsResponse.json()
            
            if (results.status === 'complete') {
              clearInterval(pollInterval)
              
              setAnalysisProgress({
                stage: 'complete',
                progress: 100,
                message: 'Analysis complete!',
                documentId,
                jobId
              })

              setAnalysisResults(results)
              setIsAnalyzing(false)
              
              // Update file status
              setFiles(prev => prev.map(f => 
                f.id === fileData.id 
                  ? { ...f, status: 'completed' as UploadStatus, progress: 100 }
                  : f
              ))
            } else if (results.status === 'generating') {
              setAnalysisProgress({
                stage: 'generating',
                progress: 80,
                message: 'Generating type suggestions...',
                documentId,
                jobId
              })
            }
          }
        } catch (err) {
          clearInterval(pollInterval)
          throw err
        }
      }, 2000)

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
        if (isAnalyzing) {
          throw new Error('Analysis timeout')
        }
      }, 30000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setAnalysisProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage
      })
      setIsAnalyzing(false)
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'failed' as UploadStatus, error: errorMessage }
          : f
      ))
    }
  }

  const handleAnalyze = useCallback(() => {
    const fileToAnalyze = files.find(f => f.status === 'pending')
    if (fileToAnalyze) {
      uploadAndAnalyze(fileToAnalyze)
    }
  }, [files])

  const handleRemove = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }, [])

  const renderProgressIndicator = () => {
    if (!analysisProgress) return null

    const stageIcons = {
      uploading: <Upload className="h-4 w-4" />,
      converting: <FileText className="h-4 w-4" />,
      analyzing: <Brain className="h-4 w-4" />,
      generating: <Sparkles className="h-4 w-4" />,
      complete: <CheckCircle2 className="h-4 w-4" />,
      error: <XCircle className="h-4 w-4" />
    }

    const stageColors = {
      uploading: 'blue',
      converting: 'indigo',
      analyzing: 'purple',
      generating: 'pink',
      complete: 'green',
      error: 'red'
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stageIcons[analysisProgress.stage]}
                <span className="text-sm font-medium">{analysisProgress.message}</span>
              </div>
              <Badge variant={analysisProgress.stage === 'error' ? 'destructive' : 'default'}>
                {analysisProgress.stage}
              </Badge>
            </div>
            <Progress value={analysisProgress.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAnalysisResults = () => {
    if (!analysisResults) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Generated Type Suggestions
          </CardTitle>
          <CardDescription>
            Based on your document analysis, we suggest the following custom types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entities" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entities">
                Entity Types ({analysisResults.entityTypes.length})
              </TabsTrigger>
              <TabsTrigger value="edges">
                Edge Types ({analysisResults.edgeTypes.length})
              </TabsTrigger>
              <TabsTrigger value="metrics">
                Metrics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="entities" className="space-y-4">
              {analysisResults.entityTypes.map(type => (
                <div key={type.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{type.name}</h4>
                    <Badge variant="outline">
                      {Math.round(type.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {type.examples.map((example, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="edges" className="space-y-4">
              {analysisResults.edgeTypes.map(type => (
                <div key={type.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{type.name}</h4>
                    <Badge variant="outline">
                      {Math.round(type.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {type.examples.map((example, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {Math.round(analysisResults.classificationRate)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expected Classification Rate
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center gap-2">
                      {analysisResults.processingTime}s
                      {analysisResults.cached && (
                        <Badge variant="secondary" className="text-xs">Cached</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Processing Time
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Analysis Pipeline</CardTitle>
          <CardDescription>
            Upload documents to automatically generate custom entity and edge types using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone 
            onFilesAccepted={addFiles}
            onError={handleError}
            disabled={isAnalyzing}
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {files.length > 0 && !isAnalyzing && (
            <Button 
              onClick={handleAnalyze} 
              className="w-full"
              disabled={!files.some(f => f.status === 'pending')}
            >
              <Brain className="mr-2 h-4 w-4" />
              Analyze Document with AI
            </Button>
          )}
        </CardContent>
      </Card>

      {isAnalyzing && renderProgressIndicator()}
      
      {analysisResults && renderAnalysisResults()}

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadQueue
              files={files}
              onRemove={handleRemove}
              onRetry={() => {}}
              onCancel={() => {}}
              onUploadAll={() => {}}
              onClearAll={() => setFiles([])}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}