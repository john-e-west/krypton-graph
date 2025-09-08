interface TypeDefinition {
  id: string
  name: string
  description: string
  pattern?: string
  attributes?: Array<{
    name: string
    type: string
    required: boolean
  }>
}

interface EdgeTypeDefinition {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  pattern?: string
}

interface OntologyDefinition {
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  domain?: string
  tags?: string[]
}

// Declare MCP functions - will be available at runtime
declare global {
  function mcp__airtable__list_records(params: {
    baseId: string;
    tableId: string;
    filterByFormula?: string;
    maxRecords?: number;
  }): Promise<{
    records: Array<{
      id: string;
      fields: Record<string, any>;
      createdTime: string;
    }>;
  }>;
}

interface GraphRecord {
  id: string
  name: string
  description: string
  ontology: OntologyDefinition
  domain?: string
  tags?: string[]
  usage_count?: number
  success_rate?: number
  created_at?: string
  last_used?: string
}

interface SimilarityScore {
  overall: number
  entity_similarity: number
  edge_similarity: number
  domain_match: number
  tag_overlap: number
  usage_factor: number
}

interface SimilarGraphMatch {
  graph: GraphRecord
  scores: SimilarityScore
  reasoning: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface SimilarityOptions {
  min_score?: number
  max_results?: number
  include_low_confidence?: boolean
  weight_usage?: boolean
  domain_filter?: string[]
}

export class GraphMatcher {
  private static readonly DEFAULT_OPTIONS: SimilarityOptions = {
    min_score: 0.3,
    max_results: 10,
    include_low_confidence: false,
    weight_usage: true
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy string matching of type names and descriptions
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    )

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1]
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i] + 1,     // deletion
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i - 1] + 1  // substitution
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Calculate string similarity based on Levenshtein distance
   */
  private static stringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - (distance / maxLength)
  }

  /**
   * Compare two entity types and return similarity score
   */
  private static compareEntityTypes(type1: TypeDefinition, type2: TypeDefinition): number {
    // Name similarity (weighted heavily)
    const nameSimilarity = this.stringSimilarity(type1.name, type2.name) * 0.4

    // Description similarity 
    const descSimilarity = this.stringSimilarity(type1.description, type2.description) * 0.3

    // Pattern similarity if both have patterns
    let patternSimilarity = 0
    if (type1.pattern && type2.pattern) {
      patternSimilarity = this.stringSimilarity(type1.pattern, type2.pattern) * 0.2
    }

    // Attribute similarity
    let attributeSimilarity = 0
    if (type1.attributes && type2.attributes) {
      const attr1Names = new Set(type1.attributes.map(a => a.name.toLowerCase()))
      const attr2Names = new Set(type2.attributes.map(a => a.name.toLowerCase()))
      const intersection = new Set([...attr1Names].filter(x => attr2Names.has(x)))
      const union = new Set([...attr1Names, ...attr2Names])
      attributeSimilarity = union.size > 0 ? (intersection.size / union.size) * 0.1 : 0
    }

    return nameSimilarity + descSimilarity + patternSimilarity + attributeSimilarity
  }

  /**
   * Compare two edge types and return similarity score
   */
  private static compareEdgeTypes(edge1: EdgeTypeDefinition, edge2: EdgeTypeDefinition): number {
    // Name similarity
    const nameSimilarity = this.stringSimilarity(edge1.name, edge2.name) * 0.5

    // Description similarity
    const descSimilarity = this.stringSimilarity(edge1.description, edge2.description) * 0.3

    // Source/target type compatibility
    let typeCompatibility = 0
    const source1 = new Set(edge1.sourceTypes.map(t => t.toLowerCase()))
    const source2 = new Set(edge2.sourceTypes.map(t => t.toLowerCase()))
    const target1 = new Set(edge1.targetTypes.map(t => t.toLowerCase()))
    const target2 = new Set(edge2.targetTypes.map(t => t.toLowerCase()))

    const sourceOverlap = new Set([...source1].filter(x => source2.has(x)))
    const targetOverlap = new Set([...target1].filter(x => target2.has(x)))
    
    const sourceUnion = new Set([...source1, ...source2])
    const targetUnion = new Set([...target1, ...target2])
    
    if (sourceUnion.size > 0 && targetUnion.size > 0) {
      typeCompatibility = ((sourceOverlap.size / sourceUnion.size) + 
                          (targetOverlap.size / targetUnion.size)) / 2 * 0.2
    }

    return nameSimilarity + descSimilarity + typeCompatibility
  }

  /**
   * Calculate entity type similarity between two ontologies
   */
  private static calculateEntitySimilarity(
    ontology1: OntologyDefinition, 
    ontology2: OntologyDefinition
  ): number {
    if (ontology1.entityTypes.length === 0 || ontology2.entityTypes.length === 0) {
      return 0
    }

    let totalSimilarity = 0
    const maxPossibleMatches = Math.max(ontology1.entityTypes.length, ontology2.entityTypes.length)

    // For each type in ontology1, find best match in ontology2
    for (const type1 of ontology1.entityTypes) {
      let bestScore = 0
      for (const type2 of ontology2.entityTypes) {
        const score = this.compareEntityTypes(type1, type2)
        bestScore = Math.max(bestScore, score)
      }
      totalSimilarity += bestScore
    }

    return totalSimilarity / maxPossibleMatches
  }

  /**
   * Calculate edge type similarity between two ontologies
   */
  private static calculateEdgeSimilarity(
    ontology1: OntologyDefinition,
    ontology2: OntologyDefinition
  ): number {
    if (ontology1.edgeTypes.length === 0 && ontology2.edgeTypes.length === 0) {
      return 1 // Both have no edges - perfect match
    }
    
    if (ontology1.edgeTypes.length === 0 || ontology2.edgeTypes.length === 0) {
      return 0.5 // One has edges, other doesn't - partial penalty
    }

    let totalSimilarity = 0
    const maxPossibleMatches = Math.max(ontology1.edgeTypes.length, ontology2.edgeTypes.length)

    // For each edge in ontology1, find best match in ontology2
    for (const edge1 of ontology1.edgeTypes) {
      let bestScore = 0
      for (const edge2 of ontology2.edgeTypes) {
        const score = this.compareEdgeTypes(edge1, edge2)
        bestScore = Math.max(bestScore, score)
      }
      totalSimilarity += bestScore
    }

    return totalSimilarity / maxPossibleMatches
  }

  /**
   * Calculate domain similarity based on explicit domain and inferred domain from tags/names
   */
  private static calculateDomainSimilarity(
    ontology1: OntologyDefinition,
    ontology2: OntologyDefinition
  ): number {
    // Explicit domain matching
    if (ontology1.domain && ontology2.domain) {
      if (ontology1.domain === ontology2.domain) return 1.0
      return this.stringSimilarity(ontology1.domain, ontology2.domain)
    }

    // Infer domain from tags and entity types
    const getDomainKeywords = (ontology: OntologyDefinition): Set<string> => {
      const keywords = new Set<string>()
      
      // Add tags
      ontology.tags?.forEach(tag => keywords.add(tag.toLowerCase()))
      
      // Add common domain keywords from entity types
      ontology.entityTypes.forEach(type => {
        const name = type.name.toLowerCase()
        const desc = type.description.toLowerCase()
        
        // Legal domain
        if (name.includes('contract') || name.includes('legal') || 
            desc.includes('contract') || desc.includes('legal')) {
          keywords.add('legal')
        }
        
        // Medical domain
        if (name.includes('patient') || name.includes('medical') || 
            desc.includes('patient') || desc.includes('medical')) {
          keywords.add('medical')
        }
        
        // Business domain
        if (name.includes('organization') || name.includes('company') || 
            desc.includes('organization') || desc.includes('company')) {
          keywords.add('business')
        }
        
        // Academic domain
        if (name.includes('research') || name.includes('paper') || 
            desc.includes('research') || desc.includes('academic')) {
          keywords.add('academic')
        }
      })
      
      return keywords
    }

    const keywords1 = getDomainKeywords(ontology1)
    const keywords2 = getDomainKeywords(ontology2)
    
    if (keywords1.size === 0 && keywords2.size === 0) return 0.5
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
    const union = new Set([...keywords1, ...keywords2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Calculate tag overlap between ontologies
   */
  private static calculateTagOverlap(
    ontology1: OntologyDefinition,
    ontology2: OntologyDefinition
  ): number {
    const tags1 = new Set((ontology1.tags || []).map(t => t.toLowerCase()))
    const tags2 = new Set((ontology2.tags || []).map(t => t.toLowerCase()))
    
    if (tags1.size === 0 && tags2.size === 0) return 0.5
    
    const intersection = new Set([...tags1].filter(x => tags2.has(x)))
    const union = new Set([...tags1, ...tags2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Generate human-readable reasoning for the similarity score
   */
  private static generateReasoning(
    targetOntology: OntologyDefinition,
    candidateGraph: GraphRecord,
    scores: SimilarityScore
  ): string[] {
    const reasoning: string[] = []

    // Entity type reasoning
    if (scores.entity_similarity > 0.8) {
      reasoning.push(`High entity type compatibility (${(scores.entity_similarity * 100).toFixed(0)}%)`)
    } else if (scores.entity_similarity > 0.5) {
      reasoning.push(`Moderate entity type similarity (${(scores.entity_similarity * 100).toFixed(0)}%)`)
    } else {
      reasoning.push(`Limited entity type overlap (${(scores.entity_similarity * 100).toFixed(0)}%)`)
    }

    // Edge type reasoning
    if (scores.edge_similarity > 0.8) {
      reasoning.push(`Strong relationship pattern match (${(scores.edge_similarity * 100).toFixed(0)}%)`)
    } else if (scores.edge_similarity > 0.5) {
      reasoning.push(`Some relationship patterns align (${(scores.edge_similarity * 100).toFixed(0)}%)`)
    }

    // Domain reasoning
    if (scores.domain_match > 0.8) {
      reasoning.push(`Same domain focus identified`)
    } else if (scores.domain_match > 0.5) {
      reasoning.push(`Related domain characteristics`)
    }

    // Tag reasoning
    if (scores.tag_overlap > 0.7) {
      reasoning.push(`Shared tags and categories`)
    }

    // Usage reasoning
    if (candidateGraph.usage_count && candidateGraph.usage_count > 10) {
      reasoning.push(`Proven pattern with ${candidateGraph.usage_count} uses`)
    }

    if (candidateGraph.success_rate && candidateGraph.success_rate > 0.9) {
      reasoning.push(`High success rate (${(candidateGraph.success_rate * 100).toFixed(0)}%)`)
    }

    return reasoning
  }

  /**
   * Find similar graphs for a given ontology definition
   */
  public static async findSimilarGraphs(
    targetOntology: OntologyDefinition,
    candidateGraphs: GraphRecord[],
    options: SimilarityOptions = {}
  ): Promise<SimilarGraphMatch[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    const matches: SimilarGraphMatch[] = []

    for (const candidate of candidateGraphs) {
      // Filter by domain if specified
      if (opts.domain_filter && opts.domain_filter.length > 0) {
        if (!candidate.domain || !opts.domain_filter.includes(candidate.domain)) {
          continue
        }
      }

      // Calculate individual similarity scores
      const entity_similarity = this.calculateEntitySimilarity(targetOntology, candidate.ontology)
      const edge_similarity = this.calculateEdgeSimilarity(targetOntology, candidate.ontology)
      const domain_match = this.calculateDomainSimilarity(targetOntology, candidate.ontology)
      const tag_overlap = this.calculateTagOverlap(targetOntology, candidate.ontology)

      // Calculate usage factor
      let usage_factor = 0.5 // Default neutral factor
      if (opts.weight_usage && candidate.usage_count && candidate.success_rate) {
        const usage_score = Math.min(candidate.usage_count / 50, 1) * 0.5
        const success_score = candidate.success_rate * 0.5
        usage_factor = usage_score + success_score
      }

      // Calculate overall similarity with weighted components
      const overall = (
        entity_similarity * 0.35 +
        edge_similarity * 0.25 +
        domain_match * 0.20 +
        tag_overlap * 0.15 +
        usage_factor * 0.05
      )

      const scores: SimilarityScore = {
        overall,
        entity_similarity,
        edge_similarity,
        domain_match,
        tag_overlap,
        usage_factor
      }

      // Skip if below minimum score
      if (overall < opts.min_score!) {
        continue
      }

      // Determine confidence level
      let confidence: 'high' | 'medium' | 'low'
      if (overall >= 0.8) {
        confidence = 'high'
      } else if (overall >= 0.6) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      // Skip low confidence matches if not requested
      if (confidence === 'low' && !opts.include_low_confidence) {
        continue
      }

      const reasoning = this.generateReasoning(targetOntology, candidate, scores)

      matches.push({
        graph: candidate,
        scores,
        reasoning,
        confidence
      })
    }

    // Sort by overall score (descending)
    matches.sort((a, b) => b.scores.overall - a.scores.overall)

    // Limit results
    return matches.slice(0, opts.max_results!)
  }

  /**
   * Get all graphs from Airtable using MCP
   */
  public static async getGraphsFromAirtable(): Promise<GraphRecord[]> {
    try {
      // Fetch all active graphs from Airtable
      const result = await mcp__airtable__list_records({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblKBwwyf3xrCVlH6', // Graphs table
        filterByFormula: 'AND({IsActive} = TRUE(), {IsArchived} = FALSE())',
        maxRecords: 100
      })

      // Transform Airtable records to GraphRecord format
      const graphs: GraphRecord[] = []
      
      for (const record of result.records) {
        const fields = record.fields
        
        // For now, create a simplified ontology structure
        // TODO: Link to actual Ontologies table for full ontology definitions
        const ontology: OntologyDefinition = {
          entityTypes: [], // Would need to fetch from linked EntityDefinitions
          edgeTypes: [], // Would need to fetch from linked EdgeDefinitions
          domain: fields.Tags ? String(fields.Tags).split(',')[0]?.trim() : undefined,
          tags: fields.Tags ? String(fields.Tags).split(',').map(tag => tag.trim()) : []
        }

        graphs.push({
          id: record.id,
          name: String(fields.Name || ''),
          description: String(fields.Description || ''),
          ontology,
          domain: ontology.domain,
          tags: ontology.tags,
          usage_count: 0, // Would need metrics tracking
          success_rate: 0.85, // Default - would need actual metrics
          created_at: record.createdTime,
          last_used: undefined // Would need usage tracking
        })
      }

      return graphs
    } catch (error) {
      console.error('Failed to fetch graphs from Airtable:', error)
      // Return empty array rather than failing completely
      return []
    }
  }
}