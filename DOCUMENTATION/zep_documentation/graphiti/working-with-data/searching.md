# Searching the Graph | Zep Documentation

**Source URL:** https://help.getzep.com/graphiti/working-with-data/searching  
**Scraped:** 2025-08-29 13:00:16

---

The examples below demonstrate two search approaches in the Graphiti library:

  1. **Hybrid Search:**
    
        1| await graphiti.search(query)  
    ---|---  
  
Combines semantic similarity and BM25 retrieval, reranked using Reciprocal Rank Fusion.

Example: Does a broad retrieval of facts related to Allbirds Wool Runners and Jane’s purchase.

  2. **Node Distance Reranking:**
    
        1| await graphiti.search(query, focal_node_uuid)  
    ---|---  
  
Extends Hybrid Search above by prioritizing results based on proximity to a specified node in the graph.

Example: Focuses on Jane-specific information, highlighting her wool allergy.

Node Distance Reranking is particularly useful for entity-specific queries, providing more contextually relevant results. It weights facts by their closeness to the focal node, emphasizing information directly related to the entity of interest.

This dual approach allows for both broad exploration and targeted, entity-specific information retrieval from the knowledge graph.
    
    
    1| query = "Can Jane wear Allbirds Wool Runners?"  
    ---|---  
    2| jane_node_uuid = "123e4567-e89b-12d3-a456-426614174000"  
    3|   
    4| def print_facts(edges):  
    5|     print("\n".join([edge.fact for edge in edges]))  
    6|   
    7| # Hybrid Search  
    8| results = await graphiti.search(query)  
    9| print_facts(results)  
    10|   
    11| > The Allbirds Wool Runners are sold by Allbirds.  
    12| > Men's SuperLight Wool Runners - Dark Grey (Medium Grey Sole) has a runner silhouette.  
    13| > Jane purchased SuperLight Wool Runners.  
    14|   
    15| # Hybrid Search with Node Distance Reranking  
    16| await client.search(query, jane_node_uuid)  
    17| print_facts(results)  
    18|   
    19| > Jane purchased SuperLight Wool Runners.  
    20| > Jane is allergic to wool.  
    21| > The Allbirds Wool Runners are sold by Allbirds.  
  
## Configurable Search Strategies

Graphiti also provides a low-level search method that is more configurable than the out-of-the-box search. This search method can be called using `graphiti._search()` and passing in an additional config parameter of type `SearchConfig`. `SearchConfig` contains 4 fields: one for the limit, and three more configs for each of edges, nodes, and communities. The `graphiti._search()` method returns a `SearchResults` object containing a list of nodes, edges, and communities.

The `graphiti._search()` method is quite configurable and can be complicated to work with at first. As such, we also have a `search_config_recipes.py` file that contains a few prebuilt `SearchConfig` recipes for common use cases.

The 15 recipes are the following:

Search Type| Description  
---|---  
COMBINED_HYBRID_SEARCH_RRF| Performs a hybrid search with RRF reranking over edges, nodes, and communities.  
COMBINED_HYBRID_SEARCH_MMR| Performs a hybrid search with MMR reranking over edges, nodes, and communities.  
COMBINED_HYBRID_SEARCH_CROSS_ENCODER| Performs a full-text search, similarity search, and BFS with cross_encoder reranking over edges, nodes, and communities.  
EDGE_HYBRID_SEARCH_RRF| Performs a hybrid search over edges with RRF reranking.  
EDGE_HYBRID_SEARCH_MMR| Performs a hybrid search over edges with MMR reranking.  
EDGE_HYBRID_SEARCH_NODE_DISTANCE| Performs a hybrid search over edges with node distance reranking.  
EDGE_HYBRID_SEARCH_EPISODE_MENTIONS| Performs a hybrid search over edges with episode mention reranking.  
EDGE_HYBRID_SEARCH_CROSS_ENCODER| Performs a hybrid search over edges with cross encoder reranking.  
NODE_HYBRID_SEARCH_RRF| Performs a hybrid search over nodes with RRF reranking.  
NODE_HYBRID_SEARCH_MMR| Performs a hybrid search over nodes with MMR reranking.  
NODE_HYBRID_SEARCH_NODE_DISTANCE| Performs a hybrid search over nodes with node distance reranking.  
NODE_HYBRID_SEARCH_EPISODE_MENTIONS| Performs a hybrid search over nodes with episode mentions reranking.  
NODE_HYBRID_SEARCH_CROSS_ENCODER| Performs a hybrid search over nodes with cross encoder reranking.  
COMMUNITY_HYBRID_SEARCH_RRF| Performs a hybrid search over communities with RRF reranking.  
COMMUNITY_HYBRID_SEARCH_MMR| Performs a hybrid search over communities with MMR reranking.  
COMMUNITY_HYBRID_SEARCH_CROSS_ENCODER| Performs a hybrid search over communities with cross encoder reranking.  
  
## Supported Reranking Approaches

**Reciprocal Rank Fusion (RRF)** enhances search by combining results from different algorithms, like BM25 and semantic search. Each algorithm’s results are ranked, converted to reciprocal scores (1/rank), and summed. This aggregated score determines the final ranking, leveraging the strengths of each method for more accurate retrieval.

**Maximal Marginal Relevance (MMR)** is a search strategy that balances relevance and diversity in results. It selects results that are both relevant to the query and diverse from already chosen ones, reducing redundancy and covering different query aspects. MMR ensures comprehensive and varied search results by iteratively choosing results that maximize relevance while minimizing similarity to previously selected results.

A **Cross-Encoder** is a model that jointly encodes a query and a result, scoring their relevance by considering their combined context. This approach often yields more accurate results compared to methods that encode query and a text separately.

Graphiti supports three cross encoders:

  * `OpenAIRerankerClient` (the default) - Uses an OpenAI model to classify relevance and the resulting `logprobs` are used to rerank results.
  * `GeminiRerankerClient` \- Uses Google’s Gemini models to classify relevance for cost-effective and low-latency reranking.
  * `BGERerankerClient` \- Uses the `BAAI/bge-reranker-v2-m3` model and requires `sentence_transformers` be installed.
