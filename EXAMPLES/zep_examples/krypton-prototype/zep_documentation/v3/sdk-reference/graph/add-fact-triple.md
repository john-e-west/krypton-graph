# Add Fact Triple | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/graph/add-fact-triple  
**Scraped:** 2025-08-29 13:00:52

---

Add a fact triple for a user or group

### Request

This endpoint expects an object.

factstringRequired`<=50 characters`

The fact relating the two nodes that this edge represents

fact_namestringRequired`>=1 character``<=50 characters`

The name of the edge to add. Should be all caps using snake case (eg RELATES_TO)

target_node_namestringRequired`<=50 characters`

The name of the target node to add

created_atstringOptional

The timestamp of the message

expired_atstringOptional

The time (if any) at which the edge expires

fact_uuidstringOptional

The uuid of the edge to add

graph_idstringOptional

invalid_atstringOptional

The time (if any) at which the fact stops being true

source_node_namestringOptional`<=50 characters`

The name of the source node to add

source_node_summarystringOptional`<=500 characters`

The summary of the source node to add

source_node_uuidstringOptional

The source node uuid

target_node_summarystringOptional`<=500 characters`

The summary of the target node to add

target_node_uuidstringOptional

The target node uuid

user_idstringOptional

valid_atstringOptional

The time at which the fact becomes true

### Response

Resulting triple

edgeobject or null

Show 12 properties

source_nodeobject or null

Show 7 properties

target_nodeobject or null

Show 7 properties

### Errors

400

Graph Add Fact Triple Request Bad Request Error

500

Graph Add Fact Triple Request Internal Server Error
