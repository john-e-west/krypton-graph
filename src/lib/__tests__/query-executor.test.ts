import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryExecutor, QueryCache } from '../query-executor'
import { ParsedQuery, QueryResult } from '@/types/query'

describe('QueryExecutor', () => {
  let executor: QueryExecutor
  
  beforeEach(() => {
    executor = new QueryExecutor('test-base-id', 'test-api-key')
  })

  it('executes query with entity filters', async () => {
    const mockEntityResponse = {
      ok: true,
      json: async () => ({
        records: [
          { id: 'rec1', fields: { Type: 'Person', Name: 'John' } },
          { id: 'rec2', fields: { Type: 'Person', Name: 'Jane' } }
        ]
      })
    }
    
    const mockEdgeResponse = {
      ok: true,
      json: async () => ({
        records: [
          { id: 'edge1', fields: { Source: 'rec1', Target: 'rec2' } },
          { id: 'edge2', fields: { Source: 'rec2', Target: 'rec3' } }
        ]
      })
    }
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockEntityResponse)
      .mockResolvedValueOnce(mockEdgeResponse)
    
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const result = await executor.execute(query)
    
    expect(result.entities).toHaveLength(2)
    expect(result.edges).toHaveLength(2)
    expect(result.metadata.totalResults).toBe(4)
    expect(result.metadata.cached).toBe(false)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.airtable.com/v0/test-base-id/Entities'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        })
      })
    )
  })

  it('executes query with edge filters', async () => {
    const mockEdgeResponse = {
      ok: true,
      json: async () => ({
        records: [
          { id: 'edge1', fields: { Type: 'KNOWS', Source: 'rec1', Target: 'rec2' } }
        ]
      })
    }
    
    global.fetch = vi.fn().mockResolvedValue(mockEdgeResponse)
    
    const query: ParsedQuery = {
      edges: [{ type: 'KNOWS' }],
      limit: 100
    }
    
    const result = await executor.execute(query)
    
    expect(result.edges).toHaveLength(1)
    expect(result.metadata.totalResults).toBe(1)
  })

  it('handles API errors by returning empty results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request'
    })
    
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const result = await executor.execute(query)
    
    expect(result.entities).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
    expect(result.metadata.totalResults).toBe(0)
  })

  it('builds correct Airtable formula for multiple entity types', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ records: [] })
    }
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse)
    
    const query: ParsedQuery = {
      entities: [{ type: ['Person', 'Document'] }],
      limit: 100
    }
    
    await executor.execute(query)
    
    const callUrl = (fetch as any).mock.calls[0][0]
    expect(callUrl).toContain('filterByFormula')
    expect(decodeURIComponent(callUrl)).toContain('OR')
    expect(decodeURIComponent(callUrl)).toContain('Person')
    expect(decodeURIComponent(callUrl)).toContain('Document')
  })

  it('fetches edges for entities when no edge filters specified', async () => {
    const mockEntityResponse = {
      ok: true,
      json: async () => ({
        records: [
          { id: 'rec1', fields: { Type: 'Person' } }
        ]
      })
    }
    
    const mockEdgeResponse = {
      ok: true,
      json: async () => ({
        records: [
          { id: 'edge1', fields: { Source: 'rec1', Target: 'rec2' } }
        ]
      })
    }
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockEntityResponse)
      .mockResolvedValueOnce(mockEdgeResponse)
    
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const result = await executor.execute(query)
    
    expect(result.entities).toHaveLength(1)
    expect(result.edges).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('QueryCache', () => {
  let cache: QueryCache
  
  beforeEach(() => {
    cache = new QueryCache()
  })

  it('generates consistent cache keys', () => {
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const key1 = cache.generateKey(query)
    const key2 = cache.generateKey(query)
    
    expect(key1).toBe(key2)
  })

  it('stores and retrieves cached results', async () => {
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const result: QueryResult = {
      query,
      entities: [{ id: 'rec1' }],
      edges: [],
      metadata: {
        totalResults: 1,
        executionTime: 100,
        cached: false
      }
    }
    
    const key = cache.generateKey(query)
    await cache.set(key, result)
    
    const cached = await cache.get(key)
    
    expect(cached).toBeDefined()
    expect(cached?.metadata.cached).toBe(true)
    expect(cached?.entities).toHaveLength(1)
  })

  it('returns null for expired cache entries', async () => {
    const query: ParsedQuery = {
      entities: [{ type: 'Person' }],
      limit: 100
    }
    
    const result: QueryResult = {
      query,
      entities: [],
      edges: [],
      metadata: {
        totalResults: 0,
        executionTime: 100,
        cached: false
      }
    }
    
    const key = cache.generateKey(query)
    await cache.set(key, result)
    
    const originalTtl = (cache as any).ttl
    ;(cache as any).ttl = -1
    
    const cached = await cache.get(key)
    
    expect(cached).toBeNull()
    
    ;(cache as any).ttl = originalTtl
  })

  it('clears all cached entries', async () => {
    const query1: ParsedQuery = { entities: [{ type: 'Person' }], limit: 100 }
    const query2: ParsedQuery = { entities: [{ type: 'Document' }], limit: 100 }
    
    const result: QueryResult = {
      query: query1,
      entities: [],
      edges: [],
      metadata: { totalResults: 0, executionTime: 100, cached: false }
    }
    
    await cache.set(cache.generateKey(query1), result)
    await cache.set(cache.generateKey(query2), result)
    
    cache.clear()
    
    expect(await cache.get(cache.generateKey(query1))).toBeNull()
    expect(await cache.get(cache.generateKey(query2))).toBeNull()
  })
})