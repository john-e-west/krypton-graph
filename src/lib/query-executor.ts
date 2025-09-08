import { ParsedQuery, QueryResult, EntityFilter, EdgeFilter } from '@/types/query'

export class QueryExecutor {
  private baseId: string
  private apiKey: string

  constructor(baseId: string, apiKey: string) {
    this.baseId = baseId
    this.apiKey = apiKey
  }

  async execute(query: ParsedQuery): Promise<QueryResult> {
    const startTime = Date.now()
    
    const entities = await this.fetchEntities(query)
    const edges = await this.fetchEdges(query, entities)
    
    const executionTime = Date.now() - startTime
    
    return {
      query,
      entities,
      edges,
      metadata: {
        totalResults: entities.length + edges.length,
        executionTime,
        cached: false
      }
    }
  }

  private async fetchEntities(query: ParsedQuery): Promise<any[]> {
    if (!query.entities || query.entities.length === 0) {
      return []
    }

    const formula = this.buildAirtableFormula(query.entities)
    
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${this.baseId}/Entities?` + 
        new URLSearchParams({
          filterByFormula: formula,
          maxRecords: String(query.limit || 100)
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.records || []
    } catch (error) {
      console.error('Failed to fetch entities:', error)
      return []
    }
  }

  private async fetchEdges(query: ParsedQuery, entities: any[]): Promise<any[]> {
    if (!query.edges || query.edges.length === 0) {
      if (!entities || entities.length === 0) {
        return []
      }
      
      const entityIds = entities.map(e => e.id)
      return this.fetchEdgesForEntities(entityIds)
    }

    const formula = this.buildEdgeFormula(query.edges)
    
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${this.baseId}/Edges?` +
        new URLSearchParams({
          filterByFormula: formula,
          maxRecords: String(query.limit || 100)
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.records || []
    } catch (error) {
      console.error('Failed to fetch edges:', error)
      return []
    }
  }

  private async fetchEdgesForEntities(entityIds: string[]): Promise<any[]> {
    if (entityIds.length === 0) return []
    
    const formula = `OR(${entityIds.map(id => 
      `OR(RECORD_ID() = '${id}', {Source} = '${id}', {Target} = '${id}')`
    ).join(', ')})`
    
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${this.baseId}/Edges?` +
        new URLSearchParams({
          filterByFormula: formula,
          maxRecords: '1000'
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.records || []
    } catch (error) {
      console.error('Failed to fetch edges for entities:', error)
      return []
    }
  }

  private buildAirtableFormula(filters: EntityFilter[]): string {
    const conditions: string[] = []
    
    for (const filter of filters) {
      if (filter.type) {
        if (Array.isArray(filter.type)) {
          conditions.push(
            `OR(${filter.type.map(t => `{Type} = '${t}'`).join(', ')})`
          )
        } else {
          conditions.push(`{Type} = '${filter.type}'`)
        }
      }
      
      if (filter.attributes) {
        for (const attr of filter.attributes) {
          conditions.push(this.buildAttributeCondition(attr))
        }
      }
      
      if (filter.id) {
        if (Array.isArray(filter.id)) {
          conditions.push(
            `OR(${filter.id.map(id => `RECORD_ID() = '${id}'`).join(', ')})`
          )
        } else {
          conditions.push(`RECORD_ID() = '${filter.id}'`)
        }
      }
    }
    
    return conditions.length > 0 ? `AND(${conditions.join(', ')})` : ''
  }

  private buildEdgeFormula(filters: EdgeFilter[]): string {
    const conditions: string[] = []
    
    for (const filter of filters) {
      if (filter.type) {
        if (Array.isArray(filter.type)) {
          conditions.push(
            `OR(${filter.type.map(t => `{Type} = '${t}'`).join(', ')})`
          )
        } else {
          conditions.push(`{Type} = '${filter.type}'`)
        }
      }
      
      if (filter.attributes) {
        for (const attr of filter.attributes) {
          conditions.push(this.buildAttributeCondition(attr))
        }
      }
    }
    
    return conditions.length > 0 ? `AND(${conditions.join(', ')})` : ''
  }

  private buildAttributeCondition(attr: any): string {
    const field = `{${attr.field}}`
    const value = attr.value
    
    switch (attr.operator) {
      case 'equals':
        return `${field} = '${value}'`
      case 'not_equals':
        return `${field} != '${value}'`
      case 'contains':
        return `FIND('${value}', ${field}) > 0`
      case 'starts_with':
        return `LEFT(${field}, ${value.length}) = '${value}'`
      case 'ends_with':
        return `RIGHT(${field}, ${value.length}) = '${value}'`
      case 'greater_than':
        return `${field} > ${value}`
      case 'less_than':
        return `${field} < ${value}`
      case 'is_null':
        return `${field} = BLANK()`
      case 'is_not_null':
        return `${field} != BLANK()`
      default:
        return `${field} = '${value}'`
    }
  }
}

export class QueryCache {
  private cache: Map<string, { result: QueryResult; timestamp: number }> = new Map()
  private ttl: number = 5 * 60 * 1000

  generateKey(query: ParsedQuery): string {
    return JSON.stringify(query)
  }

  async get(key: string): Promise<QueryResult | null> {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return { ...cached.result, metadata: { ...cached.result.metadata, cached: true } }
  }

  async set(key: string, result: QueryResult): Promise<void> {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }
}