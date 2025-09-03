# Knowledge Graph MCP Server | Zep Documentation

**Source URL:** https://help.getzep.com/graphiti/getting-started/mcp-server  
**Scraped:** 2025-08-29 13:00:19

---

What is the Graphiti MCP Server?

The Graphiti MCP Server is an experimental implementation that exposes Graphiti’s key functionality through the Model Context Protocol (MCP). This enables AI assistants like Claude Desktop and Cursor to interact with Graphiti’s knowledge graph capabilities, providing persistent memory and contextual awareness.

The Graphiti MCP Server bridges AI assistants with Graphiti’s temporally-aware knowledge graphs, allowing assistants to maintain persistent memory across conversations and sessions. By integrating through MCP, assistants can automatically store, retrieve, and reason with information from their interactions.

## Key Features

The MCP server exposes Graphiti’s core capabilities:

  * **Episode Management** : Add, retrieve, and delete episodes (text, messages, or JSON data)
  * **Entity Management** : Search and manage entity nodes and relationships
  * **Search Capabilities** : Semantic and hybrid search for facts and node summaries
  * **Group Management** : Organize data with group_id filtering for multi-user scenarios
  * **Graph Maintenance** : Clear graphs and rebuild indices as needed

## Quick Start with OpenAI

##### 

This quick start assumes you have OpenAI API access. For other LLM providers and detailed configuration options, see the [MCP Server README](https://github.com/getzep/graphiti/blob/main/mcp_server/README.md).

### Prerequisites

Before getting started, ensure you have:

  1. **Python 3.10+** installed on your system
  2. **Neo4j database** (version 5.26 or later) running locally or accessible remotely
  3. **OpenAI API key** for LLM operations and embeddings

### Installation

  1. Clone the Graphiti repository:

    
    
    $| git clone https://github.com/getzep/graphiti.git  
    ---|---  
    >| cd graphiti  
  
  2. Navigate to the MCP server directory and install dependencies:

    
    
    $| cd mcp_server  
    ---|---  
    >| uv sync  
  
### Configuration

Set up your environment variables in a `.env` file:
    
    
    $| # Required  
    ---|---  
    >| OPENAI_API_KEY=your_openai_api_key_here  
    >| MODEL_NAME=gpt-4o-mini  
    >|   
    >| # Neo4j Configuration (adjust as needed)  
    >| NEO4J_URI=bolt://localhost:7687  
    >| NEO4J_USER=neo4j  
    >| NEO4J_PASSWORD=your_neo4j_password  
  
### Running the Server

Start the MCP server:
    
    
    $| uv run graphiti_mcp_server.py  
    ---|---  
  
For development with custom options:
    
    
    $| uv run graphiti_mcp_server.py --model gpt-4o-mini --transport sse --group-id my-project  
    ---|---  
  
## MCP Client Integration

### Claude Desktop

Configure Claude Desktop to connect via the stdio transport:
    
    
    1| {  
    ---|---  
    2|   "mcpServers": {  
    3|     "graphiti-memory": {  
    4|       "transport": "stdio",  
    5|       "command": "/path/to/uv",  
    6|       "args": [  
    7|         "run",  
    8|         "--directory",  
    9|         "/path/to/graphiti/mcp_server",  
    10|         "graphiti_mcp_server.py",  
    11|         "--transport",  
    12|         "stdio"  
    13|       ],  
    14|       "env": {  
    15|         "OPENAI_API_KEY": "your_api_key",  
    16|         "MODEL_NAME": "gpt-4o-mini",  
    17|         "NEO4J_URI": "bolt://localhost:7687",  
    18|         "NEO4J_USER": "neo4j",  
    19|         "NEO4J_PASSWORD": "your_password"  
    20|       }  
    21|     }  
    22|   }  
    23| }  
  
### Cursor IDE

For Cursor, use the SSE transport configuration:
    
    
    1| {  
    ---|---  
    2|   "mcpServers": {  
    3|     "graphiti-memory": {  
    4|       "url": "http://localhost:8000/sse"  
    5|     }  
    6|   }  
    7| }  
  
## Available Tools

Once connected, AI assistants have access to these Graphiti tools:

  * `add_memory` \- Store episodes and interactions in the knowledge graph
  * `search_facts` \- Find relevant facts and relationships
  * `search_nodes` \- Search for entity summaries and information
  * `get_episodes` \- Retrieve recent episodes for context
  * `delete_episode` \- Remove episodes from the graph
  * `clear_graph` \- Reset the knowledge graph entirely

## Docker Deployment

For containerized deployment, use the provided Docker Compose setup:
    
    
    $| docker compose up  
    ---|---  
  
This starts both Neo4j and the MCP server with SSE transport enabled.

## Next Steps

For comprehensive configuration options, advanced features, and troubleshooting:

  * **Full Documentation** : See the complete [MCP Server README](https://github.com/getzep/graphiti/blob/main/mcp_server/README.md)
  * **Integration Examples** : Explore client-specific setup guides for Claude Desktop and Cursor
  * **Custom Entity Types** : Configure domain-specific entity extraction
  * **Multi-tenant Setup** : Use group IDs for organizing data across different contexts

##### 

The MCP server is experimental and under active development. Features and APIs may change between releases.
