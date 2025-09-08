import { ParsedQuery, EntityFilter, EdgeFilter, RelationshipChain, Aggregation, OrderClause, AutocompleteContext, Suggestion } from '@/types/query'

export class NaturalLanguageParser {
  private apiKey: string
  private entityTypes: string[] = []
  private edgeTypes: string[] = []
  private attributes: Map<string, string[]> = new Map()

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.loadSchemaInfo()
  }

  private async loadSchemaInfo() {
    this.entityTypes = ['Person', 'Document', 'Project', 'Organization', 'Event', 'Location']
    this.edgeTypes = ['KNOWS', 'CREATED_BY', 'REFERENCES', 'WORKS_FOR', 'LOCATED_IN', 'PARTICIPATES_IN']
    this.attributes.set('Person', ['name', 'email', 'role', 'department'])
    this.attributes.set('Document', ['title', 'content', 'createdAt', 'type'])
    this.attributes.set('Project', ['name', 'status', 'startDate', 'endDate'])
  }

  async parseNaturalLanguage(input: string): Promise<ParsedQuery> {
    const prompt = this.buildPrompt(input)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a graph query parser. Convert natural language queries to structured graph queries.' 
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const parsed = JSON.parse(data.choices[0].message.content)
      
      return this.validateAndEnhance(parsed)
    } catch (error) {
      console.error('Failed to parse natural language query:', error)
      return this.fallbackParser(input)
    }
  }

  private buildPrompt(input: string): string {
    return `
      Convert this natural language query to a graph query:
      "${input}"
      
      Context:
      - Entity types: ${this.entityTypes.join(', ')}
      - Edge types: ${this.edgeTypes.join(', ')}
      - Common attributes: ${Array.from(this.attributes.entries()).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')}
      
      Return a JSON object with:
      {
        "entities": [
          {
            "type": "entity type or null",
            "attributes": [
              {"field": "field name", "operator": "equals|contains|etc", "value": "value"}
            ]
          }
        ],
        "edges": [
          {
            "type": "edge type or null",
            "source": {"type": "source entity type"},
            "target": {"type": "target entity type"}
          }
        ],
        "relationships": [],
        "limit": 100,
        "orderBy": []
      }
      
      Examples:
      - "Find all people" -> {"entities": [{"type": "Person"}]}
      - "Documents created by John" -> {"entities": [{"type": "Document"}], "edges": [{"type": "CREATED_BY", "target": {"type": "Person", "attributes": [{"field": "name", "operator": "contains", "value": "John"}]}}]}
      - "Projects with status active" -> {"entities": [{"type": "Project", "attributes": [{"field": "status", "operator": "equals", "value": "active"}]}]}
    `
  }

  private validateAndEnhance(parsed: any): ParsedQuery {
    const query: ParsedQuery = {
      entities: [],
      edges: [],
      relationships: [],
      aggregations: [],
      limit: parsed.limit || 100,
      orderBy: []
    }

    if (parsed.entities && Array.isArray(parsed.entities)) {
      query.entities = parsed.entities
        .map((e: any) => this.validateEntityFilter(e))
        .filter((e: any) => e !== null)
    }

    if (parsed.edges && Array.isArray(parsed.edges)) {
      query.edges = parsed.edges
        .map((e: any) => this.validateEdgeFilter(e))
        .filter((e: any) => e !== null)
    }

    if (parsed.orderBy && Array.isArray(parsed.orderBy)) {
      query.orderBy = parsed.orderBy
    }

    return query
  }

  private validateEntityFilter(filter: any): EntityFilter {
    const validated: EntityFilter = {}
    
    if (filter.type) {
      if (Array.isArray(filter.type)) {
        const validTypes = filter.type.filter((t: string) => this.entityTypes.includes(t))
        if (validTypes.length > 0) {
          validated.type = validTypes
        }
      } else if (this.entityTypes.includes(filter.type)) {
        validated.type = filter.type
      }
    }

    if (filter.attributes && Array.isArray(filter.attributes)) {
      validated.attributes = filter.attributes.filter((attr: any) => 
        attr.field && attr.operator && attr.value !== undefined
      )
    }

    if (filter.id) {
      validated.id = filter.id
    }

    if (Object.keys(validated).length === 0) {
      return null as any
    }

    return validated
  }

  private validateEdgeFilter(filter: any): EdgeFilter {
    const validated: EdgeFilter = {}
    
    if (filter.type) {
      if (Array.isArray(filter.type)) {
        validated.type = filter.type.filter((t: string) => this.edgeTypes.includes(t))
      } else if (this.edgeTypes.includes(filter.type)) {
        validated.type = filter.type
      }
    }

    if (filter.source) {
      validated.source = this.validateEntityFilter(filter.source)
    }

    if (filter.target) {
      validated.target = this.validateEntityFilter(filter.target)
    }

    if (filter.attributes && Array.isArray(filter.attributes)) {
      validated.attributes = filter.attributes
    }

    return validated
  }

  private fallbackParser(input: string): ParsedQuery {
    const query: ParsedQuery = {
      limit: 100
    }

    const lowerInput = input.toLowerCase()

    const entityMatches = this.entityTypes.filter(type => 
      lowerInput.includes(type.toLowerCase())
    )

    if (entityMatches.length > 0) {
      query.entities = entityMatches.map(type => ({ type }))
    }

    const edgeMatches = this.edgeTypes.filter(type => 
      lowerInput.includes(type.toLowerCase().replace('_', ' '))
    )

    if (edgeMatches.length > 0) {
      query.edges = edgeMatches.map(type => ({ type }))
    }

    const limitMatch = lowerInput.match(/(?:limit|top|first)\s+(\d+)/)
    if (limitMatch) {
      query.limit = parseInt(limitMatch[1])
    }

    return query
  }

  async suggestQueries(partialInput: string): Promise<string[]> {
    const suggestions: string[] = []
    
    const templates = [
      'Find all {entity}',
      'Show {entity} created by {name}',
      'Get {entity} with {attribute} {value}',
      '{entity} connected to {entity}',
      'Recent {entity}',
      '{entity} modified in the last {days} days'
    ]

    for (const entityType of this.entityTypes) {
      if (entityType.toLowerCase().startsWith(partialInput.toLowerCase())) {
        suggestions.push(`Find all ${entityType}s`)
        suggestions.push(`Show recent ${entityType}s`)
      }
    }

    const historicalQueries = await this.getHistoricalQueries(partialInput)
    suggestions.push(...historicalQueries)

    return suggestions.slice(0, 10)
  }

  private async getHistoricalQueries(partialInput: string): Promise<string[]> {
    const historical = [
      'Find all documents created this week',
      'Show people in engineering department',
      'Get projects with status active',
      'Documents referencing Project Alpha',
      'People who know John Smith'
    ]

    return historical.filter(q => 
      q.toLowerCase().includes(partialInput.toLowerCase())
    ).slice(0, 5)
  }

  async getSuggestions(input: string, context: AutocompleteContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []

    if (context.expecting === 'entity_type') {
      for (const type of this.entityTypes) {
        if (type.toLowerCase().includes(input.toLowerCase())) {
          suggestions.push({
            type: 'entity_type',
            value: type,
            label: type,
            description: `Entity type: ${type}`
          })
        }
      }
    }

    if (context.expecting === 'attribute' && context.entityType) {
      const attrs = this.attributes.get(context.entityType) || []
      for (const attr of attrs) {
        if (attr.toLowerCase().includes(input.toLowerCase())) {
          suggestions.push({
            type: 'attribute',
            value: attr,
            label: attr,
            description: `${context.entityType} attribute`
          })
        }
      }
    }

    const templates = await this.getQueryTemplates(input)
    suggestions.push(...templates)

    const historical = await this.getHistoricalSuggestions(input)
    suggestions.push(...historical)

    return suggestions.slice(0, 20)
  }

  private async getQueryTemplates(input: string): Promise<Suggestion[]> {
    const templates = [
      {
        name: 'Find by Type',
        query: 'Find all {type}',
        description: 'Search for all entities of a specific type'
      },
      {
        name: 'Find Connections',
        query: 'Show connections between {entity1} and {entity2}',
        description: 'Find all paths between two entities'
      },
      {
        name: 'Recent Items',
        query: 'Show {type} created in the last {days} days',
        description: 'Find recently created items'
      }
    ]

    return templates
      .filter(t => t.query.toLowerCase().includes(input.toLowerCase()))
      .map(t => ({
        type: 'template' as const,
        value: t.query,
        label: t.name,
        description: t.description
      }))
  }

  private async getHistoricalSuggestions(input: string): Promise<Suggestion[]> {
    const historical = [
      { query: 'Find all documents', results: 245 },
      { query: 'Show people in engineering', results: 32 },
      { query: 'Active projects', results: 18 }
    ]

    return historical
      .filter(h => h.query.toLowerCase().includes(input.toLowerCase()))
      .map(h => ({
        type: 'historical' as const,
        value: h.query,
        label: h.query,
        description: `Previous search (${h.results} results)`
      }))
  }
}