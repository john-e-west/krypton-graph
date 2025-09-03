# Get Graph Edges | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/graph/edge/get-by-graph-id  
**Scraped:** 2025-08-29 13:01:16

---

Returns all edges for a graph.

### Path parameters

graph_idstringRequired

Graph ID

### Request

This endpoint expects an object.

limitintegerOptional

Maximum number of items to return

uuid_cursorstringOptional

UUID based cursor, used for pagination. Should be the UUID of the last item in the previous page

### Response

Edges

created_atstring

Creation time of the edge

factstring

Fact representing the edge and nodes that it connects

namestring

Name of the edge, relation name

source_node_uuidstring

UUID of the source node

target_node_uuidstring

UUID of the target node

uuidstring

UUID of the edge

attributesmap from strings to any or null

Additional attributes of the edge. Dependent on edge types

episodeslist of strings or null

List of episode ids that reference these entity edges

expired_atstring or null

Datetime of when the node was invalidated

invalid_atstring or null

Datetime of when the fact stopped being true

scoredouble or null

valid_atstring or null

Datetime of when the fact became true

### Errors

400

Edge Get by Graph ID Request Bad Request Error

500

Edge Get by Graph ID Request Internal Server Error
