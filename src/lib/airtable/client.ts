// ============================================================================
// Enhanced Airtable Client with MCP Integration
// Supports rate limiting, retry logic, and comprehensive error handling
// ============================================================================

import { RateLimiter } from './rateLimiter'
import {
  AirtableListResponse,
  AirtableApiError,
  RateLimitError,
  ValidationError,
  TableName,
  TableRecordMap,
  CreateRecordData,
  UpdateRecordData,
  AirtableRecordId
} from '../types/airtable'

// Environment configuration
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID
const AIRTABLE_RATE_LIMIT = parseInt(import.meta.env.VITE_AIRTABLE_RATE_LIMIT || '5', 10)

export class AirtableClient {
  private apiKey: string
  private baseId: string
  private baseUrl = 'https://api.airtable.com/v0'
  private rateLimiter: RateLimiter
  private isConfigured: boolean

  constructor() {
    this.apiKey = AIRTABLE_API_KEY || ''
    this.baseId = AIRTABLE_BASE_ID || 'appvLsaMZqtLc9EIX' // Default to known base ID
    this.isConfigured = !!(this.apiKey && this.baseId)
    
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: AIRTABLE_RATE_LIMIT,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      apiKey: this.apiKey
    })

    if (!this.isConfigured) {
      console.warn('Airtable client not fully configured. Check environment variables.')
    }
  }

  /**
   * Check if client is properly configured
   */
  isReady(): boolean {
    return this.isConfigured
  }

  /**
   * Get configuration status
   */
  getConfig() {
    return {
      hasApiKey: !!this.apiKey,
      hasBaseId: !!this.baseId,
      baseId: this.baseId,
      rateLimitStats: this.rateLimiter.getStats()
    }
  }

  /**
   * Fetch all records from a table with optional filtering
   */
  async listRecords<T extends TableName>(
    tableName: T,
    options: {
      filterByFormula?: string
      maxRecords?: number
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
      view?: string
      offset?: string
    } = {}
  ): Promise<AirtableListResponse<TableRecordMap[T]>> {
    this.ensureConfigured()

    const params = new URLSearchParams()
    
    if (options.filterByFormula) {
      params.append('filterByFormula', options.filterByFormula)
    }
    if (options.maxRecords) {
      params.append('maxRecords', options.maxRecords.toString())
    }
    if (options.view) {
      params.append('view', options.view)
    }
    if (options.offset) {
      params.append('offset', options.offset)
    }
    if (options.sort) {
      options.sort.forEach((sortItem, index) => {
        params.append(`sort[${index}][field]`, sortItem.field)
        params.append(`sort[${index}][direction]`, sortItem.direction)
      })
    }

    const url = `${this.baseUrl}/${this.baseId}/${tableName}${
      params.toString() ? `?${params.toString()}` : ''
    }`

    try {
      return await this.rateLimiter.execute('GET', url)
    } catch (error) {
      throw this.handleError(error as Error, 'listRecords', { tableName, options })
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord<T extends TableName>(
    tableName: T,
    recordId: AirtableRecordId
  ): Promise<TableRecordMap[T]> {
    this.ensureConfigured()

    const url = `${this.baseUrl}/${this.baseId}/${tableName}/${recordId}`

    try {
      return await this.rateLimiter.execute('GET', url)
    } catch (error) {
      throw this.handleError(error as Error, 'getRecord', { tableName, recordId })
    }
  }

  /**
   * Create a new record
   */
  async createRecord<T extends TableName>(
    tableName: T,
    data: CreateRecordData<T>
  ): Promise<TableRecordMap[T]> {
    this.ensureConfigured()

    const url = `${this.baseUrl}/${this.baseId}/${tableName}`

    try {
      return await this.rateLimiter.execute('POST', url, data)
    } catch (error) {
      throw this.handleError(error as Error, 'createRecord', { tableName, data })
    }
  }

  /**
   * Update an existing record
   */
  async updateRecord<T extends TableName>(
    tableName: T,
    recordId: AirtableRecordId,
    data: UpdateRecordData<T>
  ): Promise<TableRecordMap[T]> {
    this.ensureConfigured()

    const url = `${this.baseUrl}/${this.baseId}/${tableName}/${recordId}`

    try {
      return await this.rateLimiter.execute('PATCH', url, data)
    } catch (error) {
      throw this.handleError(error as Error, 'updateRecord', { tableName, recordId, data })
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord<T extends TableName>(
    tableName: T,
    recordId: AirtableRecordId
  ): Promise<{ deleted: boolean; id: AirtableRecordId }> {
    this.ensureConfigured()

    const url = `${this.baseUrl}/${this.baseId}/${tableName}/${recordId}`

    try {
      return await this.rateLimiter.execute('DELETE', url)
    } catch (error) {
      throw this.handleError(error as Error, 'deleteRecord', { tableName, recordId })
    }
  }

  /**
   * Batch create multiple records
   */
  async batchCreate<T extends TableName>(
    tableName: T,
    records: CreateRecordData<T>[]
  ): Promise<AirtableListResponse<TableRecordMap[T]>> {
    this.ensureConfigured()

    // Airtable limits batch operations to 10 records
    if (records.length > 10) {
      throw new ValidationError('Batch operations are limited to 10 records at a time')
    }

    const url = `${this.baseUrl}/${this.baseId}/${tableName}`
    const data = { records }

    try {
      return await this.rateLimiter.execute('POST', url, data)
    } catch (error) {
      throw this.handleError(error as Error, 'batchCreate', { tableName, records })
    }
  }

  /**
   * Search records by text (if supported by table)
   */
  async searchRecords<T extends TableName>(
    tableName: T,
    searchTerm: string,
    options: {
      fieldIds?: string[]
      maxRecords?: number
    } = {}
  ): Promise<AirtableListResponse<TableRecordMap[T]>> {
    // Fallback to filter formula for basic text search
    const filterByFormula = `SEARCH(LOWER("${searchTerm.toLowerCase()}"), LOWER(CONCATENATE(values)))`
    
    return this.listRecords(tableName, {
      filterByFormula,
      maxRecords: options.maxRecords || 100
    })
  }

  /**
   * Legacy method for backwards compatibility
   */
  async fetchRecords(tableName: string) {
    console.warn('fetchRecords is deprecated, use listRecords instead')
    return this.listRecords(tableName as TableName)
  }

  /**
   * Ensure client is properly configured before making requests
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new AirtableApiError(
        'Airtable client not configured. Please set VITE_AIRTABLE_API_KEY and VITE_AIRTABLE_BASE_ID environment variables.',
        0,
        'NOT_CONFIGURED'
      )
    }
  }

  /**
   * Handle and transform errors into appropriate error types
   */
  private handleError(error: Error, operation: string, context: any): Error {
    console.error(`Airtable ${operation} error:`, error, context)

    if (error instanceof AirtableApiError) {
      return error
    }

    if (error.message.includes('429')) {
      return new RateLimitError('Rate limit exceeded')
    }

    if (error.message.includes('400')) {
      return new ValidationError(`Invalid request: ${error.message}`)
    }

    if (error.message.includes('401')) {
      return new AirtableApiError('Unauthorized: Check API key', 401, 'UNAUTHORIZED')
    }

    if (error.message.includes('403')) {
      return new AirtableApiError('Forbidden: Check permissions', 403, 'FORBIDDEN')
    }

    if (error.message.includes('404')) {
      return new AirtableApiError('Not found: Check base/table/record IDs', 404, 'NOT_FOUND')
    }

    // Default to generic API error
    return new AirtableApiError(
      `Airtable API error in ${operation}: ${error.message}`,
      0,
      'UNKNOWN_ERROR',
      { originalError: error, context }
    )
  }
}

// Singleton instance
export const airtableClient = new AirtableClient()