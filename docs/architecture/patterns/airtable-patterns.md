# Airtable Architecture Patterns

## Core Patterns for Krypton-Graph

### Pattern: MCP-Based Data Access Layer
**Context**: Need programmatic access to Airtable with type safety
**Pattern**: 
```typescript
// Use MCP tools for all Airtable operations
await mcp.airtable.list_records({
  baseId: "appvLsaMZqtLc9EIX",
  tableId: "tblupVP410vrQERwa",
  filterByFormula: "Status = 'Published'"
});
```
**Benefits**:
- Abstracted API complexity
- Built-in rate limiting
- Type-safe operations
- Error handling included
**Trade-offs**:
- Additional layer of abstraction
- MCP server dependency
**Implementation**: Use MCP tools exclusively, no direct API calls

### Pattern: Hub-and-Spoke Data Model
**Context**: Knowledge graph with central ontology management
**Pattern**:
```
Ontologies (Hub)
    ├── EntityDefinitions (Spoke)
    ├── EdgeDefinitions (Spoke)
    ├── TestDatasets (Spoke)
    └── GraphAssignments (Spoke)
```
**Benefits**:
- Clear data ownership
- Simplified queries
- Natural graph structure
- Easy navigation
**Trade-offs**:
- Potential bottleneck on hub table
- More joins required
**Implementation**: Already in place in current schema

### Pattern: JSON Fields for Flexible Properties
**Context**: Need schema flexibility within structured database
**Pattern**:
```javascript
// Store complex properties as JSON
{
  "Properties JSON": JSON.stringify({
    attributes: ["name", "age", "role"],
    constraints: { age: { min: 0, max: 150 } },
    required: ["name"]
  })
}
```
**Benefits**:
- Schema flexibility
- Complex data structures
- Evolve without migrations
**Trade-offs**:
- No database-level validation
- Requires client-side parsing
- Can't query JSON contents directly
**Implementation**: Validate JSON on write, parse on read

### Pattern: Status-Based Workflow
**Context**: Ontologies need lifecycle management
**Pattern**:
```
Draft → Testing → Published → Deprecated
```
**Benefits**:
- Clear state transitions
- Audit trail capability
- Predictable lifecycle
**Trade-offs**:
- Manual status updates
- No automatic transitions
**Implementation**: Enforce transitions in application logic

### Pattern: Versioning Through Copies
**Context**: Need to track ontology versions
**Pattern**:
- Version field for tracking
- Copy record for new versions
- Link versions through formula field
**Benefits**:
- Complete history
- Easy rollback
- Compare versions
**Trade-offs**:
- Data duplication
- Manual version management
**Implementation**: Create version management utilities

### Pattern: View-Based Access Control
**Context**: Different users need different data subsets
**Pattern**:
```javascript
// Use views for filtered access
const publishedOntologies = await mcp.airtable.list_records({
  baseId: BASE_ID,
  tableId: ONTOLOGIES_TABLE,
  view: "Published Ontologies"
});
```
**Benefits**:
- Pre-filtered data
- Consistent queries
- Airtable-managed filters
**Trade-offs**:
- Views must be pre-created
- Less dynamic than formulas
**Implementation**: Create views for common access patterns

### Pattern: Batch Operations with Rate Limiting
**Context**: Need to handle Airtable's 5 req/sec limit
**Pattern**:
```javascript
class AirtableBatcher {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  async batch(operations) {
    // Chunk operations
    const chunks = chunk(operations, 10);
    
    // Process with delays
    for (const chunk of chunks) {
      await this.process(chunk);
      await delay(200); // Respect rate limit
    }
  }
}
```
**Benefits**:
- Avoid rate limit errors
- Efficient bulk operations
- Predictable performance
**Trade-offs**:
- Higher latency
- Complex error handling
**Implementation**: Build batching utility class

### Pattern: Linked Records for Relationships
**Context**: Need to model graph relationships
**Pattern**:
```javascript
// Use linked record fields
{
  "EntityDefinitions": ["rec123", "rec456"],
  "EdgeDefinitions": ["rec789"]
}
```
**Benefits**:
- Native relationship support
- Bidirectional links
- Automatic updates
**Trade-offs**:
- Limited to Airtable records
- Can't model complex relationships
**Implementation**: Use multiple record links for many-to-many

### Pattern: Client-Side Caching
**Context**: Minimize API calls and improve performance
**Pattern**:
```javascript
class AirtableCache {
  cache = new Map();
  ttl = 5 * 60 * 1000; // 5 minutes
  
  async get(key, fetcher) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.ttl) {
        return data;
      }
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```
**Benefits**:
- Reduced API calls
- Faster response times
- Lower costs
**Trade-offs**:
- Potential stale data
- Memory usage
- Cache invalidation complexity
**Implementation**: TTL-based cache with manual invalidation

### Pattern: Formula Fields for Derived Data
**Context**: Need calculated/derived values
**Pattern**:
```airtable
// Airtable formula examples
CONCATENATE({Entity Name}, " - ", {Version})
IF({Status} = "Published", "✅", "⏳")
```
**Benefits**:
- Automatic calculations
- Always up-to-date
- No application logic needed
**Trade-offs**:
- Limited formula language
- Can't use external data
- Performance for complex formulas
**Implementation**: Use for simple calculations only

## Anti-Patterns to Avoid

### ❌ Direct API Calls
Don't bypass MCP for direct Airtable API access

### ❌ Storing Large Files
Don't store files >5MB in attachment fields

### ❌ Complex Queries in Formulas
Don't use filterByFormula for complex joins

### ❌ Ignoring Rate Limits
Don't make rapid-fire API calls without throttling

### ❌ Deep Nesting in JSON
Don't create deeply nested JSON structures

## Best Practices

1. **Always use MCP tools** for Airtable operations
2. **Cache aggressively** but invalidate smartly
3. **Batch operations** when possible
4. **Use views** for common queries
5. **Validate JSON** before storing
6. **Monitor rate limits** proactively
7. **Document JSON schemas** thoroughly
8. **Test with production-like data** volumes