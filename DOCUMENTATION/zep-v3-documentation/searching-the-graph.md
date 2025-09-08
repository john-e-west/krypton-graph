# Searching the Graph | Zep Documentation

**Source URL:** https://help.getzep.com/v3/searching-the-graph  
**Scraped:** 2025-08-29 13:00:23

---

##### Custom Context Blocks

Graph search results should be used in conjunction with [Custom Context Blocks](/v3/cookbook/customize-your-context-block) to create rich, contextual prompts for AI models. Custom context blocks allow you to format and structure the retrieved graph information, combining search results with conversation history and other relevant data to provide comprehensive context for your AI applications.

Learn how to integrate graph search results into your context generation workflow for more effective AI interactions.

## Introduction

Zep’s graph search provides powerful hybrid search capabilities that combine semantic similarity with BM25 full-text search to find relevant information across your knowledge graph. This approach leverages the best of both worlds: semantic understanding for conceptual matches and full-text search for exact term matching. Additionally, you can optionally enable breadth-first search to bias results toward information connected to specific starting points in your graph.

### How It Works

  * **Semantic similarity** : Converts queries into embeddings to find conceptually similar content
  * **BM25 full-text search** : Performs traditional keyword-based search for exact matches
  * **Breadth-first search** (optional): Biases results toward information connected to specified starting nodes, useful for contextual relevance
  * **Hybrid results** : Combines and reranks results using sophisticated algorithms

### Graph Concepts

  * **Nodes** : Connection points representing entities (people, places, concepts) discussed in conversations or added via the Graph API
  * **Edges** : Relationships between nodes containing specific facts and interactions

The example below demonstrates a simple search:

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query=query,  
    10| )  
  
##### Best Practices

Keep queries short: they are truncated at 400 characters. Long queries may increase latency without improving search quality. Break down complex searches into smaller, targeted queries. Use precise, contextual queries rather than generic ones

## Configurable Parameters

Zep provides extensive configuration options to fine-tune search behavior and optimize results for your specific use case:

Parameter| Type| Description| Default| Required  
---|---|---|---|---  
`graph_id`| string| Search within a graph| -| Yes*  
`user_id`| string| Search within a user graph| -| Yes*  
`query`| string| Search text (max 400 characters)| -| Yes  
`scope`| string| Search target: `"edges"`, `"nodes"`, or `"episodes"`| `"edges"`| No  
`reranker`| string| Reranking method: `"rrf"`, `"mmr"`, `"node_distance"`, `"episode_mentions"`, or `"cross_encoder"`| `"rrf"`| No  
`limit`| integer| Maximum number of results to return| `10`| No  
`mmr_lambda`| float| MMR diversity vs relevance balance (0.0-1.0)| -| No†  
`center_node_uuid`| string| Center node for distance-based reranking| -| No‡  
`search_filters`| object| Filter by entity types (`node_labels`), edge types (`edge_types`), or timestamps (`created_at`, `expired_at`, `invalid_at`, `valid_at`§)| -| No  
`bfs_origin_node_uuids`| array| Node UUIDs to seed breadth-first searches from| -| No  
`min_fact_rating`| double| The minimum rating by which to filter relevant facts (range: 0.0-1.0). Can only be used when using `scope="edges"`| -| No  
  
*Either `user_id` OR `graph_id` is required †Required when using `mmr` reranker  
‡Required when using `node_distance` reranker  
§Timestamp filtering only applies to edge scope searches

## Search Scopes

Zep supports three different search scopes, each optimized for different types of information retrieval:

### Edges (Default)

Edges represent individual relationships and facts between entities in your graph. They contain specific interactions, conversations, and detailed information. Edge search is ideal for:

  * Finding specific details or conversations
  * Retrieving precise facts about relationships
  * Getting granular information about interactions

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| # Edge search (default scope)  
    8| search_results = client.graph.search(  
    9|     user_id=user_id,  
    10|     query="What did John say about the project?",  
    11|     scope="edges",  # Optional - this is the default  
    12| )  
  
### Nodes

Nodes are connection points in the graph that represent entities. Each node maintains a summary of facts from its connections (edges), providing a comprehensive overview. Node search is useful for:

  * Understanding broader context around entities
  * Getting entity summaries and overviews
  * Finding all information related to a specific person, place, or concept

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     graph_id=graph_id,  
    9|     query="John Smith",  
    10|     scope="nodes",  
    11| )  
  
### Episodes

Episodes represent individual messages or chunks of data sent to Zep. Episode search allows you to find relevant episodes based on their content, making it ideal for:

  * Finding specific messages or data chunks related to your query
  * Discovering when certain topics were mentioned
  * Retrieving relevant individual interactions
  * Understanding the context of specific messages

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="project discussion",  
    10|     scope="episodes",  
    11| )  
  
## Rerankers

Zep provides multiple reranking algorithms to optimize search results for different use cases. Each reranker applies a different strategy to prioritize and order results:

