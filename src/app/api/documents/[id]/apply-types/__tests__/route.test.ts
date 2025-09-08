import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock the auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  withAuth: vi.fn(),
  validateRequestBody: vi.fn(),
  withRateLimit: vi.fn(),
  validateDocumentAccess: vi.fn()
}));

// Mock MCP functions
const mockMcpCreateRecord = vi.fn();
const mockMcpUpdateRecords = vi.fn();
global.mcp__airtable__create_record = mockMcpCreateRecord;
global.mcp__airtable__update_records = mockMcpUpdateRecords;

import { 
  withAuth, 
  validateRequestBody, 
  withRateLimit, 
  validateDocumentAccess 
} from '@/lib/auth/middleware';

// Mock NextResponse to avoid issues with streaming
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data, init) => ({
        json: async () => data,
        status: init?.status || 200,
        ok: init?.status ? init.status < 400 : true
      }))
    }
  };
});

const mockEntityTypes = [
  {
    id: 'person',
    name: 'Person',
    description: 'Individual people',
    pattern: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b',
    attributes: [
      { name: 'name', type: 'string', required: true }
    ]
  },
  {
    id: 'organization',
    name: 'Organization',
    description: 'Companies and institutions'
  }
];

const mockEdgeTypes = [
  {
    id: 'works_at',
    name: 'WORKS_AT',
    description: 'Employment relationship',
    sourceTypes: ['Person'],
    targetTypes: ['Organization']
  }
];

const mockConfig = {
  name: 'Test Knowledge Graph',
  description: 'A test knowledge graph',
  isPrivate: true,
  allowCollaboration: false,
  tags: ['test', 'development']
};

const createMockRequest = (body: any, _documentId: string = 'doc-123') => {
  return {
    json: vi.fn().mockResolvedValue(body)
  } as unknown as NextRequest;
};

const createMockParams = (documentId: string = 'doc-123') => ({
  params: { id: documentId }
});

