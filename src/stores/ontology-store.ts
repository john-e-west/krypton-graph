import { create } from 'zustand'
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

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

interface UnclassifiedItem {
  id: string
  text: string
  context: string
  score?: number
  suggestedTypes?: Array<{
    typeName: string
    confidence: number
  }>
  pattern?: string
}

interface OntologyVersion {
  id: string
  name: string
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  createdAt: Date
  description?: string
}

interface ClassificationMetrics {
  totalItems: number
  classifiedCount: number
  unclassifiedCount: number
  classificationRate: number
  averageConfidence: number
}

interface EditHistory {
  id: string
  action: 'create' | 'update' | 'delete' | 'merge' | 'split'
  entityType: 'entity' | 'edge'
  targetId: string
  previousState: any
  newState: any
  timestamp: Date
  description: string
}

interface OntologyState {
  // Current ontology data
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  unclassifiedItems: UnclassifiedItem[]
  
  // State management
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  lastSaved: Date | null
  
  // Preview state
  previewEntityTypes: EntityType[] | null
  previewEdgeTypes: EdgeType[] | null
  
  // Metrics
  currentMetrics: ClassificationMetrics | null
  previewMetrics: ClassificationMetrics | null
  
  // Version control
  versions: OntologyVersion[]
  currentVersionId: string | null
  
  // Edit history
  editHistory: EditHistory[]
  historyIndex: number
  maxHistorySize: number
  
  // Auto-save
  autoSaveInterval: number
  lastAutoSave: Date | null
}

