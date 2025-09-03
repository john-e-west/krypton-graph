# Create Graph | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/graph/create  
**Scraped:** 2025-08-29 13:01:42

---

Creates a new graph.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Request

This endpoint expects an object.

graph_idstringRequired

descriptionstringOptional

fact_rating_instructionobjectOptional

Show 2 properties

namestringOptional

### Response

The added graph

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

Graph Create Request Bad Request Error

500

Graph Create Request Internal Server Error
