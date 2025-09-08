# Reading Data from the Graph | Zep Documentation

**Source URL:** https://help.getzep.com/v3/reading-data-from-the-graph  
**Scraped:** 2025-08-29 13:00:27

---

Zep provides APIs to read Edges, Nodes, and Episodes from the graph. These elements can be retrieved individually using their `UUID`, or as lists associated with a specific `user_id` or `graph_id`. The latter method returns all objects within the user’s or graph’s graph.

Examples of each retrieval method are provided below.

## Reading Edges

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| edge = client.graph.edge.get(edge_uuid)  
  
## Reading Nodes

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| node = client.graph.node.get_by_user(user_uuid)  
  
## Reading Episodes

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(  
    4|     api_key=API_KEY,  
    5| )  
    6|   
    7| episode = client.graph.episode.get_by_graph_id(graph_uuid)
