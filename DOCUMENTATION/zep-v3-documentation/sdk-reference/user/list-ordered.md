# Get Users | Zep Documentation

**Source URL:** https://help.getzep.com/v3/sdk-reference/user/list-ordered  
**Scraped:** 2025-08-29 13:01:15

---

Returns all users.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Query parameters

pageNumberintegerOptional

Page number for pagination, starting from 1

pageSizeintegerOptional

Number of users to retrieve per page

### Response

Successfully retrieved list of users

row_countinteger or null

total_countinteger or null

userslist of objects or null

Show 13 properties

### Errors

400

User List Ordered Request Bad Request Error

500

User List Ordered Request Internal Server Error
