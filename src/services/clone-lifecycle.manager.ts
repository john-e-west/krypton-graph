import { graphCloneService, Clone } from './graph-clone.service'
import { airtableService } from './airtable.service'

export class CloneLifecycleManager {
  private readonly DEFAULT_TTL = 24 * 60 * 60
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map()
  private activeClones: Map<string, Clone> = new Map()

  async scheduleCleanup(cloneId: string, ttl?: number): Promise<void> {
    const timeToLive = ttl || this.DEFAULT_TTL
    
    const timer = setTimeout(async () => {
      try {
        const clone = await this.getClone(cloneId)
        if (clone && clone.status === 'active') {
          await this.cleanup(cloneId)
        }
      } catch (error) {
        console.error(`Failed to cleanup clone ${cloneId}:`, error)
      }
      this.cleanupTimers.delete(cloneId)
    }, timeToLive * 1000)
    
    this.cleanupTimers.set(cloneId, timer)
  }

  async cleanup(cloneId: string): Promise<void> {
    await this.deleteClonedEntities(cloneId)
    await this.deleteClonedEdges(cloneId)
    await this.deleteCloneMetadata(cloneId)
    
    this.activeClones.delete(cloneId)
    
    await this.logCleanup(cloneId)
    
    const timer = this.cleanupTimers.get(cloneId)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(cloneId)
    }
  }

  async cleanupOrphans(): Promise<void> {
    const orphans = await this.findOrphanedClones()
    
    for (const orphan of orphans) {
      await this.cleanup(orphan.id)
    }
  }

  async extendTTL(cloneId: string, additionalSeconds: number): Promise<void> {
    const timer = this.cleanupTimers.get(cloneId)
    if (timer) {
      clearTimeout(timer)
    }
    
    await this.scheduleCleanup(cloneId, additionalSeconds)
  }

  async getClone(cloneId: string): Promise<Clone | undefined> {
    if (this.activeClones.has(cloneId)) {
      return this.activeClones.get(cloneId)
    }
    
    try {
      const cloneData = await this.fetchCloneFromStorage(cloneId)
      if (cloneData) {
        return cloneData
      }
    } catch (error) {
      console.error(`Failed to fetch clone ${cloneId}:`, error)
    }
    
    return undefined
  }

  private async deleteClonedEntities(cloneId: string): Promise<void> {
    try {
      const records = await airtableService.listRecords('ClonedEntities', {
        filterByFormula: `{cloneId} = '${cloneId}'`
      })
      
      if (records.length > 0) {
        const recordIds = records.map(r => r.id)
        await this.deleteInBatches('ClonedEntities', recordIds)
      }
    } catch (error) {
      console.error(`Failed to delete cloned entities for ${cloneId}:`, error)
    }
  }

  private async deleteClonedEdges(cloneId: string): Promise<void> {
    try {
      const records = await airtableService.listRecords('ClonedEdges', {
        filterByFormula: `{cloneId} = '${cloneId}'`
      })
      
      if (records.length > 0) {
        const recordIds = records.map(r => r.id)
        await this.deleteInBatches('ClonedEdges', recordIds)
      }
    } catch (error) {
      console.error(`Failed to delete cloned edges for ${cloneId}:`, error)
    }
  }

  private async deleteCloneMetadata(cloneId: string): Promise<void> {
    try {
      const records = await airtableService.listRecords('ClonedGraphs', {
        filterByFormula: `{id} = '${cloneId}'`
      })
      
      if (records.length > 0) {
        await airtableService.deleteRecords('ClonedGraphs', [records[0].id])
      }
    } catch (error) {
      console.error(`Failed to delete clone metadata for ${cloneId}:`, error)
    }
  }

  private async deleteInBatches(table: string, recordIds: string[]): Promise<void> {
    const batchSize = 10
    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize)
      await airtableService.deleteRecords(table, batch)
    }
  }

  private async logCleanup(cloneId: string): Promise<void> {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Cleaned up clone ${cloneId}`)
    
    try {
      await airtableService.createRecords('CloneCleanupLog', [{
        fields: {
          cloneId,
          cleanedAt: timestamp,
          reason: 'TTL_EXPIRED'
        }
      }])
    } catch (error) {
      console.error('Failed to log cleanup:', error)
    }
  }

  private async findOrphanedClones(): Promise<{ id: string }[]> {
    try {
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - 48)
      
      const records = await airtableService.listRecords('ClonedGraphs', {
        filterByFormula: `AND(
          {status} = 'active',
          IS_BEFORE({createdAt}, '${cutoffTime.toISOString()}')
        )`
      })
      
      return records.map(r => ({ id: r.fields.id as string }))
    } catch (error) {
      console.error('Failed to find orphaned clones:', error)
      return []
    }
  }

  private async fetchCloneFromStorage(cloneId: string): Promise<Clone | undefined> {
    try {
      const records = await airtableService.listRecords('ClonedGraphs', {
        filterByFormula: `{id} = '${cloneId}'`
      })
      
      if (records.length > 0) {
        const record = records[0]
        return {
          id: record.fields.id as string,
          parentGraphId: record.fields.parentGraphId as string,
          status: record.fields.status as any,
          createdAt: new Date(record.fields.createdAt as string),
          operations: JSON.parse(record.fields.operations as string || '[]'),
          ttl: record.fields.ttl as number,
          size: JSON.parse(record.fields.size as string || '{}'),
          entities: [],
          edges: [],
          isStale: () => false,
          registerOperation: () => {}
        }
      }
    } catch (error) {
      console.error(`Failed to fetch clone from storage:`, error)
    }
    
    return undefined
  }

  async monitorCloneHealth(): Promise<void> {
    setInterval(async () => {
      await this.cleanupOrphans()
    }, 60 * 60 * 1000)
  }

  destroy(): void {
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer)
    }
    this.cleanupTimers.clear()
    this.activeClones.clear()
  }
}

export const cloneLifecycleManager = new CloneLifecycleManager()