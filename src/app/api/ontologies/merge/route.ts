import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, validateRequestBody, withRateLimit } from '@/lib/auth/middleware'

// Validation schemas
const AttributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  type: z.string().min(1, 'Attribute type is required'),
  required: z.boolean()
})

const TypeDefinitionSchema = z.object({
  id: z.string().min(1, 'Type ID is required'),
  name: z.string().min(1, 'Type name is required').max(100, 'Type name must be under 100 characters'),
  description: z.string().min(1, 'Type description is required').max(500, 'Description must be under 500 characters'),
  pattern: z.string().optional(),
  attributes: z.array(AttributeSchema).optional()
})

const EdgeTypeDefinitionSchema = z.object({
  id: z.string().min(1, 'Edge type ID is required'),
  name: z.string().min(1, 'Edge type name is required').max(100, 'Edge type name must be under 100 characters'),
  description: z.string().min(1, 'Edge type description is required').max(500, 'Description must be under 500 characters'),
  sourceTypes: z.array(z.string().min(1)).min(1, 'At least one source type is required'),
  targetTypes: z.array(z.string().min(1)).min(1, 'At least one target type is required'),
  pattern: z.string().optional()
})

const OntologyDefinitionSchema = z.object({
  entityTypes: z.array(TypeDefinitionSchema),
  edgeTypes: z.array(EdgeTypeDefinitionSchema),
  domain: z.string().optional(),
  tags: z.array(z.string().min(1)).optional()
})

const ConflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolution: z.enum(['use_first', 'use_second', 'merge', 'rename_first', 'rename_second']),
  newName: z.string().optional(),
  newDescription: z.string().optional(),
  mergedAttributes: z.array(AttributeSchema).optional()
})

const MergeOntologiesRequestSchema = z.object({
  ontologies: z.array(OntologyDefinitionSchema)
    .min(2, 'At least 2 ontologies are required for merging')
    .max(5, 'Maximum of 5 ontologies can be merged at once'),
  strategy: z.enum(['union', 'intersection', 'custom']).default('union'),
  conflictResolutions: z.array(ConflictResolutionSchema).optional(),
  mergeOptions: z.object({
    allowRename: z.boolean().default(true),
    enforceTypeLimits: z.boolean().default(true),
    preserveMetadata: z.boolean().default(true)
  }).optional()
})

interface MergeConflict {
  id: string
  type: 'entity_name_conflict' | 'edge_name_conflict' | 'type_mismatch' | 'attribute_conflict'
  description: string
  conflictingItems: Array<{
    ontologyIndex: number
    item: any
    source: string
  }>
  suggestedResolution?: string
}

interface MergedOntologyResult {
  mergedOntology: {
    entityTypes: any[]
    edgeTypes: any[]
    domain?: string
    tags?: string[]
    metadata: {
      sourceOntologies: number
      mergeStrategy: string
      conflictsResolved: number
      timestamp: string
    }
  }
  conflicts: MergeConflict[]
  warnings: string[]
  statistics: {
    totalEntityTypes: number
    totalEdgeTypes: number
    duplicatesRemoved: number
    conflictsDetected: number
  }
}

class OntologyMerger {
  /**
   * Detect conflicts between ontologies
   */
  static detectConflicts(ontologies: any[]): MergeConflict[] {
    const conflicts: MergeConflict[] = []
    
    // Check for entity type name conflicts
    const entityTypeNames = new Map<string, Array<{ ontologyIndex: number, type: any }>>()
    
    ontologies.forEach((ontology, index) => {
      ontology.entityTypes?.forEach((type: any) => {
        if (!entityTypeNames.has(type.name)) {
          entityTypeNames.set(type.name, [])
        }
        entityTypeNames.get(type.name)!.push({ ontologyIndex: index, type })
      })
    })

    entityTypeNames.forEach((instances, typeName) => {
      if (instances.length > 1) {
        // Check if they're actually different
        const first = instances[0].type
        const hasConflicts = instances.some(instance => 
          instance.type.description !== first.description ||
          JSON.stringify(instance.type.attributes || []) !== JSON.stringify(first.attributes || [])
        )
        
        if (hasConflicts) {
          conflicts.push({
            id: `entity_conflict_${typeName}`,
            type: 'entity_name_conflict',
            description: `Entity type "${typeName}" has conflicting definitions across ontologies`,
            conflictingItems: instances.map(instance => ({
              ontologyIndex: instance.ontologyIndex,
              item: instance.type,
              source: `Ontology ${instance.ontologyIndex + 1}`
            })),
            suggestedResolution: 'merge'
          })
        }
      }
    })

    // Check for edge type name conflicts
    const edgeTypeNames = new Map<string, Array<{ ontologyIndex: number, type: any }>>()
    
    ontologies.forEach((ontology, index) => {
      ontology.edgeTypes?.forEach((type: any) => {
        if (!edgeTypeNames.has(type.name)) {
          edgeTypeNames.set(type.name, [])
        }
        edgeTypeNames.get(type.name)!.push({ ontologyIndex: index, type })
      })
    })

    edgeTypeNames.forEach((instances, typeName) => {
      if (instances.length > 1) {
        const first = instances[0].type
        const hasConflicts = instances.some(instance => 
          instance.type.description !== first.description ||
          JSON.stringify(instance.type.sourceTypes) !== JSON.stringify(first.sourceTypes) ||
          JSON.stringify(instance.type.targetTypes) !== JSON.stringify(first.targetTypes)
        )
        
        if (hasConflicts) {
          conflicts.push({
            id: `edge_conflict_${typeName}`,
            type: 'edge_name_conflict',
            description: `Edge type "${typeName}" has conflicting definitions across ontologies`,
            conflictingItems: instances.map(instance => ({
              ontologyIndex: instance.ontologyIndex,
              item: instance.type,
              source: `Ontology ${instance.ontologyIndex + 1}`
            })),
            suggestedResolution: 'merge'
          })
        }
      }
    })

    return conflicts
  }

