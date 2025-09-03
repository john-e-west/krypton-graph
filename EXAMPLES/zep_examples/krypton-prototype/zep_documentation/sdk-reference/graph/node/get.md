# Get Node | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/graph/node/get  
**Scraped:** 2025-08-29 13:01:38

---

Returns a specific node by its UUID.

### Path parameters

uuidstringRequired

Node UUID

### Response

Node

created_atstring

Creation time of the node

namestring

Name of the node

summarystring

Regional summary of surrounding edges

uuidstring

UUID of the node

attributesmap from strings to any or null

Additional attributes of the node. Dependent on node labels

labelslist of strings or null

Labels associated with the node

scoredouble or null

### Errors

400

Node Get Request Bad Request Error

404

Node Get Request Not Found Error

500

Node Get Request Internal Server Error
