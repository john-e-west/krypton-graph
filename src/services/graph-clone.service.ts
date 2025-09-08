import { v4 as uuidv4 } from 'uuid'
import { airtableService } from './airtable.service'

export interface Operation {
  method: string
  args: any[]
  timestamp: Date
}

export interface CloneInfo {
  id: string
  parentGraphId: string
  status: 'active' | 'pending' | 'committed' | 'rejected'
  createdAt: Date
  operations: Operation[]
  ttl: number
  size: {
    entities: number
    edges: number
    bytes: number
  }
}

export interface Clone extends CloneInfo {
  entities: ClonedEntity[]
  edges: ClonedEdge[]
  isStale(): boolean
  registerOperation(operation: Operation): void
}

export interface ClonedEntity {
  id: string
  originalId: string
  cloneId: string
  type: string
  attributes: Record<string, any>
  isModified: boolean
  modifications?: {
    field: string
    oldValue: any
    newValue: any
  }[]
}

export interface ClonedEdge {
  id: string
  originalId: string
  cloneId: string
  fromEntityId: string
  toEntityId: string
  type: string
  properties: Record<string, any>
  isModified: boolean
  modifications?: {
    field: string
    oldValue: any
    newValue: any
  }[]
}

export interface RollbackAction {
  execute(): Promise<void>
}

class CloneImpl implements Clone {
  id: string
  parentGraphId: string
  status: 'active' | 'pending' | 'committed' | 'rejected'
  createdAt: Date
  operations: Operation[]
  ttl: number
  size: {
    entities: number
    edges: number
    bytes: number
  }
  entities: ClonedEntity[]
  edges: ClonedEdge[]

  constructor(data: Partial<Clone>) {
    this.id = data.id || generateCloneId()
    this.parentGraphId = data.parentGraphId || ''
    this.status = data.status || 'active'
    this.createdAt = data.createdAt || new Date()
    this.operations = data.operations || []
    this.ttl = data.ttl || 24 * 60 * 60
    this.size = data.size || { entities: 0, edges: 0, bytes: 0 }
    this.entities = data.entities || []
    this.edges = data.edges || []
  }

  isStale(): boolean {
    const now = new Date()
    const ageInSeconds = (now.getTime() - this.createdAt.getTime()) / 1000
    return ageInSeconds > this.ttl
  }

  registerOperation(operation: Operation): void {
    this.operations.push(operation)
  }
}

export class CloneTransaction {
  private operations: Array<() => Promise<any>> = []
  private rollbackStack: RollbackAction[] = []
  private lockId?: string

  async begin(): Promise<void> {
    this.operations = []
    this.rollbackStack = []
    await this.acquireLock()
  }

  async commit(): Promise<void> {
    try {
      for (const op of this.operations) {
        await op()
      }
      await this.releaseLock()
    } catch (error) {
      await this.rollback()
      throw error
    }
  }

  async rollback(): Promise<void> {
    for (const action of this.rollbackStack.reverse()) {
      await action.execute()
    }
    await this.releaseLock()
  }

  registerOperation(op: () => Promise<any>, rollback: RollbackAction): void {
    this.operations.push(op)
    this.rollbackStack.push(rollback)
  }

  private async acquireLock(): Promise<void> {
    this.lockId = uuidv4()
  }

  private async releaseLock(): Promise<void> {
    this.lockId = undefined
  }
}

function generateCloneId(): string {
  return `clone_${uuidv4()}`
}

export class GraphCloneService {
  private activeClones: Map<string, Clone> = new Map()
  private readonly BATCH_SIZE = 500

  async cloneBeforeModify(graphId: string, operation: Operation): Promise<Clone> {
    const existingClone = this.activeClones.get(graphId)
    if (existingClone && !existingClone.isStale()) {
      existingClone.registerOperation(operation)
      return existingClone
    }

    const clone = await this.createClone(graphId)
    this.activeClones.set(graphId, clone)
    clone.registerOperation(operation)
    
    return clone
  }

