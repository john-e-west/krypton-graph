# Adding Memory | Zep Documentation

**Source URL:** https://help.getzep.com/adding-memory  
**Scraped:** 2025-08-29 13:00:31

---

You can add both messages and business data to User Graphs.

## Adding Messages

Add your chat history to Zep using the `thread.add_messages` method. `thread.add_messages` is thread-specific and expects data in chat message format, including a `name` (e.g., user’s real name), `role` (AI, human, tool), and message `content`. Zep stores the chat history and builds a user-level knowledge graph from the messages.

##### 

For best results, add chat history to Zep on every chat turn. That is, add both the AI and human messages in a single operation and in the order that the messages were created.

The example below adds messages to Zep’s memory for the user in the given thread:

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2| from zep_cloud.types import Message  
    3|   
    4| zep_client = Zep(  
    5|     api_key=API_KEY,  
    6| )  
    7|   
    8| messages = [  
    9|     Message(  
    10|         name="Jane",  
    11|         role="user",  
    12|         content="Who was Octavia Butler?",  
    13|     )  
    14| ]  
    15|   
    16| episode_uuids = zep_client.thread.add_messages(thread_id, messages=messages)  
  
You can find additional arguments to `thread.add_messages` in the [SDK reference](/sdk-reference/thread/add-messages). Notably, for latency sensitive applications, you can set `return_context` to true which will make `thread.add_messages` return a context block in the way that `thread.get_user_context` does (discussed below).

### Check when messages are finished processing

You can use the episode UUIDs returned by the `thread.add_messages` function to poll the messages and check when they are finished processing. An example of this can be found in the [check data ingestion status cookbook](/cookbook/check-data-ingestion-status).

### Ignore Assistant Messages

You can also pass in a list of roles to ignore when adding messages to a User Graph using the `ignore_roles` argument. For example, you may not want assistant messages to be added to the user graph; providing the assistant messages in the `thread.add_messages` call while setting `ignore_roles` to include “assistant” will make it so that only the user messages are ingested into the graph, but the assistant messages are still used to contextualize the user messages. This is important in case the user message itself does not have enough context, such as the message “Yes.” Additionally, the assistant messages will still be added to the thread’s message history.

## Adding Business Data

You can also add JSON or unstructured text as memory to a User Graph using our [Graph API](/adding-data-to-the-graph).

## Customizing Memory Creation

Zep offers two ways to customize how memory is created. You can read more about these features at their guide pages:

  * [**Custom entity and edge types**](/customizing-graph-structure#custom-entity-and-edge-types): Feature allowing use of Pydantic-like classes to customize creation/retrieval of entities and relations in the knowledge graph.
  * [**Fact ratings**](/facts#rating-facts-for-relevancy): Feature for rating and filtering facts by relevance to your use case.
