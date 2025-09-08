// ============================================================================
// Airtable Schema Types - Generated from Krypton-Graph Base
// Base ID: appvLsaMZqtLc9EIX
// ============================================================================

// Common types
export type AirtableRecordId = string
export type AirtableDateTime = string // ISO 8601 format
export type AirtableCollaborator = {
  id: string
  email: string
  name?: string
}

// Status enums
export type OntologyStatus = 'Draft' | 'Testing' | 'Published' | 'Deprecated'
export type Domain = 'Healthcare' | 'Finance' | 'Legal' | 'Technology' | 'Education' | 'Manufacturing'
export type ContentType = 'text' | 'json' | 'messages'
export type TargetType = 'graph_id' | 'user_id' | 'project'
export type OverrideLevel = 'Required' | 'Default' | 'Optional'
export type RunStatus = 'Running' | 'Completed' | 'Failed'
export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-many'
export type FactRatingConfigStatus = 'Draft' | 'Testing' | 'Active' | 'Deprecated'

// Document related types
export type DocumentType = 'pdf' | 'txt' | 'md' | 'docx'
export type DocumentStatus = 'uploaded' | 'processing' | 'chunked' | 'staged' | 'completed' | 'failed'
export type EpisodeType = 'document_import' | 'ontology_update' | 'graph_generation'
export type EpisodeStatus = 'started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
export type AuditOperation = 'CREATE' | 'UPDATE' | 'DELETE'

