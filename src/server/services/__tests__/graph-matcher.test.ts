import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphMatcher } from '../graph-matcher';

// Mock the MCP function
const mockMcpAirtableListRecords = vi.fn();
global.mcp__airtable__list_records = mockMcpAirtableListRecords;

const mockEntityTypes = [
  {
    id: 'person',
    name: 'Person',
    description: 'Individual people and employees',
    attributes: [
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number', required: false }
    ]
  },
  {
    id: 'organization',
    name: 'Organization',
    description: 'Companies and business entities'
  }
];

const mockEdgeTypes = [
  {
    id: 'works_at',
    name: 'WORKS_AT',
    description: 'Employment relationship',
    sourceTypes: ['Person'],
    targetTypes: ['Organization']
  },
  {
    id: 'manages',
    name: 'MANAGES',
    description: 'Management hierarchy',
    sourceTypes: ['Person'],
    targetTypes: ['Person']
  }
];

const mockOntology = {
  entityTypes: mockEntityTypes,
  edgeTypes: mockEdgeTypes,
  domain: 'business',
  tags: ['corporate', 'hr']
};

describe('GraphMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('findSimilarGraphs', () => {
    it('finds exact matches with high similarity scores', async () => {
      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'HR Management System',
          description: 'Employee and organizational management',
          ontology: mockOntology,
          domain: 'business',
          tags: ['corporate', 'hr'],
          usage_count: 15,
          success_rate: 0.95
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs
      );

      expect(results).toHaveLength(1);
      expect(results[0].scores.overall).toBeGreaterThan(0.9);
      expect(results[0].confidence).toBe('high');
      expect(results[0].reasoning).toContain('High entity type compatibility (100%)');
    });

    it('calculates entity similarity correctly', async () => {
      const similarOntology = {
        entityTypes: [
          {
            id: 'individual',
            name: 'Individual',
            description: 'People and persons',
            attributes: [
              { name: 'fullName', type: 'string', required: true }
            ]
          },
          {
            id: 'company',
            name: 'Company',
            description: 'Business organizations and corporations'
          }
        ],
        edgeTypes: [],
        domain: 'business'
      };

      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Similar Graph',
          description: 'A similar graph',
          ontology: similarOntology,
          domain: 'business',
          usage_count: 10,
          success_rate: 0.8
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs
      );

      expect(results).toHaveLength(1);
      expect(results[0].scores.entity_similarity).toBeGreaterThan(0.5);
      expect(results[0].scores.entity_similarity).toBeLessThan(1.0);
    });

    it('calculates edge similarity correctly', async () => {
      const differentEdgeOntology = {
        entityTypes: mockEntityTypes,
        edgeTypes: [
          {
            id: 'employed_by',
            name: 'EMPLOYED_BY',
            description: 'Employment connection',
            sourceTypes: ['Person'],
            targetTypes: ['Organization']
          }
        ],
        domain: 'business'
      };

      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Different Edge Graph',
          description: 'Graph with different edge types',
          ontology: differentEdgeOntology,
          domain: 'business',
          usage_count: 5,
          success_rate: 0.7
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs
      );

      expect(results).toHaveLength(1);
      expect(results[0].scores.edge_similarity).toBeGreaterThan(0.4);
      expect(results[0].scores.edge_similarity).toBeLessThan(0.8);
    });

    it('handles empty edge types gracefully', async () => {
      const noEdgesOntology = {
        entityTypes: mockEntityTypes,
        edgeTypes: [],
        domain: 'business'
      };

      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'No Edges Graph',
          description: 'Graph without edge types',
          ontology: {
            entityTypes: mockEntityTypes,
            edgeTypes: []
          },
          domain: 'business',
          usage_count: 3,
          success_rate: 0.6
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        noEdgesOntology,
        candidateGraphs
      );

      expect(results).toHaveLength(1);
      expect(results[0].scores.edge_similarity).toBe(1.0); // Both have no edges
    });

    it('filters by minimum score', async () => {
      const veryDifferentOntology = {
        entityTypes: [
          {
            id: 'vehicle',
            name: 'Vehicle',
            description: 'Transportation vehicles'
          }
        ],
        edgeTypes: [
          {
            id: 'drives',
            name: 'DRIVES',
            description: 'Driving relationship',
            sourceTypes: ['Person'],
            targetTypes: ['Vehicle']
          }
        ],
        domain: 'transportation'
      };

      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Transportation Graph',
          description: 'Vehicle management system',
          ontology: veryDifferentOntology,
          domain: 'transportation',
          usage_count: 8,
          success_rate: 0.85
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { min_score: 0.8 }
      );

      expect(results).toHaveLength(0); // Should filter out low similarity
    });

    it('limits results correctly', async () => {
      const candidateGraphs = Array.from({ length: 15 }, (_, i) => ({
        id: `graph${i}`,
        name: `Graph ${i}`,
        description: `Description ${i}`,
        ontology: {
          entityTypes: [
            {
              id: 'person',
              name: 'Person',
              description: 'Individual people'
            }
          ],
          edgeTypes: []
        },
        usage_count: i,
        success_rate: 0.8
      }));

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { max_results: 5 }
      );

      expect(results).toHaveLength(5);
    });

    it('weights usage statistics when enabled', async () => {
      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'High Usage Graph',
          description: 'Popular graph',
          ontology: {
            entityTypes: mockEntityTypes.slice(0, 1), // Less similar
            edgeTypes: []
          },
          usage_count: 100,
          success_rate: 0.98
        },
        {
          id: 'graph2',
          name: 'Low Usage Graph',
          description: 'Unused graph',
          ontology: mockOntology, // More similar
          usage_count: 1,
          success_rate: 0.5
        }
      ];

      const withUsageWeighting = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { weight_usage: true }
      );

      const withoutUsageWeighting = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { weight_usage: false }
      );

      // Usage weighting should affect the relative scores
      expect(withUsageWeighting[0].scores.usage_factor).toBeGreaterThan(
        withoutUsageWeighting[0].scores.usage_factor
      );
    });

    it('calculates domain similarity correctly', async () => {
      const sameDomainGraph = {
        id: 'graph1',
        name: 'Same Domain Graph',
        description: 'Business graph',
        ontology: {
          entityTypes: [{ id: 'different', name: 'Different', description: 'Different type' }],
          edgeTypes: []
        },
        domain: 'business',
        usage_count: 5,
        success_rate: 0.7
      };

      const differentDomainGraph = {
        id: 'graph2',
        name: 'Different Domain Graph',
        description: 'Medical graph',
        ontology: {
          entityTypes: [{ id: 'different', name: 'Different', description: 'Different type' }],
          edgeTypes: []
        },
        domain: 'medical',
        usage_count: 5,
        success_rate: 0.7
      };

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        [sameDomainGraph, differentDomainGraph]
      );

      const sameDomainResult = results.find(r => r.graph.id === 'graph1');
      const differentDomainResult = results.find(r => r.graph.id === 'graph2');

      expect(sameDomainResult?.scores.domain_match).toBeGreaterThan(
        differentDomainResult?.scores.domain_match || 0
      );
    });

    it('generates meaningful reasoning', async () => {
      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Well-Used Graph',
          description: 'Popular business graph',
          ontology: mockOntology,
          domain: 'business',
          tags: ['corporate', 'hr'],
          usage_count: 50,
          success_rate: 0.95
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs
      );

      expect(results[0].reasoning).toContain('High entity type compatibility (100%)');
      expect(results[0].reasoning).toContain('Strong relationship pattern match (100%)');
      expect(results[0].reasoning).toContain('Same domain focus identified');
      expect(results[0].reasoning).toContain('Proven pattern with 50 uses');
      expect(results[0].reasoning).toContain('High success rate (95%)');
    });

    it('filters by domain when specified', async () => {
      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Business Graph',
          description: 'Business domain graph',
          ontology: mockOntology,
          domain: 'business',
          usage_count: 10,
          success_rate: 0.8
        },
        {
          id: 'graph2',
          name: 'Medical Graph',
          description: 'Medical domain graph',
          ontology: mockOntology,
          domain: 'medical',
          usage_count: 10,
          success_rate: 0.8
        }
      ];

      const results = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { domain_filter: ['business'] }
      );

      expect(results).toHaveLength(1);
      expect(results[0].graph.domain).toBe('business');
    });

    it('excludes low confidence matches by default', async () => {
      const veryDifferentOntology = {
        entityTypes: [
          {
            id: 'asteroid',
            name: 'Asteroid',
            description: 'Space rocks'
          }
        ],
        edgeTypes: [
          {
            id: 'orbits',
            name: 'ORBITS',
            description: 'Orbital mechanics',
            sourceTypes: ['Asteroid'],
            targetTypes: ['Planet']
          }
        ],
        domain: 'astronomy'
      };

      const candidateGraphs = [
        {
          id: 'graph1',
          name: 'Space Graph',
          description: 'Astronomy and space',
          ontology: veryDifferentOntology,
          domain: 'astronomy',
          usage_count: 3,
          success_rate: 0.6
        }
      ];

      const withoutLowConfidence = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { include_low_confidence: false }
      );

      const withLowConfidence = await GraphMatcher.findSimilarGraphs(
        mockOntology,
        candidateGraphs,
        { include_low_confidence: true }
      );

      expect(withoutLowConfidence.length).toBeLessThanOrEqual(withLowConfidence.length);
    });
  });

  describe('getGraphsFromAirtable', () => {
    it('should fetch graphs from Airtable using MCP', async () => {
      const mockRecords = [
        {
          id: 'rec123',
          fields: {
            Name: 'Test Graph',
            Description: 'A test graph',
            Tags: 'business, finance'
          },
          createdTime: '2025-01-01T00:00:00.000Z'
        }
      ];

      mockMcpAirtableListRecords.mockResolvedValue({
        records: mockRecords
      });

      const graphs = await GraphMatcher.getGraphsFromAirtable();

      expect(mockMcpAirtableListRecords).toHaveBeenCalledWith({
        baseId: 'appvLsaMZqtLc9EIX',
        tableId: 'tblKBwwyf3xrCVlH6',
        filterByFormula: 'AND({IsActive} = TRUE(), {IsArchived} = FALSE())',
        maxRecords: 100
      });

      expect(graphs).toHaveLength(1);
      expect(graphs[0]).toMatchObject({
        id: 'rec123',
        name: 'Test Graph',
        description: 'A test graph',
        tags: ['business', 'finance'],
        domain: 'business'
      });
    });

    it('should handle MCP errors gracefully', async () => {
      mockMcpAirtableListRecords.mockRejectedValue(new Error('Network error'));

      const graphs = await GraphMatcher.getGraphsFromAirtable();

      expect(graphs).toEqual([]);
    });

    it('should parse tags correctly', async () => {
      const mockRecords = [
        {
          id: 'rec123',
          fields: {
            Name: 'Test Graph',
            Description: 'A test graph',
            Tags: 'tag1, tag2, tag3'
          },
          createdTime: '2025-01-01T00:00:00.000Z'
        }
      ];

      mockMcpAirtableListRecords.mockResolvedValue({
        records: mockRecords
      });

      const graphs = await GraphMatcher.getGraphsFromAirtable();

      expect(graphs[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(graphs[0].domain).toBe('tag1');
    });
  });
});