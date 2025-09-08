// ============================================================================
// Ontology Service - Business logic for Ontologies table
// ============================================================================

import { BaseAirtableService } from './base.service'
import { AirtableClient } from '../client'
import {
  OntologyRecord,
  Domain,
  OntologyStatus,
  AirtableRecordId,
  CreateRecordData,
  UpdateRecordData
} from '../../types/airtable'

export class OntologyService extends BaseAirtableService<'Ontologies'> {
  constructor(client: AirtableClient) {
    super(client, 'Ontologies')
  }

  /**
   * Find ontologies by domain
   */
  async findByDomain(domain: Domain): Promise<OntologyRecord[]> {
    return this.findAll({
      filterByFormula: `{Domain} = '${domain}'`
    })
  }

  /**
   * Find ontologies by status
   */
  async findByStatus(status: OntologyStatus): Promise<OntologyRecord[]> {
    return this.findAll({
      filterByFormula: `{Status} = '${status}'`
    })
  }

  /**
   * Get published ontologies only
   */
  async findPublished(): Promise<OntologyRecord[]> {
    return this.findByStatus('Published')
  }

  /**
   * Get draft ontologies only
   */
  async findDrafts(): Promise<OntologyRecord[]> {
    return this.findByStatus('Draft')
  }

  /**
   * Search ontologies by name or description
   */
  async searchByNameOrDescription(searchTerm: string): Promise<OntologyRecord[]> {
    const formula = `OR(
      SEARCH(LOWER("${searchTerm.toLowerCase()}"), LOWER({Name})),
      SEARCH(LOWER("${searchTerm.toLowerCase()}"), LOWER({Description}))
    )`
    
    return this.findAll({
      filterByFormula: formula
    })
  }

  /**
   * Create a new ontology with validation
   */
  async createOntology(data: {
    name: string
    description?: string
    domain?: Domain
    version?: string
    notes?: string
  }): Promise<OntologyRecord> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Ontology name is required')
    }

    // Check for duplicate names
    const existing = await this.findAll({
      filterByFormula: `{Name} = '${data.name.replace(/'/g, "\\'")}'`
    })
    
    if (existing.length > 0) {
      throw new Error(`Ontology with name '${data.name}' already exists`)
    }

    const recordData: CreateRecordData<'Ontologies'> = {
      fields: {
        Name: data.name,
        Description: data.description,
        Domain: data.domain,
        Version: data.version || '1.0.0',
        Status: 'Draft', // Default to draft
        Notes: data.notes
      }
    }

    return this.create(recordData)
  }

  /**
   * Update ontology status with validation
   */
  async updateStatus(
    id: AirtableRecordId,
    status: OntologyStatus,
    notes?: string
  ): Promise<OntologyRecord> {
    const updateData: UpdateRecordData<'Ontologies'> = {
      fields: {
        Status: status
      }
    }

    if (notes) {
      updateData.fields.Notes = notes
    }

    return this.update(id, updateData)
  }

  /**
   * Publish an ontology (change status to Published)
   */
  async publish(id: AirtableRecordId, notes?: string): Promise<OntologyRecord> {
    return this.updateStatus(id, 'Published', notes)
  }

  /**
   * Deprecate an ontology
   */
  async deprecate(id: AirtableRecordId, notes?: string): Promise<OntologyRecord> {
    return this.updateStatus(id, 'Deprecated', notes)
  }

  /**
   * Get ontology with all related records
   */
  async findWithRelatedRecords(id: AirtableRecordId): Promise<{
    ontology: OntologyRecord
    entityDefinitionsCount: number
    edgeDefinitionsCount: number
    testRunsCount: number
  }> {
    const ontology = await this.findById(id)
    
    return {
      ontology,
      entityDefinitionsCount: ontology.fields.EntityDefinitions?.length || 0,
      edgeDefinitionsCount: ontology.fields.EdgeDefinitions?.length || 0,
      testRunsCount: ontology.fields.TestRuns?.length || 0
    }
  }

  /**
   * Get statistics about ontologies
   */
  async getStats(): Promise<{
    total: number
    byStatus: Record<OntologyStatus, number>
    byDomain: Record<Domain, number>
  }> {
    const allRecords = await this.findAll()
    
    const stats = {
      total: allRecords.length,
      byStatus: {
        'Draft': 0,
        'Testing': 0,
        'Published': 0,
        'Deprecated': 0
      } as Record<OntologyStatus, number>,
      byDomain: {
        'Healthcare': 0,
        'Finance': 0,
        'Legal': 0,
        'Technology': 0,
        'Education': 0,
        'Manufacturing': 0
      } as Record<Domain, number>
    }

    allRecords.forEach(record => {
      if (record.fields.Status) {
        stats.byStatus[record.fields.Status]++
      }
      if (record.fields.Domain) {
        stats.byDomain[record.fields.Domain]++
      }
    })

    return stats
  }
}