describe('/api/documents/[id]/apply-types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful authentication by default
    (withAuth as any).mockResolvedValue({
      user: { userId: 'test-user-123', sessionId: 'session-123' }
    });
    
    // Mock successful rate limiting by default
    (withRateLimit as any).mockReturnValue(null);
    
    // Mock successful document access validation by default  
    (validateDocumentAccess as any).mockResolvedValue({ authorized: true });
    
    // Mock successful request validation by default
    (validateRequestBody as any).mockImplementation(async (req, schema) => {
      const body = await req.json();
      return { data: body };
    });
    
    // Mock successful MCP calls by default
    mockMcpCreateRecord.mockResolvedValue({
      id: 'rec123456',
      fields: { Name: 'Test Graph' },
      createdTime: '2025-01-01T00:00:00.000Z'
    });
    
    mockMcpUpdateRecords.mockResolvedValue([{
      id: 'rec123456', 
      fields: { Status: 'Active' }
    }]);
  });

  describe('POST', () => {
    it('creates knowledge graph with valid request', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.graphId).toBeDefined();
      expect(data.status).toBe('created');
      expect(data.config.name).toBe('Test Knowledge Graph');
      expect(data.config.entityTypes).toBe(2);
      expect(data.config.edgeTypes).toBe(1);
      expect(data.processing.totalChunks).toBeGreaterThan(0);
    });

    it('returns error when document ID is missing', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams('');

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID is required');
    });

    it('returns error when entityTypes is empty', async () => {
      const request = createMockRequest({
        entityTypes: [],
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one entity type is required');
    });

    it('returns error when entityTypes is not an array', async () => {
      const request = createMockRequest({
        entityTypes: null,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one entity type is required');
    });

    it('returns error when config is missing', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Graph configuration with name is required');
    });

    it('returns error when config name is empty', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: { ...mockConfig, name: '' }
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Graph configuration with name is required');
    });

    it('enforces Zep v3 entity types limit', async () => {
      const tooManyEntityTypes = Array.from({ length: 11 }, (_, i) => ({
        id: `type${i}`,
        name: `Type${i}`,
        description: `Type ${i} description`
      }));

      const request = createMockRequest({
        entityTypes: tooManyEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum of 10 entity types allowed (Zep v3 constraint)');
    });

    it('enforces Zep v3 edge types limit', async () => {
      const tooManyEdgeTypes = Array.from({ length: 11 }, (_, i) => ({
        id: `edge${i}`,
        name: `EDGE_${i}`,
        description: `Edge ${i} description`,
        sourceTypes: ['Person'],
        targetTypes: ['Organization']
      }));

      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: tooManyEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum of 10 edge types allowed (Zep v3 constraint)');
    });

    it('handles empty edge types array', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: [],
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.config.edgeTypes).toBe(0);
    });

    it('includes processing metrics in response', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(data.processing).toBeDefined();
      expect(data.processing.totalChunks).toBeGreaterThan(0);
      expect(data.processing.processedChunks).toBeGreaterThan(0);
      expect(data.processing.totalEntities).toBeGreaterThan(0);
    });

    it('includes Zep integration details in response', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(data.zep).toBeDefined();
      expect(data.zep.graphId).toBeDefined();
      expect(data.zep.status).toBe('processing');
      expect(data.zep.entityCount).toBeGreaterThan(0);
      expect(data.zep.edgeCount).toBeGreaterThan(0);
      expect(data.zep.processingTimeMs).toBeGreaterThan(0);
    });

    it('includes Airtable record details in response', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(data.airtable).toBeDefined();
      expect(data.airtable.recordId).toBeDefined();
      expect(data.airtable.status).toBe('created');
    });

    it('includes createdAt timestamp', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(data.createdAt).toBeDefined();
      expect(new Date(data.createdAt)).toBeInstanceOf(Date);
    });

    it('returns 401 when authentication fails', async () => {
      (withAuth as any).mockResolvedValue({
        error: { json: vi.fn().mockResolvedValue({ error: 'Authentication required' }), status: 401 }
      });

      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);

      expect(response.status).toBe(401);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      (withRateLimit as any).mockReturnValue({
        json: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
        status: 429
      });

      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);

      expect(response.status).toBe(429);
    });

    it('returns 403 when document access is denied', async () => {
      (validateDocumentAccess as any).mockResolvedValue({
        authorized: false,
        error: { json: vi.fn().mockResolvedValue({ error: 'Access denied' }), status: 403 }
      });

      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      const response = await POST(request, params);

      expect(response.status).toBe(403);
    });

    it('returns 400 when request validation fails', async () => {
      (validateRequestBody as any).mockResolvedValue({
        error: { 
          json: vi.fn().mockResolvedValue({ 
            error: 'Invalid request body',
            validation_errors: [{ field: 'entityTypes', message: 'Required' }]
          }), 
          status: 400 
        }
      });

      const request = createMockRequest({
        invalid: 'data'
      });
      const params = createMockParams();

      const response = await POST(request, params);

      expect(response.status).toBe(400);
    });

    it('includes user information in Airtable record', async () => {
      const request = createMockRequest({
        entityTypes: mockEntityTypes,
        edgeTypes: mockEdgeTypes,
        config: mockConfig
      });
      const params = createMockParams();

      await POST(request, params);

      expect(mockMcpCreateRecord).toHaveBeenCalledWith({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblKBwwyf3xrCVlH6',
        fields: expect.objectContaining({
          CreatedBy: 'test-user-123',
          LastModifiedBy: 'test-user-123'
        })
      });
    });

    it('handles request parsing errors', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as NextRequest;
      const params = createMockParams();

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create knowledge graph');
      expect(data.details).toBe('Invalid JSON');
    });
  });

  describe('GET', () => {
    it('returns method not allowed', async () => {
      const request = {} as NextRequest;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed. Use POST to apply types and create knowledge graph.');
    });
  });
});