  /**
   * Merge ontologies based on strategy and conflict resolutions
   */
  static mergeOntologies(
    ontologies: any[],
    strategy: 'union' | 'intersection' | 'custom',
    conflictResolutions: any[] = []
  ): MergedOntologyResult {
    const conflicts = this.detectConflicts(ontologies)
    const warnings: string[] = []
    let duplicatesRemoved = 0

    // Create resolution map for quick lookup
    const resolutionMap = new Map(conflictResolutions.map(r => [r.conflictId, r]))

    // Merge entity types
    const mergedEntityTypes = new Map<string, any>()
    const entityTypeNames = new Set<string>()

    ontologies.forEach((ontology, ontologyIndex) => {
      ontology.entityTypes?.forEach((type: any) => {
        const conflict = conflicts.find(c => 
          c.type === 'entity_name_conflict' && 
          c.conflictingItems.some(item => item.ontologyIndex === ontologyIndex && item.item.id === type.id)
        )

        if (conflict) {
          const resolution = resolutionMap.get(conflict.id)
          if (resolution) {
            switch (resolution.resolution) {
              case 'use_first':
                if (conflict.conflictingItems[0].ontologyIndex === ontologyIndex) {
                  mergedEntityTypes.set(type.id, type)
                  entityTypeNames.add(type.name)
                }
                break
              case 'use_second':
                if (conflict.conflictingItems[1].ontologyIndex === ontologyIndex) {
                  mergedEntityTypes.set(type.id, type)
                  entityTypeNames.add(type.name)
                }
                break
              case 'merge':
                if (conflict.conflictingItems[0].ontologyIndex === ontologyIndex) {
                  // Create merged type
                  const mergedType = {
                    ...type,
                    description: resolution.newDescription || type.description,
                    attributes: resolution.mergedAttributes || type.attributes
                  }
                  mergedEntityTypes.set(type.id, mergedType)
                  entityTypeNames.add(type.name)
                }
                break
              case 'rename_first':
                if (conflict.conflictingItems[0].ontologyIndex === ontologyIndex) {
                  const renamedType = {
                    ...type,
                    name: resolution.newName || `${type.name}_1`
                  }
                  mergedEntityTypes.set(type.id, renamedType)
                  entityTypeNames.add(renamedType.name)
                }
                break
              case 'rename_second':
                if (conflict.conflictingItems[1].ontologyIndex === ontologyIndex) {
                  const renamedType = {
                    ...type,
                    name: resolution.newName || `${type.name}_2`
                  }
                  mergedEntityTypes.set(type.id, renamedType)
                  entityTypeNames.add(renamedType.name)
                }
                break
            }
          } else {
            // No resolution provided - add warning
            warnings.push(`Conflict "${conflict.id}" requires manual resolution`)
          }
        } else {
          // No conflict - add the type
          if (entityTypeNames.has(type.name)) {
            duplicatesRemoved++
          } else {
            mergedEntityTypes.set(type.id, type)
            entityTypeNames.add(type.name)
          }
        }
      })
    })

    // Merge edge types (similar logic)
    const mergedEdgeTypes = new Map<string, any>()
    const edgeTypeNames = new Set<string>()

    ontologies.forEach((ontology, ontologyIndex) => {
      ontology.edgeTypes?.forEach((type: any) => {
        const conflict = conflicts.find(c => 
          c.type === 'edge_name_conflict' && 
          c.conflictingItems.some(item => item.ontologyIndex === ontologyIndex && item.item.id === type.id)
        )

        if (conflict) {
          const resolution = resolutionMap.get(conflict.id)
          if (resolution) {
            // Apply resolution logic (similar to entity types)
            switch (resolution.resolution) {
              case 'use_first':
                if (conflict.conflictingItems[0].ontologyIndex === ontologyIndex) {
                  mergedEdgeTypes.set(type.id, type)
                  edgeTypeNames.add(type.name)
                }
                break
              // ... other resolution cases
              default:
                mergedEdgeTypes.set(type.id, type)
                edgeTypeNames.add(type.name)
            }
          }
        } else {
          if (edgeTypeNames.has(type.name)) {
            duplicatesRemoved++
          } else {
            mergedEdgeTypes.set(type.id, type)
            edgeTypeNames.add(type.name)
          }
        }
      })
    })

    // Merge metadata
    const allDomains = ontologies.map(o => o.domain).filter(Boolean)
    const allTags = ontologies.flatMap(o => o.tags || [])
    const uniqueTags = [...new Set(allTags)]

    const mergedOntology = {
      entityTypes: Array.from(mergedEntityTypes.values()),
      edgeTypes: Array.from(mergedEdgeTypes.values()),
      domain: allDomains.length > 0 ? allDomains[0] : undefined,
      tags: uniqueTags,
      metadata: {
        sourceOntologies: ontologies.length,
        mergeStrategy: strategy,
        conflictsResolved: conflictResolutions.length,
        timestamp: new Date().toISOString()
      }
    }

    // Check Zep v3 constraints
    if (mergedOntology.entityTypes.length > 10) {
      warnings.push(`Merged ontology has ${mergedOntology.entityTypes.length} entity types, exceeding Zep v3 limit of 10`)
    }
    if (mergedOntology.edgeTypes.length > 10) {
      warnings.push(`Merged ontology has ${mergedOntology.edgeTypes.length} edge types, exceeding Zep v3 limit of 10`)
    }

    return {
      mergedOntology,
      conflicts,
      warnings,
      statistics: {
        totalEntityTypes: mergedOntology.entityTypes.length,
        totalEdgeTypes: mergedOntology.edgeTypes.length,
        duplicatesRemoved,
        conflictsDetected: conflicts.length
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication
    const authResult = await withAuth()
    if (authResult.error) {
      return authResult.error
    }
    const { user } = authResult

    // Step 2: Rate limiting
    const rateLimitError = withRateLimit(`ontology-merge:${user.userId}`, 5, 60000) // 5 per minute
    if (rateLimitError) {
      return rateLimitError
    }

    // Step 3: Request body validation
    const validationResult = await validateRequestBody(request, MergeOntologiesRequestSchema)
    if (validationResult.error) {
      return validationResult.error
    }
    const { ontologies, strategy, conflictResolutions, mergeOptions } = validationResult.data

    // Step 4: Detect conflicts if no resolutions provided
    if (!conflictResolutions || conflictResolutions.length === 0) {
      const conflicts = OntologyMerger.detectConflicts(ontologies)
      
      if (conflicts.length > 0) {
        return NextResponse.json({
          step: 'conflict_detection',
          message: 'Conflicts detected that require manual resolution',
          conflicts,
          totalConflicts: conflicts.length,
          nextAction: 'Provide conflict resolutions and retry the merge'
        }, { status: 409 })
      }
    }

    // Step 5: Perform the merge
    const mergeResult = OntologyMerger.mergeOntologies(ontologies, strategy, conflictResolutions)

    // Step 6: Apply type limits if enforced
    if (mergeOptions?.enforceTypeLimits) {
      if (mergeResult.mergedOntology.entityTypes.length > 10) {
        return NextResponse.json({
          error: 'Merged ontology exceeds Zep v3 entity type limit',
          details: `Merge would result in ${mergeResult.mergedOntology.entityTypes.length} entity types (max: 10)`,
          suggestion: 'Reduce the number of ontologies being merged or resolve conflicts to eliminate duplicates'
        }, { status: 400 })
      }

      if (mergeResult.mergedOntology.edgeTypes.length > 10) {
        return NextResponse.json({
          error: 'Merged ontology exceeds Zep v3 edge type limit',
          details: `Merge would result in ${mergeResult.mergedOntology.edgeTypes.length} edge types (max: 10)`,
          suggestion: 'Reduce the number of ontologies being merged or resolve conflicts to eliminate duplicates'
        }, { status: 400 })
      }
    }

    const response = {
      success: true,
      mergedOntology: mergeResult.mergedOntology,
      statistics: mergeResult.statistics,
      warnings: mergeResult.warnings,
      remainingConflicts: mergeResult.conflicts.filter(c => 
        !conflictResolutions?.some(r => r.conflictId === c.id)
      ),
      mergeMetadata: {
        strategy,
        userId: user.userId,
        timestamp: new Date().toISOString(),
        sourceCount: ontologies.length,
        totalConflictsResolved: conflictResolutions?.length || 0
      }
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Ontology merge API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to merge ontologies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed. Use POST to merge ontologies.',
      info: {
        endpoint: '/api/ontologies/merge',
        method: 'POST',
        description: 'Merge multiple ontologies with conflict resolution',
        requiredFields: ['ontologies'],
        optionalFields: ['strategy', 'conflictResolutions', 'mergeOptions']
      }
    },
    { status: 405 }
  )
}