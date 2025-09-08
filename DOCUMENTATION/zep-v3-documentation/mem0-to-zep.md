# Mem0 Migration | Zep Documentation

**Source URL:** https://help.getzep.com/v3/mem0-to-zep  
**Scraped:** 2025-08-29 13:00:10

---

Zep is a memory layer for AI agents that unifies chat and business data into a dynamic [temporal knowledge graph](/v3/concepts#the-knowledge-graph) for each user. It tracks entities, relationships, and facts as they evolve, enabling you to build prompts with only the most relevant information—reducing hallucinations, improving recall, and lowering LLM costs.

Zep provides high-level APIs like `thread.get_user_context` and deep search with `graph.search`, supports custom entity/edge types, fact ratings, hybrid search, and granular graph updates. Mem0, by comparison, offers basic add/get/search APIs and an optional graph, but lacks built-in data unification, ontology customization, temporal fact management, fact ratings, and fine-grained graph control.

##### 

Got lots of data to migrate? [Contact us](/cdn-cgi/l/email-protection#90e3f1fcf5e3d0f7f5e4eaf5e0bef3fffd) for a discount and increased API limits.

## Zep’s memory model in one minute

### Unified customer record

  * Messages sent via [`thread.add_messages`](/v3/memory#adding-memory) go straight into the user’s knowledge graph; business objects (JSON, docs, e-mails, CRM rows) flow in through [`graph.add`](/v3/adding-data-to-the-graph). Zep automatically deduplicates entities and keeps every fact’s _valid_ and _invalid_ dates so you always see the latest truth.

### Domain-depth ontology

  * You can define Pydantic-style **[custom entity and edge classes](/v3/customizing-graph-structure)** so the graph speaks your business language (Accounts, Policies, Devices, etc.).

### Temporal facts & ratings

  * Every edge stores when a fact was created, became valid, was invalidated, and (optionally) expired; [`fact_ratings`](/v3/facts) let you auto-label facts (e.g., “high-confidence KYC data”) and filter on retrieval.

### Hybrid & granular search

  * [`graph.search`](/v3/searching-the-graph) supports [hybrid BM25 + semantic queries, graph search](/v3/searching-the-graph), with pluggable rerankers (RRF, MMR, cross-encoder) and can target nodes, edges, episodes, or everything at once.

## How Zep differs from Mem0

Capability|  **Zep**|  **Mem0**  
---|---|---  
 **Business-data ingestion**|  Native via [`graph.add`](/v3/adding-data-to-the-graph) (JSON or text); [business facts merge with user graph](/v3/concepts#business-data-vs-chat-message-data)| No direct ingestion API; business data must be rewritten as “memories” or loaded into external graph store  
 **Knowledge-graph storage**|  Built-in [temporal graph](/v3/concepts#managing-changes-in-facts-over-time); zero infra for developers| Optional “Graph Memory” layer that _requires_ Neo4j/Memgraph and extra config  
 **Custom ontology**|  First-class [entity/edge type system](/v3/customizing-graph-structure)| Not exposed; relies on generic nodes/relationships  
 **Fact life-cycle (valid/invalid)**| [Automatic and queryable](/v3/concepts#managing-changes-in-facts-over-time)| Not documented / not supported  
 **Fact ratings & filtering**| Yes ([`fact_ratings` API](/v3/facts))| Not available  
 **Search**| [Hybrid vector + graph search](/v3/searching-the-graph) with multiple rerankers| Vector search with filters; basic Cypher queries if graph layer enabled  
 **Graph CRUD**|  Full [node/edge CRUD](/v3/deleting-data-from-the-graph) & [bulk episode ingest](/v3/adding-data-to-the-graph)| Add/Delete memories; no low-level edge ops  
 **Context block**| [Auto-generated, temporal, prompt-ready](/v3/retrieving-memory#retrieving-zeps-context-block)| You assemble snippets manually from `search` output  
 **LLM integration**|  Returns [ready-made `memory.context`](/v3/retrieving-memory#retrieving-zeps-context-block); easily integrates with agentic tools| Returns raw strings you must format  
  
## SDK support

Zep offers Python, TypeScript, and Go SDKs. See [Installation Instructions](/v3/quickstart) for more details.

## Migrating your code

### Basic flows

 **What you do in Mem0**|  **Do this in Zep**  
---|---  
`client.add(messages, user_id=ID)` → stores conversation snippets| `zep.thread.add_messages(thread_id, messages=[...])` – keeps chat sequence **and** updates graph  
`client.add("json...", user_id=ID)` (not really supported)| `zep.graph.add(user_id, data=<JSON>)` – drop raw business records right in  
`client.search(query, user_id=ID)` – vector+filter search|  _Easy path_ : `zep.thread.get_user_context(thread_id)` returns the `memory.context` \+ recent messages  
 _Deep path_ : `zep.graph.search(user_id, query, reranker="rrf")`  
`client.get_all(user_id=ID)` – list memories| `zep.graph.search(user_id, '')` or iterate `graph.get_nodes/edges` for full dump  
`client.update(memory_id, ...)` / `delete`| `zep.graph.edge.delete(uuid_="edge_uuid")` or `zep.graph.episode.delete(uuid_="episode_uuid")` for granular edits. Facts may not be updated directly; new data automatically invalidates old.  
  
### Practical tips

  * **Thread mapping:** Map Mem0’s `user_id` → Zep `user_id`, and create `thread_id` per conversation thread.
  * **Business objects:** Convert external records to JSON or text and feed them through `graph.add`; Zep will handle entity linking automatically.
  * **Prompting:** Replace your custom “summary builder” with the `memory.context` string; it already embeds temporal ranges and entity summaries.
  * **Quality filters:** Use Fact Ratings and apply `min_fact_rating` when calling `thread.get_user_context` to exclude low-confidence facts instead of manual post-processing.
  * **Search tuning:** Start with the default `rrf` reranker; switch to `mmr`, `node_distance`, `cross_encoder`, or `episode_mentions` when you need speed or precision tweaks.

## Side-by-side SDK cheat-sheet

 **Operation**|  Mem0 Method (Python)| Zep Method (Python)| Notes  
---|---|---|---  
Add chat messages| `m.add(messages, user_id=...)`| `zep.thread.add_messages(thread_id, messages)`| Zep expects _ordered_ AI + user msgs per turn  
Add business record|  _n/a_ (work-around)| `zep.graph.add(user_id, data)`| Direct ingestion of JSON/text  
Retrieve context| `m.search(query,... )`| `zep.thread.get_user_context(thread_id)`| Zep auto-selects facts; no prompt assembly  
Semantic / hybrid search| `m.search(query, ...)`| `zep.graph.search(..., reranker=...)`| Multiple rerankers, node/edge scopes  
List memories| `m.get_all(user_id)`| `zep.graph.search(user_id, '')`| Empty query lists entire graph  
Update fact| `m.update(id, ...)`|  _Not directly supported_ \- add new data to supersede| Facts are temporal; new data invalidates old  
Delete fact| `m.delete(id)`| `zep.graph.edge.delete(uuid_="edge_uuid")`| Episode deletion removes associated edges  
Rate / filter facts|  _not supported_| `min_fact_rating` param on `thread.get_user_context`| —  
  
## Where to dig deeper

  * [**Quickstart**](/v3/quickstart)
  * [**Graph Search guide**](/v3/searching-the-graph)
  * [**Entity / Edge customization**](/v3/customizing-graph-structure)
  * [**Fact ratings**](/v3/facts)
  * **Graph CRUD** : [Reading from the Graph](/v3/reading-data-from-the-graph) | [Adding to the Graph](/v3/adding-data-to-the-graph) | [Deleting from the Graph](/v3/deleting-data-from-the-graph)

For any questions, ping the Zep Discord or contact your account manager. Happy migrating!
