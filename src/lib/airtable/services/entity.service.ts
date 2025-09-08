// ============================================================================
// Entity Service - Business logic for EntityDefinitions table
// ============================================================================

import { BaseAirtableService } from './base.service'
import { AirtableClient } from '../client'
import {
  EntityDefinitionRecord,
  AirtableRecordId,
  CreateRecordData,
  UpdateRecordData
} from '../../types/airtable'

export class EntityService extends BaseAirtableService<'EntityDefinitions'> {
  constructor(client: AirtableClient) {
    super(client, 'EntityDefinitions')
  }

  /**
   * Find entities by ontology
   */
  async findByOntology(ontologyId: AirtableRecordId): Promise<EntityDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${ontologyId}', ARRAYJOIN({Ontology}))`
    })
  }

  /**
   * Find entities by class
   */
  async findByClass(entityClass: string): Promise<EntityDefinitionRecord[]> {
    return this.findAll({
      filterByFormula: `{Entity Class} = '${entityClass.replace(/'/g, "\\'")}'`
    })
  }

  /**
   * Search entities by name
   */
  async searchByName(searchTerm: string): Promise<EntityDefinitionRecord[]> {
    const formula = `SEARCH(LOWER("${searchTerm.toLowerCase()}"), LOWER({Entity Name}))`
    
    return this.findAll({
      filterByFormula: formula
    })
  }

  /**
   * Get entities sorted by priority
   */
  async findSortedByPriority(ontologyId?: AirtableRecordId): Promise<EntityDefinitionRecord[]> {
    const options = {
      sort: [{ field: 'Priority', direction: 'desc' as const }]
    }

    if (ontologyId) {
      return this.findAll({
        ...options,
        filterByFormula: `FIND('${ontologyId}', ARRAYJOIN({Ontology}))`
      })
    }

    return this.findAll(options)
  }

  /**
   * Create a new entity definition with validation
   */
  async createEntity(data: {
    name: string
    ontologyId: AirtableRecordId
    entityClass?: string
    propertiesJson?: string
    validationRules?: string
    examples?: string
    priority?: number
    description?: string
  }): Promise<EntityDefinitionRecord> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Entity name is required')
    }

    if (!data.ontologyId) {
      throw new Error('Ontology ID is required')
    }

    // Validate JSON if provided
    if (data.propertiesJson) {
      try {
        JSON.parse(data.propertiesJson)
      } catch (error) {
        throw new Error('Properties JSON is invalid')
      }
    }

    // Check for duplicate names within the same ontology
    const existing = await this.findAll({
      filterByFormula: `AND(
        {Entity Name} = '${data.name.replace(/'/g, "\\'")}',
        FIND('${data.ontologyId}', ARRAYJOIN({Ontology}))
      )`
    })
    
    if (existing.length > 0) {
      throw new Error(`Entity '${data.name}' already exists in this ontology`)
    }

    const recordData: CreateRecordData<'EntityDefinitions'> = {
      fields: {
        'Entity Name': data.name,
        'Ontology': [data.ontologyId],
        'Entity Class': data.entityClass,
        'Properties JSON': data.propertiesJson,
        'Validation Rules': data.validationRules,
        'Examples': data.examples,
        'Priority': data.priority || 0,
        'Description': data.description
      }
    }

    return this.create(recordData)
  }

  /**
   * Update entity properties JSON
   */
  async updateProperties(
    id: AirtableRecordId,
    propertiesJson: string
  ): Promise<EntityDefinitionRecord> {
    // Validate JSON
    try {
      JSON.parse(propertiesJson)
    } catch (error) {
      throw new Error('Properties JSON is invalid')
    }

    const updateData: UpdateRecordData<'EntityDefinitions'> = {
      fields: {
        'Properties JSON': propertiesJson
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Update entity validation rules
   */
  async updateValidationRules(
    id: AirtableRecordId,
    validationRules: string
  ): Promise<EntityDefinitionRecord> {
    const updateData: UpdateRecordData<'EntityDefinitions'> = {
      fields: {
        'Validation Rules': validationRules
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Update entity priority
   */
  async updatePriority(
    id: AirtableRecordId,
    priority: number
  ): Promise<EntityDefinitionRecord> {
    const updateData: UpdateRecordData<'EntityDefinitions'> = {
      fields: {
        'Priority': priority
      }
    }

    return this.update(id, updateData)
  }

  /**
   * Get entity definition with parsed properties
   */
  async findByIdWithParsedProperties(id: AirtableRecordId): Promise<{
    entity: EntityDefinitionRecord
    parsedProperties?: any
  }> {
    const entity = await this.findById(id)
    let parsedProperties = undefined

    if (entity.fields['Properties JSON']) {
      try {
        parsedProperties = JSON.parse(entity.fields['Properties JSON'])
      } catch (error) {
        console.warn(`Failed to parse properties JSON for entity ${id}:`, error)
      }
    }

    return {
      entity,
      parsedProperties
    }
  }

  /**
   * Get entities grouped by class
   */
  async getGroupedByClass(ontologyId?: AirtableRecordId): Promise<Record<string, EntityDefinitionRecord[]>> {
    let entities: EntityDefinitionRecord[]
    
    if (ontologyId) {
      entities = await this.findByOntology(ontologyId)
    } else {
      entities = await this.findAll()
    }

    const grouped: Record<string, EntityDefinitionRecord[]> = {}
    
    entities.forEach(entity => {
      const entityClass = entity.fields['Entity Class'] || 'Uncategorized'
      if (!grouped[entityClass]) {
        grouped[entityClass] = []
      }
      grouped[entityClass].push(entity)
    })

    return grouped
  }

  /**
   * Get statistics about entities
   */
  async getStats(ontologyId?: AirtableRecordId): Promise<{
    total: number
    byClass: Record<string, number>
    averagePriority: number
    withProperties: number
    withValidation: number
  }> {
    let entities: EntityDefinitionRecord[]
    
    if (ontologyId) {
      entities = await this.findByOntology(ontologyId)
    } else {
      entities = await this.findAll()
    }

    const stats = {
      total: entities.length,
      byClass: {} as Record<string, number>,
      averagePriority: 0,
      withProperties: 0,
      withValidation: 0
    }

    let totalPriority = 0

    entities.forEach(entity => {
      const entityClass = entity.fields['Entity Class'] || 'Uncategorized'
      stats.byClass[entityClass] = (stats.byClass[entityClass] || 0) + 1

      if (entity.fields['Priority']) {
        totalPriority += entity.fields['Priority']
      }

      if (entity.fields['Properties JSON']) {
        stats.withProperties++
      }

      if (entity.fields['Validation Rules']) {
        stats.withValidation++
      }
    })

    stats.averagePriority = entities.length > 0 ? totalPriority / entities.length : 0

    return stats
  }
}