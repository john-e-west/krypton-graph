# Get Edge | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/graph/edge/get  
**Scraped:** 2025-08-29 13:00:58

---

Returns a specific edge by its UUID.

### Path parameters

uuidstringRequired

Edge UUID

### Response

Edge

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

Edge Get Request Bad Request Error

404

Edge Get Request Not Found Error

500

Edge Get Request Internal Server Error
