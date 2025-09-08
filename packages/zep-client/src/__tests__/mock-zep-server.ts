import { vi } from 'vitest';

export interface MockZepServerConfig {
  rateLimitAt?: number;
  errorRate?: number;
  latency?: number;
  failAfter?: number;
}

export class MockZepServer {
  private requestCount = 0;
  private users = new Map<string, any>();
  private documents = new Map<string, any>();
  private memories = new Map<string, any[]>();

  constructor(private config: MockZepServerConfig = {}) {}

  async simulateRequest<T>(operation: () => T, _params?: any): Promise<T> {
    this.requestCount++;

    // Simulate latency
    if (this.config.latency) {
      await this.sleep(this.config.latency);
    }

    // Simulate rate limiting
    if (this.config.rateLimitAt && this.requestCount % this.config.rateLimitAt === 0) {
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      error.headers = { 'retry-after': '2' };
      throw error;
    }

    // Simulate random errors
    if (this.config.errorRate && Math.random() < this.config.errorRate) {
      const error: any = new Error('Server error');
      error.status = 500 + Math.floor(Math.random() * 10);
      throw error;
    }

    // Simulate failure after N requests
    if (this.config.failAfter && this.requestCount > this.config.failAfter) {
      const error: any = new Error('Connection reset');
      error.code = 'ECONNRESET';
      throw error;
    }

    return operation();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock Zep client methods
  createMockClient() {
    return {
      user: {
        add: vi.fn(async (user: any) => {
          return this.simulateRequest(() => {
            this.users.set(user.userId, user);
            return user;
          });
        }),
        get: vi.fn(async ({ userId }: { userId: string }) => {
          return this.simulateRequest(() => {
            return this.users.get(userId) || null;
          });
        }),
        update: vi.fn(async (updates: any) => {
          return this.simulateRequest(() => {
            const existing = this.users.get(updates.userId);
            if (!existing) {
              const error: any = new Error('User not found');
              error.status = 404;
              throw error;
            }
            const updated = { ...existing, ...updates };
            this.users.set(updates.userId, updated);
            return updated;
          });
        })
      },
      document: {
        add: vi.fn(async ({ userId, documents }: any) => {
          return this.simulateRequest(() => {
            const uuids = documents.map((doc: any) => {
              const uuid = `doc_${Date.now()}_${Math.random()}`;
              this.documents.set(uuid, { ...doc, userId });
              return uuid;
            });
            return { uuids };
          });
        })
      },
      memory: {
        add: vi.fn(async ({ sessionId, messages }: any) => {
          return this.simulateRequest(() => {
            const existing = this.memories.get(sessionId) || [];
            this.memories.set(sessionId, [...existing, ...messages]);
            return { success: true };
          });
        }),
        search: vi.fn(async (_params: any) => {
          return this.simulateRequest(() => {
            // Return mock search results
            return [
              {
                content: 'Mock search result',
                score: 0.95,
                metadata: { test: true },
                episodeId: 'ep_123',
                documentId: 'doc_456'
              }
            ];
          });
        }),
        delete: vi.fn(async ({ sessionId }: any) => {
          return this.simulateRequest(() => {
            this.memories.delete(sessionId);
            return { success: true };
          });
        })
      },
      graph: {
        get: vi.fn(async ({ userId }: any) => {
          return this.simulateRequest(() => {
            return {
              nodes: [],
              edges: [],
              userId
            };
          });
        }),
        add: vi.fn(async ({ facts }: any) => {
          return this.simulateRequest(() => {
            const uuids = facts.map(() => `fact_${Date.now()}_${Math.random()}`);
            return { uuids };
          });
        })
      }
    };
  }

  reset() {
    this.requestCount = 0;
    this.users.clear();
    this.documents.clear();
    this.memories.clear();
  }

  getMetrics() {
    return {
      requestCount: this.requestCount,
      userCount: this.users.size,
      documentCount: this.documents.size,
      sessionCount: this.memories.size
    };
  }
}