export interface KnowledgeGraph {
  id: string
  name: string
  description: string
  ontologyId: string
  status: 'active' | 'archived' | 'processing'
  metadata: {
    createdAt: Date
    updatedAt: Date
    createdBy: string
    lastModifiedBy: string
    tags: string[]
  }
  statistics: {
    entityCount: number
    edgeCount: number
    documentCount: number
    lastProcessedAt?: Date
    sizeInBytes: number
  }
  settings: {
    isActive: boolean
    isPublic: boolean
    allowCloning: boolean
    processingEnabled: boolean
  }
}

export interface GraphRecord {
  id: string
  name: string
  description: string
  ontologyId: string
  status: string
  entities?: string[]
  edges?: string[]
  documents?: string[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
  tags: string[]
  isActive: boolean
  isArchived: boolean
}

export interface GraphStatistics {
  entityCount: number
  edgeCount: number
  documentCount: number
  entityTypeCounts?: Record<string, number>
  edgeTypeCounts?: Record<string, number>
  lastProcessedAt?: Date
  sizeInBytes: number
}

export interface GraphExport {
  version: string
  exportDate: string
  graph: {
    id: string
    name: string
    description: string
    ontologyId: string
    metadata: {
      createdAt: string
      tags: string[]
    }
    statistics: {
      entityCount: number
      edgeCount: number
      documentCount: number
    }
    structure: {
      entityTypes: string[]
      edgeTypes: string[]
    }
  }
  includesData: boolean
}