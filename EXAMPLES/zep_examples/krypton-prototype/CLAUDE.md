# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains scraped documentation from Zep, a context engineering platform for AI agents. The documentation is stored as Markdown files within the `zep_documentation/` directory.

## Project Structure

```
/
├── zep_documentation/        # Main documentation directory
│   ├── *.md                 # Core documentation files
│   ├── cdn-cgi/             # CDN-related content
│   ├── cookbook/            # Practical recipes and patterns
│   ├── docs/                # Additional documentation
│   ├── graphiti/            # Graphiti framework documentation
│   │   ├── configuration/   # Graph DB and LLM configuration
│   │   ├── core-concepts/   # Core Graphiti concepts
│   │   ├── getting-started/ # Quickstart guides
│   │   ├── integrations/    # Integration guides
│   │   └── working-with-data/ # Data manipulation guides
│   ├── sdk-reference/       # SDK API documentation
│   │   ├── graph/          # Graph API methods
│   │   ├── thread/         # Thread API methods
│   │   └── user/           # User API methods
│   └── v3/                  # Version 3 documentation mirror
```

## Key Concepts

The documentation covers:
- **Zep Platform**: A context engineering platform for building AI agents with persistent memory
- **Knowledge Graphs**: Temporal knowledge graphs that track entities, relationships, and facts over time
- **Graphiti**: Open-source temporal knowledge graph framework
- **Agent Memory**: Systems for storing and retrieving user context and conversation history
- **Dynamic Graph RAG**: Real-time knowledge graph updates without batch recomputation

## Documentation Content

The repository contains documentation covering:
- Quickstart guides for Python, TypeScript, and Go SDKs
- API reference for graph, thread, and user operations
- Cookbook examples for common use cases
- Migration guides (Mem0 to Zep, v2 to v3)
- Performance optimization strategies
- MCP server integration for AI assistants

## Important Files

- `index.md` - Main documentation entry point
- `quickstart.md` - Getting started guide with code examples
- `concepts.md` - Core platform concepts and architecture
- `SCRAPING_SUMMARY.md` - Summary of all scraped documentation files
- `graphiti.md` - Introduction to the Graphiti framework