import { TypeSuggestion } from '@/services/type-suggestion-engine'

export interface CachedAnalysis {
  documentId: string
  documentHash: string
  entityTypes: TypeSuggestion[]
  edgeTypes: TypeSuggestion[]
  classificationRate: number
  processingTime: number
  timestamp: Date
  expiresAt: Date
}

export class AnalysisCache {
  private static instance: AnalysisCache
  private cache: Map<string, CachedAnalysis> = new Map()
  private hashIndex: Map<string, string> = new Map() // hash -> documentId
  private ttl: number = 24 * 60 * 60 * 1000 // 24 hours default

  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval()
  }

  static getInstance(): AnalysisCache {
    if (!AnalysisCache.instance) {
      AnalysisCache.instance = new AnalysisCache()
    }
    return AnalysisCache.instance
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // Clean every 5 minutes
  }

  private cleanup() {
    const now = new Date()
    const expiredIds: string[] = []

    for (const [id, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        expiredIds.push(id)
        // Remove from hash index
        this.hashIndex.delete(entry.documentHash)
      }
    }

    // Remove expired entries
    expiredIds.forEach(id => this.cache.delete(id))
    
    if (expiredIds.length > 0) {
      console.log(`Cleaned ${expiredIds.length} expired cache entries`)
    }
  }

  async set(
    documentId: string,
    documentHash: string,
    data: Omit<CachedAnalysis, 'documentId' | 'documentHash' | 'timestamp' | 'expiresAt'>
  ): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.ttl)

    const entry: CachedAnalysis = {
      documentId,
      documentHash,
      ...data,
      timestamp: now,
      expiresAt
    }

    this.cache.set(documentId, entry)
    this.hashIndex.set(documentHash, documentId)

    // In production, also persist to Airtable
    await this.persistToAirtable(entry)
  }

  async get(documentId: string): Promise<CachedAnalysis | null> {
    const entry = this.cache.get(documentId)
    
    if (!entry) {
      // Try to load from Airtable
      return await this.loadFromAirtable(documentId)
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(documentId)
      this.hashIndex.delete(entry.documentHash)
      return null
    }

    return entry
  }

  async getByHash(documentHash: string): Promise<CachedAnalysis | null> {
    const documentId = this.hashIndex.get(documentHash)
    
    if (!documentId) {
      // Try to find in Airtable by hash
      return await this.loadFromAirtableByHash(documentHash)
    }

    return this.get(documentId)
  }

  async invalidate(documentId: string): Promise<void> {
    const entry = this.cache.get(documentId)
    
    if (entry) {
      this.hashIndex.delete(entry.documentHash)
      this.cache.delete(documentId)
    }

    // Also remove from Airtable
    await this.removeFromAirtable(documentId)
  }

  async invalidateAll(): Promise<void> {
    this.cache.clear()
    this.hashIndex.clear()
    
    // Clear Airtable cache table
    await this.clearAirtableCache()
  }

  setTTL(milliseconds: number): void {
    this.ttl = milliseconds
  }

  getStats(): {
    size: number
    hashIndexSize: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    let oldest: Date | null = null
    let newest: Date | null = null

    for (const entry of this.cache.values()) {
      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp
      }
      if (!newest || entry.timestamp > newest) {
        newest = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      hashIndexSize: this.hashIndex.size,
      oldestEntry: oldest,
      newestEntry: newest
    }
  }

  // Airtable integration methods (placeholders)
  private async persistToAirtable(entry: CachedAnalysis): Promise<void> {
    // In production, save to Airtable cache table
    // This would use the Airtable MCP to store the cache entry
    console.log('Would persist to Airtable:', entry.documentId)
  }

  private async loadFromAirtable(documentId: string): Promise<CachedAnalysis | null> {
    // In production, load from Airtable cache table
    console.log('Would load from Airtable:', documentId)
    return null
  }

  private async loadFromAirtableByHash(documentHash: string): Promise<CachedAnalysis | null> {
    // In production, query Airtable by document hash
    console.log('Would load from Airtable by hash:', documentHash)
    return null
  }

  private async removeFromAirtable(documentId: string): Promise<void> {
    // In production, remove from Airtable cache table
    console.log('Would remove from Airtable:', documentId)
  }

  private async clearAirtableCache(): Promise<void> {
    // In production, clear all entries from Airtable cache table
    console.log('Would clear Airtable cache')
  }
}

// Export singleton instance
export const analysisCache = AnalysisCache.getInstance()