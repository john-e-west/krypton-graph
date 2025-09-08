import { v4 as uuidv4 } from 'uuid'
import {
  DocumentRecord,
  DocumentChunkRecord,
  EpisodeRecord,
  AuditLogRecord,
  EpisodeType,
  EpisodeStatus,
  AuditOperation,
  TableName,
  AirtableRecordId,
} from '../../types/airtable'
import { AirtableClient } from '../client'

export interface DocumentData {
  name: string
  type: 'pdf' | 'txt' | 'md' | 'docx'
  originalPath: string
  markdownContent?: string
  fileSize: number
  pageCount?: number
  wordCount: number
  chunks: ChunkData[]
}

export interface ChunkData {
  content: string
  chunkIndex: number
  startPosition: number
  endPosition: number
  wordCount: number
  characterCount: number
  overlapPrevious?: number
  overlapNext?: number
  headings: string[]
  hasEntities?: boolean
}

export interface StagingResult {
  success: boolean
  episodeId: string
  documentId?: string
  chunkIds?: string[]
  error?: Error
}

export interface VerificationReport {
  documentId: string
  timestamp: Date
  checks: VerificationCheck[]
  passed: boolean
}

export interface VerificationCheck {
  name: string
  passed: boolean
  expected?: any
  actual?: any
  error?: string
}

interface IntegrityRule {
  table: TableName
  required: boolean
}

const INTEGRITY_RULES: Record<string, Record<string, IntegrityRule>> = {
  DocumentChunks: {
    Document: { table: 'Documents', required: true },
  },
}

export class AirtableStagingService {
  private client: AirtableClient
  private episodeId: string | null = null
  private stagedRecords: Map<TableName, AirtableRecordId[]> = new Map()

  constructor(client: AirtableClient) {
    this.client = client
  }

  async stageDocument(
    documentData: DocumentData,
    _userId?: string
  ): Promise<StagingResult> {
    try {
      // Start episode
      this.episodeId = await this.createEpisode('document_import')

      // Create document record
      const docRecord = await this.createDocumentRecord(documentData, _userId)
      this.trackRecord('Documents', docRecord.id)
      await this.auditLog('CREATE', 'Documents', docRecord.id, undefined, docRecord.fields)

      // Stage all chunks
      const chunkIds: string[] = []
      for (const chunk of documentData.chunks) {
        const chunkRecord = await this.createChunkRecord(chunk, docRecord.id)
        chunkIds.push(chunkRecord.id)
        this.trackRecord('DocumentChunks', chunkRecord.id)
        await this.auditLog('CREATE', 'DocumentChunks', chunkRecord.id, undefined, chunkRecord.fields)
      }

      // Update document with chunk count
      await this.updateDocumentRecord(docRecord.id, {
        'Chunk Count': documentData.chunks.length,
        Status: 'staged',
      })
      await this.auditLog('UPDATE', 'Documents', docRecord.id, 
        { 'Chunk Count': 0, Status: 'processing' },
        { 'Chunk Count': documentData.chunks.length, Status: 'staged' }
      )

      // Verify staging
      const verification = await this.verifyStaging(docRecord.id, documentData.chunks.length)
      
      if (!verification.passed) {
        throw new Error(`Staging verification failed: ${JSON.stringify(verification.checks.filter(c => !c.passed))}`)
      }

      // Complete episode
      await this.completeEpisode({
        documentsProcessed: 1,
        chunksCreated: chunkIds.length,
      })

      return {
        success: true,
        episodeId: this.episodeId,
        documentId: docRecord.id,
        chunkIds,
      }
    } catch (error) {
      await this.rollback()
      await this.failEpisode(error as Error)
      return {
        success: false,
        episodeId: this.episodeId || '',
        error: error as Error,
      }
    }
  }

  private async createEpisode(type: EpisodeType): Promise<string> {
    const episodeId = uuidv4()
    const episode: Partial<EpisodeRecord['fields']> = {
      'Episode ID': episodeId,
      Type: type,
      Status: 'started',
      'Started At': new Date().toISOString(),
      'Documents Processed': 0,
      'Chunks Created': 0,
    }

    await this.client.createRecord('Episodes', { fields: episode })
    this.episodeId = episodeId
    return episodeId
  }

  // Note: Episode update functionality removed - will be re-added when needed

