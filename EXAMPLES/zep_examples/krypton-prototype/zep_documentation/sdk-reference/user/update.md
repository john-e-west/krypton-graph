# Update User | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/user/update  
**Scraped:** 2025-08-29 13:00:08

---

Updates a user.

### Path parameters

userIdstringRequired

User ID

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Request

This endpoint expects an object.

emailstringOptional

The email address of the user.

fact_rating_instructionobjectOptional

Optional instruction to use for fact rating.

Show 2 properties

first_namestringOptional

The first name of the user.

last_namestringOptional

The last name of the user.

metadatamap from strings to anyOptional

The metadata to update

### Response

The user that was updated.

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

400

User Update Request Bad Request Error

404

User Update Request Not Found Error

500

User Update Request Internal Server Error
