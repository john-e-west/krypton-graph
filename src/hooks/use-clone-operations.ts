import { useState, useCallback, useEffect } from 'react'
import { graphCloneService, Clone } from '@/services/graph-clone.service'
import { graphOperations } from '@/services/graph-operations.service'
import { toast } from 'sonner'

export function useCloneOperations(graphId: string) {
  const [activeClone, setActiveClone] = useState<Clone | undefined>()
  const [isCloning, setIsCloning] = useState(false)
  const [cloneProgress, setCloneProgress] = useState(0)

  useEffect(() => {
    const checkActiveClone = async () => {
      const clone = await graphCloneService.getActiveClone(graphId)
      setActiveClone(clone)
    }
    
    checkActiveClone()
  }, [graphId])

  const performClonedOperation = useCallback(async (
    operation: () => Promise<any>
  ) => {
    setIsCloning(true)
    setCloneProgress(0)
    
    try {
      const progressInterval = setInterval(() => {
        setCloneProgress(prev => Math.min(prev + 10, 90))
      }, 100)
      
      const result = await operation()
      
      clearInterval(progressInterval)
      setCloneProgress(100)
      
      if (result.cloneId) {
        const clone = await graphCloneService.getActiveClone(graphId)
        setActiveClone(clone)
        
        toast.success('Operation performed on clone', {
          description: `Clone ID: ${result.cloneId}`
        })
      }
      
      setTimeout(() => {
        setIsCloning(false)
        setCloneProgress(0)
      }, 500)
      
      return result
    } catch (error) {
      setIsCloning(false)
      setCloneProgress(0)
      toast.error('Clone operation failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }, [graphId])

  const acceptClone = useCallback(async () => {
    if (!activeClone) return
    
    try {
      await graphOperations.acceptClone(activeClone.id)
      setActiveClone(undefined)
      toast.success('Clone committed successfully')
    } catch (error) {
      toast.error('Failed to commit clone', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [activeClone])

  const rejectClone = useCallback(async () => {
    if (!activeClone) return
    
    try {
      await graphOperations.rejectClone(activeClone.id)
      setActiveClone(undefined)
      toast.success('Clone rejected and cleaned up')
    } catch (error) {
      toast.error('Failed to reject clone', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [activeClone])

  return {
    activeClone,
    isCloning,
    cloneProgress,
    performClonedOperation,
    acceptClone,
    rejectClone
  }
}