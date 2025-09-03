# Coding with LLMs | Zep Documentation

**Source URL:** https://help.getzep.com/v3/coding-with-llms  
**Scraped:** 2025-08-29 13:01:52

---

Zep provides tools that give AI coding assistants direct access to Zep’s documentation: a real-time MCP server and standardized llms.txt files for enhanced code generation and troubleshooting.

## Docs MCP Server

Zep’s Docs MCP server gives AI assistants real-time access to search Zep’s complete documentation.

**Server details:**

  * URL: `docs-mcp.getzep.com`
  * Type: Search-based with SSE transport
  * Capabilities: Real-time documentation search and retrieval

### Setting up the MCP server

###### Claude Code

###### Cursor

###### Other SSE clients

Add the SSE server using the CLI:
    
    
    $| claude mcp add --transport sse zep-docs https://docs-mcp.getzep.com/sse  
    ---|---  
  
### Using the MCP server

Once configured, AI assistants can automatically:

  * Search Zep concepts and features
  * Find code examples and tutorials
  * Access current API documentation
  * Retrieve troubleshooting information

## llms.txt

Zep publishes standardized `llms.txt` files containing essential information for AI coding assistants:

  * Core concepts and architecture
  * Usage patterns and examples
  * API reference summaries
  * Best practices and troubleshooting
  * Framework integration examples

### Accessing llms.txt

Zep provides two versions of the llms.txt file:

**Standard version** (recommended for most use cases):
    
    
    https://help.getzep.com/llms.txt  
    ---  
  
**Comprehensive version** (for advanced use cases):
    
    
    https://help.getzep.com/llms-full.txt  
    ---  
  
The standard version contains curated essentials, while the comprehensive version includes complete documentation but is much larger. Most AI assistants work better with the standard version due to context limitations.
