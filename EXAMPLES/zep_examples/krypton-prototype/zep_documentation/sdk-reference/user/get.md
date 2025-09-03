# Get User | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/user/get  
**Scraped:** 2025-08-29 13:01:45

---

Returns a user.

### Path parameters

userIdstringRequired

The user_id of the user to get.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Response

The user that was retrieved.

created_atstring or null

deleted_atstring or null

emailstring or null

fact_rating_instructionobject or null

Show 2 properties

first_namestring or null

idinteger or null

last_namestring or null

metadatamap from strings to any or null

Deprecated

project_uuidstring or null

session_countinteger or null

Deprecated

updated_atstring or null

Deprecated

user_idstring or null

uuidstring or null

### Errors

404

User Get Request Not Found Error

500

User Get Request Internal Server Error
