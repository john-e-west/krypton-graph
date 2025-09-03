# Search Graph | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/graph/search  
**Scraped:** 2025-08-29 13:00:35

---

Perform a graph search query.

### Request

This endpoint expects an object.

querystringRequired`<=400 characters`

The string to search for (required)

bfs_origin_node_uuidslist of stringsOptional

Nodes that are the origins of the BFS searches

center_node_uuidstringOptional

Node to rerank around for node distance reranking

graph_idstringOptional

The graph_id to search in. When searching user graph, please use user_id instead.

limitintegerOptional`<=50`

The maximum number of facts to retrieve. Defaults to 10. Limited to 50.

min_fact_ratingdoubleOptional

The minimum rating by which to filter relevant facts

min_scoredoubleOptional

Deprecated

mmr_lambdadoubleOptional

weighting for maximal marginal relevance

rerankerenumOptional

Defaults to RRF

Allowed values:rrfmmrnode_distanceepisode_mentionscross_encoder

scopeenumOptional

Defaults to Edges. Communities will be added in the future.

Allowed values:edgesnodesepisodes

search_filtersobjectOptional

Search filters to apply to the search

Show 6 properties

user_idstringOptional

The user_id when searching user graph. If not searching user graph, please use graph_id instead.

### Response

Graph search results

edgeslist of objects or null

Show 12 properties

episodeslist of objects or null

Show 10 properties

nodeslist of objects or null

Show 7 properties

### Errors

400

Graph Search Request Bad Request Error

500

Graph Search Request Internal Server Error
