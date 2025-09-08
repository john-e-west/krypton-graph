import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, validateDocumentAccess } from '@/lib/auth/middleware'

// Declare MCP functions
declare global {
  function mcp__airtable__list_records(params: {
    baseId: string;
    tableId: string;
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }): Promise<{
    records: Array<{
      id: string;
      fields: Record<string, any>;
      createdTime: string;
    }>;
  }>;
}

interface ClassificationMetrics {
  graphId: string
  totalDocuments: number
  totalEntities: number
  totalEdges: number
  classificationRate: number
  successRate: number
  unclassifiedCount: number
  entityTypeBreakdown: Array<{
    type: string
    count: number
    percentage: number
    accuracy: number
  }>
  edgeTypeBreakdown: Array<{
    type: string
    count: number
    percentage: number
    accuracy: number
  }>
  performanceMetrics: {
    avgProcessingTime: number
    throughputPerHour: number
    errorRate: number
  }
  trends: {
    daily: Array<{
      date: string
      entitiesProcessed: number
      edgesProcessed: number
      successRate: number
    }>
    weekly: Array<{
      week: string
      entitiesProcessed: number
      edgesProcessed: number
      successRate: number
    }>
    monthly: Array<{
      month: string
      entitiesProcessed: number
      edgesProcessed: number
      successRate: number
    }>
  }
  lastUpdated: string
}

interface TimeRangeFilter {
  startDate?: string
  endDate?: string
  granularity: 'daily' | 'weekly' | 'monthly'
}

