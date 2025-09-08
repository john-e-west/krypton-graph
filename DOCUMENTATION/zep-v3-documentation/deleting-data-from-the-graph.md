# Deleting Data from the Graph | Zep Documentation

**Source URL:** https://help.getzep.com/v3/deleting-data-from-the-graph  
**Scraped:** 2025-08-29 13:00:24

---

## Delete an Edge

Here’s how to delete an edge from a graph:

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| client.graph.edge.delete(uuid_="your_edge_uuid")  
  
Note that when you delete an edge, it never deletes the associated nodes, even if it means there will be a node with no edges. And currently, nodes with no edges will not appear in the graph explorer, but they will still exist in the graph and be retrievable in memory.

## Delete an Episode

##### 

Deleting an episode does not regenerate the names or summaries of nodes shared with other episodes. This episode information may still exist within these nodes. If an episode invalidates a fact, and the episode is deleted, the fact will remain marked as invalidated.

When you delete an [episode](/graphiti/graphiti/adding-episodes), it will delete all the edges associated with it, and it will delete any nodes that are only attached to that episode. Nodes that are also attached to another episode will not be deleted.

Here’s how to delete an episode from a graph:

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| client.graph.episode.delete(uuid_="episode_uuid")  
  
## Delete a Node

This feature is coming soon.
