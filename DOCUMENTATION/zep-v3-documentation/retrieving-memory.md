# Retrieving Memory | Zep Documentation

**Source URL:** https://help.getzep.com/v3/retrieving-memory  
**Scraped:** 2025-08-29 13:00:45

---

There are two ways to retrieve memory from a User Graph: using Zep’s Context Block or searching the graph.

## Retrieving Zep’s Context Block

Zep’s Context Block is an optimized, automatically assembled string that you can directly provide as context to your agent. Zep’s Context Block combines semantic search, full text search, and breadth first search to return context that is highly relevant to the user’s current conversation slice, utilizing the past four messages.

The Context Block is returned by the `thread.get_user_context()` method. This method uses the latest messages of the _given thread_ to search the (entire) User Graph and then returns the search results in the form of the Context Block.

Note that although `thread.get_user_context()` only requires a thread ID, it is able to return memory derived from any thread of that user. The thread is just used to determine what’s relevant.

The `mode` parameter determines what form the Context Block takes (see below).

### Summarized Context Block (default)

This Context Block type returns a short summary of the relevant context.

**Benefits:**

  * Low token usage
  * Easier for LLMs to understand

**Trade-offs:**

  * Higher latency
  * Some risk of missing important details

Example:

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
  
### Basic Context Block (faster)

This Context Block type returns the relevant context in a more raw format, but faster.

**Benefits:**

  * Lower latency (P95 < 200ms)
  * More detailed information preserved

**Trade-offs:**

  * Higher token usage
  * May be harder for some LLMs to parse

Example:

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
  
### Getting the Context Block Sooner

You can get the Context Block sooner by passing in the `return_context=True` flag to the `thread.add_messages()` method, but it will always return the basic Context Block type. Read more about this in our [performance guide](/v3/performance#get-the-context-block-sooner).

## Searching the Graph

You can also directly search a User Graph using our highly customizable `graph.search` method and construct a custom context block. Read more about this in our [Searching the Graph](/v3/searching-the-graph) guide.

## Using Memory

### Provide the Context Block in Your System Prompt

Once you’ve retrieved the [Context Block](/v3/retrieving-memory#retrieving-zeps-context-block), or [constructed your own context block](/v3/cookbook/customize-your-context-block) by [searching the graph](/v3/searching-the-graph), you can include this string in your system prompt:

MessageType| Content  
---|---  
`System`| Your system prompt   
  
`{Zep context block}`  
`Assistant`| An assistant message stored in Zep  
`User`| A user message stored in Zep  
…| …  
`User`| The latest user message  
  
### Provide the Last 4 to 6 Messages of the Thread

You should also include the last 4 to 6 messages of the thread when calling your LLM provider. Because Zep’s ingestion can take a few minutes, the context block may not include information from the last few messages; and so the context block acts as the “long-term memory,” and the last few messages serve as the raw, short-term memory.
