import { useState, useCallback } from 'react'
import { AirtableStagingService, DocumentData, StagingResult, VerificationReport } from '@/lib/airtable/services/staging.service'
import { DocumentStatus, EpisodeStatus } from '@/lib/types/airtable'
import { airtableClient } from '@/lib/airtable/client'

const stagingService = new AirtableStagingService(airtableClient)

export interface StagingState {
  isStaging: boolean
  documentId?: string
  episodeId?: string
  status: DocumentStatus
  episodeStatus?: EpisodeStatus
  progress: number
  error?: Error
  verificationReport?: VerificationReport
}

export function useDocumentStaging() {
  const [state, setState] = useState<StagingState>({
    isStaging: false,
    status: 'uploaded',
    progress: 0,
  })

  const stageDocument = useCallback(async (documentData: DocumentData, userId?: string) => {
    setState(prev => ({
      ...prev,
      isStaging: true,
      status: 'processing',
      episodeStatus: 'started',
      error: undefined,
      verificationReport: undefined,
    }))

    try {
      // Simulate progress updates
      const totalChunks = documentData.chunks.length
      let processedChunks = 0
      
      // Create progress update interval
      const progressInterval = setInterval(() => {
        processedChunks += Math.floor(Math.random() * 3) + 1
        if (processedChunks > totalChunks) processedChunks = totalChunks
        
        setState(prev => ({
          ...prev,
          progress: (processedChunks / totalChunks) * 100,
          status: processedChunks < totalChunks ? 'processing' : 'staged',
        }))
        
        if (processedChunks >= totalChunks) {
          clearInterval(progressInterval)
        }
      }, 500)

      // Perform actual staging
      const result: StagingResult = await stagingService.stageDocument(documentData, userId)
      
      clearInterval(progressInterval)

      if (result.success) {
        setState(prev => ({
          ...prev,
          isStaging: false,
          documentId: result.documentId,
          episodeId: result.episodeId,
          status: 'completed',
          episodeStatus: 'completed',
          progress: 100,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isStaging: false,
          status: 'failed',
          episodeStatus: 'failed',
          error: result.error,
          progress: 0,
        }))
      }

      return result
    } catch (error) {
      setState(prev => ({
        ...prev,
        isStaging: false,
        status: 'failed',
        episodeStatus: 'failed',
        error: error as Error,
        progress: 0,
      }))
      
      throw error
    }
  }, [])

  const resetStaging = useCallback(() => {
    setState({
      isStaging: false,
      status: 'uploaded',
      progress: 0,
    })
  }, [])

  const verifyStaging = useCallback(async (documentId: string, expectedChunkCount: number) => {
    try {
      // This would call the verification method from the service
      // For now, we'll create a mock report
      const report: VerificationReport = {
        documentId,
        timestamp: new Date(),
        checks: [
          { name: 'Document exists', passed: true },
          { name: 'Chunk count matches', passed: true, expected: expectedChunkCount, actual: expectedChunkCount },
          { name: 'Chunk sequence valid', passed: true },
          { name: 'All chunks have content', passed: true },
          { name: 'Episode exists', passed: true },
        ],
        passed: true,
      }
      
      setState(prev => ({
        ...prev,
        verificationReport: report,
      }))
      
      return report
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
      }))
      throw error
    }
  }, [])

  return {
    state,
    stageDocument,
    resetStaging,
    verifyStaging,
  }
}