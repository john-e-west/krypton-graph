// ============================================================================
// Base Service Class for Airtable Operations
// Provides common CRUD operations with type safety
// ============================================================================

import { AirtableClient } from '../client'
import {
  TableName,
  TableRecordMap,
  AirtableRecordId,
  CreateRecordData,
  UpdateRecordData,
  AirtableListResponse
} from '../../types/airtable'

export abstract class BaseAirtableService<T extends TableName> {
  protected client: AirtableClient
  protected tableName: T

  constructor(client: AirtableClient, tableName: T) {
    this.client = client
    this.tableName = tableName
  }

  /**
   * Get all records from the table
   */
  async findAll(options: {
    filterByFormula?: string
    maxRecords?: number
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
    view?: string
  } = {}): Promise<TableRecordMap[T][]> {
    const response = await this.client.listRecords(this.tableName, options)
    return response.records
  }

  /**
   * Get a single record by ID
   */
  async findById(id: AirtableRecordId): Promise<TableRecordMap[T]> {
    return this.client.getRecord(this.tableName, id)
  }

  /**
   * Create a new record
   */
  async create(data: CreateRecordData<T>): Promise<TableRecordMap[T]> {
    return this.client.createRecord(this.tableName, data)
  }

  /**
   * Update an existing record
   */
  async update(
    id: AirtableRecordId,
    data: UpdateRecordData<T>
  ): Promise<TableRecordMap[T]> {
    return this.client.updateRecord(this.tableName, id, data)
  }

  /**
   * Delete a record
   */
  async delete(id: AirtableRecordId): Promise<{ deleted: boolean; id: AirtableRecordId }> {
    return this.client.deleteRecord(this.tableName, id)
  }

  /**
   * Create multiple records in batch
   */
  async batchCreate(
    records: CreateRecordData<T>[]
  ): Promise<TableRecordMap[T][]> {
    const response = await this.client.batchCreate(this.tableName, records)
    return response.records
  }

  /**
   * Search records by text
   */
  async search(
    searchTerm: string,
    options: {
      fieldIds?: string[]
      maxRecords?: number
    } = {}
  ): Promise<TableRecordMap[T][]> {
    const response = await this.client.searchRecords(this.tableName, searchTerm, options)
    return response.records
  }

  /**
   * Count records (using maxRecords=1 and returning totalRecords if available)
   */
  async count(filterByFormula?: string): Promise<number> {
    const response = await this.client.listRecords(this.tableName, {
      maxRecords: 1,
      filterByFormula
    })
    // Note: Airtable doesn't return total count in API response
    // This would require fetching all records to get accurate count
    console.warn('count() returns limited data - consider implementing pagination for large datasets')
    return response.records.length
  }

  /**
   * Check if a record exists
   */
  async exists(id: AirtableRecordId): Promise<boolean> {
    try {
      await this.findById(id)
      return true
    } catch (error) {
      if (error instanceof Error && error.message?.includes('404')) {
        return false
      }
      throw error
    }
  }

  /**
   * Get paginated results
   */
  async paginate(
    options: {
      filterByFormula?: string
      maxRecords?: number
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
      view?: string
      offset?: string
    } = {}
  ): Promise<{
    records: TableRecordMap[T][]
    offset?: string
    hasMore: boolean
  }> {
    const response = await this.client.listRecords(this.tableName, options)
    return {
      records: response.records,
      offset: response.offset,
      hasMore: !!response.offset
    }
  }

  /**
   * Get table name for debugging/logging
   */
  getTableName(): T {
    return this.tableName
  }

  /**
   * Get client instance (for advanced operations)
   */
  getClient(): AirtableClient {
    return this.client
  }
}