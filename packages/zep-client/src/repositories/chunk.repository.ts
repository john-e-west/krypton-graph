import { ChunkData } from '../services/sync.service';

export interface ChunkFilter {
  documentId?: string;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  processingBatchId?: string;
  episodeId?: string;
}

export interface ChunkUpdate {
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  syncAttemptCount?: number;
  lastSyncAttempt?: string;
  lastSyncError?: string;
  zepChunkId?: string;
  episodeId?: string;
}

export interface BatchChunkUpdate {
  chunkIds: string[];
  updates: ChunkUpdate;
}

export class ChunkRepository {
  private airtableBaseId: string;
  private airtableApiKey: string;
  private tableId: string = 'tblgx3MyyzB9sy68l'; // DocumentChunks table ID

  constructor() {
    this.airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID || '';
    this.airtableApiKey = process.env.VITE_AIRTABLE_API_KEY || '';
  }

  async fetchChunks(filter: ChunkFilter): Promise<ChunkData[]> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    const filterFormula = this.buildFilterFormula(filter);
    
    const params = new URLSearchParams({
      sort: JSON.stringify([{field: "Chunk Index", direction: "asc"}])
    });

    if (filterFormula) {
      params.append('filterByFormula', filterFormula);
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chunks: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records.map((record: any) => this.mapAirtableToChunk(record));
    } catch (error) {
      console.error('Error fetching chunks:', error);
      throw error;
    }
  }

  async fetchChunksByDocument(documentId: string, status?: string): Promise<ChunkData[]> {
    const filter: ChunkFilter = { documentId };
    if (status) {
      filter.syncStatus = status as any;
    }
    return this.fetchChunks(filter);
  }

  async fetchUnsyncedChunks(documentId: string): Promise<ChunkData[]> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    const params = new URLSearchParams({
      filterByFormula: `AND({Document}="${documentId}", OR({Sync Status}="", {Sync Status}="pending"))`,
      sort: JSON.stringify([{field: "Chunk Index", direction: "asc"}])
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unsynced chunks: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records.map((record: any) => this.mapAirtableToChunk(record));
    } catch (error) {
      console.error('Error fetching unsynced chunks:', error);
      throw error;
    }
  }

  async fetchFailedChunks(documentId: string): Promise<ChunkData[]> {
    return this.fetchChunks({
      documentId,
      syncStatus: 'failed'
    });
  }

  async updateChunk(chunkId: string, updates: ChunkUpdate): Promise<void> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks/${chunkId}`;
    
    const updateFields: any = {};
    
    if (updates.syncStatus) {
      updateFields['Sync Status'] = updates.syncStatus;
    }
    
    if (updates.syncAttemptCount !== undefined) {
      updateFields['Sync Attempt Count'] = updates.syncAttemptCount;
    }
    
    if (updates.lastSyncAttempt) {
      updateFields['Last Sync Attempt'] = updates.lastSyncAttempt;
    }
    
    if (updates.lastSyncError !== undefined) {
      updateFields['Last Sync Error'] = updates.lastSyncError;
    }
    
    if (updates.zepChunkId) {
      updateFields['ZEP Chunk ID'] = updates.zepChunkId;
    }

    if (updates.episodeId) {
      updateFields['Episode ID'] = updates.episodeId;
    }

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updateFields
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update chunk: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error updating chunk ${chunkId}:`, error);
      throw error;
    }
  }

  async batchUpdateChunks(batch: BatchChunkUpdate): Promise<void> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    
    const updateFields: any = {};
    
    if (batch.updates.syncStatus) {
      updateFields['Sync Status'] = batch.updates.syncStatus;
    }
    
    if (batch.updates.syncAttemptCount !== undefined) {
      updateFields['Sync Attempt Count'] = batch.updates.syncAttemptCount;
    }
    
    if (batch.updates.lastSyncAttempt) {
      updateFields['Last Sync Attempt'] = batch.updates.lastSyncAttempt;
    }
    
    if (batch.updates.lastSyncError !== undefined) {
      updateFields['Last Sync Error'] = batch.updates.lastSyncError;
    }
    
    if (batch.updates.zepChunkId) {
      updateFields['ZEP Chunk ID'] = batch.updates.zepChunkId;
    }

    if (batch.updates.episodeId) {
      updateFields['Episode ID'] = batch.updates.episodeId;
    }

    // Airtable allows updating up to 10 records at a time
    const batchSize = 10;
    
    for (let i = 0; i < batch.chunkIds.length; i += batchSize) {
      const chunkBatch = batch.chunkIds.slice(i, i + batchSize);
      
      const records = chunkBatch.map(chunkId => ({
        id: chunkId,
        fields: updateFields
      }));

      try {
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.airtableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            records
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to batch update chunks: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error batch updating chunks ${chunkBatch}:`, error);
        throw error;
      }
    }
  }

  async getSyncStatistics(documentId?: string): Promise<{
    totalChunks: number;
    syncedChunks: number;
    failedChunks: number;
    pendingChunks: number;
    syncingChunks: number;
  }> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/DocumentChunks`;
    const params = new URLSearchParams({
      fields: JSON.stringify(['Sync Status', 'Document'])
    });

    if (documentId) {
      params.append('filterByFormula', `{Document}="${documentId}"`);
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sync statistics: ${response.statusText}`);
      }

      const data = await response.json();
      const chunks = data.records;

      const totalChunks = chunks.length;
      const syncedChunks = chunks.filter((r: any) => r.fields['Sync Status'] === 'synced').length;
      const failedChunks = chunks.filter((r: any) => r.fields['Sync Status'] === 'failed').length;
      const syncingChunks = chunks.filter((r: any) => r.fields['Sync Status'] === 'syncing').length;
      const pendingChunks = chunks.filter((r: any) => 
        !r.fields['Sync Status'] || r.fields['Sync Status'] === 'pending'
      ).length;

      return {
        totalChunks,
        syncedChunks,
        failedChunks,
        pendingChunks,
        syncingChunks
      };
    } catch (error) {
      console.error('Error fetching sync statistics:', error);
      throw error;
    }
  }

  private buildFilterFormula(filter: ChunkFilter): string {
    const conditions: string[] = [];

    if (filter.documentId) {
      conditions.push(`{Document}="${filter.documentId}"`);
    }

    if (filter.syncStatus) {
      conditions.push(`{Sync Status}="${filter.syncStatus}"`);
    }

    if (filter.processingBatchId) {
      conditions.push(`{Processing Batch ID}="${filter.processingBatchId}"`);
    }

    if (filter.episodeId) {
      conditions.push(`{Episode ID}="${filter.episodeId}"`);
    }

    if (conditions.length === 0) {
      return '';
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return `AND(${conditions.join(', ')})`;
  }

  private mapAirtableToChunk(record: any): ChunkData {
    return {
      id: record.id,
      content: record.fields['Content'] || '',
      chunkIndex: record.fields['Chunk Index'] || 0,
      startPosition: record.fields['Start Position'],
      endPosition: record.fields['End Position'],
      wordCount: record.fields['Word Count'],
      characterCount: record.fields['Character Count'],
      headings: record.fields['Headings'],
      documentId: record.fields['Document']?.[0] || '',
      episodeId: record.fields['Episode ID'],
      syncStatus: record.fields['Sync Status'],
      syncAttemptCount: record.fields['Sync Attempt Count'],
      lastSyncAttempt: record.fields['Last Sync Attempt'],
      lastSyncError: record.fields['Last Sync Error'],
      zepChunkId: record.fields['ZEP Chunk ID']
    };
  }
}