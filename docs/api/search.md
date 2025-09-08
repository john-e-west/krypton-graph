# Search API Documentation

## Overview
The Semantic Search API provides natural language search capabilities across documents, facts, and entities using ZEP v3 integration. It features relevance scoring, caching, and comprehensive filtering options.

## Base URL
```
/api/search
```

## Authentication
All requests require a user ID for tracking and personalization.

## Endpoints

### POST /api/search
Perform a semantic search query.

#### Request Body
```json
{
  "query": "string",           // Required, min 2 chars, max 500 chars
  "userId": "string",          // Required, unique user identifier
  "filters": {                 // Optional
    "sources": ["documents", "facts", "entities"],  // Filter by source types
    "dateRange": {
      "start": "ISO 8601 date",
      "end": "ISO 8601 date"
    },
    "limit": 20,               // Results per page (10-100)
    "minScore": 0.7,          // Minimum relevance score (0.0-1.0)
    "confidenceLevels": ["high", "medium", "low"],
    "sortBy": "relevance",    // relevance | date | source
    "sortOrder": "desc"       // asc | desc
  }
}
```

#### Response
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "snippet": "string",
      "highlightedSnippet": "string with <mark> tags",
      "source": "string",
      "sourceType": "document | fact | entity",
      "score": 0.95,
      "highlights": ["matched", "terms"],
      "metadata": {
        "createdAt": "ISO 8601 date",
        "lastModified": "ISO 8601 date",
        "author": "string",
        "tags": ["array", "of", "tags"]
      },
      "url": "/documents/doc_123",
      "scoreExplanation": {
        "baseScore": 0.85,
        "finalScore": 0.95,
        "similarityPercentage": 85,
        "confidenceLevel": "high",
        "boostFactors": {
          "recency": 0.15,
          "sourceWeight": 1.0,
          "queryMatch": 0.05
        }
      }
    }
  ],
  "totalCount": 42,
  "query": "processed query",
  "processingTimeMs": 45,
  "queryIntent": {
    "type": "question | statement | command",
    "searchType": "entity | concept | general",
    "temporal": false,
    "confidence": 0.9
  },
  "suggestions": [
    "authentication documentation",
    "authentication examples",
    "how to authenticate"
  ]
}
```

#### Status Codes
- `200 OK` - Successful search
- `400 Bad Request` - Invalid query parameters
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

#### Example Request
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication security best practices",
    "userId": "user-123",
    "filters": {
      "sources": ["documents", "facts"],
      "limit": 20,
      "minScore": 0.7
    }
  }'
```

### GET /api/search
Perform a search using query parameters (limited functionality).

#### Query Parameters
- `q` - Search query (required)
- `userId` - User identifier (required)
- `limit` - Number of results (optional, default: 20)
- `sources` - Comma-separated source types (optional)

#### Example Request
```bash
curl "http://localhost:3000/api/search?q=authentication&userId=user-123&limit=10"
```

## Data Models

### SearchQuery
```typescript
interface SearchQuery {
  query: string;                  // 2-500 characters
  userId?: string;
  filters?: {
    sources?: string[];           // ['documents', 'facts', 'entities']
    dateRange?: {
      start: string;              // ISO 8601
      end: string;                // ISO 8601
    };
    limit?: number;               // 10-100
    minScore?: number;            // 0.0-1.0
    confidenceLevels?: ('high' | 'medium' | 'low')[];
    sortBy?: 'relevance' | 'date' | 'source';
    sortOrder?: 'asc' | 'desc';
  };
}
```

### SearchResult
```typescript
interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  highlightedSnippet?: string;
  source: string;
  sourceType: 'document' | 'fact' | 'entity';
  score: number;                  // 0.0-1.0
  highlights: string[];
  metadata: Record<string, unknown>;
  url?: string;
  scoreExplanation?: ScoreExplanation;
}
```

