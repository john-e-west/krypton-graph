# Get user context | Zep Documentation

**Source URL:** https://help.getzep.com/sdk-reference/thread/get-user-context  
**Scraped:** 2025-08-29 13:01:32

---

Returns most relevant context from the user graph (including memory from any/all past threads) based on the content of the past few messages of the given thread.

### Path parameters

threadIdstringRequired

The ID of the current thread (for which context is being retrieved).

### Headers

AuthorizationstringRequired

Header authentication of the form `Api-Key <token>`

### Query parameters

minRatingdoubleOptional

The minimum rating by which to filter relevant facts.

modeenumOptionalDefaults to `summary`

Defaults to summary mode. Use basic for lower latency

Allowed values:basicsummary

### Response

OK

contextstring or null

Context block containing relevant facts, entities, and messages/episodes from the user graph. Meant to be replaced in the system prompt on every chat turn.

### Errors

404

Thread Get User Context Request Not Found Error

500

Thread Get User Context Request Internal Server Error
