# Add messages to a thread | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/thread/add-messages  
**Scraped:** 2025-08-29 13:01:31

---

Add messages to a thread.

### Path parameters

threadIdstringRequired

The ID of the thread to which messages should be added.

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Request

This endpoint expects an object.

messageslist of objectsRequired

A list of message objects, where each message contains a role and content.

Show 6 properties

ignore_roleslist of enumsOptional

Optional list of role types to ignore when adding messages to graph memory. The message itself will still be added, retained and used as context for messages that are added to a user's graph.

Show 6 enum values

return_contextbooleanOptional

Optionally return context block relevant to the most recent messages.

### Response

An object, optionally containing user context retrieved for the last thread message

contextstring or null

message_uuidslist of strings or null

### Errors

500

Thread Add Messages Request Internal Server Error