### ScoreExplanation
```typescript
interface ScoreExplanation {
  baseScore: number;
  finalScore: number;
  similarityPercentage: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  boostFactors: {
    recency: number;              // 0.0-0.15
    sourceWeight: number;         // 1.0-1.2
    queryMatch: number;           // 0.0-0.1
  };
}
```

## Query Processing

### Query Enhancement
The API automatically enhances queries through:
- **Stop word removal**: Common words like "the", "is", "at" are filtered
- **Abbreviation expansion**: "docs" → "documents", "config" → "configuration"
- **Intent detection**: Identifies questions, commands, and statements
- **Temporal detection**: Recognizes time-based queries

### Relevance Scoring
Results are scored using multiple factors:

1. **Base Score** (0.0-1.0): Semantic similarity from ZEP
2. **Recency Boost** (up to 15%):
   - < 24 hours: +15%
   - < 7 days: +10%
   - < 30 days: +5%
   - < 90 days: +2%
3. **Source Weight**:
   - Facts: 1.2x multiplier
   - Documents: 1.0x (baseline)
   - Entities: 1.0x
4. **Query Match Boost** (up to 10%): Based on exact term matches

### Confidence Levels
- **High**: Score ≥ 0.85 AND multiple highlight matches
- **Medium**: Score ≥ 0.70 OR at least one highlight match
- **Low**: All other results

## Performance

### Caching
- **TTL**: 5 minutes for results, 1 hour for suggestions
- **Key**: Hash of (query + filters + userId)
- **Hit Rate Target**: >60%
- **Max Size**: 1000 entries (LRU eviction)

### Response Times
- **P50**: <100ms target
- **P95**: <200ms requirement
- **P99**: <500ms threshold

### Rate Limiting
- **Default**: 60 requests per minute per user
- **Burst**: Up to 10 requests
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 2 characters long",
    "details": {
      "field": "query",
      "value": "a"
    }
  }
}
```

### Common Error Codes
- `INVALID_QUERY` - Query validation failed
- `INVALID_FILTERS` - Filter parameters invalid
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `ZEP_ERROR` - ZEP service error
- `INTERNAL_ERROR` - Server error

## Integration Examples

### React/Next.js
```typescript
async function search(query: string, filters?: SearchFilters) {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      filters,
      userId: getCurrentUserId(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}
```

### With React Query
```typescript
import { useQuery } from '@tanstack/react-query';

function useSearch(query: string, filters?: SearchFilters) {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => search(query, filters),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Pagination Example
```typescript
const [page, setPage] = useState(1);
const resultsPerPage = 20;

const { data } = useSearch(query, {
  ...filters,
  limit: resultsPerPage,
  offset: (page - 1) * resultsPerPage,
});
```

## Best Practices

1. **Query Optimization**
   - Keep queries concise and focused
   - Use specific terms rather than generic ones
   - Leverage filters to narrow results

2. **Performance**
   - Implement client-side debouncing (300ms recommended)
   - Cache results on the client using React Query or SWR
   - Use pagination for large result sets

3. **Error Handling**
   - Implement retry logic with exponential backoff
   - Show helpful error messages to users
   - Provide search suggestions on no results

4. **Accessibility**
   - Ensure keyboard navigation for search UI
   - Provide clear focus indicators
   - Announce result counts to screen readers

## Monitoring

### Metrics to Track
- Query latency (p50, p95, p99)
- Cache hit rate
- Error rate by type
- Popular queries
- No-result queries
- Click-through rates

### Logging
All searches are logged with:
- Query text
- User ID
- Filters applied
- Result count
- Processing time
- Cache hit/miss
- Error details (if any)

## Changelog

### Version 1.0.0 (2025-01-07)
- Initial release
- Multi-source semantic search
- Advanced relevance scoring
- Query intent detection
- Performance optimization with caching
- Comprehensive filtering options

## Support

For issues or questions:
- GitHub Issues: [krypton-graph/issues](https://github.com/krypton-graph/issues)
- Documentation: [/docs/stories/6.1.zep-semantic-search.story.md](../stories/6.1.zep-semantic-search.story.md)