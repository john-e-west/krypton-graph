import { SavedQuery, GraphQuery } from '@/types/query'

export class SavedQueryManager {
  private storageKey = 'krypton-saved-queries'

  async saveQuery(
    query: GraphQuery,
    name: string,
    description?: string,
    tags: string[] = []
  ): Promise<SavedQuery> {
    const saved: SavedQuery = {
      id: this.generateId(),
      name,
      description,
      query,
      tags,
      isPublic: false,
      metadata: {
        createdAt: new Date(),
        createdBy: 'current_user',
        useCount: 0
      }
    }

    const existing = await this.getAllQueries()
    const updated = [...existing, saved]
    
    await this.saveToStorage(updated)
    return saved
  }

  async loadQuery(id: string): Promise<SavedQuery | null> {
    const queries = await this.getAllQueries()
    const query = queries.find(q => q.id === id)
    
    if (query) {
      query.metadata.lastUsed = new Date()
      query.metadata.useCount++
      
      const updated = queries.map(q => q.id === id ? query : q)
      await this.saveToStorage(updated)
    }
    
    return query || null
  }

  async deleteQuery(id: string): Promise<boolean> {
    const queries = await this.getAllQueries()
    const filtered = queries.filter(q => q.id !== id)
    
    if (filtered.length !== queries.length) {
      await this.saveToStorage(filtered)
      return true
    }
    
    return false
  }

  async updateQuery(id: string, updates: Partial<SavedQuery>): Promise<SavedQuery | null> {
    const queries = await this.getAllQueries()
    const index = queries.findIndex(q => q.id === id)
    
    if (index === -1) return null
    
    const updated = { ...queries[index], ...updates }
    queries[index] = updated
    
    await this.saveToStorage(queries)
    return updated
  }

  async searchQueries(
    searchTerm?: string,
    tags?: string[],
    isPublic?: boolean
  ): Promise<SavedQuery[]> {
    let queries = await this.getAllQueries()
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      queries = queries.filter(q =>
        q.name.toLowerCase().includes(term) ||
        q.description?.toLowerCase().includes(term) ||
        q.query.raw.toLowerCase().includes(term)
      )
    }
    
    if (tags && tags.length > 0) {
      queries = queries.filter(q =>
        tags.some(tag => q.tags.includes(tag))
      )
    }
    
    if (isPublic !== undefined) {
      queries = queries.filter(q => q.isPublic === isPublic)
    }
    
    return queries.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    )
  }

  async getAllQueries(): Promise<SavedQuery[]> {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []
      
      const queries = JSON.parse(stored)
      return queries.map((q: any) => ({
        ...q,
        metadata: {
          ...q.metadata,
          createdAt: new Date(q.metadata.createdAt),
          lastUsed: q.metadata.lastUsed ? new Date(q.metadata.lastUsed) : undefined
        }
      }))
    } catch (error) {
      console.error('Failed to load saved queries:', error)
      return []
    }
  }

  async getPopularTags(limit = 10): Promise<string[]> {
    const queries = await this.getAllQueries()
    const tagCounts = new Map<string, number>()
    
    queries.forEach(q => {
      q.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag)
  }

  async getQueryStats(): Promise<{
    totalQueries: number
    publicQueries: number
    privateQueries: number
    totalUses: number
    mostUsedQuery?: SavedQuery
  }> {
    const queries = await this.getAllQueries()
    
    const stats = {
      totalQueries: queries.length,
      publicQueries: queries.filter(q => q.isPublic).length,
      privateQueries: queries.filter(q => !q.isPublic).length,
      totalUses: queries.reduce((sum, q) => sum + q.metadata.useCount, 0),
      mostUsedQuery: queries.reduce((max, q) => 
        q.metadata.useCount > (max?.metadata.useCount || 0) ? q : max, 
        undefined as SavedQuery | undefined
      )
    }
    
    return stats
  }

  async duplicateQuery(id: string, newName?: string): Promise<SavedQuery | null> {
    const original = await this.loadQuery(id)
    if (!original) return null
    
    return this.saveQuery(
      original.query,
      newName || `${original.name} (Copy)`,
      original.description,
      [...original.tags]
    )
  }

  private async saveToStorage(queries: SavedQuery[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queries))
    } catch (error) {
      console.error('Failed to save queries to storage:', error)
      throw new Error('Failed to save queries')
    }
  }

  private generateId(): string {
    return `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async exportQueries(): Promise<string> {
    const queries = await this.getAllQueries()
    return JSON.stringify(queries, null, 2)
  }

  async importQueries(jsonData: string, overwrite = false): Promise<{
    imported: number
    skipped: number
    errors: string[]
  }> {
    const result = { imported: 0, skipped: 0, errors: [] as string[] }
    
    try {
      const importedQueries: SavedQuery[] = JSON.parse(jsonData)
      const existing = await this.getAllQueries()
      const existingIds = new Set(existing.map(q => q.id))
      
      for (const query of importedQueries) {
        try {
          if (existingIds.has(query.id) && !overwrite) {
            result.skipped++
            continue
          }
          
          if (!query.name || !query.query) {
            result.errors.push(`Invalid query structure: ${query.id || 'unknown'}`)
            continue
          }
          
          query.metadata.createdAt = new Date(query.metadata.createdAt)
          if (query.metadata.lastUsed) {
            query.metadata.lastUsed = new Date(query.metadata.lastUsed)
          }
          
          if (existingIds.has(query.id)) {
            const index = existing.findIndex(q => q.id === query.id)
            existing[index] = query
          } else {
            existing.push(query)
          }
          
          result.imported++
        } catch (error) {
          result.errors.push(`Failed to import query ${query.id}: ${error}`)
        }
      }
      
      await this.saveToStorage(existing)
    } catch (error) {
      result.errors.push(`Failed to parse import data: ${error}`)
    }
    
    return result
  }
}