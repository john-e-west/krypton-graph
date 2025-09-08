interface EntityType {
  id: string
  name: string
  description: string
  attributes: Array<{
    name: string
    type: string
    required: boolean
  }>
  classifiedCount: number
  confidence: number
  examples: string[]
}

interface EdgeType {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  classifiedCount: number
  confidence: number
}

interface OptimizationResult {
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  mergedTypes: Array<{
    originalTypes: string[]
    newType: EntityType
    reasoning: string
  }>
  splitTypes: Array<{
    originalType: string
    newTypes: EntityType[]
    reasoning: string
  }>
  qualityMetrics: {
    totalTypes: number
    estimatedClassificationRate: number
    averageConfidence: number
    coverageImprovement: number
  }
}

interface OptimizationOptions {
  maxEntityTypes: number
  maxEdgeTypes: number
  minClassificationRate: number
  aggressiveness: 'conservative' | 'moderate' | 'aggressive'
  preserveHighConfidence: boolean
  domainConstraints?: {
    requiredTypes: string[]
    protectedTypes: string[]
  }
}

export class TypeOptimizer {
  private entityTypes: EntityType[]
  private edgeTypes: EdgeType[]
  private options: OptimizationOptions

  constructor(
    entityTypes: EntityType[], 
    edgeTypes: EdgeType[], 
    options: OptimizationOptions
  ) {
    this.entityTypes = [...entityTypes]
    this.edgeTypes = [...edgeTypes]
    this.options = options
  }

  /**
   * Main optimization method that applies various strategies
   */
  optimize(): OptimizationResult {
    const result: OptimizationResult = {
      entityTypes: [...this.entityTypes],
      edgeTypes: [...this.edgeTypes],
      mergedTypes: [],
      splitTypes: [],
      qualityMetrics: {
        totalTypes: this.entityTypes.length + this.edgeTypes.length,
        estimatedClassificationRate: this.calculateCurrentClassificationRate(),
        averageConfidence: this.calculateAverageConfidence(),
        coverageImprovement: 0
      }
    }

    // Apply optimization strategies in order of impact
    this.applyHierarchicalConsolidation(result)
    this.applyAttributeBasedMerging(result)
    this.applyPatternGeneralization(result)
    this.applyCoverageMaximization(result)

    // Recalculate metrics
    result.qualityMetrics = this.calculateFinalMetrics(result)

    return result
  }

  /**
   * Merge types that are in a hierarchical relationship
   */
  private applyHierarchicalConsolidation(result: OptimizationResult): void {
    const candidatePairs = this.findHierarchicalCandidates(result.entityTypes)
    
    for (const [parent, child] of candidatePairs) {
      if (result.entityTypes.length <= this.options.maxEntityTypes) break

      const mergedType = this.mergeTypes(parent, child, 'hierarchical')
      if (mergedType && this.shouldMerge(parent, child, mergedType)) {
        result.entityTypes = result.entityTypes.filter(t => t.id !== parent.id && t.id !== child.id)
        result.entityTypes.push(mergedType)
        
        result.mergedTypes.push({
          originalTypes: [parent.name, child.name],
          newType: mergedType,
          reasoning: `Merged hierarchical types: ${child.name} is a specialization of ${parent.name}`
        })
      }
    }
  }

  /**
   * Merge types with similar attributes
   */
  private applyAttributeBasedMerging(result: OptimizationResult): void {
    const similarTypes = this.findAttributeSimilarTypes(result.entityTypes)
    
    for (const typeGroup of similarTypes) {
      if (result.entityTypes.length <= this.options.maxEntityTypes) break
      if (typeGroup.length < 2) continue

      const mergedType = this.mergeMultipleTypes(typeGroup)
      if (mergedType && this.shouldMergeMultiple(typeGroup, mergedType)) {
        result.entityTypes = result.entityTypes.filter(t => !typeGroup.find(gt => gt.id === t.id))
        result.entityTypes.push(mergedType)
        
        result.mergedTypes.push({
          originalTypes: typeGroup.map(t => t.name),
          newType: mergedType,
          reasoning: `Merged types with similar attributes: ${typeGroup.map(t => t.name).join(', ')}`
        })
      }
    }
  }

  /**
   * Generalize patterns to capture more items
   */
  private applyPatternGeneralization(result: OptimizationResult): void {
    const lowCoverageTypes = result.entityTypes.filter(t => 
      t.classifiedCount < this.calculateMedianClassifiedCount(result.entityTypes) * 0.5
    )

    for (const type of lowCoverageTypes) {
      const generalizedType = this.generalizeType(type)
      if (generalizedType && this.estimateImprovement(type, generalizedType) > 0.1) {
        const index = result.entityTypes.findIndex(t => t.id === type.id)
        if (index !== -1) {
          result.entityTypes[index] = generalizedType
        }
      }
    }
  }

