# List all graphs. | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/graph/list-all  
**Scraped:** 2025-08-29 13:01:44

---

Returns all graphs. In order to list users, use user.list_ordered instead

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Query parameters

pageNumberintegerOptional

Page number for pagination, starting from 1.

pageSizeintegerOptional

Number of graphs to retrieve per page.

### Response

Successfully retrieved list of graphs.

graphslist of objects or null

Show 8 properties

row_countinteger or null

total_countinteger or null

### Errors

400

Graph List All Request Bad Request Error

500

Graph List All Request Internal Server Error
