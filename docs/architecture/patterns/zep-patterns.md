# Architecture Patterns from Zep POC

## Knowledge Graph Patterns

### Pattern: Entity-Edge-Attribute Model
**Source**: krypton-prototype/zep_entity_edge_types_poc.py
**Context**: Need flexible schema for knowledge representation
**Pattern**:
```python
class Entity(EntityModel):
    # Typed attributes using Pydantic
    attribute1: EntityText
    attribute2: EntityInt
    attribute3: EntityBoolean
    
class Edge(EdgeModel):
    # Relationship properties
    property1: EntityText
    property2: EntityFloat
```
**Benefits**:
- Type safety with flexibility
- Extensible attributes
- Clear data model
- Validation built-in
**Trade-offs**:
- More complex than flat tables
- Requires type definitions upfront
**Adaptation**: Store as JSON in Airtable Properties field

### Pattern: Ontology as Configuration
**Source**: krypton-prototype/zep_entity_edge_types_poc.py
**Context**: Different graphs need different entity/edge types
**Pattern**:
```python
client.graph.set_ontology(
    graph_ids=["specific_graph"],  # Scoped configuration
    entities={"Company": CompanyClass},
    edges={"EMPLOYS": EmploysEdge}
)
```
**Benefits**:
- Per-graph customization
- Reusable type definitions
- Clear scope boundaries
- Override defaults selectively
**Trade-offs**:
- Configuration complexity
- Multiple ontology versions
**Adaptation**: Link Airtable records to specific ontology versions

### Pattern: Episode-Based Processing
**Source**: krypton-prototype/zep_episode_analysis.py
**Context**: Group related changes for atomic processing
**Pattern**:
```python
episode = client.graph.add(data)
wait_for_processing(episode.uuid)
check_results(episode.uuid)
```
**Benefits**:
- Atomic operations
- Rollback capability
- Processing status tracking
- Audit trail
**Trade-offs**:
- Async complexity
- Processing delays
**Adaptation**: Batch Airtable operations with transaction IDs

### Pattern: Snapshot-Compare-Rollback
**Source**: krypton-prototype/zep_impact_assessment.py
**Context**: Preview changes before committing
**Pattern**:
```python
before = capture_snapshot()
episode = add_data()
after = capture_snapshot()
impact = compare(before, after)
if not acceptable:
    rollback(episode)
```
**Benefits**:
- Safe experimentation
- Impact visibility
- Undo capability
- Change metrics
**Trade-offs**:
- Performance overhead
- Storage for snapshots
**Adaptation**: Preview Airtable changes in staging table

### Pattern: Type-Filtered Search
**Source**: krypton-prototype/zep_comprehensive_test.py
**Context**: Search within specific entity/edge types
**Pattern**:
```python
results = client.graph.search(
    query="search terms",
    scope="nodes",
    search_filters={"node_labels": ["Company", "Developer"]}
)
```
**Benefits**:
- Targeted searches
- Better performance
- Type-aware results
- Reduced noise
**Trade-offs**:
- Requires type knowledge
- More complex queries
**Adaptation**: Use Airtable filterByFormula with type fields

### Pattern: Dual Graph Types
**Source**: krypton-prototype/ZEP_POC_SUMMARY.md
**Context**: Different behavior for user vs general graphs
**Pattern**:
```python
# User graphs - automatic typing
user_graph = client.user.create(user_id)

# General graphs - explicit typing
general_graph = client.graph.create(graph_id)
client.graph.set_ontology(graph_ids=[graph_id])
```
**Benefits**:
- Specialized behavior
- User context preservation
- Flexible general graphs
**Trade-offs**:
- Two mental models
- Different APIs
**Adaptation**: Use Airtable views to separate user/general data

### Pattern: Natural Language Extraction
**Source**: krypton-prototype/sample_conversation.txt usage
**Context**: Build graphs from unstructured text
**Pattern**:
```python
# Text to graph
client.graph.add(
    graph_id=graph_id,
    type="text",
    data=conversation_text
)
# Automatic entity/relationship extraction
```
**Benefits**:
- Low-friction data input
- Handles unstructured data
- Discovers implicit relationships
**Trade-offs**:
- AI dependency
- Extraction accuracy
- Processing time
**Adaptation**: Use AI to extract, then store in Airtable

### Pattern: JSON Schema Mapping
**Source**: krypton-prototype/sample_company_data.json
**Context**: Import structured data into graph
**Pattern**:
```python
# Direct JSON to graph
client.graph.add(
    graph_id=graph_id,
    type="json",
    data=json.dumps(company_data)
)
```
**Benefits**:
- Preserves structure
- Batch import
- Type inference
**Trade-offs**:
- Requires clean JSON
- Schema assumptions
**Adaptation**: Parse JSON, map to Airtable schema

### Pattern: Temporal Fact Management
**Source**: krypton-prototype/zep_impact_assessment.py
**Context**: Facts valid for specific time periods
**Pattern**:
```python
edge = {
    "fact": "Jane is CEO of TechCorp",
    "valid_at": "2020-01-01",
    "invalid_at": "2023-12-31"
}
```
**Benefits**:
- Historical accuracy
- Time-based queries
- Fact evolution
**Trade-offs**:
- Storage overhead
- Query complexity
**Adaptation**: Add valid_from/valid_to fields in Airtable

### Pattern: Processing Status Tracking
**Source**: krypton-prototype/zep_comprehensive_test.py
**Context**: Monitor async operations
**Pattern**:
```python
episode = submit_data()
while not episode.processed:
    time.sleep(2)
    episode = check_status(episode.uuid)
```
**Benefits**:
- Async operations
- Progress visibility
- Error detection
**Trade-offs**:
- Polling overhead
- Latency
**Adaptation**: Status field in Airtable with automation triggers

## Anti-Patterns from POC

### ❌ Hardcoded Search Queries
POC uses broad hardcoded queries - should be dynamic

### ❌ No Pagination
POC limits results to 50 - production needs pagination

### ❌ Missing Error Recovery
POC has basic error handling - needs retry logic

### ❌ Synchronous Waiting
POC blocks on processing - should use callbacks/webhooks

## Key Insights for Adaptation

1. **Ontology-First Design**: Define types before data
2. **Episode Batching**: Group related changes
3. **Type Safety**: Use Pydantic-style models
4. **Temporal Tracking**: Include time dimensions
5. **Impact Preview**: Test changes before commit
6. **Dual Processing**: Sync for simple, async for complex
7. **Search Optimization**: Type-filtered queries
8. **Flexible Attributes**: JSON for extensibility