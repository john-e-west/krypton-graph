import { NextRequest } from 'next/server';
import { POST, GET } from '../../../../app/api/search/route';
import { vi } from 'vitest';

// Mock the search service
vi.mock('../../../../app/services/search/semantic-search.service', () => ({
  SemanticSearchService: {
    getInstance: () => ({
      search: vi.fn().mockResolvedValue({
        results: [],
        totalCount: 0,
        query: 'test query',
        processingTimeMs: 50,
        suggestions: ['test suggestion']
      })
    })
  }
}));

describe('/api/search', () => {
  describe('POST', () => {
    it('should handle valid search request', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test search',
          userId: 'test-user'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.query).toBe('test query');
    });

    it('should reject request without query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'test-user'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query parameter is required and must be a string');
    });

    it('should reject request with non-string query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 123,
          userId: 'test-user'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query parameter is required and must be a string');
    });

    it('should handle filters and optional parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test search',
          userId: 'test-user',
          filters: {
            dateRange: { start: '2025-01-01', end: '2025-01-31' },
            sourceType: ['document', 'fact'],
            limit: 10
          }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should use anonymous user if userId not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test search'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET', () => {
    it('should handle valid GET request', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test%20search&userId=test-user');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should reject GET request without query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?userId=test-user');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query parameter "q" is required');
    });

    it('should handle optional GET parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test&limit=5&sourceType=document,fact&userId=test-user');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should use default values for missing GET parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});