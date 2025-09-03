# Get User Nodes | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/graph/node/get-by-user-id  
**Scraped:** 2025-08-29 13:01:07

---

Returns all nodes for a user

### Path parameters

user_idstringRequired

User ID

### Request

This endpoint expects an object.

limitintegerOptional

Maximum number of items to return

uuid_cursorstringOptional

UUID based cursor, used for pagination. Should be the UUID of the last item in the previous page

### Response

Nodes

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

Node Get by User ID Request Bad Request Error

500

Node Get by User ID Request Internal Server Error
