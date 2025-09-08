export interface GraphQuery {
  id: string
  type: 'natural' | 'structured'
  raw: string
  parsed: ParsedQuery
  metadata: {
    createdAt: Date
    createdBy: string
    executionTime?: number
    resultCount?: number
  }
}

export interface ParsedQuery {
  entities?: EntityFilter[]
  edges?: EdgeFilter[]
  relationships?: RelationshipChain[]
  aggregations?: Aggregation[]
  limit?: number
  orderBy?: OrderClause[]
}

export interface EntityFilter {
  type?: string | string[]
  attributes?: AttributeFilter[]
  id?: string | string[]
  createdAfter?: Date
  createdBefore?: Date
  modifiedAfter?: Date
  modifiedBefore?: Date
}

export interface EdgeFilter {
  type?: string | string[]
  source?: EntityFilter
  target?: EntityFilter
  attributes?: AttributeFilter[]
  bidirectional?: boolean
}

export interface AttributeFilter {
  field: string
  operator: FilterOperator
  value: unknown
  caseSensitive?: boolean
}

export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'between' | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'regex'

export interface RelationshipChain {
  start: EntityFilter
  path: EdgeStep[]
  end?: EntityFilter
  maxDepth?: number
}

export interface EdgeStep {
  type?: string
  direction: 'outgoing' | 'incoming' | 'both'
  through?: EntityFilter
}

export interface OrderClause {
  field: string
  direction: 'asc' | 'desc'
}

export interface Aggregation {
  field: string
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max'
  groupBy?: string[]
}

export interface QueryResult {
  query: ParsedQuery
  entities: GraphEntity[]
  edges: GraphEdge[]
  aggregations?: AggregationResult[]
  metadata: {
    totalResults: number
    executionTime: number
    cached: boolean
  }
}

export interface AggregationResult {
  field: string
  operation: string
  value: number
  groups?: Record<string, unknown>
}

export interface SavedQuery {
  id: string
  name: string
  description?: string
  query: GraphQuery
  tags: string[]
  isPublic: boolean
  metadata: {
    createdAt: Date
    createdBy: string
    lastUsed?: Date
    useCount: number
    averageExecutionTime?: number
  }
}

export interface Suggestion {
  type: 'entity_type' | 'attribute' | 'historical' | 'template'
  value: string
  label: string
  description: string
}

export interface AutocompleteContext {
  expecting: 'entity_type' | 'attribute' | 'edge_type' | 'value'
  entityType?: string
  currentQuery?: string
}

export interface QueryTemplate {
  name: string
  description: string
  template: (...args: unknown[]) => ParsedQuery
}

// Graph data structures
export interface GraphEntity {
  id: string
  type: string
  [key: string]: unknown
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  [key: string]: unknown
}