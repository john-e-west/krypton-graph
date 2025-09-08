import { Episode } from '../types';
import { EpisodeManager } from '../episode-manager';

export interface EpisodeRecord {
  id?: string;
  zep_episode_id: string;
  document_id?: string;
  user_id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export class EpisodeService {
  private episodeManager: EpisodeManager;
  private airtableBaseId: string;
  private airtableApiKey: string;

  constructor(episodeManager: EpisodeManager) {
    this.episodeManager = episodeManager;
    this.airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID || '';
    this.airtableApiKey = process.env.VITE_AIRTABLE_API_KEY || '';
  }

  async createEpisode(
    userId: string,
    sessionId: string,
    documentId?: string
  ): Promise<Episode> {
    // Create episode in memory
    const episode = this.episodeManager.createEpisode(userId, sessionId);
    
    // Store in Airtable
    try {
      await this.storeEpisodeInAirtable({
        zep_episode_id: episode.id,
        user_id: userId,
        document_id: documentId,
        created_at: episode.createdAt.toISOString(),
        status: 'pending',
        metadata: episode.metadata
      });
    } catch (error) {
      console.error('Failed to store episode in Airtable:', error);
    }

    return episode;
  }

  async updateEpisodeStatus(
    episodeId: string,
    status: EpisodeRecord['status']
  ): Promise<void> {
    // Update in memory
    this.episodeManager.updateMetadata(episodeId, { status });
    
    // Update in Airtable
    try {
      await this.updateEpisodeInAirtable(episodeId, { status });
    } catch (error) {
      console.error('Failed to update episode status in Airtable:', error);
    }
  }

  async listEpisodesByUser(userId: string): Promise<EpisodeRecord[]> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes`;
    const params = new URLSearchParams({
      filterByFormula: `{user_id}="${userId}"`
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch episodes: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records.map((record: any) => ({
        id: record.id,
        ...record.fields
      }));
    } catch (error) {
      console.error('Failed to list episodes from Airtable:', error);
      return [];
    }
  }

  async deleteEpisode(episodeId: string): Promise<void> {
    // Find Airtable record
    const airtableRecord = await this.findEpisodeInAirtable(episodeId);
    
    if (airtableRecord) {
      const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes/${airtableRecord.id}`;
      
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.airtableApiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to delete episode: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to delete episode from Airtable:', error);
      }
    }
  }

  async linkChunksToEpisode(
    episodeId: string,
    chunkIds: string[]
  ): Promise<void> {
    this.episodeManager.updateMetadata(episodeId, {
      chunkIds,
      chunkCount: chunkIds.length
    });

    try {
      await this.updateEpisodeInAirtable(episodeId, {
        metadata: {
          chunkIds,
          chunkCount: chunkIds.length
        }
      });
    } catch (error) {
      console.error('Failed to link chunks to episode:', error);
    }
  }

  private async storeEpisodeInAirtable(
    record: EpisodeRecord
  ): Promise<string | undefined> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: record
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create episode: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error storing episode in Airtable:', error);
      return undefined;
    }
  }

  private async updateEpisodeInAirtable(
    episodeId: string,
    updates: Partial<EpisodeRecord>
  ): Promise<void> {
    const airtableRecord = await this.findEpisodeInAirtable(episodeId);
    
    if (!airtableRecord) {
      console.warn(`Episode ${episodeId} not found in Airtable`);
      return;
    }

    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes/${airtableRecord.id}`;
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updates
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update episode: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating episode in Airtable:', error);
    }
  }

  private async findEpisodeInAirtable(
    episodeId: string
  ): Promise<{ id: string; fields: any } | undefined> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes`;
    const params = new URLSearchParams({
      filterByFormula: `{zep_episode_id}="${episodeId}"`,
      maxRecords: '1'
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to find episode: ${response.statusText}`);
      }

      const data = await response.json();
      return data.records[0];
    } catch (error) {
      console.error('Error finding episode in Airtable:', error);
      return undefined;
    }
  }
}