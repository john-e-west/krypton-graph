# Zep & Graphiti POC Summary

## Overview
Successfully built and tested a proof of concept with Zep's context engineering platform and the Graphiti framework for temporal knowledge graphs.

## Completed Goals

### 1. ✅ Connected to Zep using Python
- Installed `zep-cloud` SDK via pip
- Configured API key in `.env` file
- Successfully established connection to Zep Cloud

### 2. ✅ Created Graph and User Graph
- **General Graph**: Created with custom ID (`graph_id`)
- **User Graph**: Created user with associated thread (`user_id`)
- Both graph types successfully store and process data

### 3. ✅ Researched Edge and Entity Types

#### Key Findings:

**Default Entity Types (automatically applied to user graphs):**
- User, Assistant, Preference, Location, Event, Object, Topic, Organization, Document

**Default Edge Types:**
- LocatedAt, OccurredAt, ParticipatedIn, Owns, Uses, WorksFor, Discusses, RelatesTo

**Important Differences:**
- **User Graphs**: Automatically use default entity/edge types to classify extracted information
- **General Graphs**: Don't use types by default; require explicit custom type setting
- This explains why user graphs show typed entities while general graphs don't unless configured

### 4. ✅ Implemented Custom Entity and Edge Types

Created custom types for tech domain:
- **Entities**: TechnologyCompany, Developer, Project
- **Edges**: EmployedBy, WorksOn, Develops

Successfully applied custom types to:
- Specific graphs using `graph_ids` parameter
- Specific users using `user_ids` parameter
- Project-wide (when no IDs specified)

### 5. ✅ Generated and Tested Sample Data

Test results show:
- User graphs successfully extract facts and relationships from conversations
- Context retrieval works well for user threads
- Data processing requires time (async processing in background)
- Search functionality works with type filtering

## Project Structure

```
krypton-prototype/
├── .env                           # API configuration (gitignored)
├── .gitignore                     # Git ignore rules
├── requirements.txt               # Python dependencies
├── zep_poc.py                    # Basic POC script
├── zep_entity_edge_types_poc.py # Entity/Edge types research
├── zep_comprehensive_test.py    # Complete functionality test
├── ZEP_POC_SUMMARY.md           # This summary
├── CLAUDE.md                    # Documentation for Claude Code
└── zep_documentation/           # Scraped Zep documentation
```

## Key Insights

1. **Graph Types Matter**: User graphs and general graphs behave differently regarding type systems
2. **Processing Time**: Data needs time to be processed into the knowledge graph (async)
3. **Type Flexibility**: Can override defaults with custom types for specific use cases
4. **Ontology Scope**: Types can be set project-wide or for specific graphs/users
5. **Type Classification**: Each entity/edge is classified into exactly one type or none

## API Usage Examples

### Creating a Graph
```python
graph = client.graph.create(
    graph_id="my_graph",
    name="My Knowledge Graph",
    description="Description"
)
```

### Setting Custom Types
```python
client.graph.set_ontology(
    graph_ids=["graph_id"],  # Optional: specific graphs
    user_ids=["user_id"],    # Optional: specific users
    entities={"EntityName": EntityClass},
    edges={"EDGE_TYPE": (EdgeClass, [EntityEdgeSourceTarget(...)])}
)
```

### Adding Data
```python
# JSON data
client.graph.add(graph_id=graph_id, type="json", data=json_string)

# Text data
client.graph.add(graph_id=graph_id, type="text", data=text_string)

# Messages (for user threads)
client.thread.add_messages(thread_id, messages=[Message(...)])
```

### Searching with Type Filters
```python
results = client.graph.search(
    graph_id=graph_id,  # or user_id for user graphs
    query="search query",
    scope="nodes",  # or "edges"
    search_filters={"node_labels": ["TypeName"]},
    limit=10
)
```

## Next Steps

To extend this POC:
1. Implement more complex custom entity/edge types with validation
2. Test batch data ingestion for larger datasets
3. Explore fact invalidation and temporal aspects
4. Build agentic tools using Zep's search APIs
5. Test performance with concurrent operations
6. Integrate with LangChain/LangGraph for agent applications

## Resources

- [Zep Documentation](https://help.getzep.com/)
- [Graphiti Framework](https://help.getzep.com/graphiti)
- API Key Management: Store in `.env` file
- Dashboard: https://app.getzep.com/ (view graphs visually)