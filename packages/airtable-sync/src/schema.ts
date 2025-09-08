export const AIRTABLE_TABLES = {
  DOCUMENTS: 'Documents',
  CHUNKS: 'Chunks',
  ENTITIES: 'Entities',
  RELATIONSHIPS: 'Relationships',
  FACTS: 'Facts',
  EPISODES: 'Episodes',
  QUEUE: 'Queue',
  AUDIT: 'Audit'
} as const;

export const FIELD_MAPPINGS = {
  DOCUMENTS: {
    title: 'Title',
    content: 'Content',
    source: 'Source',
    status: 'Status',
    episodeId: 'Episode ID',
    chunkCount: 'Chunk Count',
    metadata: 'Metadata',
    createdAt: 'Created At',
    updatedAt: 'Updated At'
  },
  CHUNKS: {
    documentId: 'Document',
    content: 'Content',
    chunkIndex: 'Chunk Index',
    chunkSize: 'Chunk Size',
    embedding: 'Embedding',
    metadata: 'Metadata'
  },
  ENTITIES: {
    name: 'Name',
    type: 'Type',
    description: 'Description',
    documentIds: 'Documents',
    factIds: 'Facts',
    metadata: 'Metadata'
  },
  RELATIONSHIPS: {
    sourceEntity: 'Source Entity',
    targetEntity: 'Target Entity',
    relationshipType: 'Relationship Type',
    strength: 'Strength',
    documentIds: 'Documents',
    metadata: 'Metadata'
  },
  FACTS: {
    subject: 'Subject',
    predicate: 'Predicate',
    object: 'Object',
    confidence: 'Confidence',
    sourceDocuments: 'Source Documents',
    zepFactId: 'ZEP Fact ID',
    metadata: 'Metadata'
  },
  EPISODES: {
    episodeId: 'Episode ID',
    userId: 'User ID',
    sessionId: 'Session ID',
    documentIds: 'Documents',
    messageCount: 'Message Count',
    startTime: 'Start Time',
    endTime: 'End Time',
    metadata: 'Metadata'
  },
  QUEUE: {
    type: 'Type',
    status: 'Status',
    priority: 'Priority',
    payload: 'Payload',
    result: 'Result',
    error: 'Error',
    attempts: 'Attempts',
    createdAt: 'Created At',
    processedAt: 'Processed At'
  },
  AUDIT: {
    action: 'Action',
    entityType: 'Entity Type',
    entityId: 'Entity ID',
    userId: 'User ID',
    changes: 'Changes',
    timestamp: 'Timestamp',
    metadata: 'Metadata'
  }
} as const;

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tables?: Partial<typeof AIRTABLE_TABLES>;
  fieldMappings?: Partial<typeof FIELD_MAPPINGS>;
}

export const STATUS_VALUES = {
  DOCUMENT: ['pending', 'processing', 'completed', 'failed'],
  QUEUE: ['pending', 'processing', 'completed', 'failed']
} as const;

export const QUEUE_TYPES = [
  'document',
  'search',
  'graph_update',
  'batch_import',
  'sync'
] as const;

export const ENTITY_TYPES = [
  'person',
  'organization',
  'location',
  'event',
  'concept',
  'product',
  'technology'
] as const;

export const RELATIONSHIP_TYPES = [
  'mentions',
  'references',
  'related_to',
  'part_of',
  'authored_by',
  'located_in',
  'occurred_at',
  'uses',
  'produces'
] as const;