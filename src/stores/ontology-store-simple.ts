import { useState, useCallback, useEffect } from 'react'

interface AttributeDefinition {
  name: string
  type: string
  required: boolean
  description?: string
}

interface EntityType {
  id: string
  name: string
  description: string
  expectedCount: number
  confidence: number
  examples: string[]
  attributes: AttributeDefinition[]
  createdAt: Date
  updatedAt: Date
}

interface EdgeType {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  confidence: number
  examples: string[]
  createdAt: Date
  updatedAt: Date
}

interface OntologyState {
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  isDirty: boolean
  lastSaved: Date | null
}

const STORAGE_KEY = 'ontology-state'

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const loadFromStorage = (): Partial<OntologyState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const saveToStorage = (state: OntologyState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export const useOntologyState = () => {
  const [state, setState] = useState<OntologyState>(() => ({
    entityTypes: [],
    edgeTypes: [],
    isDirty: false,
    lastSaved: null,
    ...loadFromStorage()
  }))

  // Auto-save to localStorage
  useEffect(() => {
    saveToStorage(state)
  }, [state])

  const addEntityType = useCallback((entityTypeData: Omit<EntityType, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const entityType: EntityType = {
      ...entityTypeData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    
    setState(prev => ({
      ...prev,
      entityTypes: [...prev.entityTypes, entityType],
      isDirty: true
    }))
  }, [])

  const updateEntityType = useCallback((id: string, updates: Partial<EntityType>) => {
    setState(prev => ({
      ...prev,
      entityTypes: prev.entityTypes.map(type =>
        type.id === id
          ? { ...type, ...updates, updatedAt: new Date() }
          : type
      ),
      isDirty: true
    }))
  }, [])

  const deleteEntityType = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      entityTypes: prev.entityTypes.filter(type => type.id !== id),
      isDirty: true
    }))
  }, [])

  const reorderEntityTypes = useCallback((types: EntityType[]) => {
    setState(prev => ({
      ...prev,
      entityTypes: types,
      isDirty: true
    }))
  }, [])

  const addEdgeType = useCallback((edgeTypeData: Omit<EdgeType, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const edgeType: EdgeType = {
      ...edgeTypeData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    
    setState(prev => ({
      ...prev,
      edgeTypes: [...prev.edgeTypes, edgeType],
      isDirty: true
    }))
  }, [])

  const updateEdgeType = useCallback((id: string, updates: Partial<EdgeType>) => {
    setState(prev => ({
      ...prev,
      edgeTypes: prev.edgeTypes.map(type =>
        type.id === id
          ? { ...type, ...updates, updatedAt: new Date() }
          : type
      ),
      isDirty: true
    }))
  }, [])

  const deleteEdgeType = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      edgeTypes: prev.edgeTypes.filter(type => type.id !== id),
      isDirty: true
    }))
  }, [])

  const reorderEdgeTypes = useCallback((types: EdgeType[]) => {
    setState(prev => ({
      ...prev,
      edgeTypes: types,
      isDirty: true
    }))
  }, [])

  const save = useCallback(async () => {
    // Simulate API save
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setState(prev => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date()
    }))
  }, [])

  const load = useCallback(async (ontologyId: string) => {
    // Simulate API load
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Load data from API here
    // For now, just mark as clean
    setState(prev => ({
      ...prev,
      isDirty: false
    }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      entityTypes: [],
      edgeTypes: [],
      isDirty: false,
      lastSaved: null
    })
  }, [])

  return {
    ...state,
    actions: {
      addEntityType,
      updateEntityType,
      deleteEntityType,
      reorderEntityTypes,
      addEdgeType,
      updateEdgeType,
      deleteEdgeType,
      reorderEdgeTypes,
      save,
      load,
      resetState
    }
  }
}