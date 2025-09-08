import { GraphQuery, QueryResult } from '@/types/query'

export interface QueryHistoryEntry {
  id: string
  query: GraphQuery
  result?: QueryResult
  timestamp: Date
  status: 'success' | 'error' | 'cancelled'
  error?: string
  executionTime?: number
}

export class QueryHistoryManager {
  private storageKey = 'krypton-query-history'
  private maxHistorySize = 1000

  async addToHistory(
    query: GraphQuery,
    result?: QueryResult,
    status: 'success' | 'error' | 'cancelled' = 'success',
    error?: string
  ): Promise<QueryHistoryEntry> {
    const entry: QueryHistoryEntry = {
      id: this.generateId(),
      query,
      result,
      timestamp: new Date(),
      status,
      error,
      executionTime: result?.metadata.executionTime
    }

    const history = await this.getHistory()
    const updated = [entry, ...history].slice(0, this.maxHistorySize)
    
    await this.saveToStorage(updated)
    return entry
  }

  async getHistory(limit?: number): Promise<QueryHistoryEntry[]> {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []
      
      const history = JSON.parse(stored).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
        query: {
          ...entry.query,
          metadata: {
            ...entry.query.metadata,
            createdAt: new Date(entry.query.metadata.createdAt)
          }
        }
      }))
      
      return limit ? history.slice(0, limit) : history
    } catch (error) {
      console.error('Failed to load query history:', error)
      return []
    }
  }

  async searchHistory(searchTerm: string, limit = 50): Promise<QueryHistoryEntry[]> {
    const history = await this.getHistory()
    const term = searchTerm.toLowerCase()
    
    return history
      .filter(entry => 
        entry.query.raw.toLowerCase().includes(term) ||
        entry.query.type.toLowerCase().includes(term)
      )
      .slice(0, limit)
  }

  async getHistoryByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<QueryHistoryEntry[]> {
    const history = await this.getHistory()
    
    return history.filter(entry =>
      entry.timestamp >= startDate && entry.timestamp <= endDate
    )
  }

  async getHistoryStats(): Promise<{
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    averageExecutionTime: number
    queryTypeBreakdown: Record<string, number>
    recentActivity: QueryHistoryEntry[]
  }> {
    const history = await this.getHistory()
    const recent = history.slice(0, 10)
    
    const successful = history.filter(h => h.status === 'success')
    const failed = history.filter(h => h.status === 'error')
    
    const executionTimes = successful
      .filter(h => h.executionTime)
      .map(h => h.executionTime!)
    
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0

    const typeBreakdown = history.reduce((acc, h) => {
      acc[h.query.type] = (acc[h.query.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalQueries: history.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      averageExecutionTime: avgExecutionTime,
      queryTypeBreakdown: typeBreakdown,
      recentActivity: recent
    }
  }

  async deleteHistoryEntry(id: string): Promise<boolean> {
    const history = await this.getHistory()
    const filtered = history.filter(entry => entry.id !== id)
    
    if (filtered.length !== history.length) {
      await this.saveToStorage(filtered)
      return true
    }
    
    return false
  }

  async clearHistory(): Promise<void> {
    localStorage.removeItem(this.storageKey)
  }

  async clearOldHistory(daysToKeep = 30): Promise<number> {
    const history = await this.getHistory()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const filtered = history.filter(entry => entry.timestamp > cutoffDate)
    const removedCount = history.length - filtered.length
    
    if (removedCount > 0) {
      await this.saveToStorage(filtered)
    }
    
    return removedCount
  }

  async getMostFrequentQueries(limit = 10): Promise<{
    query: string
    count: number
    lastUsed: Date
  }[]> {
    const history = await this.getHistory()
    const queryMap = new Map<string, {
      count: number
      lastUsed: Date
    }>()
    
    history.forEach(entry => {
      const key = entry.query.raw
      const existing = queryMap.get(key)
      
      if (existing) {
        existing.count++
        if (entry.timestamp > existing.lastUsed) {
          existing.lastUsed = entry.timestamp
        }
      } else {
        queryMap.set(key, {
          count: 1,
          lastUsed: entry.timestamp
        })
      }
    })
    
    return Array.from(queryMap.entries())
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  async getSimilarQueries(targetQuery: string, limit = 5): Promise<QueryHistoryEntry[]> {
    const history = await this.getHistory()
    const target = targetQuery.toLowerCase()
    
    const scored = history
      .map(entry => ({
        entry,
        similarity: this.calculateSimilarity(target, entry.query.raw.toLowerCase())
      }))
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
    
    return scored.slice(0, limit).map(item => item.entry)
  }

  async rerunQuery(historyId: string): Promise<GraphQuery | null> {
    const history = await this.getHistory()
    const entry = history.find(h => h.id === historyId)
    
    return entry ? entry.query : null
  }

  async compareQueryResults(id1: string, id2: string): Promise<{
    query1: QueryHistoryEntry | null
    query2: QueryHistoryEntry | null
    comparison: {
      executionTimeDiff?: number
      resultCountDiff?: number
      statusMatch: boolean
    }
  } | null> {
    const history = await this.getHistory()
    const query1 = history.find(h => h.id === id1)
    const query2 = history.find(h => h.id === id2)
    
    if (!query1 || !query2) return null
    
    const comparison = {
      executionTimeDiff: query1.executionTime && query2.executionTime
        ? query2.executionTime - query1.executionTime
        : undefined,
      resultCountDiff: query1.result && query2.result
        ? query2.result.metadata.totalResults - query1.result.metadata.totalResults
        : undefined,
      statusMatch: query1.status === query2.status
    }
    
    return { query1, query2, comparison }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 2
    )
    
    return commonWords.length / Math.max(words1.length, words2.length)
  }

  private async saveToStorage(history: QueryHistoryEntry[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save query history:', error)
      throw new Error('Failed to save query history')
    }
  }

  private generateId(): string {
    return `qh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async exportHistory(): Promise<string> {
    const history = await this.getHistory()
    return JSON.stringify(history, null, 2)
  }

  async importHistory(jsonData: string): Promise<{
    imported: number
    errors: string[]
  }> {
    const result = { imported: 0, errors: [] as string[] }
    
    try {
      const importedHistory: QueryHistoryEntry[] = JSON.parse(jsonData)
      const existing = await this.getHistory()
      
      for (const entry of importedHistory) {
        try {
          if (!entry.query || !entry.timestamp) {
            result.errors.push(`Invalid history entry: ${entry.id || 'unknown'}`)
            continue
          }
          
          entry.timestamp = new Date(entry.timestamp)
          entry.query.metadata.createdAt = new Date(entry.query.metadata.createdAt)
          
          existing.push(entry)
          result.imported++
        } catch (error) {
          result.errors.push(`Failed to import history entry ${entry.id}: ${error}`)
        }
      }
      
      const sorted = existing
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.maxHistorySize)
      
      await this.saveToStorage(sorted)
    } catch (error) {
      result.errors.push(`Failed to parse import data: ${error}`)
    }
    
    return result
  }
}