# Performance Optimization Guide | Zep Documentation

**Source URL:** https://help.getzep.com/performance  
**Scraped:** 2025-08-29 13:00:32

---

This guide covers best practices for optimizing Zep’s performance in production environments.

## Reuse the Zep SDK Client

The Zep SDK client maintains an HTTP connection pool that enables connection reuse, significantly reducing latency by avoiding the overhead of establishing new connections. To optimize performance:

  * Create a single client instance and reuse it across your application
  * Avoid creating new client instances for each request or function
  * Consider implementing a client singleton pattern in your application
  * For serverless environments, initialize the client outside the handler function

## Optimizing Memory Operations

The `thread.add_messages` and `thread.get_user_context` methods are optimized for conversational messages and low-latency retrieval. For optimal performance:

  * Keep individual messages under 10K characters
  * Use `graph.add` for larger documents, tool outputs, or business data
  * Consider chunking large documents before adding them to the graph (the `graph.add` endpoint has a 10,000 character limit)
  * Remove unnecessary metadata or content before persistence
  * For bulk document ingestion, process documents in parallel while respecting rate limits

    
    
    1| # Recommended for conversations  
    ---|---  
    2| zep_client.thread.add_messages(  
    3|     thread_id="thread_123",  
    4|     message={  
    5|         "role": "user",  
    6|         "name": "Alice",  
    7|         "content": "What's the weather like today?"  
    8|     }  
    9| )  
    10|   
    11| # Recommended for large documents  
    12| await zep_client.graph.add(  
    13|     data=document_content,  # Your chunked document content  
    14|     user_id=user_id,       # Or graph_id  
    15|     type="text"            # Can be "text", "message", or "json"  
    16| )  
  
### Use the Basic Context Block

Zep’s [context block](/retrieving-memory#retrieving-zeps-context-block) can either be in summarized or basic form (summarized by default). Retrieving basic results reduces latency (P95 < 200 ms) since this bypasses the final summarization step.

PythonTypeScriptGo
    
    
    1| # Get memory for the thread  
    ---|---  
    2| memory = client.thread.get_user_context(thread_id=thread_id, mode="basic")  
    3|   
    4| # Access the context block (for use in prompts)  
    5| context_block = memory.context  
    6| print(context_block)  
      
    
    FACTS and ENTITIES represent relevant context to the current conversation.  
    ---  
    # These are the most relevant facts and their valid date ranges  
    # format: FACT (Date range: from - to)  
    <FACTS>  
      - Emily is experiencing issues with logging in. (2024-11-14 02:13:19+00:00 -  
        present)   
      - User account Emily0e62 has a suspended status due to payment failure.   
        (2024-11-14 02:03:58+00:00 - present)   
      - user has the id of Emily0e62 (2024-11-14 02:03:54 - present)  
      - The failed transaction used a card with last four digits 1234. (2024-09-15  
        00:00:00+00:00 - present)  
      - The reason for the transaction failure was 'Card expired'. (2024-09-15  
        00:00:00+00:00 - present)  
      - user has the name of Emily Painter (2024-11-14 02:03:54 - present)   
      - Account Emily0e62 made a failed transaction of 99.99. (2024-07-30   
        00:00:00+00:00 - 2024-08-30 00:00:00+00:00)  
    </FACTS>  
    # These are the most relevant entities  
    # ENTITY_NAME: entity summary  
    <ENTITIES>  
      - Emily0e62: Emily0e62 is a user account associated with a transaction,  
        currently suspended due to payment failure, and is also experiencing issues  
        with logging in.   
      - Card expired: The node represents the reason for the transaction failure,   
        which is indicated as 'Card expired'.   
      - Magic Pen Tool: The tool being used by the user that is malfunctioning.   
      - User: user   
      - Support Agent: Support agent responding to the user's bug report.   
      - SupportBot: SupportBot is the virtual assistant providing support to the user,   
        Emily, identified as SupportBot.   
      - Emily Painter: Emily is a user reporting a bug with the magic pen tool,   
        similar to Emily Painter, who is expressing frustration with the AI art  
        generation tool and seeking assistance regarding issues with the PaintWiz app.  
    </ENTITIES>  
  
### Get the Context Block sooner

Additionally, you can request the Context Block directly in the response to the `thread.add_messages()` call. This optimization eliminates the need for a separate `thread.get_user_context()`, though this method always returns the basic Context Block type. Read more about our [Context Block](/retrieving-memory#retrieving-zeps-context-block).

In this scenario you can pass in the `return_context=True` flag to the `thread.add_messages()` method. Zep will perform a user graph search right after persisting the memory and return the context relevant to the recently added memory.

PythonTypeScriptGo
    
    
    1| memory_response = await zep_client.thread.add_messages(  
    ---|---  
    2|     thread_id=thread_id,  
    3|     messages=messages,  
    4|     return_context=True  
    5| )  
    6|   
    7| context = memory_response.context  
  
##### 

Read more in the [Thread SDK Reference](/sdk-reference/thread/add-messages)

### Searching the Graph Sooner

Instead of using `thread.get_user_context`, you might want to [search the graph](/searching-the-graph) directly with custom parameters and construct your own [custom context block](/cookbook/customize-your-context-block). When doing this, you can search the graph and add data to the graph concurrently.
    
    
    1| import asyncio  
    ---|---  
    2| from zep_cloud.client import AsyncZep  
    3| from zep_cloud.types import Message  
    4|   
    5| client = AsyncZep(api_key="your_api_key")  
    6|   
    7| async def add_and_retrieve_from_zep(messages):  
    8|     # Concatenate message content to create query string  
    9|     query = " ".join([msg.content for msg in messages])  
    10|       
    11|     # Execute all operations concurrently  
    12|     add_result, edges_result, nodes_result = await asyncio.gather(  
    13|         client.thread.add_messages(  
    14|             thread_id=thread_id,  
    15|             messages=messages  
    16|         ),  
    17|         client.graph.search(  
    18|             user_id=user_id,  
    19|             query=query,  
    20|             scope="edges"  
    21|         ),  
    22|         client.graph.search(  
    23|             user_id=user_id,  
    24|             query=query,  
    25|             scope="nodes"  
    26|         )  
    27|     )  
    28|       
    29|     return add_result, edges_result, nodes_result  
  
You would then need to construct a custom context block using the search results. Learn more about [customizing your context block](/cookbook/customize-your-context-block).

## Optimizing Search Queries

Zep uses hybrid search combining semantic similarity and BM25 full-text search. For optimal performance:

  * Keep your queries concise. Queries are automatically truncated to 8,192 tokens (approximately 32,000 Latin characters)
  * Longer queries may not improve search quality and will increase latency
  * Consider breaking down complex searches into smaller, focused queries
  * Use specific, contextual queries rather than generic ones

Best practices for search:

  * Keep search queries concise and specific
  * Structure queries to target relevant information
  * Use natural language queries for better semantic matching
  * Consider the scope of your search (graphs versus user graphs)

    
    
    1| # Recommended - concise query  
    ---|---  
    2| results = await zep_client.graph.search(  
    3|     user_id=user_id,  # Or graph_id  
    4|     query="project requirements discussion"  
    5| )  
    6|   
    7| # Not recommended - overly long query  
    8| results = await zep_client.graph.search(  
    9|     user_id=user_id,  
    10|     query="very long text with multiple paragraphs..."  # Will be truncated  
    11| )  
  
## Summary

  * Reuse Zep SDK client instances to optimize connection management
  * Use appropriate methods for different types of content (`thread.add_messages` for conversations, `graph.add` for large documents)
  * Keep search queries focused and under the token limit for optimal performance
