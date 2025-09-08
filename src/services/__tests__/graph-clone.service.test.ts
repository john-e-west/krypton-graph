import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GraphCloneService, CloneTransaction } from '../graph-clone.service'
import { airtableService } from '../airtable.service'

vi.mock('../airtable.service', () => ({
  airtableService: {
    createRecords: vi.fn(),
    listRecords: vi.fn(),
    deleteRecords: vi.fn()
  }
}))

describe('GraphCloneService', () => {
  let service: GraphCloneService
  
  beforeEach(() => {
    service = new GraphCloneService()
    vi.clearAllMocks()
  })
  
  describe('cloneBeforeModify', () => {
    it('should create a new clone for a graph', async () => {
      const graphId = 'graph-123'
      const operation = {
        method: 'addEntity',
        args: [],
        timestamp: new Date()
      }
      
      const clone = await service.cloneBeforeModify(graphId, operation)
      
      expect(clone).toBeDefined()
      expect(clone.parentGraphId).toBe(graphId)
      expect(clone.status).toBe('active')
      expect(clone.operations).toHaveLength(1)
      expect(clone.operations[0]).toEqual(operation)
    })
    
    it('should reuse existing clone if not stale', async () => {
      const graphId = 'graph-123'
      const operation1 = {
        method: 'addEntity',
        args: [],
        timestamp: new Date()
      }
      const operation2 = {
        method: 'updateEntity',
        args: [],
        timestamp: new Date()
      }
      
      const clone1 = await service.cloneBeforeModify(graphId, operation1)
      const clone2 = await service.cloneBeforeModify(graphId, operation2)
      
      expect(clone1.id).toBe(clone2.id)
      expect(clone2.operations).toHaveLength(2)
    })
    
    it('should handle clone with batch processing', async () => {
      const graphId = 'graph-large'
      const operation = {
        method: 'bulkAdd',
        args: [],
        timestamp: new Date()
      }
      
      const clone = await service.cloneBeforeModify(graphId, operation)
      
      expect(clone).toBeDefined()
      expect(clone.size).toBeDefined()
      expect(clone.size.entities).toBeGreaterThanOrEqual(0)
      expect(clone.size.edges).toBeGreaterThanOrEqual(0)
    })
  })
  
  describe('commitClone', () => {
    it('should commit a clone successfully', async () => {
      const graphId = 'graph-123'
      const operation = {
        method: 'addEntity',
        args: [],
        timestamp: new Date()
      }
      
      const clone = await service.cloneBeforeModify(graphId, operation)
      await service.commitClone(clone.id)
      
      const activeClone = await service.getActiveClone(graphId)
      expect(activeClone).toBeUndefined()
    })
    
    it('should throw error for non-existent clone', async () => {
      await expect(service.commitClone('non-existent')).rejects.toThrow('Clone non-existent not found')
    })
  })
  
  describe('rejectClone', () => {
    it('should reject and cleanup a clone', async () => {
      const graphId = 'graph-123'
      const operation = {
        method: 'addEntity',
        args: [],
        timestamp: new Date()
      }
      
      const clone = await service.cloneBeforeModify(graphId, operation)
      await service.rejectClone(clone.id)
      
      const activeClone = await service.getActiveClone(graphId)
      expect(activeClone).toBeUndefined()
    })
  })
})

describe('CloneTransaction', () => {
  let transaction: CloneTransaction
  
  beforeEach(() => {
    transaction = new CloneTransaction()
  })
  
  describe('transaction management', () => {
    it('should execute operations in order', async () => {
      const operations: number[] = []
      
      await transaction.begin()
      
      transaction.registerOperation(
        async () => { operations.push(1) },
        { execute: async () => { operations.pop() } }
      )
      
      transaction.registerOperation(
        async () => { operations.push(2) },
        { execute: async () => { operations.pop() } }
      )
      
      await transaction.commit()
      
      expect(operations).toEqual([1, 2])
    })
    
    it('should rollback on failure', async () => {
      const operations: number[] = []
      
      await transaction.begin()
      
      transaction.registerOperation(
        async () => { operations.push(1) },
        { execute: async () => { operations.pop() } }
      )
      
      transaction.registerOperation(
        async () => { throw new Error('Operation failed') },
        { execute: async () => { operations.pop() } }
      )
      
      await expect(transaction.commit()).rejects.toThrow('Operation failed')
      expect(operations).toEqual([])
    })
    
    it('should rollback in reverse order', async () => {
      const rollbackOrder: number[] = []
      
      await transaction.begin()
      
      transaction.registerOperation(
        async () => { },
        { execute: async () => { rollbackOrder.push(1) } }
      )
      
      transaction.registerOperation(
        async () => { },
        { execute: async () => { rollbackOrder.push(2) } }
      )
      
      await transaction.rollback()
      
      expect(rollbackOrder).toEqual([2, 1])
    })
  })
})