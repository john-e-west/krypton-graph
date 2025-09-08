import OpenAI from 'openai'

export interface TypeSuggestion {
  id: string
  name: string
  description: string
  examples: string[]
  confidence: number
  category: 'entity' | 'edge'
  pattern?: string
}

export interface TypeAnalysisResult {
  entityTypes: TypeSuggestion[]
  edgeTypes: TypeSuggestion[]
  classificationRate: number
  analysisMetadata: {
    documentLength: number
    complexity: 'low' | 'medium' | 'high'
    domain: string
    language: string
  }
}

interface OpenAITypeResponse {
  entities: Array<{
    name: string
    description: string
    examples: string[]
    confidence: number
  }>
  edges: Array<{
    name: string
    description: string
    examples: string[]
    confidence: number
  }>
  metadata: {
    domain: string
    complexity: string
    estimatedClassificationRate: number
  }
}

export class TypeSuggestionEngine {
  private openai: OpenAI | null = null
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      })
    }
  }

  async generateTypeSuggestions(content: string): Promise<TypeAnalysisResult> {
    if (!this.openai) {
      // Fallback to rule-based analysis if OpenAI is not configured
      return this.performRuleBasedAnalysis(content)
    }

    try {
      const prompt = this.buildAnalysisPrompt(content)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing documents and suggesting custom entity and edge types for knowledge graph construction. 
            You must return valid JSON matching the specified schema.
            Limit suggestions to maximum 10 entity types and 10 edge types.
            Focus on types that are extractable from text and suitable for Zep v3 classification.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      })

      const result = JSON.parse(response.choices[0].message.content || '{}') as OpenAITypeResponse
      
      return this.formatSuggestions(result, content)
      
    } catch (error) {
      console.error('OpenAI API error:', error)
      // Fallback to rule-based analysis
      return this.performRuleBasedAnalysis(content)
    }
  }

  private buildAnalysisPrompt(content: string): string {
    // Truncate content if too long
    const maxLength = 4000
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...[truncated]'
      : content

    return `Analyze the following document content and suggest custom entity and edge types for knowledge graph construction.

Document Content:
${truncatedContent}

Requirements:
1. Suggest up to 10 custom entity types that represent key concepts in the document
2. Suggest up to 10 custom edge types that represent relationships between entities
3. Each type must be extractable from text using pattern matching
4. Provide concrete examples from the document for each type
5. Estimate confidence (0-1) based on frequency and clarity of patterns
6. Estimate overall classification success rate

Return JSON with this structure:
{
  "entities": [
    {
      "name": "TypeName",
      "description": "What this entity represents",
      "examples": ["example1", "example2", "example3"],
      "confidence": 0.85
    }
  ],
  "edges": [
    {
      "name": "RelationshipName",
      "description": "What this relationship represents",
      "examples": ["entity1 relates to entity2"],
      "confidence": 0.75
    }
  ],
  "metadata": {
    "domain": "detected domain (e.g., scientific, business, technical)",
    "complexity": "low|medium|high",
    "estimatedClassificationRate": 75
  }
}`
  }

  private formatSuggestions(
    response: OpenAITypeResponse, 
    content: string
  ): TypeAnalysisResult {
    const entityTypes: TypeSuggestion[] = response.entities.map((entity, index) => ({
      id: `entity-${index + 1}`,
      name: entity.name,
      description: entity.description,
      examples: entity.examples.slice(0, 5),
      confidence: entity.confidence,
      category: 'entity' as const,
      pattern: this.generatePattern(entity.name, entity.examples)
    }))

    const edgeTypes: TypeSuggestion[] = response.edges.map((edge, index) => ({
      id: `edge-${index + 1}`,
      name: edge.name,
      description: edge.description,
      examples: edge.examples.slice(0, 5),
      confidence: edge.confidence,
      category: 'edge' as const,
      pattern: this.generatePattern(edge.name, edge.examples)
    }))

    return {
      entityTypes: entityTypes.slice(0, 10),
      edgeTypes: edgeTypes.slice(0, 10),
      classificationRate: response.metadata.estimatedClassificationRate,
      analysisMetadata: {
        documentLength: content.length,
        complexity: response.metadata.complexity as 'low' | 'medium' | 'high',
        domain: response.metadata.domain,
        language: 'en'
      }
    }
  }

  private generatePattern(typeName: string, examples: string[]): string {
    // Generate a simple regex pattern based on examples
    // This is a placeholder - real implementation would be more sophisticated
    
    if (examples.length === 0) {
      return `\\b${typeName}\\b`
    }

    // Find common patterns in examples
    const commonWords = this.findCommonPatterns(examples)
    if (commonWords.length > 0) {
      return commonWords.map(w => `\\b${w}\\b`).join('|')
    }

    return `\\b${typeName}\\b`
  }

  private findCommonPatterns(examples: string[]): string[] {
    if (examples.length < 2) return []

    // Simple implementation: find words that appear in multiple examples
    const wordCounts = new Map<string, number>()
    
    examples.forEach(example => {
      const words = example.toLowerCase().split(/\s+/)
      const uniqueWords = new Set(words)
      uniqueWords.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      })
    })

    // Return words that appear in at least half of examples
    const threshold = Math.ceil(examples.length / 2)
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word]) => word)
      .slice(0, 5)
  }

  private performRuleBasedAnalysis(content: string): TypeAnalysisResult {
    // Fallback rule-based analysis when OpenAI is not available
    
    const entitySuggestions: TypeSuggestion[] = []
    const edgeSuggestions: TypeSuggestion[] = []

    // Common entity patterns
    const entityPatterns = [
      { name: 'Person', pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, description: 'Names of people' },
      { name: 'Organization', pattern: /\b(?:Inc|Corp|LLC|Ltd|Company|Organization)\b/gi, description: 'Company or organization names' },
      { name: 'Date', pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, description: 'Date references' },
      { name: 'Location', pattern: /\b(?:Street|Avenue|City|State|Country)\b/gi, description: 'Geographic locations' },
      { name: 'Product', pattern: /\b(?:Product|Service|Solution|Platform)\b/gi, description: 'Products or services' }
    ]

    // Common relationship patterns
    const edgePatterns = [
      { name: 'WorksFor', pattern: /works?\s+(?:for|at|with)/gi, description: 'Employment relationships' },
      { name: 'LocatedIn', pattern: /located\s+(?:in|at)/gi, description: 'Location relationships' },
      { name: 'Manages', pattern: /manages?|oversees?|leads?/gi, description: 'Management relationships' },
      { name: 'Contains', pattern: /contains?|includes?|comprises?/gi, description: 'Containment relationships' },
      { name: 'RelatesTo', pattern: /relates?\s+to|associated\s+with/gi, description: 'General relationships' }
    ]

    // Analyze content for entity patterns
    entityPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern.pattern) || []
      if (matches.length > 0) {
        entitySuggestions.push({
          id: `entity-${index + 1}`,
          name: pattern.name,
          description: pattern.description,
          examples: Array.from(new Set(matches)).slice(0, 5),
          confidence: Math.min(0.9, matches.length / 100),
          category: 'entity',
          pattern: pattern.pattern.source
        })
      }
    })

    // Analyze content for edge patterns
    edgePatterns.forEach((pattern, index) => {
      const matches = content.match(pattern.pattern) || []
      if (matches.length > 0) {
        edgeSuggestions.push({
          id: `edge-${index + 1}`,
          name: pattern.name,
          description: pattern.description,
          examples: Array.from(new Set(matches)).slice(0, 5),
          confidence: Math.min(0.85, matches.length / 50),
          category: 'edge',
          pattern: pattern.pattern.source
        })
      }
    })

    // Estimate classification rate based on pattern matches
    const totalMatches = entitySuggestions.reduce((sum, s) => sum + s.examples.length, 0) +
                        edgeSuggestions.reduce((sum, s) => sum + s.examples.length, 0)
    const estimatedRate = Math.min(85, 50 + (totalMatches * 2))

    return {
      entityTypes: entitySuggestions.slice(0, 10),
      edgeTypes: edgeSuggestions.slice(0, 10),
      classificationRate: estimatedRate,
      analysisMetadata: {
        documentLength: content.length,
        complexity: content.length > 10000 ? 'high' : content.length > 5000 ? 'medium' : 'low',
        domain: 'general',
        language: 'en'
      }
    }
  }

  async predictClassificationRate(
    content: string,
    entityTypes: TypeSuggestion[],
    edgeTypes: TypeSuggestion[]
  ): Promise<number> {
    // Simulate classification with the suggested types
    let matchCount = 0
    let totalPossibleMatches = 0

    // Check how many entities can be found
    entityTypes.forEach(type => {
      if (type.pattern) {
        const regex = new RegExp(type.pattern, 'gi')
        const matches = content.match(regex) || []
        matchCount += matches.length
      }
    })

    // Check how many relationships can be found
    edgeTypes.forEach(type => {
      if (type.pattern) {
        const regex = new RegExp(type.pattern, 'gi')
        const matches = content.match(regex) || []
        matchCount += matches.length
      }
    })

    // Estimate total possible entities and relationships
    const words = content.split(/\s+/).length
    totalPossibleMatches = Math.floor(words / 10) // Rough estimate

    if (totalPossibleMatches === 0) return 0

    const rate = (matchCount / totalPossibleMatches) * 100
    return Math.min(95, Math.max(10, rate))
  }
}