# Key Concepts | Zep Documentation

**Source URL:** https://help.getzep.com/concepts  
**Scraped:** 2025-08-29 12:59:59

---

##### 

Looking to just get coding? Check out our [Quickstart](/quickstart).

Zep is a context engineering platform that systematically assembles personalized context—user preferences, traits, and business data—for reliable agent applications. Zep combines Graph RAG, agent memory, and context assembly capabilities to deliver comprehensive personalized context that reduces hallucinations and improves accuracy.

## Concepts Table

Concept| Description| Docs  
---|---|---  
Knowledge Graph| Zep’s unified knowledge store for agents. Nodes represent entities, edges represent facts/relationships. The graph updates dynamically in response to new data.| [Docs](/understanding-the-graph)  
Zep’s Context Block| Optimized string containing facts and entities from the knowledge graph most relevant to the current thread. Also contains dates when facts became valid and invalid. Provide this to your chatbot as “memory”.| [Docs](/retrieving-memory#retrieving-zeps-context-block)  
Fact Invalidation| When new data invalidates a prior fact, the time the fact became invalid is stored on that fact’s edge in the knowledge graph.| [Docs](/facts)  
JSON/text/message| Types of data that can be ingested into the knowledge graph. Can represent business data, documents, chat messages, emails, etc.| [Docs](/adding-data-to-the-graph)  
Custom Entity/Edge Types| Feature allowing use of Pydantic-like classes to customize creation/retrieval of entities and relations in the knowledge graph.| [Docs](/customizing-graph-structure#custom-entity-and-edge-types)  
Graph| Represents an arbitrary knowledge graph for storing up-to-date knowledge about an object or system. For storing up-to-date knowledge about a user, a user graph should be used.| [Docs](/graph-overview)  
User Graph| Special type of graph for storing personalized memory for a user of your application.| [Docs](/users)  
User| A user in Zep represents a user of your application, and has its own User Graph and thread history.| [Docs](/users)  
Threads| Conversation threads of a user. By default, all messages added to any thread of that user are ingested into that user’s graph.| [Docs](/threads)  
`graph.add` & `thread.add_messages`| Methods for adding data to a graph and user graph respectively.| [Docs](/adding-data-to-the-graph) [Docs](/memory#adding-memory)  
`graph.search` & `thread.get_user_context`| Low level and high level methods respectively for retrieving from the knowledge graph.| [Docs](/searching-the-graph) [Docs](/memory#retrieving-memory)  
Fact Ratings| Feature for rating and filtering facts by relevance to your use case.| [Docs](/facts#rating-facts-for-relevancy)  
Agentic Tool| Use Zep’s memory retrieval methods as agentic tools, enabling your agent to query for relevant information from the user’s knowledge graph.| [Docs](/quickstart#use-zep-as-an-agentic-tool)  
  
## Use Cases Table

Use case| Purpose| Implementation  
---|---|---  
Dynamic Graph RAG| Provide your agent with up-to-date knowledge of an object/system| Add/stream all relevant data to a Graph ([docs](/adding-data-to-the-graph)), chunking first if needed ([docs](/adding-data-to-the-graph#data-size-limit-and-chunking)), and retrieve from the graph by constructing a custom context block ([docs](/cookbook/customize-your-context-block))  
Agent memory| Provide your agent with up-to-date knowledge of a user| Add/stream user messages and user business data to a User Graph ([docs](/adding-memory)), and retrieve user memory as the context block returned from `thread.get_user_context` ([docs](/retrieving-memory)), and provide this context block to your agent before responding  
Voice agents| Provide up-to-date knowledge with extremely low latency to a voice agent| Similar to other implementations, except incorporating latency optimizations ([docs](/performance))  
  
## What is Context Engineering?

Context Engineering is the discipline of assembling all necessary information, instructions, and tools around a LLM to help it accomplish tasks reliably. Unlike simple prompt engineering, context engineering involves building dynamic systems that provide the right information in the right format so LLMs can perform consistently.

The core challenge: LLMs are stateless and only know what’s in their immediate context window. Context engineering bridges this gap by systematically providing relevant background knowledge, user history, business data, and tool outputs.

Using [business data and/or user chat histories](/concepts#business-data-vs-chat-message-data), Zep automatically constructs a [temporal knowledge graph](/graph-overview) to reflect the state of an object/system or a user. The knowledge graph contains entities, relationships, and facts related to your object/system or user. As facts change or are superseded, [Zep updates the graph](/concepts#managing-changes-in-facts-over-time) to reflect their new state. Through systematic context engineering, Zep provides your agent with the comprehensive information needed to deliver personalized responses and solve problems. This reduces hallucinations, improves accuracy, and reduces the cost of LLM calls.

## How Zep Fits Into Your Application

Your application sends Zep business data (JSON, unstructured text) and/or messages. Business data sources may include CRM applications, emails, billing data, or conversations on other communication platforms like Slack.

![](https://files.buildwithfern.com/zep.docs.buildwithfern.com/2025-08-28T23:32:12.149Z/images/how-zep-fits-into-app-diagram.png)

Zep automatically fuses this data together on a temporal knowledge graph, building a holistic view of the object/system or user and the relationships between entities. Zep offers a number of APIs for [adding and retrieving memory](/concepts#retrieving-memory). In addition to populating a prompt with Zep’s engineered context, Zep’s search APIs can be used to build [agentic tools](/concepts#using-zep-as-an-agentic-tool).

The example below shows Zep’s `memory.context` field resulting from a call to `thread.get_user_context()`. This is Zep’s engineered context block that can be added to your prompt and contains facts and graph entities relevant to the current conversation with a user. For more about the temporal context of facts, see [Managing changes in facts over time](/concepts#managing-changes-in-facts-over-time).

### Context Block

[Zep’s Context Block](/retrieving-memory#retrieving-zeps-context-block) is Zep’s engineered context string containing relevant facts and entities for the thread. It is always present in the result of `thread.get_user_context()` call and can be optionally [received with the response of `thread.add_messages()` call](/docs/performance/performance-best-practices#get-the-context-block-string-sooner).

Zep’s context block can either be in summarized or basic form (summarized by default). Retrieving basic results reduces latency (P95 < 200 ms). Read more about Zep’s Context Block [here](/retrieving-memory#retrieving-zeps-context-block).

###### Summary (default)

###### Basic (fast)

PythonTypeScriptGo
    
    
    1| # Get memory for the thread  
    ---|---  
    2| memory = client.thread.get_user_context(thread_id=thread_id)  
    3|   
    4| # Access the context block (for use in prompts)  
    5| context_block = memory.context  
    6| print(context_block)  
      
    
    - On 2024-07-30, account Emily0e62 made a failed transaction of $99.99.  
    ---  
    - The transaction failed due to the card with last four digits 1234.  
    - The failure reason was 'Card expired' as of 2024-09-15.  
    - Emily0e62 is a user account belonging to Emily Painter.  
    - On 2024-11-14, user account Emily0e62 was suspended due to payment failure.  
    - Since 2024-11-14, Emily Painter (Emily0e62) has experienced issues with logging in.  
    - As of the present, account Emily0e62 remains suspended and Emily continues to face login issues due to unresolved payment failure from an expired card.  
  
You can then include this context in your system prompt:

MessageType| Content  
---|---  
`System`| Your system prompt   
  
`{Zep context block}`  
`Assistant`| An assistant message stored in Zep  
`User`| A user message stored in Zep  
…| …  
`User`| The latest user message