  private async createClone(graphId: string): Promise<Clone> {
    const transaction = new CloneTransaction()
    
    try {
      await transaction.begin()
      
      const entities = await this.cloneEntities(graphId, transaction)
      const edges = await this.cloneEdges(graphId, transaction)
      
      const sizeInBytes = this.calculateSize(entities, edges)
      
      await transaction.commit()
      
      return new CloneImpl({
        id: generateCloneId(),
        parentGraphId: graphId,
        entities,
        edges,
        createdAt: new Date(),
        status: 'active',
        ttl: 24 * 60 * 60,
        size: {
          entities: entities.length,
          edges: edges.length,
          bytes: sizeInBytes
        }
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  private async cloneEntities(
    graphId: string, 
    transaction: CloneTransaction
  ): Promise<ClonedEntity[]> {
    const entities = await this.fetchEntities(graphId)
    const cloneId = generateCloneId()
    const clonedEntities: ClonedEntity[] = []
    
    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const batch = entities.slice(i, i + this.BATCH_SIZE)
      const clonedBatch = await this.cloneEntityBatch(batch, cloneId, graphId, transaction)
      clonedEntities.push(...clonedBatch)
    }
    
    return clonedEntities
  }

  private async cloneEntityBatch(
    entities: any[],
    cloneId: string,
    graphId: string,
    transaction: CloneTransaction
  ): Promise<ClonedEntity[]> {
    const clonedEntities: ClonedEntity[] = entities.map(entity => ({
      id: `${cloneId}::${entity.id}`,
      originalId: entity.id,
      cloneId,
      type: entity.type,
      attributes: { ...entity.attributes },
      isModified: false
    }))

    const createOp = async () => {
      await this.storeClonedEntities(clonedEntities)
    }

    const rollback: RollbackAction = {
      execute: async () => {
        await this.deleteClonedEntities(clonedEntities.map(e => e.id))
      }
    }

    transaction.registerOperation(createOp, rollback)
    
    return clonedEntities
  }

  private async cloneEdges(
    graphId: string,
    transaction: CloneTransaction
  ): Promise<ClonedEdge[]> {
    const edges = await this.fetchEdges(graphId)
    const cloneId = generateCloneId()
    const clonedEdges: ClonedEdge[] = []
    
    for (let i = 0; i < edges.length; i += this.BATCH_SIZE) {
      const batch = edges.slice(i, i + this.BATCH_SIZE)
      const clonedBatch = await this.cloneEdgeBatch(batch, cloneId, graphId, transaction)
      clonedEdges.push(...clonedBatch)
    }
    
    return clonedEdges
  }

  private async cloneEdgeBatch(
    edges: any[],
    cloneId: string,
    graphId: string,
    transaction: CloneTransaction
  ): Promise<ClonedEdge[]> {
    const clonedEdges: ClonedEdge[] = edges.map(edge => ({
      id: `${cloneId}::${edge.id}`,
      originalId: edge.id,
      cloneId,
      fromEntityId: `${cloneId}::${edge.fromEntityId}`,
      toEntityId: `${cloneId}::${edge.toEntityId}`,
      type: edge.type,
      properties: { ...edge.properties },
      isModified: false
    }))

    const createOp = async () => {
      await this.storeClonedEdges(clonedEdges)
    }

    const rollback: RollbackAction = {
      execute: async () => {
        await this.deleteClonedEdges(clonedEdges.map(e => e.id))
      }
    }

    transaction.registerOperation(createOp, rollback)
    
    return clonedEdges
  }

  private async fetchEntities(_graphId: string): Promise<any[]> {
    return []
  }

  private async fetchEdges(_graphId: string): Promise<any[]> {
    return []
  }

  private async storeClonedEntities(entities: ClonedEntity[]): Promise<void> {
    const chunks = this.chunk(entities, 10)
    for (const chunk of chunks) {
      await airtableService.createRecords('ClonedEntities', chunk.map(e => ({
        fields: {
          id: e.id,
          originalId: e.originalId,
          cloneId: e.cloneId,
          type: e.type,
          attributes: JSON.stringify(e.attributes),
          isModified: e.isModified
        }
      })))
    }
  }

  private async storeClonedEdges(edges: ClonedEdge[]): Promise<void> {
    const chunks = this.chunk(edges, 10)
    for (const chunk of chunks) {
      await airtableService.createRecords('ClonedEdges', chunk.map(e => ({
        fields: {
          id: e.id,
          originalId: e.originalId,
          cloneId: e.cloneId,
          fromEntityId: e.fromEntityId,
          toEntityId: e.toEntityId,
          type: e.type,
          properties: JSON.stringify(e.properties),
          isModified: e.isModified
        }
      })))
    }
  }

  private async deleteClonedEntities(ids: string[]): Promise<void> {
    console.log('Rolling back cloned entities:', ids)
  }

  private async deleteClonedEdges(ids: string[]): Promise<void> {
    console.log('Rolling back cloned edges:', ids)
  }

  private calculateSize(entities: ClonedEntity[], edges: ClonedEdge[]): number {
    const entitiesSize = JSON.stringify(entities).length
    const edgesSize = JSON.stringify(edges).length
    return entitiesSize + edgesSize
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  async getActiveClone(graphId: string): Promise<Clone | undefined> {
    return this.activeClones.get(graphId)
  }

  async commitClone(cloneId: string): Promise<void> {
    const clone = Array.from(this.activeClones.values())
      .find(c => c.id === cloneId)
    
    if (!clone) {
      throw new Error(`Clone ${cloneId} not found`)
    }

    clone.status = 'committed'
    
    this.activeClones.delete(clone.parentGraphId)
  }

  async rejectClone(cloneId: string): Promise<void> {
    const clone = Array.from(this.activeClones.values())
      .find(c => c.id === cloneId)
    
    if (!clone) {
      throw new Error(`Clone ${cloneId} not found`)
    }

    clone.status = 'rejected'
    
    await this.cleanupClone(cloneId)
    
    this.activeClones.delete(clone.parentGraphId)
  }

  private async cleanupClone(cloneId: string): Promise<void> {
    console.log(`Cleaning up clone ${cloneId}`)
  }
}

export const graphCloneService = new GraphCloneService()