interface OntologyActions {
  // Entity type actions
  addEntityType: (entityType: Omit<EntityType, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEntityType: (id: string, updates: Partial<EntityType>) => void
  deleteEntityType: (id: string) => void
  reorderEntityTypes: (types: EntityType[]) => void
  
  // Edge type actions
  addEdgeType: (edgeType: Omit<EdgeType, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEdgeType: (id: string, updates: Partial<EdgeType>) => void
  deleteEdgeType: (id: string) => void
  reorderEdgeTypes: (types: EdgeType[]) => void
  
  // Unclassified items
  setUnclassifiedItems: (items: UnclassifiedItem[]) => void
  removeUnclassifiedItems: (itemIds: string[]) => void
  
  // Preview state
  setPreviewTypes: (entityTypes: EntityType[], edgeTypes: EdgeType[]) => void
  clearPreview: () => void
  applyPreview: () => void
  
  // Metrics
  setCurrentMetrics: (metrics: ClassificationMetrics) => void
  setPreviewMetrics: (metrics: ClassificationMetrics) => void
  
  // Save/Load
  save: () => Promise<void>
  load: (ontologyId: string) => Promise<void>
  
  // Version control
  createVersion: (name: string, description?: string) => void
  loadVersion: (versionId: string) => void
  deleteVersion: (versionId: string) => void
  
  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  
  // Auto-save
  enableAutoSave: (intervalMs?: number) => void
  disableAutoSave: () => void
  
  // Utilities
  markDirty: () => void
  markClean: () => void
  resetState: () => void
}

type OntologyStore = OntologyState & OntologyActions

const initialState: OntologyState = {
  entityTypes: [],
  edgeTypes: [],
  unclassifiedItems: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSaved: null,
  previewEntityTypes: null,
  previewEdgeTypes: null,
  currentMetrics: null,
  previewMetrics: null,
  versions: [],
  currentVersionId: null,
  editHistory: [],
  historyIndex: -1,
  maxHistorySize: 50,
  autoSaveInterval: 30000, // 30 seconds
  lastAutoSave: null,
}

let autoSaveTimer: NodeJS.Timeout | null = null

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const addToHistory = (
  state: OntologyState,
  action: EditHistory['action'],
  entityType: EditHistory['entityType'],
  targetId: string,
  previousState: any,
  newState: any,
  description: string
) => {
  const historyEntry: EditHistory = {
    id: generateId(),
    action,
    entityType,
    targetId,
    previousState,
    newState,
    timestamp: new Date(),
    description
  }
  
  // Remove any history after current index
  state.editHistory = state.editHistory.slice(0, state.historyIndex + 1)
  
  // Add new entry
  state.editHistory.push(historyEntry)
  
  // Limit history size
  if (state.editHistory.length > state.maxHistorySize) {
    state.editHistory = state.editHistory.slice(-state.maxHistorySize)
  }
  
  state.historyIndex = state.editHistory.length - 1
}

export const useOntologyStore = create<OntologyStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Entity type actions
        addEntityType: (entityTypeData) => set((state) => {
          const now = new Date()
          const entityType: EntityType = {
            ...entityTypeData,
            id: generateId(),
            createdAt: now,
            updatedAt: now
          }
          
          addToHistory(
            state,
            'create',
            'entity',
            entityType.id,
            null,
            entityType,
            `Created entity type "${entityType.name}"`
          )
          
          state.entityTypes.push(entityType)
          state.isDirty = true
        }),

        updateEntityType: (id, updates) => set((state) => {
          const index = state.entityTypes.findIndex(t => t.id === id)
          if (index !== -1) {
            const previousState = { ...state.entityTypes[index] }
            const updatedType = {
              ...state.entityTypes[index],
              ...updates,
              updatedAt: new Date()
            }
            
            addToHistory(
              state,
              'update',
              'entity',
              id,
              previousState,
              updatedType,
              `Updated entity type "${updatedType.name}"`
            )
            
            state.entityTypes[index] = updatedType
            state.isDirty = true
          }
        }),

        deleteEntityType: (id) => set((state) => {
          const index = state.entityTypes.findIndex(t => t.id === id)
          if (index !== -1) {
            const deletedType = state.entityTypes[index]
            
            addToHistory(
              state,
              'delete',
              'entity',
              id,
              deletedType,
              null,
              `Deleted entity type "${deletedType.name}"`
            )
            
            state.entityTypes.splice(index, 1)
            state.isDirty = true
          }
        }),

        reorderEntityTypes: (types) => set((state) => {
          state.entityTypes = types
          state.isDirty = true
        }),

        // Edge type actions
        addEdgeType: (edgeTypeData) => set((state) => {
          const now = new Date()
          const edgeType: EdgeType = {
            ...edgeTypeData,
            id: generateId(),
            createdAt: now,
            updatedAt: now
          }
          
          addToHistory(
            state,
            'create',
            'edge',
            edgeType.id,
            null,
            edgeType,
            `Created edge type "${edgeType.name}"`
          )
          
          state.edgeTypes.push(edgeType)
          state.isDirty = true
        }),

        updateEdgeType: (id, updates) => set((state) => {
          const index = state.edgeTypes.findIndex(t => t.id === id)
          if (index !== -1) {
            const previousState = { ...state.edgeTypes[index] }
            const updatedType = {
              ...state.edgeTypes[index],
              ...updates,
              updatedAt: new Date()
            }
            
            addToHistory(
              state,
              'update',
              'edge',
              id,
              previousState,
              updatedType,
              `Updated edge type "${updatedType.name}"`
            )
            
            state.edgeTypes[index] = updatedType
            state.isDirty = true
          }
        }),

        deleteEdgeType: (id) => set((state) => {
          const index = state.edgeTypes.findIndex(t => t.id === id)
          if (index !== -1) {
            const deletedType = state.edgeTypes[index]
            
            addToHistory(
              state,
              'delete',
              'edge',
              id,
              deletedType,
              null,
              `Deleted edge type "${deletedType.name}"`
            )
            
            state.edgeTypes.splice(index, 1)
            state.isDirty = true
          }
        }),

        reorderEdgeTypes: (types) => set((state) => {
          state.edgeTypes = types
          state.isDirty = true
        }),

        // Unclassified items
        setUnclassifiedItems: (items) => set((state) => {
          state.unclassifiedItems = items
        }),

        removeUnclassifiedItems: (itemIds) => set((state) => {
          state.unclassifiedItems = state.unclassifiedItems.filter(
            item => !itemIds.includes(item.id)
          )
        }),

        // Preview state
        setPreviewTypes: (entityTypes, edgeTypes) => set((state) => {
          state.previewEntityTypes = entityTypes
          state.previewEdgeTypes = edgeTypes
        }),

        clearPreview: () => set((state) => {
          state.previewEntityTypes = null
          state.previewEdgeTypes = null
          state.previewMetrics = null
        }),

        applyPreview: () => set((state) => {
          if (state.previewEntityTypes && state.previewEdgeTypes) {
            state.entityTypes = state.previewEntityTypes
            state.edgeTypes = state.previewEdgeTypes
            state.previewEntityTypes = null
            state.previewEdgeTypes = null
            state.isDirty = true
          }
        }),

        // Metrics
        setCurrentMetrics: (metrics) => set((state) => {
          state.currentMetrics = metrics
        }),

        setPreviewMetrics: (metrics) => set((state) => {
          state.previewMetrics = metrics
        }),

        // Save/Load
        save: async () => {
          set((state) => {
            state.isSaving = true
          })
          
          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            set((state) => {
              state.isDirty = false
              state.lastSaved = new Date()
              state.isSaving = false
            })
          } catch (error) {
            set((state) => {
              state.isSaving = false
            })
            throw error
          }
        },

