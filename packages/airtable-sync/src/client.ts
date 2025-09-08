import Airtable, { Base, Table } from 'airtable';
import {
  AirtableRecord,
  DocumentRecord,
  ChunkRecord,
  EntityRecord,
  RelationshipRecord,
  FactRecord,
  EpisodeRecord,
  QueueRecord,
  AuditRecord
} from '@krypton/types';
import { AirtableConfig, AIRTABLE_TABLES, FIELD_MAPPINGS } from './schema';

export class AirtableClient {
  private base: Base;
  private config: AirtableConfig;
  private tables: Map<string, Table<any>>;

  constructor(config: AirtableConfig) {
    this.config = config;
    Airtable.configure({ apiKey: config.apiKey });
    this.base = Airtable.base(config.baseId);
    this.tables = new Map();
    this.initializeTables();
  }

  private initializeTables(): void {
    const tableNames = this.config.tables || AIRTABLE_TABLES;
    Object.entries(tableNames).forEach(([key, name]) => {
      this.tables.set(key, this.base(name));
    });
  }

  private getTable(tableName: keyof typeof AIRTABLE_TABLES): Table<any> {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }
    return table;
  }

  // Document Operations
  async createDocument(fields: DocumentRecord['fields']): Promise<DocumentRecord> {
    const table = this.getTable('DOCUMENTS');
    const record = await table.create(this.mapFields('DOCUMENTS', fields));
    return this.mapRecord(record) as DocumentRecord;
  }

  async getDocument(recordId: string): Promise<DocumentRecord | null> {
    try {
      const table = this.getTable('DOCUMENTS');
      const record = await table.find(recordId);
      return this.mapRecord(record) as DocumentRecord;
    } catch {
      return null;
    }
  }

  async updateDocument(
    recordId: string,
    fields: Partial<DocumentRecord['fields']>
  ): Promise<DocumentRecord> {
    const table = this.getTable('DOCUMENTS');
    const record = await table.update(recordId, this.mapFields('DOCUMENTS', fields));
    return this.mapRecord(record) as DocumentRecord;
  }

  async listDocuments(
    filter?: string,
    maxRecords = 100
  ): Promise<DocumentRecord[]> {
    const table = this.getTable('DOCUMENTS');
    const records = await table
      .select({
        filterByFormula: filter,
        maxRecords,
        sort: [{ field: 'Created At', direction: 'desc' }]
      })
      .all();
    return records.map(r => this.mapRecord(r) as DocumentRecord);
  }

  // Chunk Operations
  async createChunks(chunks: ChunkRecord['fields'][]): Promise<ChunkRecord[]> {
    const table = this.getTable('CHUNKS');
    const records = await table.create(
      chunks.map(c => ({ fields: this.mapFields('CHUNKS', c) }))
    );
    return records.map(r => this.mapRecord(r) as ChunkRecord);
  }

  async getChunksByDocument(documentId: string): Promise<ChunkRecord[]> {
    const table = this.getTable('CHUNKS');
    const records = await table
      .select({
        filterByFormula: `SEARCH("${documentId}", {Document})`,
        sort: [{ field: 'Chunk Index', direction: 'asc' }]
      })
      .all();
    return records.map(r => this.mapRecord(r) as ChunkRecord);
  }

  // Entity Operations
  async createEntity(fields: EntityRecord['fields']): Promise<EntityRecord> {
    const table = this.getTable('ENTITIES');
    const record = await table.create(this.mapFields('ENTITIES', fields));
    return this.mapRecord(record) as EntityRecord;
  }

  async findEntity(name: string, type: string): Promise<EntityRecord | null> {
    const table = this.getTable('ENTITIES');
    const records = await table
      .select({
        filterByFormula: `AND({Name} = "${name}", {Type} = "${type}")`,
        maxRecords: 1
      })
      .firstPage();
    return records.length > 0 ? (this.mapRecord(records[0]) as EntityRecord) : null;
  }

  async updateEntity(
    recordId: string,
    fields: Partial<EntityRecord['fields']>
  ): Promise<EntityRecord> {
    const table = this.getTable('ENTITIES');
    const record = await table.update(recordId, this.mapFields('ENTITIES', fields));
    return this.mapRecord(record) as EntityRecord;
  }

  // Relationship Operations
  async createRelationship(
    fields: RelationshipRecord['fields']
  ): Promise<RelationshipRecord> {
    const table = this.getTable('RELATIONSHIPS');
    const record = await table.create(this.mapFields('RELATIONSHIPS', fields));
    return this.mapRecord(record) as RelationshipRecord;
  }

  async getRelationshipsByEntity(entityId: string): Promise<RelationshipRecord[]> {
    const table = this.getTable('RELATIONSHIPS');
    const records = await table
      .select({
        filterByFormula: `OR(
          SEARCH("${entityId}", {Source Entity}),
          SEARCH("${entityId}", {Target Entity})
        )`
      })
      .all();
    return records.map(r => this.mapRecord(r) as RelationshipRecord);
  }

  // Fact Operations
  async createFact(fields: FactRecord['fields']): Promise<FactRecord> {
    const table = this.getTable('FACTS');
    const record = await table.create(this.mapFields('FACTS', fields));
    return this.mapRecord(record) as FactRecord;
  }

  async getFactsByDocument(documentId: string): Promise<FactRecord[]> {
    const table = this.getTable('FACTS');
    const records = await table
      .select({
        filterByFormula: `SEARCH("${documentId}", {Source Documents})`
      })
      .all();
    return records.map(r => this.mapRecord(r) as FactRecord);
  }

  // Episode Operations
  async createEpisode(fields: EpisodeRecord['fields']): Promise<EpisodeRecord> {
    const table = this.getTable('EPISODES');
    const record = await table.create(this.mapFields('EPISODES', fields));
    return this.mapRecord(record) as EpisodeRecord;
  }

  async getEpisode(episodeId: string): Promise<EpisodeRecord | null> {
    const table = this.getTable('EPISODES');
    const records = await table
      .select({
        filterByFormula: `{Episode ID} = "${episodeId}"`,
        maxRecords: 1
      })
      .firstPage();
    return records.length > 0 ? (this.mapRecord(records[0]) as EpisodeRecord) : null;
  }

  // Queue Operations
  async addToQueue(fields: QueueRecord['fields']): Promise<QueueRecord> {
    const table = this.getTable('QUEUE');
    const record = await table.create(this.mapFields('QUEUE', fields));
    return this.mapRecord(record) as QueueRecord;
  }

  async getNextQueueItem(): Promise<QueueRecord | null> {
    const table = this.getTable('QUEUE');
    const records = await table
      .select({
        filterByFormula: `{Status} = "pending"`,
        sort: [
          { field: 'Priority', direction: 'desc' },
          { field: 'Created At', direction: 'asc' }
        ],
        maxRecords: 1
      })
      .firstPage();
    return records.length > 0 ? (this.mapRecord(records[0]) as QueueRecord) : null;
  }

  async updateQueueItem(
    recordId: string,
    fields: Partial<QueueRecord['fields']>
  ): Promise<QueueRecord> {
    const table = this.getTable('QUEUE');
    const record = await table.update(recordId, this.mapFields('QUEUE', fields));
    return this.mapRecord(record) as QueueRecord;
  }

  // Audit Operations
  async createAuditLog(fields: AuditRecord['fields']): Promise<AuditRecord> {
    const table = this.getTable('AUDIT');
    const record = await table.create(this.mapFields('AUDIT', fields));
    return this.mapRecord(record) as AuditRecord;
  }

  async getAuditLogs(
    entityType?: string,
    entityId?: string,
    limit = 100
  ): Promise<AuditRecord[]> {
    const table = this.getTable('AUDIT');
    let filter = '';
    
    if (entityType && entityId) {
      filter = `AND({Entity Type} = "${entityType}", {Entity ID} = "${entityId}")`;
    } else if (entityType) {
      filter = `{Entity Type} = "${entityType}"`;
    } else if (entityId) {
      filter = `{Entity ID} = "${entityId}"`;
    }

    const records = await table
      .select({
        filterByFormula: filter,
        maxRecords: limit,
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      })
      .all();
    return records.map(r => this.mapRecord(r) as AuditRecord);
  }

  // Batch Operations
  async batchCreate<T extends AirtableRecord>(
    tableName: keyof typeof AIRTABLE_TABLES,
    records: T['fields'][],
    batchSize = 10
  ): Promise<T[]> {
    const table = this.getTable(tableName);
    const results: T[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const created = await table.create(
        batch.map(fields => ({ fields: this.mapFields(tableName, fields) }))
      );
      results.push(...created.map(r => this.mapRecord(r) as T));
    }

    return results;
  }

  async batchUpdate<T extends AirtableRecord>(
    tableName: keyof typeof AIRTABLE_TABLES,
    updates: Array<{ id: string; fields: Partial<T['fields']> }>,
    batchSize = 10
  ): Promise<T[]> {
    const table = this.getTable(tableName);
    const results: T[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const updated = await table.update(
        batch.map(({ id, fields }) => ({
          id,
          fields: this.mapFields(tableName, fields)
        }))
      );
      results.push(...updated.map(r => this.mapRecord(r) as T));
    }

    return results;
  }

  // Helper Methods
  private mapFields(
    tableName: keyof typeof FIELD_MAPPINGS,
    fields: Record<string, any>
  ): Record<string, any> {
    const mapping = this.config.fieldMappings?.[tableName] || FIELD_MAPPINGS[tableName];
    const mapped: Record<string, any> = {};

    Object.entries(fields).forEach(([key, value]) => {
      const fieldName = (mapping as any)[key] || key;
      mapped[fieldName] = value;
    });

    return mapped;
  }

  private mapRecord(record: any): AirtableRecord {
    return {
      id: record.id,
      fields: record.fields,
      createdTime: record._rawJson?.createdTime || new Date().toISOString()
    };
  }

  // Utility Methods
  async testConnection(): Promise<boolean> {
    try {
      const table = this.getTable('DOCUMENTS');
      await table.select({ maxRecords: 1 }).firstPage();
      return true;
    } catch (error) {
      console.error('Airtable connection test failed:', error);
      return false;
    }
  }

  async getTableSchema(tableName: keyof typeof AIRTABLE_TABLES): Promise<any> {
    // Note: Airtable doesn't provide a direct schema API
    // This would need to be manually maintained or fetched via Metadata API
    return FIELD_MAPPINGS[tableName];
  }
}