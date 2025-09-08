import { Episode } from './types';

export class EpisodeManager {
  private episodes: Map<string, Episode> = new Map();
  private sessionEpisodes: Map<string, string[]> = new Map();

  createEpisode(userId: string, sessionId: string): Episode {
    const episodeId = `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const episode: Episode = {
      id: episodeId,
      userId,
      sessionId,
      messages: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.episodes.set(episodeId, episode);
    
    // Track episodes by session
    const sessionEps = this.sessionEpisodes.get(sessionId) || [];
    sessionEps.push(episodeId);
    this.sessionEpisodes.set(sessionId, sessionEps);

    return episode;
  }

  addMessage(episodeId: string, message: any): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    episode.messages.push(message);
    episode.updatedAt = new Date();
  }

  getEpisode(episodeId: string): Episode | undefined {
    return this.episodes.get(episodeId);
  }

  getSessionEpisodes(sessionId: string): Episode[] {
    const episodeIds = this.sessionEpisodes.get(sessionId) || [];
    return episodeIds
      .map(id => this.episodes.get(id))
      .filter(Boolean) as Episode[];
  }

  updateMetadata(episodeId: string, metadata: Record<string, any>): void {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    episode.metadata = { ...episode.metadata, ...metadata };
    episode.updatedAt = new Date();
  }

  shouldCreateNewEpisode(episodeId: string, maxMessages = 50): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode) return true;

    // Create new episode if current one has too many messages
    if (episode.messages.length >= maxMessages) return true;

    // Create new episode if it's been more than 30 minutes
    const timeSinceUpdate = Date.now() - episode.updatedAt.getTime();
    if (timeSinceUpdate > 30 * 60 * 1000) return true;

    return false;
  }

  clear(): void {
    this.episodes.clear();
    this.sessionEpisodes.clear();
  }
}