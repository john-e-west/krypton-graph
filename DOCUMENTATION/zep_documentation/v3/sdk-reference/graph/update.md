# Update Graph. | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/graph/update  
**Scraped:** 2025-08-29 13:01:17

---

Updates information about a graph.

### Path parameters

graphIdstringRequired

Graph ID

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Request

This endpoint expects an object.

descriptionstringOptional

fact_rating_instructionobjectOptional

Show 2 properties

namestringOptional

### Response

The updated graph object

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

400

Graph Update Request Bad Request Error

404

Graph Update Request Not Found Error

500

Graph Update Request Internal Server Error
