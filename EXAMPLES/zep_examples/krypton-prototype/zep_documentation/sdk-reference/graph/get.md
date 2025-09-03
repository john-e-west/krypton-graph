# Get Graph | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/graph/get  
**Scraped:** 2025-08-29 13:01:35

---

Returns a graph.

### Path parameters

graphIdstringRequired

The graph_id of the graph to get.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Response

The graph that was retrieved.

created_atstring or null

descriptionstring or null

fact_rating_instructionobject or null

Show 2 properties

graph_idstring or null

idinteger or null

namestring or null

project_uuidstring or null

uuidstring or null

### Errors

404

Graph Get Request Not Found Error

500

Graph Get Request Internal Server Error