### RRF (Reciprocal Rank Fusion)

[](/v3/searching-the-graph)

Reciprocal Rank Fusion is the default reranker that intelligently combines results from both semantic similarity and BM25 full-text search. It merges the two result sets by considering the rank position of each result in both searches, creating a unified ranking that leverages the strengths of both approaches.

**When to use** : RRF is ideal for most general-purpose search scenarios where you want balanced results combining conceptual understanding with exact keyword matching.

**Score interpretation** : RRF scores combine semantic similarity and keyword matching by summing reciprocal ranks (1/rank) from both search methods, resulting in higher scores for results that perform well in both approaches. Scores don’t follow a fixed 0-1 scale but rather reflect the combined strength across both search types, with higher values indicating better overall relevance.

### MMR (Maximal Marginal Relevance)

[](/v3/searching-the-graph)

Maximal Marginal Relevance addresses a common issue in similarity searches: highly similar top results that don’t add diverse information to your context. MMR reranks results to balance relevance with diversity, promoting varied but still relevant results over redundant similar ones.

**When to use** : Use MMR when you need diverse information for comprehensive context, such as generating summaries, answering complex questions, or avoiding repetitive results.

**Required parameter** : `mmr_lambda` (0.0-1.0) - Controls the balance between relevance (1.0) and diversity (0.0). A value of 0.5 provides balanced results.

**Score interpretation** : MMR scores balance relevance with diversity based on your mmr_lambda setting, meaning a moderately relevant but diverse result may score higher than a highly relevant but similar result. Interpret scores relative to your lambda value: with lambda=0.5, moderate scores may indicate valuable diversity rather than poor relevance.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="project status",  
    10|     reranker="mmr",  
    11|     mmr_lambda=0.5, # Balance diversity vs relevance  
    12| )  
  
### Cross Encoder

`cross_encoder` uses a specialized neural model that jointly analyzes the query and each search result together, rather than analyzing them separately. This provides more accurate relevance scoring by understanding the relationship between the query and potential results in a single model pass.

**When to use** : Use cross encoder when you need the highest accuracy in relevance scoring and are willing to trade some performance for better results. Ideal for critical searches where precision is paramount.

**Trade-offs** : Higher accuracy but slower performance compared to other rerankers.

**Score interpretation** : Cross encoder scores follow a sigmoid curve (`0-1` range) where highly relevant results cluster near the top with scores that decay rapidly as relevance decreases. You’ll typically see a sharp drop-off between truly relevant results (higher scores) and less relevant ones, making it easy to set meaningful relevance thresholds.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="critical project decision",  
    10|     reranker="cross_encoder",  
    11| )  
  
### Episode Mentions

`episode_mentions` reranks search results based on how frequently nodes or edges have been mentioned across all episodes, including both conversational episodes (chat history) and episodes created via `graph.add`. Results that appear more often across these episodes are prioritized, reflecting their importance and relevance.

**When to use** : Use episode mentions when you want to surface information that has been frequently referenced across conversations or data uploads. Useful for understanding recurring themes, important topics, or frequently mentioned entities across all your graph data.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="team feedback",  
    10|     reranker="episode_mentions",  
    11| )  
  
### Node Distance

`node_distance` reranks search results based on graph proximity, prioritizing results that are closer (fewer hops) to a specified center node. This spatial approach to relevance is useful for finding information contextually related to a specific entity or concept.

**When to use** : Use node distance when you want to find information specifically related to a particular entity, person, or concept in your graph. Ideal for exploring the immediate context around a known entity.

**Required parameter** : `center_node_uuid` \- The UUID of the node to use as the center point for distance calculations.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="recent activities",  
    10|     reranker="node_distance",  
    11|     center_node_uuid=center_node_uuid,  
    12| )  
  
### Reranker Score

Graph search results include a reranker score that provides a measure of relevance for each returned result. This score is available when using any reranker and is returned on any node, edge, or episode from `graph.search`. The reranker score can be used to manually filter results to only include those above a certain relevance threshold, allowing for more precise control over search result quality.

The interpretation of the score depends on which reranker is used. For example, when using the `cross_encoder` reranker, the score follows a sigmoid curve with the score decaying rapidly as relevance decreases. For more information about the score field in the response, see the [SDK reference](https://help.getzep.com/sdk-reference/graph/search#response.body.edges.score).

## Search Filters

Zep allows you to filter search results by specific entity types or edge types, enabling more targeted searches within your graph.

### Entity Type Filtering

Filter search results to only include nodes of specific entity types. This is useful when you want to focus on particular kinds of entities (e.g., only people, only companies, only locations).

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="software engineers",  
    10|     scope="nodes",  
    11|     search_filters={  
    12|         "node_labels": ["Person", "Company"]  
    13|     }  
    14| )  
  
### Edge Type Filtering

