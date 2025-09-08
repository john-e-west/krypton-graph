import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { KnowledgeGraph } from '@/types/graph'

interface ActiveGraphContextType {
  activeGraph: KnowledgeGraph | null
  setActiveGraph: (graph: KnowledgeGraph) => void
  clearActiveGraph: () => void
  isLoading: boolean
}

const ActiveGraphContext = createContext<ActiveGraphContextType | undefined>(undefined)

export function useActiveGraph() {
  const context = useContext(ActiveGraphContext)
  if (!context) {
    throw new Error('useActiveGraph must be used within ActiveGraphProvider')
  }
  return context
}

interface ActiveGraphProviderProps {
  children: ReactNode
}

export function ActiveGraphProvider({ children }: ActiveGraphProviderProps) {
  const [activeGraph, setActiveGraphState] = useState<KnowledgeGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedGraphId = localStorage.getItem('activeGraphId')
    if (savedGraphId) {
      const savedGraph = localStorage.getItem('activeGraph')
      if (savedGraph) {
        try {
          setActiveGraphState(JSON.parse(savedGraph))
        } catch (error) {
          console.error('Failed to parse saved graph:', error)
        }
      }
    }
    setIsLoading(false)
  }, [])

  const setActiveGraph = (graph: KnowledgeGraph) => {
    setActiveGraphState(graph)
    localStorage.setItem('activeGraphId', graph.id)
    localStorage.setItem('activeGraph', JSON.stringify(graph))
  }

  const clearActiveGraph = () => {
    setActiveGraphState(null)
    localStorage.removeItem('activeGraphId')
    localStorage.removeItem('activeGraph')
  }

  return (
    <ActiveGraphContext.Provider 
      value={{ 
        activeGraph, 
        setActiveGraph, 
        clearActiveGraph, 
        isLoading 
      }}
    >
      {children}
    </ActiveGraphContext.Provider>
  )
}