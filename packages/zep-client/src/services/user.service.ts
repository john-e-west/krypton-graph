import { User } from '../types';
import { ZepClientWrapper } from '../client';

export interface UserMapping {
  id?: string;
  clerk_user_id: string;
  zep_user_id: string;
  created_at: string;
  updated_at: string;
  email?: string;
  name?: string;
}

interface CachedMapping {
  mapping: UserMapping;
  timestamp: number;
}

export class UserMappingService {
  private cache: Map<string, CachedMapping> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private airtableBaseId: string;
  private airtableApiKey: string;

  constructor(private zepClient: ZepClientWrapper) {
    this.airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID || '';
    this.airtableApiKey = process.env.VITE_AIRTABLE_API_KEY || '';
  }

  async getOrCreateZepUser(
    clerkUserId: string,
    userData?: {
      email?: string;
      name?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    // Check cache first
    const cached = this.getCachedMapping(clerkUserId);
    if (cached) {
      return cached.zep_user_id;
    }

    // Check Airtable for existing mapping
    let mapping = await this.getMappingFromAirtable(clerkUserId);
    
    if (mapping) {
      // Verify ZEP user still exists
      const zepUser = await this.zepClient.getUser(mapping.zep_user_id);
      
      if (zepUser) {
        // Update cache and return
        this.setCachedMapping(clerkUserId, mapping);
        
        // Update user metadata if provided
        if (userData) {
          await this.syncUserMetadata(mapping.zep_user_id, userData);
        }
        
        return mapping.zep_user_id;
      } else {
        // ZEP user doesn't exist, need to recreate
        console.warn(`ZEP user ${mapping.zep_user_id} not found, recreating...`);
      }
    }

    // Create new ZEP user
    const zepUserId = `user_${clerkUserId}`;
    const newUser: User = {
      userId: zepUserId,
      email: userData?.email,
      firstName: userData?.name?.split(' ')[0],
      lastName: userData?.name?.split(' ').slice(1).join(' '),
      metadata: {
        clerkUserId,
        ...userData?.metadata
      }
    };

    await this.zepClient.createUser(newUser);

    // Store mapping in Airtable
    mapping = {
      clerk_user_id: clerkUserId,
      zep_user_id: zepUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email: userData?.email,
      name: userData?.name
    };

    await this.storeMappingInAirtable(mapping);
    
    // Cache the mapping
    this.setCachedMapping(clerkUserId, mapping);

    return zepUserId;
  }

  async syncUserMetadata(
    zepUserId: string,
    userData: {
      email?: string;
      name?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await this.zepClient.updateUser(zepUserId, {
        email: userData.email,
        firstName: userData.name?.split(' ')[0],
        lastName: userData.name?.split(' ').slice(1).join(' '),
        metadata: userData.metadata
      });

      // Update Airtable record
      const clerkUserId = await this.getClerkUserIdFromZepId(zepUserId);
      if (clerkUserId) {
        await this.updateMappingInAirtable(clerkUserId, {
          email: userData.email,
          name: userData.name,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to sync user metadata:', error);
    }
  }

  async getZepUserId(clerkUserId: string): Promise<string | null> {
    // Check cache
    const cached = this.getCachedMapping(clerkUserId);
    if (cached) {
      return cached.zep_user_id;
    }

    // Check Airtable
    const mapping = await this.getMappingFromAirtable(clerkUserId);
    if (mapping) {
      this.setCachedMapping(clerkUserId, mapping);
      return mapping.zep_user_id;
    }

    return null;
  }

  private getCachedMapping(clerkUserId: string): UserMapping | null {
    const cached = this.cache.get(clerkUserId);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(clerkUserId);
      return null;
    }
    
    return cached.mapping;
  }

  private setCachedMapping(clerkUserId: string, mapping: UserMapping): void {
    this.cache.set(clerkUserId, {
      mapping,
      timestamp: Date.now()
    });
  }

  private async getMappingFromAirtable(
    clerkUserId: string
  ): Promise<UserMapping | null> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/UserMappings`;
    const params = new URLSearchParams({
      filterByFormula: `{clerk_user_id}="${clerkUserId}"`,
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
        throw new Error(`Failed to fetch user mapping: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.records.length > 0) {
        return {
          id: data.records[0].id,
          ...data.records[0].fields
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user mapping from Airtable:', error);
      return null;
    }
  }

  private async storeMappingInAirtable(mapping: UserMapping): Promise<void> {
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/UserMappings`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: mapping
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create user mapping: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to store user mapping in Airtable:', error);
    }
  }

  private async updateMappingInAirtable(
    clerkUserId: string,
    updates: Partial<UserMapping>
  ): Promise<void> {
    const existing = await this.getMappingFromAirtable(clerkUserId);
    
    if (!existing || !existing.id) {
      console.warn(`User mapping for ${clerkUserId} not found in Airtable`);
      return;
    }

    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/UserMappings/${existing.id}`;
    
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
        throw new Error(`Failed to update user mapping: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update user mapping in Airtable:', error);
    }
  }

  private async getClerkUserIdFromZepId(zepUserId: string): Promise<string | null> {
    // Check cache first
    for (const [clerkId, cached] of this.cache.entries()) {
      if (cached.mapping.zep_user_id === zepUserId) {
        return clerkId;
      }
    }

    // Query Airtable
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/UserMappings`;
    const params = new URLSearchParams({
      filterByFormula: `{zep_user_id}="${zepUserId}"`,
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
        throw new Error(`Failed to fetch user mapping: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.records.length > 0) {
        return data.records[0].fields.clerk_user_id;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get Clerk user ID from ZEP ID:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}