  /**
   * Maximize coverage within type limits
   */
  private applyCoverageMaximization(result: OptimizationResult): void {
    // Sort types by coverage potential
    result.entityTypes.sort((a, b) => {
      const scoreA = a.classifiedCount * a.confidence
      const scoreB = b.classifiedCount * b.confidence
      return scoreB - scoreA
    })

    // Keep top performing types within limits
    if (result.entityTypes.length > this.options.maxEntityTypes) {
      const typesToRemove = result.entityTypes.slice(this.options.maxEntityTypes)
      result.entityTypes = result.entityTypes.slice(0, this.options.maxEntityTypes)
      
      // Try to merge removed types into remaining types
      for (const removedType of typesToRemove) {
        const bestMatch = this.findBestMergeCandidate(removedType, result.entityTypes)
        if (bestMatch) {
          const mergedType = this.mergeTypes(bestMatch, removedType, 'coverage')
          if (mergedType) {
            const index = result.entityTypes.findIndex(t => t.id === bestMatch.id)
            if (index !== -1) {
              result.entityTypes[index] = mergedType
            }
          }
        }
      }
    }
  }

  private findHierarchicalCandidates(types: EntityType[]): Array<[EntityType, EntityType]> {
    const pairs: Array<[EntityType, EntityType]> = []
    
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const type1 = types[i]
        const type2 = types[j]
        
        if (this.isHierarchicalRelationship(type1, type2)) {
          // Determine parent-child relationship based on specificity
          const parent = type1.attributes.length <= type2.attributes.length ? type1 : type2
          const child = type1.attributes.length > type2.attributes.length ? type1 : type2
          pairs.push([parent, child])
        }
      }
    }
    
    return pairs
  }

  private isHierarchicalRelationship(type1: EntityType, type2: EntityType): boolean {
    // Check if one type's attributes are a subset of another's
    const attrs1 = new Set(type1.attributes.map(a => a.name))
    const attrs2 = new Set(type2.attributes.map(a => a.name))
    
    const intersection = new Set([...attrs1].filter(x => attrs2.has(x)))
    const minSize = Math.min(attrs1.size, attrs2.size)
    
    return intersection.size / minSize > 0.7
  }

  private findAttributeSimilarTypes(types: EntityType[]): EntityType[][] {
    const groups: EntityType[][] = []
    const visited = new Set<string>()
    
    for (const type of types) {
      if (visited.has(type.id)) continue
      
      const similarTypes = [type]
      visited.add(type.id)
      
      for (const otherType of types) {
        if (visited.has(otherType.id)) continue
        
        if (this.calculateAttributeSimilarity(type, otherType) > 0.6) {
          similarTypes.push(otherType)
          visited.add(otherType.id)
        }
      }
      
      if (similarTypes.length > 1) {
        groups.push(similarTypes)
      }
    }
    
    return groups
  }

  private calculateAttributeSimilarity(type1: EntityType, type2: EntityType): number {
    const attrs1 = new Set(type1.attributes.map(a => `${a.name}:${a.type}`))
    const attrs2 = new Set(type2.attributes.map(a => `${a.name}:${a.type}`))
    
    const intersection = new Set([...attrs1].filter(x => attrs2.has(x)))
    const union = new Set([...attrs1, ...attrs2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private mergeTypes(type1: EntityType, type2: EntityType, strategy: string): EntityType {
    const combinedAttributes = this.mergeAttributes(type1.attributes, type2.attributes)
    const combinedExamples = [...type1.examples, ...type2.examples].slice(0, 5)
    
    return {
      id: `merged-${type1.id}-${type2.id}`,
      name: this.generateMergedName(type1, type2),
      description: this.generateMergedDescription(type1, type2, strategy),
      attributes: combinedAttributes,
      classifiedCount: type1.classifiedCount + type2.classifiedCount,
      confidence: (type1.confidence * type1.classifiedCount + type2.confidence * type2.classifiedCount) / 
                   (type1.classifiedCount + type2.classifiedCount),
      examples: combinedExamples
    }
  }

  private mergeMultipleTypes(types: EntityType[]): EntityType {
    if (types.length < 2) return types[0]
    
    let result = types[0]
    for (let i = 1; i < types.length; i++) {
      result = this.mergeTypes(result, types[i], 'attribute-based')
    }
    
    return result
  }

  private mergeAttributes(attrs1: EntityType['attributes'], attrs2: EntityType['attributes']): EntityType['attributes'] {
    const merged = new Map<string, EntityType['attributes'][0]>()
    
    // Add all attributes from both types
    const allAttrs = attrs1.concat(attrs2)
    allAttrs.forEach(attr => {
      const key = `${attr.name}:${attr.type}`
      if (!merged.has(key)) {
        merged.set(key, attr)
      } else {
        // If attribute exists in both, make it required if either is required
        const existing = merged.get(key)!
        merged.set(key, {
          ...existing,
          required: existing.required || attr.required
        })
      }
    })
    
    return Array.from(merged.values())
  }

  private generateMergedName(type1: EntityType, type2: EntityType): string {
    // Find common words in names
    const words1 = type1.name.toLowerCase().split(/\s+/)
    const words2 = type2.name.toLowerCase().split(/\s+/)
    const commonWords = words1.filter(w => words2.includes(w))
    
    if (commonWords.length > 0) {
      return commonWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    
    // Use more general term
    const generalTerms = ['Entity', 'Item', 'Object', 'Element']
    return generalTerms[0]
  }

  private generateMergedDescription(type1: EntityType, type2: EntityType, strategy: string): string {
    return `Combined type from ${type1.name} and ${type2.name} (${strategy} merge). ${type1.description} ${type2.description}`.slice(0, 200)
  }

  private shouldMerge(type1: EntityType, type2: EntityType, merged: EntityType): boolean {
    const currentQuality = (type1.confidence * type1.classifiedCount + type2.confidence * type2.classifiedCount)
    const mergedQuality = merged.confidence * merged.classifiedCount
    
    return mergedQuality >= currentQuality * 0.9 // Accept 10% quality loss for simplification
  }

  private shouldMergeMultiple(types: EntityType[], merged: EntityType): boolean {
    const currentQuality = types.reduce((sum, t) => sum + t.confidence * t.classifiedCount, 0)
    const mergedQuality = merged.confidence * merged.classifiedCount
    
    return mergedQuality >= currentQuality * 0.85 // Accept 15% quality loss for multiple merges
  }

  private calculateCurrentClassificationRate(): number {
    const totalItems = this.entityTypes.reduce((sum, t) => sum + t.classifiedCount, 0)
    return totalItems > 0 ? (totalItems / (totalItems + 100)) * 100 : 0 // Assume 100 unclassified items
  }

  private calculateAverageConfidence(): number {
    const types = [...this.entityTypes, ...this.edgeTypes]
    return types.reduce((sum, t) => sum + t.confidence, 0) / types.length
  }

  private calculateMedianClassifiedCount(types: EntityType[]): number {
    const counts = types.map(t => t.classifiedCount).sort((a, b) => a - b)
    const mid = Math.floor(counts.length / 2)
    return counts.length % 2 === 0 ? (counts[mid - 1] + counts[mid]) / 2 : counts[mid]
  }

  private generalizeType(type: EntityType): EntityType {
    // Create a more general version by reducing specific attributes
    const generalizedAttributes = type.attributes.filter(attr => !attr.required || attr.name.length < 10)
    
    return {
      ...type,
      name: `General ${type.name}`,
      description: `Generalized version of ${type.name} for broader coverage`,
      attributes: generalizedAttributes,
      confidence: type.confidence * 0.9 // Slightly lower confidence for generalization
    }
  }

  private estimateImprovement(original: EntityType, generalized: EntityType): number {
    // Estimate improvement based on attribute reduction
    const attributeReduction = (original.attributes.length - generalized.attributes.length) / original.attributes.length
    return attributeReduction * 0.3 // Up to 30% improvement with full generalization
  }

  private findBestMergeCandidate(target: EntityType, candidates: EntityType[]): EntityType | null {
    let bestCandidate: EntityType | null = null
    let bestSimilarity = 0
    
    for (const candidate of candidates) {
      const similarity = this.calculateTypeSimilarity(target, candidate)
      if (similarity > bestSimilarity && similarity > 0.3) {
        bestSimilarity = similarity
        bestCandidate = candidate
      }
    }
    
    return bestCandidate
  }

  private calculateTypeSimilarity(type1: EntityType, type2: EntityType): number {
    const attributeSim = this.calculateAttributeSimilarity(type1, type2)
    const nameSim = this.calculateNameSimilarity(type1.name, type2.name)
    const descSim = this.calculateDescriptionSimilarity(type1.description, type2.description)
    
    return (attributeSim * 0.5 + nameSim * 0.2 + descSim * 0.3)
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = new Set(name1.toLowerCase().split(/\s+/))
    const words2 = new Set(name2.toLowerCase().split(/\s+/))
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    const words1 = new Set(desc1.toLowerCase().match(/\w+/g) || [])
    const words2 = new Set(desc2.toLowerCase().match(/\w+/g) || [])
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private calculateFinalMetrics(result: OptimizationResult): OptimizationResult['qualityMetrics'] {
    const totalTypes = result.entityTypes.length + result.edgeTypes.length
    const totalClassified = result.entityTypes.reduce((sum, t) => sum + t.classifiedCount, 0)
    const averageConfidence = result.entityTypes.reduce((sum, t) => sum + t.confidence, 0) / result.entityTypes.length
    
    const originalRate = this.calculateCurrentClassificationRate()
    const newRate = totalClassified > 0 ? (totalClassified / (totalClassified + 80)) * 100 : 0 // Assume fewer unclassified after optimization
    
    return {
      totalTypes,
      estimatedClassificationRate: newRate,
      averageConfidence,
      coverageImprovement: newRate - originalRate
    }
  }
}