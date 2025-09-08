import { 
  AuditEntry, 
  AuditAction, 
  AuditFilters, 
  AuditReport 
} from '../types/review'
import { v4 as uuidv4 } from 'uuid'

const generateId = () => uuidv4()
const currentUser = { id: 'current-user-id' } // Placeholder for auth

export class AuditLogger {
  private entries: AuditEntry[] = []
  private maxEntries = 1000

  async log(
    action: AuditAction,
    target: AuditEntry['target'],
    details: Record<string, any> = {}
  ): Promise<void> {
    // Create entry synchronously with placeholder IP
    const entry: AuditEntry = {
      id: generateId(),
      timestamp: new Date(),
      action,
      actor: currentUser.id,
      target,
      details,
      ipAddress: '127.0.0.1', // Default IP, will be updated async if needed
      userAgent: this.getUserAgent()
    }

    // Store locally immediately (synchronous)
    this.entries.push(entry)

    // Maintain entry limit
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }

    // Do async operations in background
    Promise.resolve().then(async () => {
      try {
        // Update IP address if we can get it
        const realIP = await this.getClientIP()
        if (realIP && realIP !== '127.0.0.1') {
          entry.ipAddress = realIP
        }

        // Persist to database
        await this.persistEntry(entry)

        // Trigger webhooks if configured
        await this.triggerWebhooks(entry)
      } catch (error) {
        console.error('Failed to complete async audit operations:', error)
      }
    })
  }

  async queryEntries(
    startDate: Date,
    endDate: Date,
    filters?: AuditFilters
  ): Promise<AuditEntry[]> {
    let filteredEntries = this.entries.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    )

    if (filters) {
      if (filters.actor) {
        filteredEntries = filteredEntries.filter(
          entry => entry.actor === filters.actor
        )
      }

      if (filters.action && filters.action.length > 0) {
        filteredEntries = filteredEntries.filter(
          entry => filters.action!.includes(entry.action)
        )
      }

      if (filters.targetType && filters.targetType.length > 0) {
        filteredEntries = filteredEntries.filter(
          entry => filters.targetType!.includes(entry.target.type)
        )
      }
    }

    return filteredEntries
  }

  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    filters?: AuditFilters
  ): Promise<AuditReport> {
    const entries = await this.queryEntries(startDate, endDate, filters)

    const byAction = this.groupByAction(entries)
    const byActor = this.groupByActor(entries)
    const timeline = entries.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )
    const summary = this.generateSummary(entries, startDate, endDate)

    return {
      period: { start: startDate, end: endDate },
      totalActions: entries.length,
      byAction,
      byActor,
      timeline,
      summary
    }
  }

  getRecentEntries(limit: number = 50): AuditEntry[] {
    return this.entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  getEntryById(id: string): AuditEntry | undefined {
    return this.entries.find(entry => entry.id === id)
  }

  async searchEntries(query: string): Promise<AuditEntry[]> {
    const lowercaseQuery = query.toLowerCase()
    
    return this.entries.filter(entry => {
      // Search in action
      if (entry.action.toLowerCase().includes(lowercaseQuery)) {
        return true
      }

      // Search in actor
      if (entry.actor.toLowerCase().includes(lowercaseQuery)) {
        return true
      }

      // Search in target
      if (entry.target.id.toLowerCase().includes(lowercaseQuery)) {
        return true
      }

      // Search in details
      const detailsStr = JSON.stringify(entry.details).toLowerCase()
      if (detailsStr.includes(lowercaseQuery)) {
        return true
      }

      return false
    })
  }

  private groupByAction(entries: AuditEntry[]): Record<AuditAction, number> {
    const grouped: Record<AuditAction, number> = {} as Record<AuditAction, number>

    entries.forEach(entry => {
      grouped[entry.action] = (grouped[entry.action] || 0) + 1
    })

    return grouped
  }

  private groupByActor(entries: AuditEntry[]): Record<string, number> {
    const grouped: Record<string, number> = {}

    entries.forEach(entry => {
      grouped[entry.actor] = (grouped[entry.actor] || 0) + 1
    })

    return grouped
  }

  private generateSummary(
    entries: AuditEntry[], 
    startDate: Date, 
    endDate: Date
  ): string {
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const avgPerDay = totalDays > 0 ? Math.round(entries.length / totalDays) : 0

    const uniqueActors = new Set(entries.map(e => e.actor)).size
    const mostCommonAction = this.getMostCommonAction(entries)
    const riskActions = entries.filter(e => 
      ['ROLLBACK_INITIATED', 'CHANGE_REJECTED'].includes(e.action)
    ).length

    return `
Audit Summary (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}):
• Total activities: ${entries.length} (${avgPerDay}/day average)
• Unique users: ${uniqueActors}
• Most common action: ${mostCommonAction || 'None'}
• Risk actions: ${riskActions} (${Math.round(riskActions / entries.length * 100)}%)
    `.trim()
  }

  private getMostCommonAction(entries: AuditEntry[]): AuditAction | null {
    const actionCounts = this.groupByAction(entries)
    const actions = Object.entries(actionCounts)
    
    if (actions.length === 0) return null

    const [mostCommon] = actions.sort((a, b) => b[1] - a[1])
    return mostCommon[0] as AuditAction
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      // In a real application, this would be handled server-side
      return '127.0.0.1'
    } catch {
      return undefined
    }
  }

  private getUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  }

  private async persistEntry(entry: AuditEntry): Promise<void> {
    try {
      // TODO: Persist to actual storage (backend API, IndexedDB, etc.)
      console.log('Persisting audit entry:', entry.id)
      
      // For now, just store in localStorage as backup
      const stored = localStorage.getItem('audit-entries')
      const entries = stored ? JSON.parse(stored) : []
      entries.push(entry)
      
      // Keep only last 100 entries in localStorage
      if (entries.length > 100) {
        entries.splice(0, entries.length - 100)
      }
      
      localStorage.setItem('audit-entries', JSON.stringify(entries))
    } catch (error) {
      console.error('Failed to persist audit entry:', error)
    }
  }

  private async triggerWebhooks(entry: AuditEntry): Promise<void> {
    try {
      // TODO: Implement webhook triggering for important events
      const importantActions: AuditAction[] = [
        'ROLLBACK_INITIATED',
        'REVIEW_COMPLETED',
        'CHANGE_REJECTED'
      ]

      if (importantActions.includes(entry.action)) {
        console.log('Would trigger webhook for:', entry.action)
        // await this.callWebhook(entry)
      }
    } catch (error) {
      console.error('Failed to trigger webhook:', error)
    }
  }

  // Utility methods for reporting and analysis
  getActivityTrends(days: number = 7): {
    date: string
    count: number
  }[] {
    const trends: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const count = this.entries.filter(
        entry => entry.timestamp >= dayStart && entry.timestamp <= dayEnd
      ).length

      trends.push({ date: dateStr, count })
    }

    return trends
  }

  getRiskScore(): {
    score: number
    level: 'low' | 'medium' | 'high'
    factors: string[]
  } {
    const recentEntries = this.getRecentEntries(100)
    const factors: string[] = []
    let score = 0

    // Check for high-risk activities
    const rollbacks = recentEntries.filter(e => e.action === 'ROLLBACK_INITIATED').length
    const rejections = recentEntries.filter(e => e.action === 'CHANGE_REJECTED').length
    
    if (rollbacks > 3) {
      score += 30
      factors.push(`${rollbacks} rollbacks in recent activity`)
    }

    if (rejections > 10) {
      score += 20
      factors.push(`${rejections} rejections in recent activity`)
    }

    // Check for unusual patterns
    const uniqueActors = new Set(recentEntries.map(e => e.actor)).size
    if (uniqueActors === 1 && recentEntries.length > 20) {
      score += 15
      factors.push('All recent activity from single user')
    }

    const level = score < 20 ? 'low' : score < 50 ? 'medium' : 'high'

    return { score, level, factors }
  }

  // Export audit data
  exportAuditData(startDate?: Date, endDate?: Date): string {
    const entries = startDate && endDate 
      ? this.entries.filter(e => e.timestamp >= startDate && e.timestamp <= endDate)
      : this.entries

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      entryCount: entries.length,
      entries: entries
    }, null, 2)
  }

  // Import audit data
  importAuditData(data: string): void {
    try {
      const parsed = JSON.parse(data)
      
      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error('Invalid audit data format')
      }

      // Validate entries
      parsed.entries.forEach((entry: any, index: number) => {
        if (!entry.id || !entry.timestamp || !entry.action || !entry.actor) {
          throw new Error(`Invalid entry at index ${index}`)
        }
      })

      // Merge with existing entries, avoiding duplicates
      const existingIds = new Set(this.entries.map(e => e.id))
      const newEntries = parsed.entries.filter((e: AuditEntry) => !existingIds.has(e.id))
      
      this.entries.push(...newEntries)
      this.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      console.log(`Imported ${newEntries.length} new audit entries`)
    } catch (error) {
      throw new Error(`Failed to import audit data: ${error}`)
    }
  }
}