  private async completeEpisode(stats: {
    documentsProcessed: number
    chunksCreated: number
    entitiesExtracted?: number
    edgesCreated?: number
  }): Promise<void> {
    if (!this.episodeId) return

    const episodes = await this.client.listRecords<'Episodes'>('Episodes', {
      filterByFormula: `{Episode ID} = '${this.episodeId}'`,
      maxRecords: 1,
    })

    if (episodes.records.length > 0) {
      await this.client.updateRecord('Episodes', episodes.records[0].id, {
        fields: {
          Status: 'completed' as EpisodeStatus,
          'Completed At': new Date().toISOString(),
          'Documents Processed': stats.documentsProcessed,
          'Chunks Created': stats.chunksCreated,
          'Entities Extracted': stats.entitiesExtracted,
          'Edges Created': stats.edgesCreated,
        },
      })
    }
  }

  private async failEpisode(error: Error): Promise<void> {
    if (!this.episodeId) return

    const episodes = await this.client.listRecords<'Episodes'>('Episodes', {
      filterByFormula: `{Episode ID} = '${this.episodeId}'`,
      maxRecords: 1,
    })

    if (episodes.records.length > 0) {
      await this.client.updateRecord('Episodes', episodes.records[0].id, {
        fields: {
          Status: 'failed' as EpisodeStatus,
          'Completed At': new Date().toISOString(),
          'Error Log': JSON.stringify({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    }
  }

  private async createDocumentRecord(
    documentData: DocumentData,
    _userId?: string
  ): Promise<DocumentRecord> {
    const fields: Partial<DocumentRecord['fields']> = {
      Name: documentData.name,
      Type: documentData.type,
      'Original Path': documentData.originalPath,
      'Markdown Content': documentData.markdownContent,
      Status: 'processing',
      'Episode ID': this.episodeId || undefined,
      'Uploaded At': new Date().toISOString(),
      'File Size': documentData.fileSize,
      'Page Count': documentData.pageCount,
      'Word Count': documentData.wordCount,
    }

    // Note: Uploaded By would need to be set with actual collaborator ID
    // For now we'll leave it unset
    
    return await this.client.createRecord<'Documents'>('Documents', { fields })
  }

  private async updateDocumentRecord(
    documentId: string,
    updates: Partial<DocumentRecord['fields']>
  ): Promise<void> {
    await this.client.updateRecord('Documents', documentId, { fields: updates })
  }

  private async createChunkRecord(
    chunk: ChunkData,
    documentId: string
  ): Promise<DocumentChunkRecord> {
    const chunkId = uuidv4()
    const fields: Partial<DocumentChunkRecord['fields']> = {
      'Chunk ID': chunkId,
      Document: [documentId],
      Content: chunk.content,
      'Chunk Index': chunk.chunkIndex,
      'Start Position': chunk.startPosition,
      'End Position': chunk.endPosition,
      'Episode ID': this.episodeId || undefined,
      'Word Count': chunk.wordCount,
      'Character Count': chunk.characterCount,
      'Overlap Previous': chunk.overlapPrevious,
      'Overlap Next': chunk.overlapNext,
      Headings: chunk.headings.join('\n'),
      'Has Entities': chunk.hasEntities,
      'Created At': new Date().toISOString(),
    }

    return await this.client.createRecord<'DocumentChunks'>('DocumentChunks', { fields })
  }

  private trackRecord(table: TableName, recordId: AirtableRecordId): void {
    if (!this.stagedRecords.has(table)) {
      this.stagedRecords.set(table, [])
    }
    const records = this.stagedRecords.get(table)
    if (records) {
      records.push(recordId)
    }
  }

  private async rollback(): Promise<void> {
    if (!this.episodeId) return

    const rollbackData = {
      recordsDeleted: [] as string[],
      tablesAffected: [] as string[],
    }

    // Delete records in reverse order
    const tables = Array.from(this.stagedRecords.keys()).reverse()
    for (const table of tables) {
      const recordIds = this.stagedRecords.get(table) || []
      if (recordIds.length > 0) {
        rollbackData.tablesAffected.push(table)
        rollbackData.recordsDeleted.push(...recordIds)
        
        // Delete records in batches of 10 (Airtable limit)
        for (let i = 0; i < recordIds.length; i += 10) {
          const batch = recordIds.slice(i, i + 10)
          // Delete records one by one since deleteRecords might not exist
          for (const recordId of batch) {
            await this.client.deleteRecord(table, recordId)
          }
        }
      }
    }

    // Update episode with rollback data
    const episodes = await this.client.listRecords<'Episodes'>('Episodes', {
      filterByFormula: `{Episode ID} = '${this.episodeId}'`,
      maxRecords: 1,
    })

    if (episodes.records.length > 0) {
      await this.client.updateRecord('Episodes', episodes.records[0].id, {
        fields: {
          Status: 'rolled_back' as EpisodeStatus,
          'Rollback Data': JSON.stringify(rollbackData),
        },
      })
    }

    // Clear tracked records
    this.stagedRecords.clear()
  }

  private async auditLog(
    operation: AuditOperation,
    table: string,
    recordId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ): Promise<void> {
    const logId = uuidv4()
    const fields: Partial<AuditLogRecord['fields']> = {
      'Log ID': logId,
      Timestamp: new Date().toISOString(),
      'Episode ID': this.episodeId || undefined,
      Operation: operation,
      Table: table,
      'Record ID': recordId,
    }

    if (operation === 'UPDATE' && before && after) {
      const changes: Array<Record<string, unknown>> = []
      for (const key in after) {
        if (before[key] !== after[key]) {
          changes.push({
            field: key,
            before: before[key],
            after: after[key],
          })
        }
      }
      fields.Changes = JSON.stringify(changes)
    } else if (operation === 'CREATE' && after) {
      fields.Changes = JSON.stringify(after)
    }

    await this.client.createRecord<'AuditLogs'>('AuditLogs', { fields })
  }

  private async verifyStaging(
    documentId: string,
    expectedChunkCount: number
  ): Promise<VerificationReport> {
    const report: VerificationReport = {
      documentId,
      timestamp: new Date(),
      checks: [],
      passed: true,
    }

    // Check 1: Document exists
    let doc: DocumentRecord | null = null
    try {
      const docs = await this.client.listRecords<'Documents'>('Documents', {
        filterByFormula: `RECORD_ID() = '${documentId}'`,
        maxRecords: 1,
      })
      doc = docs.records[0] || null
      report.checks.push({
        name: 'Document exists',
        passed: !!doc,
      })
    } catch (error) {
      report.checks.push({
        name: 'Document exists',
        passed: false,
        error: (error as Error).message,
      })
    }

    // Check 2: Chunk count matches
    if (doc) {
      try {
        const chunks = await this.client.listRecords<'DocumentChunks'>('DocumentChunks', {
          filterByFormula: `FIND('${documentId}', ARRAYJOIN({Document})) > 0`,
        })
        
        report.checks.push({
          name: 'Chunk count matches',
          expected: expectedChunkCount,
          actual: chunks.records.length,
          passed: chunks.records.length === expectedChunkCount,
        })

        // Check 3: Chunk sequence integrity
        const sortedChunks = chunks.records.sort(
          (a, b) => (a.fields['Chunk Index'] || 0) - (b.fields['Chunk Index'] || 0)
        )
        const sequenceValid = sortedChunks.every(
          (chunk, index) => chunk.fields['Chunk Index'] === index
        )
        
        report.checks.push({
          name: 'Chunk sequence valid',
          passed: sequenceValid,
        })

        // Check 4: All chunks have content
        const allHaveContent = chunks.records.every(
          (chunk) => chunk.fields.Content && chunk.fields.Content.length > 0
        )
        
        report.checks.push({
          name: 'All chunks have content',
          passed: allHaveContent,
        })
      } catch (error) {
        report.checks.push({
          name: 'Chunk verification',
          passed: false,
          error: (error as Error).message,
        })
      }
    }

    // Check 5: Episode exists and is valid
    if (this.episodeId) {
      try {
        const episodes = await this.client.listRecords<'Episodes'>('Episodes', {
          filterByFormula: `{Episode ID} = '${this.episodeId}'`,
          maxRecords: 1,
        })
        
        report.checks.push({
          name: 'Episode exists',
          passed: episodes.records.length > 0,
        })
      } catch (error) {
        report.checks.push({
          name: 'Episode exists',
          passed: false,
          error: (error as Error).message,
        })
      }
    }

    report.passed = report.checks.every((c) => c.passed)
    return report
  }

  async validateReferentialIntegrity(
    table: TableName,
    record: Record<string, unknown>
  ): Promise<boolean> {
    const rules = INTEGRITY_RULES[table]
    if (!rules) return true

    for (const [field, rule] of Object.entries(rules)) {
      if (record[field]) {
        const recordIds = Array.isArray(record[field]) ? record[field] : [record[field]]
        
        for (const recordId of recordIds) {
          try {
            const exists = await this.checkRecordExists(rule.table, recordId)
            if (!exists && rule.required) {
              throw new Error(`Invalid reference: ${field} -> ${recordId}`)
            }
          } catch (error) {
            if (rule.required) {
              throw error
            }
          }
        }
      } else if (rule.required) {
        throw new Error(`Required field ${field} is missing`)
      }
    }
    
    return true
  }

  private async checkRecordExists(table: TableName, recordId: string): Promise<boolean> {
    try {
      const records = await this.client.listRecords(table, {
        filterByFormula: `RECORD_ID() = '${recordId}'`,
        maxRecords: 1,
      })
      return records.records.length > 0
    } catch {
      return false
    }
  }
}