Filter search results to only include edges of specific relationship types. This helps you find particular kinds of relationships or interactions between entities.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="project collaboration",  
    10|     scope="edges",  
    11|     search_filters={  
    12|         "edge_types": ["WORKS_WITH", "COLLABORATES_ON"]  
    13|     }  
    14| )  
  
### Datetime Filtering

Filter search results based on timestamps, enabling temporal-based queries to find information from specific time periods. This feature allows you to search for content based on four different timestamp types, each serving a distinct purpose in tracking the lifecycle of facts in your knowledge graph.

##### Edge Scope Only

Datetime filtering only applies to edge scope searches. When using `scope="nodes"` or `scope="episodes"`, datetime filter values are ignored and have no effect on search results.

**Available Timestamp Types:**

Timestamp| Description| Example Use Case  
---|---|---  
`created_at`| The time when Zep learned the fact was true| Finding when information was first added to the system  
`valid_at`| The real world time that the fact started being true| Identifying when a relationship or state began  
`invalid_at`| The real world time that the fact stopped being true| Finding when a relationship or state ended  
`expired_at`| The time that Zep learned that the fact was false| Tracking when information was marked as outdated  
  
For example, for the fact “Alice is married to Bob”:

  * `valid_at`: The time they got married
  * `invalid_at`: The time they got divorced
  * `created_at`: The time Zep learned they were married
  * `expired_at`: The time Zep learned they were divorced

**Logic Behavior:**

  * **Outer array/list** : Uses OR logic - any condition graph can match
  * **Inner array/list** : Uses AND logic - all conditions within a graph must match

In the example below, results are returned if they match:

  * (created >= 2025-07-01 AND created < 2025-08-01) OR (created < 2025-05-01)

**Date Format** : All dates must be in ISO 8601 format with timezone (e.g., “2025-07-01T20:57:56Z”)

**Comparison Operators** : Supports `>=`, `<=`, `<`, and `>` for flexible date range queries

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2| from zep_cloud.types import SearchFilters, DateFilter  
    3|   
    4| client = Zep(  
    5|     api_key=API_KEY,  
    6| )  
    7|   
    8| # Search for edges created in July 2025 OR before May 2025  
    9| search_results = client.graph.search(  
    10|     user_id=user_id,  
    11|     query="project discussions",  
    12|     scope="edges",  
    13|     search_filters=SearchFilters(  
    14|         created_at=[  
    15|             # First condition graph (AND logic within)  
    16|             [DateFilter(comparison_operator=">=", date="2025-07-01T20:57:56Z"),   
    17|              DateFilter(comparison_operator="<", date="2025-08-01T20:57:56Z")],  
    18|             # Second condition graph (OR logic with first graph)  
    19|             [DateFilter(comparison_operator="<", date="2025-05-01T20:57:56Z")],  
    20|         ]  
    21|     )  
    22| )  
  
**Common Use Cases:**

  * **Date Range Filtering** : Find facts from specific time periods using any timestamp type
  * **Recent Activity** : Search for edges created or expired after a certain date using `>=` operator
  * **Historical Data** : Find older information using `<` or `<=` operators on any timestamp
  * **Validity Period Analysis** : Use `valid_at` and `invalid_at` together to find facts that were true during specific periods
  * **Audit Trail** : Use `created_at` and `expired_at` to track when your system learned about changes
  * **Complex Temporal Queries** : Combine multiple date conditions across different timestamp types

## Filtering by Fact Rating

The `min_fact_rating` parameter allows you to filter search results based on the relevancy rating of facts stored in your graph edges. When specified, all facts returned will have at least the minimum rating value you set.

This parameter accepts values between 0.0 and 1.0, where higher values indicate more relevant facts. By setting a minimum threshold, you can ensure that only highly relevant facts are included in your search results.

**Important** : The `min_fact_rating` parameter can only be used when searching with `scope="edges"` as fact ratings are associated with edge relationships.

Read more about [fact ratings and how they work](/v3/facts#rating-facts-for-relevancy).

## Breadth-First Search (BFS)

The `bfs_origin_node_uuids` parameter enables breadth-first searches starting from specified nodes, which helps make search results more relevant to recent context. This is particularly useful when combined with recent episode IDs to bias search results toward information connected to recent conversations. You can pass episode IDs as BFS node IDs because episodes are represented as nodes under the hood.

**When to use** : Use BFS when you want to find information that’s contextually connected to specific starting points in your graph, such as recent episodes or important entities.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| # Get recent episodes to use as BFS origin points  
    8| episodes = client.graph.episode.get_by_user_id(  
    9|     user_id=user_id,  
    10|     lastn=10  
    11| ).episodes  
    12|   
    13| episode_uuids = [episode.uuid_ for episode in episodes if episode.role == 'user']  
    14|   
    15| # Search with BFS starting from recent episodes  
    16| search_results = client.graph.search(  
    17|     user_id=user_id,  
    18|     query="project updates",  
    19|     scope="edges",  
    20|     bfs_origin_node_uuids=episode_uuids,  
    21|     limit=10  
    22| )