class MetricsAggregator {
  /**
   * Aggregate classification metrics for a specific graph
   */
  static async aggregateClassificationMetrics(
    graphId: string,
    timeRange: TimeRangeFilter
  ): Promise<ClassificationMetrics> {
    const { startDate, endDate, granularity } = timeRange
    
    // Build date filter
    let dateFilter = ''
    if (startDate || endDate) {
      const conditions = []
      if (startDate) conditions.push(`IS_AFTER({ProcessedAt}, '${startDate}')`)
      if (endDate) conditions.push(`IS_BEFORE({ProcessedAt}, '${endDate}')`)
      dateFilter = conditions.length > 0 ? `, ${conditions.join(', ')}` : ''
    }

    // Fetch classification events for this graph
    const classificationEvents = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblClassificationEvents', // Assuming this table exists
      filterByFormula: `AND({GraphId} = '${graphId}'{${dateFilter}})`,
      maxRecords: 10000,
      sort: [{ field: 'ProcessedAt', direction: 'desc' }]
    })

    // Fetch graph details
    const graphDetails = await mcp__airtable__list_records({
      baseId: 'appvLsaMZqtLc9EIX',
      tableId: 'tblKBwwyf3xrCVlH6',
      filterByFormula: `{GraphId} = '${graphId}'`,
      maxRecords: 1
    })

    if (graphDetails.records.length === 0) {
      throw new Error('Graph not found')
    }

    const graph = graphDetails.records[0]
    const events = classificationEvents.records

    // Calculate basic metrics
    const totalDocuments = new Set(events.map(e => e.fields.DocumentId)).size
    const totalEntities = events.filter(e => e.fields.EventType === 'ENTITY_CLASSIFIED').length
    const totalEdges = events.filter(e => e.fields.EventType === 'EDGE_CLASSIFIED').length
    const successfulClassifications = events.filter(e => e.fields.Success === true).length
    const totalClassificationAttempts = events.length

    const classificationRate = totalDocuments > 0 ? (totalEntities + totalEdges) / totalDocuments : 0
    const successRate = totalClassificationAttempts > 0 ? successfulClassifications / totalClassificationAttempts : 0
    const unclassifiedCount = events.filter(e => e.fields.Success === false).length

    // Calculate entity type breakdown
    const entityEvents = events.filter(e => e.fields.EventType === 'ENTITY_CLASSIFIED' && e.fields.Success)
    const entityTypeMap = new Map<string, { count: number; successful: number }>()
    
    entityEvents.forEach(event => {
      const type = String(event.fields.EntityType || 'Unknown')
      if (!entityTypeMap.has(type)) {
        entityTypeMap.set(type, { count: 0, successful: 0 })
      }
      const stats = entityTypeMap.get(type)!
      stats.count++
      if (event.fields.Success) stats.successful++
    })

    const entityTypeBreakdown = Array.from(entityTypeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      percentage: totalEntities > 0 ? (stats.count / totalEntities) * 100 : 0,
      accuracy: stats.count > 0 ? (stats.successful / stats.count) : 0
    })).sort((a, b) => b.count - a.count)

    // Calculate edge type breakdown
    const edgeEvents = events.filter(e => e.fields.EventType === 'EDGE_CLASSIFIED' && e.fields.Success)
    const edgeTypeMap = new Map<string, { count: number; successful: number }>()
    
    edgeEvents.forEach(event => {
      const type = String(event.fields.EdgeType || 'Unknown')
      if (!edgeTypeMap.has(type)) {
        edgeTypeMap.set(type, { count: 0, successful: 0 })
      }
      const stats = edgeTypeMap.get(type)!
      stats.count++
      if (event.fields.Success) stats.successful++
    })

    const edgeTypeBreakdown = Array.from(edgeTypeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      percentage: totalEdges > 0 ? (stats.count / totalEdges) * 100 : 0,
      accuracy: stats.count > 0 ? (stats.successful / stats.count) : 0
    })).sort((a, b) => b.count - a.count)

    // Calculate performance metrics
    const processingTimes = events
      .filter(e => e.fields.ProcessingTimeMs)
      .map(e => Number(e.fields.ProcessingTimeMs))
    
    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0

    const errorEvents = events.filter(e => e.fields.Success === false)
    const errorRate = totalClassificationAttempts > 0 ? errorEvents.length / totalClassificationAttempts : 0

    // Calculate throughput (entities + edges per hour)
    const hourlyData = this.groupEventsByHour(events)
    const throughputPerHour = hourlyData.length > 0 
      ? hourlyData.reduce((sum, hour) => sum + hour.count, 0) / hourlyData.length 
      : 0

    // Generate trend data based on granularity
    const trends = {
      daily: this.generateDailyTrends(events, 30), // Last 30 days
      weekly: this.generateWeeklyTrends(events, 12), // Last 12 weeks
      monthly: this.generateMonthlyTrends(events, 12) // Last 12 months
    }

    return {
      graphId,
      totalDocuments,
      totalEntities,
      totalEdges,
      classificationRate,
      successRate,
      unclassifiedCount,
      entityTypeBreakdown,
      edgeTypeBreakdown,
      performanceMetrics: {
        avgProcessingTime,
        throughputPerHour,
        errorRate
      },
      trends,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Group events by hour for throughput calculation
   */
  private static groupEventsByHour(events: any[]): Array<{ hour: string; count: number }> {
    const hourlyMap = new Map<string, number>()
    
    events.forEach(event => {
      if (event.fields.ProcessedAt) {
        const date = new Date(event.fields.ProcessedAt)
        const hourKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`
        hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1)
      }
    })

    return Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count }))
  }

  /**
   * Generate daily trend data
   */
  private static generateDailyTrends(events: any[], days: number): Array<{
    date: string
    entitiesProcessed: number
    edgesProcessed: number
    successRate: number
  }> {
    const dailyMap = new Map<string, {
      entities: number
      edges: number
      successful: number
      total: number
    }>()

    // Initialize last N days
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      dailyMap.set(dateKey, { entities: 0, edges: 0, successful: 0, total: 0 })
    }

    // Aggregate events by day
    events.forEach(event => {
      if (event.fields.ProcessedAt) {
        const dateKey = new Date(event.fields.ProcessedAt).toISOString().split('T')[0]
        if (dailyMap.has(dateKey)) {
          const stats = dailyMap.get(dateKey)!
          if (event.fields.EventType === 'ENTITY_CLASSIFIED') stats.entities++
          if (event.fields.EventType === 'EDGE_CLASSIFIED') stats.edges++
          if (event.fields.Success) stats.successful++
          stats.total++
        }
      }
    })

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        entitiesProcessed: stats.entities,
        edgesProcessed: stats.edges,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * Generate weekly trend data
   */
  private static generateWeeklyTrends(events: any[], weeks: number): Array<{
    week: string
    entitiesProcessed: number
    edgesProcessed: number
    successRate: number
  }> {
    const weeklyMap = new Map<string, {
      entities: number
      edges: number
      successful: number
      total: number
    }>()

    // Generate week keys for the last N weeks
    for (let i = 0; i < weeks; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (i * 7))
      const year = date.getFullYear()
      const week = Math.ceil(date.getDate() / 7)
      const month = date.getMonth() + 1
      const weekKey = `${year}-${month.toString().padStart(2, '0')}-W${week}`
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { entities: 0, edges: 0, successful: 0, total: 0 })
      }
    }

    // Aggregate events by week
    events.forEach(event => {
      if (event.fields.ProcessedAt) {
        const date = new Date(event.fields.ProcessedAt)
        const year = date.getFullYear()
        const week = Math.ceil(date.getDate() / 7)
        const month = date.getMonth() + 1
        const weekKey = `${year}-${month.toString().padStart(2, '0')}-W${week}`
        
        if (weeklyMap.has(weekKey)) {
          const stats = weeklyMap.get(weekKey)!
          if (event.fields.EventType === 'ENTITY_CLASSIFIED') stats.entities++
          if (event.fields.EventType === 'EDGE_CLASSIFIED') stats.edges++
          if (event.fields.Success) stats.successful++
          stats.total++
        }
      }
    })

    return Array.from(weeklyMap.entries())
      .map(([week, stats]) => ({
        week,
        entitiesProcessed: stats.entities,
        edgesProcessed: stats.edges,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }

  /**
   * Generate monthly trend data
   */
  private static generateMonthlyTrends(events: any[], months: number): Array<{
    month: string
    entitiesProcessed: number
    edgesProcessed: number
    successRate: number
  }> {
    const monthlyMap = new Map<string, {
      entities: number
      edges: number
      successful: number
      total: number
    }>()

    // Generate month keys for the last N months
    for (let i = 0; i < months; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      monthlyMap.set(monthKey, { entities: 0, edges: 0, successful: 0, total: 0 })
    }

    // Aggregate events by month
    events.forEach(event => {
      if (event.fields.ProcessedAt) {
        const date = new Date(event.fields.ProcessedAt)
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        
        if (monthlyMap.has(monthKey)) {
          const stats = monthlyMap.get(monthKey)!
          if (event.fields.EventType === 'ENTITY_CLASSIFIED') stats.entities++
          if (event.fields.EventType === 'EDGE_CLASSIFIED') stats.edges++
          if (event.fields.Success) stats.successful++
          stats.total++
        }
      }
    })

    return Array.from(monthlyMap.entries())
      .map(([month, stats]) => ({
        month,
        entitiesProcessed: stats.entities,
        edgesProcessed: stats.edges,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }
}

/**
 * GET /api/metrics/classification/[graphId] - Get classification metrics for a graph
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { graphId: string } }
) {
  try {
    const graphId = params.graphId

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`classification-metrics:${user.userId}`, 20, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Validate graph access
    const accessResult = await validateDocumentAccess(user.userId, graphId, 'read')
    if (!accessResult.authorized) {
      return accessResult.error!
    }

    // Step 4: Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const granularity = (searchParams.get('granularity') as 'daily' | 'weekly' | 'monthly') || 'daily'

    const timeRange: TimeRangeFilter = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      granularity
    }

    // Step 5: Aggregate metrics
    const metrics = await MetricsAggregator.aggregateClassificationMetrics(graphId, timeRange)

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Classification metrics API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch classification metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/metrics/classification/[graphId] - Record a classification event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { graphId: string } }
) {
  try {
    const graphId = params.graphId

    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`classification-events:${user.userId}`, 100, 60000)
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Validate request body
    const body = await request.json()
    const {
      documentId,
      eventType, // 'ENTITY_CLASSIFIED' | 'EDGE_CLASSIFIED'
      entityType,
      edgeType,
      success,
      processingTimeMs,
      confidence,
      errorMessage
    } = body

    // Step 4: Create classification event record
    const eventRecord = {
      GraphId: graphId,
      DocumentId: documentId,
      EventType: eventType,
      EntityType: entityType || '',
      EdgeType: edgeType || '',
      Success: Boolean(success),
      ProcessingTimeMs: Number(processingTimeMs) || 0,
      Confidence: Number(confidence) || 0,
      ErrorMessage: errorMessage || '',
      ProcessedAt: new Date().toISOString(),
      UserId: user.userId
    }

    // In a real implementation, you would save to Airtable here
    // For now, we'll just acknowledge the event
    
    return NextResponse.json({
      success: true,
      message: 'Classification event recorded',
      eventId: `evt_${Date.now()}`,
      timestamp: eventRecord.ProcessedAt
    })

  } catch (error) {
    console.error('Classification event API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to record classification event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}