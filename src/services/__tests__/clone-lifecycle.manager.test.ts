import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CloneLifecycleManager } from '../clone-lifecycle.manager'
import { airtableService } from '../airtable.service'

vi.mock('../airtable.service', () => ({
  airtableService: {
    createRecords: vi.fn(),
    listRecords: vi.fn(),
    deleteRecords: vi.fn()
  }
}))

describe('CloneLifecycleManager', () => {
  let manager: CloneLifecycleManager
  
  beforeEach(() => {
    manager = new CloneLifecycleManager()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
  })
  
  describe('scheduleCleanup', () => {
    it('should schedule cleanup after TTL expires', async () => {
      const cloneId = 'clone-123'
      const ttl = 60
      
      vi.mocked(airtableService.listRecords).mockResolvedValue([
        {
          id: 'rec123',
          fields: {
            id: cloneId,
            status: 'active',
            parentGraphId: 'graph-123',
            createdAt: new Date().toISOString()
          }
        }
      ])
      
      await manager.scheduleCleanup(cloneId, ttl)
      
      vi.advanceTimersByTime(ttl * 1000)
      
      await vi.runAllTimersAsync()
      
      expect(airtableService.listRecords).toHaveBeenCalled()
    })
    
    it('should not cleanup if clone is not active', async () => {
      const cloneId = 'clone-123'
      const ttl = 60
      
      vi.mocked(airtableService.listRecords).mockResolvedValue([
        {
          id: 'rec123',
          fields: {
            id: cloneId,
            status: 'committed',
            parentGraphId: 'graph-123',
            createdAt: new Date().toISOString()
          }
        }
      ])
      
      vi.mocked(airtableService.deleteRecords).mockResolvedValue()
      
      await manager.scheduleCleanup(cloneId, ttl)
      
      vi.advanceTimersByTime(ttl * 1000)
      await vi.runAllTimersAsync()
      
      expect(airtableService.deleteRecords).not.toHaveBeenCalled()
    })
  })
  
  describe('cleanup', () => {
    it('should delete all clone records', async () => {
      const cloneId = 'clone-123'
      
      vi.mocked(airtableService.listRecords)
        .mockResolvedValueOnce([
          { id: 'entity1', fields: { cloneId } },
          { id: 'entity2', fields: { cloneId } }
        ])
        .mockResolvedValueOnce([
          { id: 'edge1', fields: { cloneId } },
          { id: 'edge2', fields: { cloneId } }
        ])
        .mockResolvedValueOnce([
          { id: 'graph1', fields: { id: cloneId } }
        ])
      
      vi.mocked(airtableService.deleteRecords).mockResolvedValue()
      vi.mocked(airtableService.createRecords).mockResolvedValue([])
      
      await manager.cleanup(cloneId)
      
      expect(airtableService.deleteRecords).toHaveBeenCalledTimes(3)
      expect(airtableService.createRecords).toHaveBeenCalledWith(
        'CloneCleanupLog',
        expect.arrayContaining([
          expect.objectContaining({
            fields: expect.objectContaining({
              cloneId,
              reason: 'TTL_EXPIRED'
            })
          })
        ])
      )
    })
  })
  
  describe('cleanupOrphans', () => {
    it('should find and cleanup orphaned clones', async () => {
      vi.mocked(airtableService.listRecords)
        .mockResolvedValueOnce([
          { id: 'rec1', fields: { id: 'orphan-1' } },
          { id: 'rec2', fields: { id: 'orphan-2' } }
        ])
        .mockResolvedValue([])
      
      vi.mocked(airtableService.deleteRecords).mockResolvedValue()
      vi.mocked(airtableService.createRecords).mockResolvedValue([])
      
      await manager.cleanupOrphans()
      
      expect(airtableService.listRecords).toHaveBeenCalledWith(
        'ClonedGraphs',
        expect.objectContaining({
          filterByFormula: expect.stringContaining('active')
        })
      )
    })
  })
  
  describe('extendTTL', () => {
    it('should reschedule cleanup with new TTL', async () => {
      const cloneId = 'clone-123'
      const initialTTL = 60
      const additionalTTL = 120
      
      vi.mocked(airtableService.listRecords).mockResolvedValue([
        {
          id: 'rec123',
          fields: {
            id: cloneId,
            status: 'active',
            parentGraphId: 'graph-123',
            createdAt: new Date().toISOString()
          }
        }
      ])
      
      await manager.scheduleCleanup(cloneId, initialTTL)
      
      await manager.extendTTL(cloneId, additionalTTL)
      
      vi.advanceTimersByTime(initialTTL * 1000)
      
      vi.clearAllMocks()
      
      vi.advanceTimersByTime(additionalTTL * 1000)
      await vi.runAllTimersAsync()
      
      expect(airtableService.listRecords).toHaveBeenCalled()
    })
  })
})