        load: async (ontologyId: string) => {
          set((state) => {
            state.isLoading = true
          })
          
          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Load ontology data here
            set((state) => {
              state.isLoading = false
              state.isDirty = false
            })
          } catch (error) {
            set((state) => {
              state.isLoading = false
            })
            throw error
          }
        },

        // Version control
        createVersion: (name, description) => set((state) => {
          const version: OntologyVersion = {
            id: generateId(),
            name,
            entityTypes: [...state.entityTypes],
            edgeTypes: [...state.edgeTypes],
            createdAt: new Date(),
            description
          }
          
          state.versions.push(version)
          state.currentVersionId = version.id
        }),

        loadVersion: (versionId) => set((state) => {
          const version = state.versions.find(v => v.id === versionId)
          if (version) {
            state.entityTypes = [...version.entityTypes]
            state.edgeTypes = [...version.edgeTypes]
            state.currentVersionId = versionId
            state.isDirty = true
          }
        }),

        deleteVersion: (versionId) => set((state) => {
          state.versions = state.versions.filter(v => v.id !== versionId)
          if (state.currentVersionId === versionId) {
            state.currentVersionId = null
          }
        }),

        // Undo/Redo
        undo: () => set((state) => {
          if (get().canUndo()) {
            const historyEntry = state.editHistory[state.historyIndex]
            
            // Apply the reverse of the action
            if (historyEntry.action === 'create') {
              if (historyEntry.entityType === 'entity') {
                const index = state.entityTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.entityTypes.splice(index, 1)
              } else {
                const index = state.edgeTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.edgeTypes.splice(index, 1)
              }
            } else if (historyEntry.action === 'delete') {
              if (historyEntry.entityType === 'entity') {
                state.entityTypes.push(historyEntry.previousState)
              } else {
                state.edgeTypes.push(historyEntry.previousState)
              }
            } else if (historyEntry.action === 'update') {
              if (historyEntry.entityType === 'entity') {
                const index = state.entityTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.entityTypes[index] = historyEntry.previousState
              } else {
                const index = state.edgeTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.edgeTypes[index] = historyEntry.previousState
              }
            }
            
            state.historyIndex--
            state.isDirty = true
          }
        }),

        redo: () => set((state) => {
          if (get().canRedo()) {
            state.historyIndex++
            const historyEntry = state.editHistory[state.historyIndex]
            
            // Apply the action
            if (historyEntry.action === 'create') {
              if (historyEntry.entityType === 'entity') {
                state.entityTypes.push(historyEntry.newState)
              } else {
                state.edgeTypes.push(historyEntry.newState)
              }
            } else if (historyEntry.action === 'delete') {
              if (historyEntry.entityType === 'entity') {
                const index = state.entityTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.entityTypes.splice(index, 1)
              } else {
                const index = state.edgeTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.edgeTypes.splice(index, 1)
              }
            } else if (historyEntry.action === 'update') {
              if (historyEntry.entityType === 'entity') {
                const index = state.entityTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.entityTypes[index] = historyEntry.newState
              } else {
                const index = state.edgeTypes.findIndex(t => t.id === historyEntry.targetId)
                if (index !== -1) state.edgeTypes[index] = historyEntry.newState
              }
            }
            
            state.isDirty = true
          }
        }),

        canUndo: () => get().historyIndex >= 0,
        canRedo: () => get().historyIndex < get().editHistory.length - 1,

        // Auto-save
        enableAutoSave: (intervalMs = 30000) => {
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer)
          }
          
          set((state) => {
            state.autoSaveInterval = intervalMs
          })
          
          autoSaveTimer = setInterval(async () => {
            const state = get()
            if (state.isDirty && !state.isSaving) {
              try {
                await state.save()
                set((state) => {
                  state.lastAutoSave = new Date()
                })
              } catch (error) {
                console.error('Auto-save failed:', error)
              }
            }
          }, intervalMs)
        },

        disableAutoSave: () => {
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer)
            autoSaveTimer = null
          }
        },

        // Utilities
        markDirty: () => set((state) => {
          state.isDirty = true
        }),

        markClean: () => set((state) => {
          state.isDirty = false
        }),

        resetState: () => set(() => ({ ...initialState }))
      })),
      {
        name: 'ontology-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          entityTypes: state.entityTypes,
          edgeTypes: state.edgeTypes,
          versions: state.versions,
          currentVersionId: state.currentVersionId,
          editHistory: state.editHistory.slice(-20), // Only persist last 20 history entries
          historyIndex: Math.min(state.historyIndex, 19)
        })
      }
    )
  )
)

// Auto-enable auto-save on store creation
useOntologyStore.getState().enableAutoSave()

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useOntologyStore.getState().disableAutoSave()
  })
}