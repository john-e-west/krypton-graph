# Zep v2 to v3 migration | Zep Documentation

**Source URL:** https://help.getzep.com/zep-v2-to-v3-migration  
**Scraped:** 2025-08-29 12:59:53

---

This guide provides a comprehensive overview of migrating from Zep v2 to v3, including conceptual changes, method mappings, and functionality differences.

## Key Conceptual Changes

Zep v3 introduces several naming changes and some feature enhancements that developers familiar with v2 should understand:

### Sessions → Threads

In v2, you worked with **sessions** to manage conversation history. In v3, these are now called **threads**.

### Groups → Graphs

v2’s **groups** have been replaced with **graphs** in v3. Groups represented arbitrary knowledge graphs that could hold memory for multiple users, but the name was confusing. We’ve renamed them to **graphs** for clarity.

### Message Role Changes

The message role structure has been updated:

  * `role_type` is now called `role`
  * `role` is now called `name`

### Enhanced Context Retrieval

The v3 `getUserContext` method introduces a new `mode` parameter that controls how context is returned:

  * `"summary"` (default): Returns context summarized into natural language
  * `"basic"`: Returns raw context similar to v2’s behavior

This change allows for more flexible context retrieval based on your application’s needs.

##### 

The naming changes above are not comprehensive. There are also function name changes, which you can find in the detailed migration table below.

## Migration Table

###### Python

###### TypeScript

###### Go

v2 Method/Variable/Term| v3 Method/Variable/Term  
---|---  
`memory.get(session_id)`| `thread.get_user_context(thread_id, mode="basic")`*  
`memory.add_session`| `thread.create`  
`memory.add`| `thread.add_messages`  
`memory.delete`| `thread.delete`  
`memory.list_sessions`| `thread.list_all`  
`memory.get_session_messages`| `thread.get`  
`group.add`| `graph.create`  
`group.get_all_groups`| `graph.list_all`  
`group.get`| `graph.get`  
`group.delete`| `graph.delete`  
`group.update`| `graph.update`  
`session`| `thread`  
`session_id`| `thread_id`  
`group`| `graph`  
`group_id`| `graph_id`  
`role_type`| `role`  
`role`| `name`  
  
*`thread.get_user_context` defaults to `mode="summary"`, which makes it so that the context is summarized into natural language before being returned. Therefore, to replicate the v2 `memory.get` method, `mode` must be set to `"basic"`.
