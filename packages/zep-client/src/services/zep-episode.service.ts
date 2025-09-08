import { ChunkData } from './sync.service';

export interface ZepEpisodeMetadata {
  document_id: string;
  document_title: string;
  source_type: string;
  created_at: string;
  chunk_count: number;
  user_id: string;
  processing_batch_id?: string;
}

export interface ZepEpisode {
  id: string;
  user_id: string;
  session_id: string;
  metadata: ZepEpisodeMetadata;
  status: 'active' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
  chunk_ids: string[];
}

export interface EpisodeRegistry {
  document_id: string;
  episode_id: string;
  user_id: string;
  status: 'active' | 'completed' | 'failed';
  created_at: Date;
  expires_at: Date;
}

export class ZepEpisodeService {
  private episodeRegistry: Map<string, EpisodeRegistry> = new Map();
  private episodeCache: Map<string, ZepEpisode> = new Map();
  private cacheTTL: number = 10 * 60 * 1000; // 10 minutes
  private airtableBaseId: string;
  private airtableApiKey: string;

  constructor() {
    this.airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID || '';
    this.airtableApiKey = process.env.VITE_AIRTABLE_API_KEY || '';
    
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  async createOrGetEpisode(
    userId: string,
    documentId: string,
    documentTitle: string,
    chunks: ChunkData[]
  ): Promise<ZepEpisode> {
    // Check if we have an active episode for this document
    const existingEpisode = await this.findActiveEpisodeByDocument(documentId, userId);
    
    if (existingEpisode && existingEpisode.status === 'active') {
      console.log(`Found existing active episode ${existingEpisode.id} for document ${documentId}`);
      return existingEpisode;
    }

    // Create new episode
    const episodeId = this.generateEpisodeId();
    const sessionId = `sync_${documentId}_${Date.now()}`;
    
    const episode: ZepEpisode = {
      id: episodeId,
      user_id: userId,
      session_id: sessionId,
      metadata: {
        document_id: documentId,
        document_title: documentTitle,
        source_type: 'document_sync',
        created_at: new Date().toISOString(),
        chunk_count: chunks.length,
        user_id: userId,
        processing_batch_id: this.generateBatchId()
      },
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      chunk_ids: chunks.map(chunk => chunk.id)
    };

    // Cache the episode
    this.episodeCache.set(episodeId, episode);
    
    // Add to registry
    const registryEntry: EpisodeRegistry = {
      document_id: documentId,
      episode_id: episodeId,
      user_id: userId,
      status: 'active',
      created_at: new Date(),
      expires_at: new Date(Date.now() + this.cacheTTL)
    };
    
    this.episodeRegistry.set(`${documentId}_${userId}`, registryEntry);

    // Store in Airtable (using existing Episodes table)
    try {
      await this.storeEpisodeInAirtable(episode);
    } catch (error) {
      console.error('Failed to store episode in Airtable:', error);
      // Don't fail the sync for Airtable storage issues
    }

    console.log(`Created new ZEP episode ${episodeId} for document ${documentId}`);
    return episode;
  }

  async updateEpisodeStatus(
    episodeId: string,
    status: 'active' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const episode = this.episodeCache.get(episodeId);
    
    if (!episode) {
      console.warn(`Episode ${episodeId} not found in cache`);
      return;
    }

    episode.status = status;
    episode.updated_at = new Date();

    // Update registry entry
    const registryKey = `${episode.metadata.document_id}_${episode.user_id}`;
    const registryEntry = this.episodeRegistry.get(registryKey);
    
    if (registryEntry) {
      registryEntry.status = status;
    }

    // Update in Airtable
    try {
      await this.updateEpisodeInAirtable(episodeId, status, error);
    } catch (error) {
      console.error(`Failed to update episode ${episodeId} in Airtable:`, error);
    }

    console.log(`Updated episode ${episodeId} status to ${status}`);
  }

  async linkChunksToEpisode(
    episodeId: string,
    chunkIds: string[]
  ): Promise<void> {
    const episode = this.episodeCache.get(episodeId);
    
    if (!episode) {
      console.warn(`Episode ${episodeId} not found in cache`);
      return;
    }

    episode.chunk_ids = [...new Set([...episode.chunk_ids, ...chunkIds])];
    episode.metadata.chunk_count = episode.chunk_ids.length;
    episode.updated_at = new Date();

    console.log(`Linked ${chunkIds.length} chunks to episode ${episodeId}`);
  }

  async getEpisodeById(episodeId: string): Promise<ZepEpisode | null> {
    return this.episodeCache.get(episodeId) || null;
  }

  async findActiveEpisodeByDocument(
    documentId: string,
    userId: string
  ): Promise<ZepEpisode | null> {
    const registryKey = `${documentId}_${userId}`;
    const registryEntry = this.episodeRegistry.get(registryKey);
    
    if (!registryEntry || registryEntry.status !== 'active') {
      return null;
    }

    // Check if entry has expired
    if (new Date() > registryEntry.expires_at) {
      this.episodeRegistry.delete(registryKey);
      this.episodeCache.delete(registryEntry.episode_id);
      return null;
    }

    return this.episodeCache.get(registryEntry.episode_id) || null;
  }

  async getActiveEpisodes(userId?: string): Promise<ZepEpisode[]> {
    const activeEpisodes: ZepEpisode[] = [];
    
    for (const episode of this.episodeCache.values()) {
      if (episode.status === 'active' && (!userId || episode.user_id === userId)) {
        activeEpisodes.push(episode);
      }
    }
    
    return activeEpisodes;
  }

  async deleteEpisode(episodeId: string): Promise<void> {
    const episode = this.episodeCache.get(episodeId);
    
    if (!episode) {
      console.warn(`Episode ${episodeId} not found for deletion`);
      return;
    }

    // Remove from cache
    this.episodeCache.delete(episodeId);
    
    // Remove from registry
    const registryKey = `${episode.metadata.document_id}_${episode.user_id}`;
    this.episodeRegistry.delete(registryKey);

    console.log(`Deleted episode ${episodeId} from cache and registry`);
  }

  async rollbackEpisode(episodeId: string): Promise<void> {
    const episode = this.episodeCache.get(episodeId);
    
    if (!episode) {
      console.warn(`Episode ${episodeId} not found for rollback`);
      return;
    }

    // Here we would call ZEP API to delete the episode and its chunks
    // For now, just update status and log
    
    await this.updateEpisodeStatus(episodeId, 'failed', 'Episode rolled back');
    
    console.log(`Rolled back episode ${episodeId}`);
  }

  private async storeEpisodeInAirtable(episode: ZepEpisode): Promise<void> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes`;
    
    const fields = {
      'Episode ID': episode.id,
      'Type': 'document_import',
      'Status': 'in_progress',
      'Started At': episode.created_at.toISOString(),
      'Chunks Created': episode.metadata.chunk_count
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.airtableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      throw new Error(`Failed to create episode in Airtable: ${response.statusText}`);
    }
  }

  private async updateEpisodeInAirtable(
    episodeId: string,
    status: string,
    error?: string
  ): Promise<void> {
    // First find the record
    const findUrl = `https://api.airtable.com/v0/${this.airtableBaseId}/Episodes`;
    const findParams = new URLSearchParams({
      filterByFormula: `{Episode ID}="${episodeId}"`,
      maxRecords: '1'
    });

    const findResponse = await fetch(`${findUrl}?${findParams}`, {
      headers: {
        'Authorization': `Bearer ${this.airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!findResponse.ok) {
      throw new Error(`Failed to find episode ${episodeId}: ${findResponse.statusText}`);
    }

    const findData = await findResponse.json();
    const record = findData.records[0];
    
    if (!record) {
      console.warn(`Episode ${episodeId} not found in Airtable`);
      return;
    }

    // Update the record
    const updateUrl = `${findUrl}/${record.id}`;
    const updateFields: any = {
      'Status': status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'in_progress'
    };

    if (status === 'completed' || status === 'failed') {
      updateFields['Completed At'] = new Date().toISOString();
    }

    if (error) {
      updateFields['Error Log'] = error;
    }

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.airtableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: updateFields })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update episode ${episodeId}: ${updateResponse.statusText}`);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.episodeRegistry.entries()) {
      if (now > entry.expires_at) {
        expiredKeys.push(key);
        this.episodeCache.delete(entry.episode_id);
      }
    }
    
    expiredKeys.forEach(key => this.episodeRegistry.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired episode cache entries`);
    }
  }

  private generateEpisodeId(): string {
    return `zep_ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Statistics and monitoring
  async getEpisodeStatistics(userId?: string): Promise<{
    totalEpisodes: number;
    activeEpisodes: number;
    completedEpisodes: number;
    failedEpisodes: number;
    averageChunksPerEpisode: number;
  }> {
    const episodes = Array.from(this.episodeCache.values()).filter(ep => 
      !userId || ep.user_id === userId
    );
    
    const totalEpisodes = episodes.length;
    const activeEpisodes = episodes.filter(ep => ep.status === 'active').length;
    const completedEpisodes = episodes.filter(ep => ep.status === 'completed').length;
    const failedEpisodes = episodes.filter(ep => ep.status === 'failed').length;
    
    const totalChunks = episodes.reduce((sum, ep) => sum + ep.metadata.chunk_count, 0);
    const averageChunksPerEpisode = totalEpisodes > 0 ? totalChunks / totalEpisodes : 0;

    return {
      totalEpisodes,
      activeEpisodes,
      completedEpisodes,
      failedEpisodes,
      averageChunksPerEpisode
    };
  }
}