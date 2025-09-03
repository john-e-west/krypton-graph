# Get threads | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/thread/list-all  
**Scraped:** 2025-08-29 12:59:59

---

Returns all threads.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Query parameters

page_numberintegerOptional

Page number for pagination, starting from 1

page_sizeintegerOptional

Number of threads to retrieve per page.

order_bystringOptional

Field to order the results by: created_at, updated_at, user_id, thread_id.

ascbooleanOptional

Order direction: true for ascending, false for descending.

### Response

List of threads

response_countinteger or null

threadslist of objects or null

Show 5 properties

total_countinteger or null

### Errors

400

Thread List All Request Bad Request Error

500

Thread List All Request Internal Server Error
