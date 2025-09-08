// ============================================================================
// Test Service - Business logic for TestDatasets and TestRuns tables
// ============================================================================

import { BaseAirtableService } from './base.service'
import { AirtableClient } from '../client'
import {
  TestDatasetRecord,
  TestRunRecord,
  AirtableRecordId,
  CreateRecordData,
  UpdateRecordData,
  Domain,
  ContentType,
  RunStatus
} from '../../types/airtable'

// Test Dataset Service
export class TestDatasetService extends BaseAirtableService<'TestDatasets'> {
  constructor(client: AirtableClient) {
    super(client, 'TestDatasets')
  }

  /**
   * Find test datasets by domain
   */
  async findByDomain(domain: Domain): Promise<TestDatasetRecord[]> {
    return this.findAll({
      filterByFormula: `{Domain} = '${domain}'`
    })
  }

  /**
   * Find test datasets by content type
   */
  async findByContentType(contentType: ContentType): Promise<TestDatasetRecord[]> {
    return this.findAll({
      filterByFormula: `{Content Type} = '${contentType}'`
    })
  }

  /**
   * Find datasets with attachments
   */
  async findWithAttachments(): Promise<TestDatasetRecord[]> {
    return this.findAll({
      filterByFormula: 'LEN({File Attachment}) > 0'
    })
  }

  /**
   * Create a new test dataset
   */
  async createTestDataset(data: {
    name: string
    domain?: Domain
    contentType?: ContentType
    sampleData?: string
    expectedEntitiesJson?: string
    expectedEdgesJson?: string
    description?: string
    size?: number
  }): Promise<TestDatasetRecord> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Dataset name is required')
    }

    // Validate JSON if provided
    if (data.expectedEntitiesJson) {
      try {
        JSON.parse(data.expectedEntitiesJson)
      } catch (error) {
        throw new Error('Expected entities JSON is invalid')
      }
    }

    if (data.expectedEdgesJson) {
      try {
        JSON.parse(data.expectedEdgesJson)
      } catch (error) {
        throw new Error('Expected edges JSON is invalid')
      }
    }

    const recordData: CreateRecordData<'TestDatasets'> = {
      fields: {
        'Dataset Name': data.name,
        'Domain': data.domain,
        'Content Type': data.contentType,
        'Sample Data': data.sampleData,
        'Expected Entities JSON': data.expectedEntitiesJson,
        'Expected Edges JSON': data.expectedEdgesJson,
        'Description': data.description,
        'Size': data.size
      }
    }

    return this.create(recordData)
  }
}

// Test Run Service
export class TestRunService extends BaseAirtableService<'TestRuns'> {
  constructor(client: AirtableClient) {
    super(client, 'TestRuns')
  }

