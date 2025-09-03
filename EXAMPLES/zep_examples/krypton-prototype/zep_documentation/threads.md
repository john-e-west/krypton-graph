# Threads | Zep Documentation

**Source URL:** https://help.getzep.com/threads  
**Scraped:** 2025-08-29 13:00:30

---

## Overview

Threads represent a conversation. Each [User](/users) can have multiple threads, and each thread is a sequence of chat messages.

Chat messages are added to threads using [`thread.add_messages`](/adding-memory#adding-messages), which both adds those messages to the thread history and ingests those messages into the user-level knowledge graph. The user knowledge graph contains data from all of that user’s threads to create an integrated understanding of the user.

##### 

The knowledge graph does not separate the data from different threads, but integrates the data together to create a unified picture of the user. So the [get thread user context](/sdk-reference/thread/get-user-context) endpoint and the associated [`thread.get_user_context`](/retrieving-memory#retrieving-zeps-context-block) method don’t return memory derived only from that thread, but instead return whatever user-level memory is most relevant to that thread, based on the thread’s most recent messages.

## Adding a Thread

`threadIds` are arbitrary identifiers that you can map to relevant business objects in your app, such as users or a conversation a user might have with your app. Before you create a thread, make sure you have [created a user](/users#adding-a-user) first. Then create a thread with:

PythonTypeScript
    
    
    1| client = Zep(  
    ---|---  
    2|     api_key=API_KEY,  
    3| )  
    4| thread_id = uuid.uuid4().hex # A new thread identifier  
    5|   
    6| client.thread.create(  
    7|     thread_id=thread_id,  
    8|     user_id=user_id,  
    9| )  
  
## Getting Messages of a Thread

PythonTypeScript
    
    
    1| messages = client.thread.get(thread_id)  
    ---|---  
  
## Deleting a Thread

Deleting a thread deletes it and its associated messages. It does not however delete the associated data in the user’s knowledge graph. To remove data from the graph, see [deleting data from the graph](/deleting-data-from-the-graph).

PythonTypeScript
    
    
    1| client.thread.delete(thread_id)  
    ---|---  
  
## Listing Threads

You can list all Threads in the Zep Memory Store with page_size and page_number parameters for pagination.

PythonTypeScript
    
    
    1| # List the first 10 Threads  
    ---|---  
    2| result = client.thread.list_all(page_size=10, page_number=1)  
    3| for thread in result.threads:  
    4|     print(thread)
