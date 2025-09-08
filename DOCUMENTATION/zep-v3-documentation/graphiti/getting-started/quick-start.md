# Quick Start | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/getting-started/quick-start  
**Scraped:** 2025-08-29 13:02:06

---

##### 

For complete working examples, check out the [Graphiti Quickstart Examples](https://github.com/getzep/graphiti/tree/main/examples/quickstart) on GitHub.

## Installation

Requirements:

  * Python 3.10 or higher
  * Neo4j 5.26 or higher or FalkorDB 1.1.2 or higher (see [Graph Database Configuration](/v3/graphiti/configuration/graph-db-configuration) for setup options)
  * OpenAI API key (Graphiti defaults to OpenAI for LLM inference and embedding)

##### 

The simplest way to install Neo4j is via [Neo4j Desktop](https://neo4j.com/download/). It provides a user-friendly interface to manage Neo4j instances and databases.
    
    
    $| pip install graphiti-core  
    ---|---  
  
or
    
    
    $| uv add graphiti-core  
    ---|---  
  
### Alternative LLM Providers

##### 

While Graphiti defaults to OpenAI, it supports multiple LLM providers including Azure OpenAI, Google Gemini, Anthropic, Groq, and local models via Ollama. For detailed configuration instructions, see our [LLM Configuration](/v3/graphiti/configuration/llm-configuration) guide.

### Default to Slower, Low Concurrency; LLM Provider 429 Rate Limit Errors

Graphiti’s ingestion pipelines are designed for high concurrency. By default, concurrency is set low to avoid LLM Provider 429 Rate Limit Errors. If you find Graphiti slow, please increase concurrency as described below.

Concurrency controlled by the `SEMAPHORE_LIMIT` environment variable. By default, `SEMAPHORE_LIMIT` is set to `10` concurrent operations to help prevent `429` rate limit errors from your LLM provider. If you encounter such errors, try lowering this value.

If your LLM provider allows higher throughput, you can increase `SEMAPHORE_LIMIT` to boost episode ingestion performance.

### Environment Variables

Set your OpenAI API key:
    
    
    $| export OPENAI_API_KEY=your_openai_api_key_here  
    ---|---  
  
#### Optional Variables

  * `USE_PARALLEL_RUNTIME`: Enable Neo4j’s parallel runtime feature for search queries (not supported in Community Edition)
  * `GRAPHITI_TELEMETRY_ENABLED`: Set to `false` to disable anonymous telemetry collection

## Getting Started with Graphiti

For a comprehensive overview of Graphiti and its capabilities, check out the [Overview](/v3/graphiti/getting-started/overview) page.

### Required Imports

First, import the necessary libraries for working with Graphiti:
    
    
    1| import asyncio  
    ---|---  
    2| import json  
    3| import logging  
    4| import os  
    5| from datetime import datetime, timezone  
    6| from logging import INFO  
    7|   
    8| from dotenv import load_dotenv  
    9|   
    10| from graphiti_core import Graphiti  
    11| from graphiti_core.nodes import EpisodeType  
    12| from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_RRF  
  
### Configuration

##### 

Graphiti uses OpenAI by default for LLM inference and embedding. Ensure that an `OPENAI_API_KEY` is set in your environment. Support for multiple LLM providers is available - see our [LLM Configuration](/v3/graphiti/configuration/llm-configuration) guide.

Graphiti also requires Neo4j connection parameters. Set the following environment variables:

  * `NEO4J_URI`: The URI of your Neo4j database (default: bolt://localhost:7687)
  * `NEO4J_USER`: Your Neo4j username (default: neo4j)
  * `NEO4J_PASSWORD`: Your Neo4j password

For detailed database setup instructions, see our [Graph Database Configuration](/v3/graphiti/configuration/graph-db-configuration) guide.

Set up logging and environment variables for connecting to the Neo4j database:
    
    
    1| # Configure logging  
    ---|---  
    2| logging.basicConfig(  
    3|     level=INFO,  
    4|     format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  
    5|     datefmt='%Y-%m-%d %H:%M:%S',  
    6| )  
    7| logger = logging.getLogger(__name__)  
    8|   
    9| load_dotenv()  
    10|   
    11| # Neo4j connection parameters  
    12| # Make sure Neo4j Desktop is running with a local DBMS started  
    13| neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')  
    14| neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')  
    15| neo4j_password = os.environ.get('NEO4J_PASSWORD', 'password')  
    16|   
    17| if not neo4j_uri or not neo4j_user or not neo4j_password:  
    18|     raise ValueError('NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set')  
  
### Main Function

Create an async main function to run all Graphiti operations:
    
    
    1| async def main():  
    ---|---  
    2|     # Main function implementation will go here  
    3|     pass  
    4|   
    5| if __name__ == '__main__':  
    6|     asyncio.run(main())  
  
### Initialization

Connect to Neo4j and set up Graphiti indices. This is required before using other Graphiti functionality:
    
    
    1| # Initialize Graphiti with Neo4j connection  
    ---|---  
    2| graphiti = Graphiti(neo4j_uri, neo4j_user, neo4j_password)  
    3|   
    4| try:  
    5|     # Initialize the graph database with graphiti's indices. This only needs to be done once.  
    6|     await graphiti.build_indices_and_constraints()  
    7|       
    8|     # Additional code will go here  
    9|       
    10| finally:  
    11|     # Close the connection  
    12|     await graphiti.close()  
    13|     print('\nConnection closed')  
  
### Adding Episodes

Episodes are the primary units of information in Graphiti. They can be text or structured JSON and are automatically processed to extract entities and relationships. For more detailed information on episodes and bulk loading, see the [Adding Episodes](/v3/graphiti/core-concepts/adding-episodes) page:
    
    
    1| # Episodes list containing both text and JSON episodes  
    ---|---  
    2| episodes = [  
    3|     {  
    4|         'content': 'Kamala Harris is the Attorney General of California. She was previously '  
    5|         'the district attorney for San Francisco.',  
    6|         'type': EpisodeType.text,  
    7|         'description': 'podcast transcript',  
    8|     },  
    9|     {  
    10|         'content': 'As AG, Harris was in office from January 3, 2011 – January 3, 2017',  
    11|         'type': EpisodeType.text,  
    12|         'description': 'podcast transcript',  
    13|     },  
    14|     {  
    15|         'content': {  
    16|             'name': 'Gavin Newsom',  
    17|             'position': 'Governor',  
    18|             'state': 'California',  
    19|             'previous_role': 'Lieutenant Governor',  
    20|             'previous_location': 'San Francisco',  
    21|         },  
    22|         'type': EpisodeType.json,  
    23|         'description': 'podcast metadata',  
    24|     },  
    25|     {  
    26|         'content': {  
    27|             'name': 'Gavin Newsom',  
    28|             'position': 'Governor',  
    29|             'term_start': 'January 7, 2019',  
    30|             'term_end': 'Present',  
    31|         },  
    32|         'type': EpisodeType.json,  
    33|         'description': 'podcast metadata',  
    34|     },  
    35| ]  
    36|   
    37| # Add episodes to the graph  
    38| for i, episode in enumerate(episodes):  
    39|     await graphiti.add_episode(  
    40|         name=f'Freakonomics Radio {i}',  
    41|         episode_body=episode['content']  
    42|         if isinstance(episode['content'], str)  
    43|         else json.dumps(episode['content']),  
    44|         source=episode['type'],  
    45|         source_description=episode['description'],  
    46|         reference_time=datetime.now(timezone.utc),  
    47|     )  
    48|     print(f'Added episode: Freakonomics Radio {i} ({episode["type"].value})')  
  
### Basic Search

The simplest way to retrieve relationships (edges) from Graphiti is using the search method, which performs a hybrid search combining semantic similarity and BM25 text retrieval. For more details on search capabilities, see the [Searching the Graph](/v3/graphiti/working-with-data/searching) page:
    
    
    1| # Perform a hybrid search combining semantic similarity and BM25 retrieval  
    ---|---  
    2| print("\nSearching for: 'Who was the California Attorney General?'")  
    3| results = await graphiti.search('Who was the California Attorney General?')  
    4|   
    5| # Print search results  
    6| print('\nSearch Results:')  
    7| for result in results:  
    8|     print(f'UUID: {result.uuid}')  
    9|     print(f'Fact: {result.fact}')  
    10|     if hasattr(result, 'valid_at') and result.valid_at:  
    11|         print(f'Valid from: {result.valid_at}')  
    12|     if hasattr(result, 'invalid_at') and result.invalid_at:  
    13|         print(f'Valid until: {result.invalid_at}')  
    14|     print('---')  
  
### Center Node Search

For more contextually relevant results, you can use a center node to rerank search results based on their graph distance to a specific node. This is particularly useful for entity-specific queries as described in the [Searching the Graph](/v3/graphiti/working-with-data/searching) page:
    
    
    1| # Use the top search result's UUID as the center node for reranking  
    ---|---  
    2| if results and len(results) > 0:  
    3|     # Get the source node UUID from the top result  
    4|     center_node_uuid = results[0].source_node_uuid  
    5|   
    6|     print('\nReranking search results based on graph distance:')  
    7|     print(f'Using center node UUID: {center_node_uuid}')  
    8|   
    9|     reranked_results = await graphiti.search(  
    10|         'Who was the California Attorney General?', center_node_uuid=center_node_uuid  
    11|     )  
    12|   
    13|     # Print reranked search results  
    14|     print('\nReranked Search Results:')  
    15|     for result in reranked_results:  
    16|         print(f'UUID: {result.uuid}')  
    17|         print(f'Fact: {result.fact}')  
    18|         if hasattr(result, 'valid_at') and result.valid_at:  
    19|             print(f'Valid from: {result.valid_at}')  
    20|         if hasattr(result, 'invalid_at') and result.invalid_at:  
    21|             print(f'Valid until: {result.invalid_at}')  
    22|         print('---')  
    23| else:  
    24|     print('No results found in the initial search to use as center node.')  
  
### Node Search Using Search Recipes

Graphiti provides predefined search recipes optimized for different search scenarios. Here we use NODE_HYBRID_SEARCH_RRF for retrieving nodes directly instead of edges. For a complete list of available search recipes and reranking approaches, see the [Configurable Search Strategies](/v3/graphiti/working-with-data/searching#configurable-search-strategies) section in the Searching documentation:
    
    
    1| # Example: Perform a node search using _search method with standard recipes  
    ---|---  
    2| print(  
    3|     '\nPerforming node search using _search method with standard recipe NODE_HYBRID_SEARCH_RRF:'  
    4| )  
    5|   
    6| # Use a predefined search configuration recipe and modify its limit  
    7| node_search_config = NODE_HYBRID_SEARCH_RRF.model_copy(deep=True)  
    8| node_search_config.limit = 5  # Limit to 5 results  
    9|   
    10| # Execute the node search  
    11| node_search_results = await graphiti._search(  
    12|     query='California Governor',  
    13|     config=node_search_config,  
    14| )  
    15|   
    16| # Print node search results  
    17| print('\nNode Search Results:')  
    18| for node in node_search_results.nodes:  
    19|     print(f'Node UUID: {node.uuid}')  
    20|     print(f'Node Name: {node.name}')  
    21|     node_summary = node.summary[:100] + '...' if len(node.summary) > 100 else node.summary  
    22|     print(f'Content Summary: {node_summary}')  
    23|     print(f"Node Labels: {', '.join(node.labels)}")  
    24|     print(f'Created At: {node.created_at}')  
    25|     if hasattr(node, 'attributes') and node.attributes:  
    26|         print('Attributes:')  
    27|         for key, value in node.attributes.items():  
    28|             print(f'  {key}: {value}')  
    29|     print('---')  
  
### Complete Example

For a complete working example that puts all these concepts together, check out the [Graphiti Quickstart Examples](https://github.com/getzep/graphiti/tree/main/examples/quickstart) on GitHub.

## Next Steps

Now that you’ve learned the basics of Graphiti, you can explore more advanced features:

  * [Custom Entity and Edge Types](/v3/graphiti/core-concepts/custom-entity-and-edge-types): Learn how to define and use custom entity and edge types to better model your domain-specific knowledge
  * [Communities](/v3/graphiti/core-concepts/communities): Discover how to work with communities, which are groups of related nodes that share common attributes or relationships
  * [Advanced Search Techniques](/v3/graphiti/working-with-data/searching): Explore more sophisticated search strategies, including different reranking approaches and configurable search recipes
  * [Adding Fact Triples](/v3/graphiti/working-with-data/adding-fact-triples): Learn how to directly add fact triples to your graph for more precise knowledge representation
  * [Agent Integration](/v3/graphiti/integrations/lang-graph-agent): Discover how to integrate Graphiti with LLM agents for more powerful AI applications

##### 

Make sure to run await statements within an [async function](https://docs.python.org/3/library/asyncio-task.html).
