# Adding batch data | Zep Documentation

**Source URL:** https://help.getzep.com/adding-batch-data  
**Scraped:** 2025-08-29 13:00:38

---

The batch add method enables efficient concurrent processing of large amounts of data to your graph. This experimental feature is designed for scenarios where you need to add multiple episodes quickly, such as backfills, document collections, or historical data imports.

##### 

This is an experimental feature. While faster than sequential processing, batch ingestion may result in slightly different graph structure compared to sequential processing due to the concurrent nature of the operation.

## How batch processing works

The batch add method processes episodes concurrently for improved performance while still preserving temporal relationships between episodes. Unlike sequential processing where episodes are handled one at a time, batch processing can handle up to 20 episodes simultaneously.

The batch method works with data with a temporal dimension such as evolving chat histories and can process up to 20 episodes at a time of mixed types (text, json, message).

## When to use batch processing

Batch processing is ideal for:

  * Historical data backfills
  * Document collection imports
  * Large datasets where processing speed is prioritized
  * Data with a temporal dimension

Batch processing works for all types of data, including data with a temporal dimension such as evolving chat histories.

## Usage example

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2| from zep_cloud import EpisodeData  
    3| import json  
    4|   
    5| client = Zep(  
    6|     api_key=API_KEY,  
    7| )  
    8|   
    9| episodes = [  
    10|     EpisodeData(  
    11|         data="This is an example text episode.",  
    12|         type="text"  
    13|     ),  
    14|     EpisodeData(  
    15|         data=json.dumps({"name": "Eric Clapton", "age": 78, "genre": "Rock"}),  
    16|         type="json"  
    17|     ),  
    18|     EpisodeData(  
    19|         data="User: I really enjoyed the concert last night",  
    20|         type="message"  
    21|     )  
    22| ]  
    23|   
    24| client.graph.add_batch(episodes=episodes, graph_id=graph_id)  
  
## Adding batch message data to threads

In addition to adding batch data to your graph, you can add batch message data directly into user threads. This functionality is important when you want to maintain the structure of threads for your user data, which can affect how the `thread.get_user_context()` method works since it relies on the past messages of a given thread.

PythonTypeScriptGo
    
    
    1| from zep_cloud import Zep  
    ---|---  
    2| from zep_cloud.types import Message, RoleType  
    3|   
    4| client = Zep(api_key=API_KEY)  
    5|   
    6| # Create multiple messages for batch addition  
    7| messages = [  
    8|     Message(  
    9|         content="Hello, I need help with my account",  
    10|         role="user",  
    11|         name="customer"  
    12|     ),  
    13|     Message(  
    14|         content="I'd be happy to help you with your account. What specific issue are you experiencing?",  
    15|         role="assistant"  
    16|     ),  
    17|     Message(  
    18|         content="I can't access my dashboard and keep getting an error",  
    19|         role="user",  
    20|         name="customer"  
    21|     ),  
    22|     Message(  
    23|         content="Let me help you troubleshoot that. Can you tell me what error message you're seeing?",  
    24|         role="assistant"  
    25|     )  
    26| ]  
    27|   
    28| # Add messages in batch to create/populate a thread  
    29| response = client.thread.add_messages_batch(  
    30|     thread_id="your_thread_id",  
    31|     messages=messages,  
    32|     return_context=True  
    33| )  
  
## Important details

  * Maximum of 20 episodes per batch
  * Episodes can be of mixed types (text, json, message)
  * As an experimental feature, may produce slightly different graph structure compared to sequential processing
  * Each episode still respects the 10,000 character limit

## Data size and chunking

The same data size limits apply to batch processing as sequential processing. Each episode in the batch is limited to 10,000 characters. For larger documents, chunk them into smaller episodes before adding to the batch.

For chunking strategies and best practices, see the [data size limit and chunking section](/adding-data-to-the-graph#data-size-limit-and-chunking) in the main adding data guide.
