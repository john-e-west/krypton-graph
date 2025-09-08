// ============================================================================
// Edge Service - Business logic for EdgeDefinitions table
// ============================================================================

import { BaseAirtableService } from './base.service'
import { AirtableClient } from '../client'
import {
  EdgeDefinitionRecord,
  AirtableRecordId,
  CreateRecordData,
  UpdateRecordData,
  Cardinality
} from '../../types/airtable'

export class EdgeService extends BaseAirtableService<'EdgeDefinitions'> {
  constructor(client: AirtableClient) {
    super(client, 'EdgeDefinitions')
  }

  /**
   * Find edges by ontology
   */
  async findByOntology(ontologyId: AirtableRecordId): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${ontologyId}', ARRAYJOIN({Ontology}))`
    })
  }

  /**
   * Find edges by source entity
   */
  async findBySourceEntity(sourceEntityId: AirtableRecordId): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${sourceEntityId}', ARRAYJOIN({Source Entity}))`
    })
  }

  /**
   * Find edges by target entity
   */
  async findByTargetEntity(targetEntityId: AirtableRecordId): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${targetEntityId}', ARRAYJOIN({Target Entity}))`
    })
  }

  /**
   * Find edges between specific entities
   */
  async findBetweenEntities(
    sourceEntityId: AirtableRecordId,
    targetEntityId: AirtableRecordId
  ): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `AND(
        FIND('${sourceEntityId}', ARRAYJOIN({Source Entity})),
        FIND('${targetEntityId}', ARRAYJOIN({Target Entity}))
      )`
    })
  }

  /**
   * Find bidirectional edges
   */
  async findBidirectional(): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: '{Bidirectional} = TRUE()'
    })
  }

  /**
   * Find edges by cardinality
   */
  async findByCardinality(cardinality: Cardinality): Promise<EdgeDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `{Cardinality} = '${cardinality}'`
    })
  }

  /**
   * Search edges by name
   */
  async searchByName(searchTerm: string): Promise<EdgeDefinitionRecord[]> {
    const formula = `SEARCH(LOWER("${searchTerm.toLowerCase()}"), LOWER({Edge Name}))`
    
    return this.findAll({
      filterByFormula: formula
    })
  }

  /**
   * Create a new edge definition with validation
   */
  async createEdge(data: {
    name: string
    ontologyId: AirtableRecordId
    sourceEntityId: AirtableRecordId
    targetEntityId: AirtableRecordId
    edgeClass?: string
    propertiesJson?: string
    cardinality?: Cardinality
    bidirectional?: boolean
    description?: string
  }): Promise<EdgeDefinitionRecord> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Edge name is required')
    }

    if (!data.ontologyId) {
      throw new Error('Ontology ID is required')
    }

    if (!data.sourceEntityId) {
      throw new Error('Source entity ID is required')
    }

    if (!data.targetEntityId) {
      throw new Error('Target entity ID is required')
    }

    // Validate JSON if provided
    if (data.propertiesJson) {
      try {
        JSON.parse(data.propertiesJson)
      } catch (error) {
        throw new Error('Properties JSON is invalid')
      }
    }

    // Check for duplicate edge definitions
    const existing = await this.findAll({
      filterByFormula: `AND(
        {Edge Name} = '${data.name.replace(/'/g, "\\'")}',
        FIND('${data.ontologyId}', ARRAYJOIN({Ontology})),
        FIND('${data.sourceEntityId}', ARRAYJOIN({Source Entity})),
        FIND('${data.targetEntityId}', ARRAYJOIN({Target Entity}))
      )`
    })
    
    if (existing.length > 0) {
      throw new Error(`Edge '${data.name}' already exists between these entities`)
    }

    const recordData: CreateRecordData<'EdgeDefinitions'> = {
      fields: {
        'Edge Name': data.name,
        'Ontology': [data.ontologyId],
        'Source Entity': [data.sourceEntityId],
        'Target Entity': [data.targetEntityId],
        'Edge Class': data.edgeClass,
        'Properties JSON': data.propertiesJson,
        'Cardinality': data.cardinality,
        'Bidirectional': data.bidirectional || false,
        'Description': data.description
      }
    }

    return this.create(recordData)
  }

  /**
   * Update edge properties JSON
   */
  async updateProperties(
    id: AirtableRecordId,
    propertiesJson: string
  ): Promise<EdgeDefinitionRecord> {
    // Validate JSON
    try {
      JSON.parse(propertiesJson)
    } catch (error) {
      throw new Error('Properties JSON is invalid')
    }

    const updateData: UpdateRecordData<'EdgeDefinitions'> = {
      fields: {
        'Properties JSON': propertiesJson
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Update edge cardinality
   */
  async updateCardinality(
    id: AirtableRecordId,
    cardinality: Cardinality
  ): Promise<EdgeDefinitionRecord> {
    const updateData: UpdateRecordData<'EdgeDefinitions'> = {
      fields: {
        'Cardinality': cardinality
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Toggle bidirectional flag
   */
  async toggleBidirectional(
    id: AirtableRecordId,
    bidirectional: boolean
  ): Promise<EdgeDefinitionRecord> {
    const updateData: UpdateRecordData<'EdgeDefinitions'> = {
      fields: {
        'Bidirectional': bidirectional
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Get edge definition with parsed properties
   */
  async findByIdWithParsedProperties(id: AirtableRecordId): Promise<{
    edge: EdgeDefinitionRecord
    parsedProperties?: any
  }> {
    const edge = await this.findById(id)
    let parsedProperties = undefined

    if (edge.fields['Properties JSON']) {
      try {
        parsedProperties = JSON.parse(edge.fields['Properties JSON'])
      } catch (error) {
        console.warn(`Failed to parse properties JSON for edge ${id}:`, error)
      }
    }

    return {
      edge,
      parsedProperties
    }
  }

  /**
   * Get entity relationship graph for an ontology
   */
  async getEntityGraph(ontologyId: AirtableRecordId): Promise<{
    edges: EdgeDefinitionRecord[]
    nodes: Set<AirtableRecordId>
    adjacencyList: Record<AirtableRecordId, AirtableRecordId[]>
  }> {
    const edges = await this.findByOntology(ontologyId)
    const nodes = new Set<AirtableRecordId>()
    const adjacencyList: Record<AirtableRecordId, AirtableRecordId[]> = {}

    edges.forEach(edge => {
      const sourceEntities = edge.fields['Source Entity'] || []
      const targetEntities = edge.fields['Target Entity'] || []

      sourceEntities.forEach(sourceId => {
        nodes.add(sourceId)
        if (!adjacencyList[sourceId]) {
          adjacencyList[sourceId] = []
        }

        targetEntities.forEach(targetId => {
          nodes.add(targetId)
          adjacencyList[sourceId].push(targetId)

          // Add reverse connection for bidirectional edges
          if (edge.fields.Bidirectional) {
            if (!adjacencyList[targetId]) {
              adjacencyList[targetId] = []
            }
            adjacencyList[targetId].push(sourceId)
          }
        })
      })
    })

    return {
      edges,
      nodes,
      adjacencyList
    }
  }

  /**
   * Get statistics about edges
   */
  async getStats(ontologyId?: AirtableRecordId): Promise<{
    total: number
    byCardinality: Record<Cardinality, number>
    byClass: Record<string, number>
    bidirectionalCount: number
    withProperties: number
  }> {
    let edges: EdgeDefinitionRecord[]
    
    if (ontologyId) {
      edges = await this.findByOntology(ontologyId)
    } else {
      edges = await this.findAll()
    }

    const stats = {
      total: edges.length,
      byCardinality: {
        'one-to-one': 0,
        'one-to-many': 0,
        'many-to-many': 0
      } as Record<Cardinality, number>,
      byClass: {} as Record<string, number>,
      bidirectionalCount: 0,
      withProperties: 0
    }

    edges.forEach(edge => {
      if (edge.fields.Cardinality) {
        stats.byCardinality[edge.fields.Cardinality]++
      }

      const edgeClass = edge.fields['Edge Class'] || 'Uncategorized'
      stats.byClass[edgeClass] = (stats.byClass[edgeClass] || 0) + 1

      if (edge.fields.Bidirectional) {
        stats.bidirectionalCount++
      }

      if (edge.fields['Properties JSON']) {
        stats.withProperties++
      }
    })

    return stats
  }
}