// ============================================================================
// 1. Ontologies Table (tblupVP410vrQERwa)
// ============================================================================
export interface OntologyRecord {
  id: AirtableRecordId
  fields: {
    Name: string
    Description?: string
    Domain?: Domain
    Version?: string
    Status?: OntologyStatus
    'Created By'?: AirtableCollaborator
    'Created Date'?: AirtableDateTime
    Notes?: string
    // Linked records
    EntityDefinitions?: AirtableRecordId[]
    EdgeDefinitions?: AirtableRecordId[]
    TestRuns?: AirtableRecordId[]
    GraphAssignments?: AirtableRecordId[]
    FactRatingConfigs?: AirtableRecordId[]
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 2. EntityDefinitions Table (tbloHlpFxnP5CTBEh)
// ============================================================================
export interface EntityDefinitionRecord {
  id: AirtableRecordId
  fields: {
    'Entity Name': string
    Ontology?: AirtableRecordId[]
    'Entity Class'?: string
    'Properties JSON'?: string
    'Validation Rules'?: string
    Examples?: string
    Priority?: number
    Description?: string
    // Note: There are two EdgeDefinitions fields in the schema
    EdgeDefinitions?: AirtableRecordId[]
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 3. EdgeDefinitions Table (tbldR4dKr1EFlgOFZ)
// ============================================================================
export interface EdgeDefinitionRecord {
  id: AirtableRecordId
  fields: {
    'Edge Name': string
    Ontology?: AirtableRecordId[]
    'Edge Class'?: string
    'Source Entity'?: AirtableRecordId[]
    'Target Entity'?: AirtableRecordId[]
    'Properties JSON'?: string
    Cardinality?: Cardinality
    Bidirectional?: boolean
    Description?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 4. TestDatasets Table (tblf5a4g0VhFDlhSo)
// ============================================================================
export interface TestDatasetRecord {
  id: AirtableRecordId
  fields: {
    'Dataset Name': string
    Domain?: Domain
    'Content Type'?: ContentType
    'Sample Data'?: string
    'File Attachment'?: Array<{
      id: string
      url: string
      filename: string
      size: number
      type: string
    }>
    'Expected Entities JSON'?: string
    'Expected Edges JSON'?: string
    Description?: string
    Size?: number
    // Linked records
    TestRuns?: AirtableRecordId[]
    FactRatingTests?: AirtableRecordId[]
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 5. TestRuns Table (tble8wm5NYNGRPHkC)
// ============================================================================
export interface TestRunRecord {
  id: AirtableRecordId
  fields: {
    'Run Name': string
    Ontology?: AirtableRecordId[]
    'Test Dataset'?: AirtableRecordId[]
    'Graph ID'?: string
    'Run Date'?: AirtableDateTime
    'Entities Extracted'?: number
    'Edges Extracted'?: number
    Precision?: number // Percentage (0-1)
    Recall?: number // Percentage (0-1)
    'F1 Score'?: number // Percentage (0-1)
    'Impact Report JSON'?: string
    Status?: RunStatus
    Notes?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 6. GraphAssignments Table (tbl2eLfeMmzwRpdMT)
// ============================================================================
export interface GraphAssignmentRecord {
  id: AirtableRecordId
  fields: {
    'Assignment Name': string
    Ontology?: AirtableRecordId[]
    'Target Type'?: TargetType
    'Target ID'?: string
    'Assigned By'?: AirtableCollaborator
    'Assigned Date'?: AirtableDateTime
    Active?: boolean
    'Override Level'?: OverrideLevel
    Notes?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 7. FactRatingConfigs Table (tblGxLQO4N3z5Jz9P)
// ============================================================================
export interface FactRatingConfigRecord {
  id: AirtableRecordId
  fields: {
    'Config Name': string
    Ontology?: AirtableRecordId[]
    'Rating Instruction'?: string
    'High Example'?: string
    'Medium Example'?: string
    'Low Example'?: string
    'Domain Context'?: string
    Status?: FactRatingConfigStatus
    'Default Min Rating'?: number
    'Effectiveness Score'?: number // Percentage (0-1)
    'Created By'?: AirtableCollaborator
    'Created Date'?: AirtableDateTime
    Notes?: string
    // Linked records
    FactRatingTests?: AirtableRecordId[]
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 8. FactRatingTests Table (tblLaHGbhn4YbCHDN)
// ============================================================================
export interface FactRatingTestRecord {
  id: AirtableRecordId
  fields: {
    'Test Name': string
    Configuration?: AirtableRecordId[]
    'Test Dataset'?: AirtableRecordId[]
    'Sample Facts JSON'?: string
    'Expected Ratings JSON'?: string
    'Actual Ratings JSON'?: string
    'Accuracy Score'?: number // Percentage (0-1)
    Precision?: number // Percentage (0-1)
    Recall?: number // Percentage (0-1)
    'Run Date'?: AirtableDateTime
    Status?: RunStatus
    Notes?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 9. Graphs Table (tblKBwwyf3xrCVlH6)
// ============================================================================
export interface GraphRecord {
  id: AirtableRecordId
  fields: {
    Name: string
    Description?: string
    OntologyId?: AirtableRecordId[]
    Status?: 'active' | 'archived' | 'processing'
    Tags?: string[]
    IsActive?: boolean
    IsArchived?: boolean
    CreatedBy?: string
    LastModifiedBy?: string
    EntityCount?: number
    EdgeCount?: number
    DocumentCount?: number
    IsPublic?: boolean
    AllowCloning?: boolean
    ProcessingEnabled?: boolean
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 10. Documents Table (tbl7DlpgjDMtkKJBP)
// ============================================================================
export interface DocumentRecord {
  id: AirtableRecordId
  fields: {
    Name: string
    Type?: DocumentType
    'Original Path'?: string
    'Markdown Content'?: string
    Status?: DocumentStatus
    'Episode ID'?: string
    'Uploaded By'?: AirtableCollaborator
    'Uploaded At'?: AirtableDateTime
    'Processed At'?: AirtableDateTime
    'Chunk Count'?: number
    'File Size'?: number
    'Page Count'?: number
    'Word Count'?: number
    'Processing Time'?: number
    // Linked records
    DocumentChunks?: AirtableRecordId[]
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 11. DocumentChunks Table (tblgx3MyyzB9sy68l)
// ============================================================================
export interface DocumentChunkRecord {
  id: AirtableRecordId
  fields: {
    'Chunk ID': string
    Document?: AirtableRecordId[]
    Content?: string
    'Chunk Index'?: number
    'Start Position'?: number
    'End Position'?: number
    'Episode ID'?: string
    'Word Count'?: number
    'Character Count'?: number
    'Overlap Previous'?: number
    'Overlap Next'?: number
    Headings?: string
    'Has Entities'?: boolean
    'Created At'?: AirtableDateTime
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 12. Episodes Table (tblj3Q70btNFOlaZX)
// ============================================================================
export interface EpisodeRecord {
  id: AirtableRecordId
  fields: {
    'Episode ID': string
    Type?: EpisodeType
    Status?: EpisodeStatus
    'Started At'?: AirtableDateTime
    'Completed At'?: AirtableDateTime
    'Documents Processed'?: number
    'Chunks Created'?: number
    'Entities Extracted'?: number
    'Edges Created'?: number
    'Error Log'?: string
    'Rollback Data'?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// 13. AuditLogs Table (tbl6fULP7HU3q2L8z)
// ============================================================================
export interface AuditLogRecord {
  id: AirtableRecordId
  fields: {
    'Log ID': string
    Timestamp?: AirtableDateTime
    'Episode ID'?: string
    User?: AirtableCollaborator
    Operation?: AuditOperation
    Table?: string
    'Record ID'?: string
    Changes?: string
    Metadata?: string
  }
  createdTime: AirtableDateTime
}

// ============================================================================
// Union Types for Generic Operations
// ============================================================================
export type AirtableRecord = 
  | OntologyRecord
  | EntityDefinitionRecord
  | EdgeDefinitionRecord
  | TestDatasetRecord
  | TestRunRecord
  | GraphAssignmentRecord
  | FactRatingConfigRecord
  | FactRatingTestRecord
  | DocumentRecord
  | DocumentChunkRecord
  | EpisodeRecord
  | AuditLogRecord

// Table name to record type mapping
export type TableRecordMap = {
  'Ontologies': OntologyRecord
  'EntityDefinitions': EntityDefinitionRecord
  'EdgeDefinitions': EdgeDefinitionRecord
  'TestDatasets': TestDatasetRecord
  'TestRuns': TestRunRecord
  'GraphAssignments': GraphAssignmentRecord
  'FactRatingConfigs': FactRatingConfigRecord
  'FactRatingTests': FactRatingTestRecord
  'Graphs': GraphRecord
  'Documents': DocumentRecord
  'DocumentChunks': DocumentChunkRecord
  'Episodes': EpisodeRecord
  'AuditLogs': AuditLogRecord
}

export type TableName = keyof TableRecordMap

// ============================================================================
// API Response Types
// ============================================================================
export interface AirtableListResponse<T> {
  records: T[]
  offset?: string
}

export interface AirtableError {
  error: {
    type: string
    message: string
  }
}

// ============================================================================
// Service Layer Types
// ============================================================================
export interface CreateRecordData<T extends keyof TableRecordMap> {
  fields: Partial<TableRecordMap[T]['fields']>
}

export interface UpdateRecordData<T extends keyof TableRecordMap> {
  fields: Partial<TableRecordMap[T]['fields']>
}

// ============================================================================
// Rate Limiting Types
// ============================================================================
export interface RateLimitConfig {
  requestsPerSecond: number
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  apiKey?: string
}

export interface QueuedRequest<T = any> {
  id: string
  method: string
  url: string
  data?: any
  resolve: (value: T) => void
  reject: (error: Error) => void
  retryCount: number
  timestamp: number
}

// ============================================================================
// Error Types
// ============================================================================
export class AirtableApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AirtableApiError'
  }
}

export class RateLimitError extends AirtableApiError {
  constructor(message: string = 'Rate limit exceeded', public retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends AirtableApiError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}