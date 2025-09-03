# Adding Data to the Graph | Zep Documentation

**Source URL:** https://help.getzep.com/adding-data-to-the-graph  
**Scraped:** 2025-08-29 13:00:07

---

## Overview

##### 

Requests to add data to the same graph are completed sequentially to ensure the graph is built correctly, and processing may be slow for large datasets. Use [batch ingestion](/adding-data-to-the-graph#add-batch-data) when adding large datasets such as backfills or document collections.

In addition to incorporating memory through chat history, Zep offers the capability to add data directly to the graph. Zep supports three distinct data types: message, text, and JSON.

The message type is ideal for adding data in the form of chat messages that are not directly associated with a Zep [Thread’s](/threads) chat history. This encompasses any communication with a designated speaker, such as emails or previous chat logs.

The text type is designed for raw text data without a specific speaker attribution. This category includes content from internal documents, wiki articles, or company handbooks. It’s important to note that Zep does not process text directly from links or files.

The JSON type may be used to add any JSON document to Zep. This may include REST API responses or JSON-formatted business data.

You can add data to a graph by specifying a `graph_id`, or to a user graph by providing a `user_id`.

## Adding Message Data

Here’s an example demonstrating how to add message data to the graph:

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| message = "Paul (user): I went to Eric Clapton concert last night"  
    8|   
    9| new_episode = client.graph.add(  
    10|     user_id="user123",    # Optional user ID  
    11|     type="message",       # Specify type as "message"  
    12|     data=message  
    13| )  
  
## Adding Text Data

Here’s an example demonstrating how to add text data to the graph:

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| new_episode = client.graph.add(  
    8|     user_id="user123",  # Optional user ID  
    9|     type="text",        # Specify type as "text"   
    10|     data="The user is an avid fan of Eric Clapton"  
    11| )  
  
## Adding JSON Data

Here’s an example demonstrating how to add JSON data to the graph:

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2| import json  
    3|   
    4| client = Zep(  
    5|     api_key=API_KEY,  
    6| )  
    7|   
    8| json_data = {"name": "Eric Clapton", "age": 78, "genre": "Rock"}  
    9| json_string = json.dumps(json_data)  
    10| new_episode = client.graph.add(  
    11|     user_id=user_id,  
    12|     type="json",  
    13|     data=json_string,  
    14| )  
  
## Data Size Limit and Chunking

The `graph.add` endpoint has a data size limit of 10,000 characters when adding data to the graph. If you need to add a document which is more than 10,000 characters, we recommend chunking the document as well as using Anthropic’s contextualized retrieval technique. We have an example of this [here](https://blog.getzep.com/building-a-russian-election-interference-knowledge-graph/#:~:text=Chunking%20articles%20into%20multiple%20Episodes%20improved%20our%20results%20compared%20to%20treating%20each%20article%20as%20a%20single%20Episode.%20This%20approach%20generated%20more%20detailed%20knowledge%20graphs%20with%20richer%20node%20and%20edge%20extraction%2C%20while%20single%2DEpisode%20processing%20produced%20only%20high%2Dlevel%2C%20sparse%20graphs.). This example uses Graphiti, but the same patterns apply to Zep as well.

Additionally, we recommend using relatively small chunk sizes, so that Zep is able to capture all of the entities and relationships within a chunk. Using a larger chunk size may result in some entities and relationships not being captured.

## Adding Custom Fact/Node Triplets

You can also add manually specified fact/node triplets to the graph. You need only specify the fact, the target node name, and the source node name. Zep will then create a new corresponding edge and nodes, or use an existing edge/nodes if they exist and seem to represent the same nodes or edge you send as input. And if this new fact invalidates an existing fact, it will mark the existing fact as invalid and add the new fact triplet.

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| client.graph.add_fact_triple(  
    8|     user_id=user_id,  
    9|     fact="Paul met Eric",  
    10|     fact_name="MET",  
    11|     target_node_name="Eric Clapton",  
    12|     source_node_name="Paul",  
    13| )  
  
You can also specify the node summaries, edge temporal data, and UUIDs. See the [associated SDK reference](/sdk-reference/graph/add-fact-triple).

## Add Batch Data

You can add data in batches for faster processing when working with large datasets. To learn more about batch processing and implementation details, see [Adding Batch Data](/adding-batch-data).

## Cloning Graphs

The `graph.clone` method allows you to create complete copies of graphs with new identifiers. This is useful for scenarios like creating test copies of user data, migrating user graphs to new identifiers, or setting up template graphs for new users.

##### 

The cloning process does not copy fact ratings from the original graph. Fact ratings will not be present in the cloned graph.

##### 

The target graph must not exist - they will be created as part of the cloning operation. If no target ID is provided, one will be auto-generated and returned in the response.

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| # Clone a graph to a new graph ID  
    8| result = client.graph.clone(  
    9|     source_graph_id="graph_456",  
    10|     target_graph_id="graph_456_copy"  # Optional - will be auto-generated if not provided  
    11| )  
    12|   
    13| print(f"Cloned graph to graph: {result.graph_id}")  
  
### Cloning User Graphs

Here’s an example demonstrating how to clone a user graph:

PythonTypeScriptGo
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| # Clone a user graph to a new user ID  
    8| result = client.graph.clone(  
    9|     source_user_id="user_123",  
    10|     target_user_id="user_123_copy"  # Optional - will be auto-generated if not provided  
    11| )  
    12|   
    13| print(f"Cloned graph to user: {result.user_id}")  
  
### Key Behaviors and Limitations

  * **Target Requirements** : The target user or graph must not exist and will be created during the cloning operation
  * **Auto-generation** : If no target ID is provided, Zep will auto-generate one and return it in the response
  * **Node Modification** : The central user entity node in the cloned graph is updated with the new user ID, and all references in the node summary are updated accordingly

## Managing Your Data on the Graph

The `graph.add` method returns the [episode](/graphiti/graphiti/adding-episodes) that was created in the graph from adding that data. You can use this to maintain a mapping between your data and its corresponding episode in the graph and to delete specific data from the graph using the [delete episode](/deleting-data-from-the-graph#delete-an-episode) method.