  /**
   * Find test runs by ontology
   */
  async findByOntology(ontologyId: AirtableRecordId): Promise<TestRunRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${ontologyId}', ARRAYJOIN({Ontology}))`
    })
  }

  /**
   * Find test runs by dataset
   */
  async findByDataset(datasetId: AirtableRecordId): Promise<TestRunRecord[]> {
    return this.findAll({
      filterByFormula: `FIND('${datasetId}', ARRAYJOIN({Test Dataset}))`
    })
  }

  /**
   * Find test runs by status
   */
  async findByStatus(status: RunStatus): Promise<TestRunRecord[]> {
    return this.findAll({
      filterByFormula: `{Status} = '${status}'`
    })
  }

  /**
   * Find completed test runs
   */
  async findCompleted(): Promise<TestRunRecord[]> {
    return this.findByStatus('Completed')
  }

  /**
   * Find running test runs
   */
  async findRunning(): Promise<TestRunRecord[]> {
    return this.findByStatus('Running')
  }

  /**
   * Find failed test runs
   */
  async findFailed(): Promise<TestRunRecord[]> {
    return this.findByStatus('Failed')
  }

  /**
   * Get recent test runs
   */
  async findRecent(limit: number = 10): Promise<TestRunRecord[]> {
    return this.findAll({
      sort: [{ field: 'Run Date', direction: 'desc' }],
      maxRecords: limit
    })
  }

  /**
   * Create a new test run
   */
  async createTestRun(data: {
    name: string
    ontologyId: AirtableRecordId
    datasetId: AirtableRecordId
    graphId?: string
    notes?: string
  }): Promise<TestRunRecord> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Test run name is required')
    }

    if (!data.ontologyId) {
      throw new Error('Ontology ID is required')
    }

    if (!data.datasetId) {
      throw new Error('Dataset ID is required')
    }

    const recordData: CreateRecordData<'TestRuns'> = {
      fields: {
        'Run Name': data.name,
        'Ontology': [data.ontologyId],
        'Test Dataset': [data.datasetId],
        'Graph ID': data.graphId,
        'Status': 'Running', // Default to running
        'Notes': data.notes
      }
    }

    return this.create(recordData)
  }

  /**
   * Update test run results
   */
  async updateResults(
    id: AirtableRecordId,
    results: {
      entitiesExtracted?: number
      edgesExtracted?: number
      precision?: number
      recall?: number
      f1Score?: number
      impactReportJson?: string
      status?: RunStatus
      notes?: string
    }
  ): Promise<TestRunRecord> {
    // Validate JSON if provided
    if (results.impactReportJson) {
      try {
        JSON.parse(results.impactReportJson)
      } catch (error) {
        throw new Error('Impact report JSON is invalid')
      }
    }

    const updateData: UpdateRecordData<'TestRuns'> = {
      fields: {}
    }

    if (results.entitiesExtracted !== undefined) {
      updateData.fields['Entities Extracted'] = results.entitiesExtracted
    }
    if (results.edgesExtracted !== undefined) {
      updateData.fields['Edges Extracted'] = results.edgesExtracted
    }
    if (results.precision !== undefined) {
      updateData.fields['Precision'] = results.precision
    }
    if (results.recall !== undefined) {
      updateData.fields['Recall'] = results.recall
    }
    if (results.f1Score !== undefined) {
      updateData.fields['F1 Score'] = results.f1Score
    }
    if (results.impactReportJson) {
      updateData.fields['Impact Report JSON'] = results.impactReportJson
    }
    if (results.status) {
      updateData.fields['Status'] = results.status
    }
    if (results.notes) {
      updateData.fields['Notes'] = results.notes
    }

    return this.update(id, updateData)
  }

  /**
   * Complete a test run
   */
  async completeTestRun(
    id: AirtableRecordId,
    results: {
      entitiesExtracted: number
      edgesExtracted: number
      precision: number
      recall: number
      f1Score: number
      impactReportJson?: string
      notes?: string
    }
  ): Promise<TestRunRecord> {
    return this.updateResults(id, {
      ...results,
      status: 'Completed'
    })
  }

  /**
   * Mark a test run as failed
   */
  async failTestRun(id: AirtableRecordId, notes: string): Promise<TestRunRecord> {
    return this.updateResults(id, {
      status: 'Failed',
      notes
    })
  }

  /**
   * Get test run statistics
   */
  async getStats(ontologyId?: AirtableRecordId): Promise<{
    total: number
    byStatus: Record<RunStatus, number>
    averageMetrics: {
      precision: number
      recall: number
      f1Score: number
      entitiesExtracted: number
      edgesExtracted: number
    }
  }> {
    let testRuns: TestRunRecord[]
    
    if (ontologyId) {
      testRuns = await this.findByOntology(ontologyId)
    } else {
      testRuns = await this.findAll()
    }

    const stats = {
      total: testRuns.length,
      byStatus: {
        'Running': 0,
        'Completed': 0,
        'Failed': 0
      } as Record<RunStatus, number>,
      averageMetrics: {
        precision: 0,
        recall: 0,
        f1Score: 0,
        entitiesExtracted: 0,
        edgesExtracted: 0
      }
    }

    let completedRuns = 0
    const totalMetrics = {
      precision: 0,
      recall: 0,
      f1Score: 0,
      entitiesExtracted: 0,
      edgesExtracted: 0
    }

    testRuns.forEach(run => {
      if (run.fields.Status) {
        stats.byStatus[run.fields.Status]++
      }

      if (run.fields.Status === 'Completed') {
        completedRuns++
        if (run.fields.Precision) totalMetrics.precision += run.fields.Precision
        if (run.fields.Recall) totalMetrics.recall += run.fields.Recall
        if (run.fields['F1 Score']) totalMetrics.f1Score += run.fields['F1 Score']
        if (run.fields['Entities Extracted']) totalMetrics.entitiesExtracted += run.fields['Entities Extracted']
        if (run.fields['Edges Extracted']) totalMetrics.edgesExtracted += run.fields['Edges Extracted']
      }
    })

    if (completedRuns > 0) {
      stats.averageMetrics = {
        precision: totalMetrics.precision / completedRuns,
        recall: totalMetrics.recall / completedRuns,
        f1Score: totalMetrics.f1Score / completedRuns,
        entitiesExtracted: totalMetrics.entitiesExtracted / completedRuns,
        edgesExtracted: totalMetrics.edgesExtracted / completedRuns
      }
    }

    return stats
  }
}