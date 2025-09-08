# Find Facts Relevant to a Specific Node | Zep Documentation

**Source URL:** https://help.getzep.com/v3/cookbook/how-to-find-facts-relevant-to-a-specific-node  
**Scraped:** 2025-08-29 13:02:09

---

Below, we will go through how to retrieve facts which are related to a specific node in a Zep knowledge graph. First, we will go through some methods for determining the UUID of the node you are interested in. Then, we will go through some methods for retrieving the facts related to that node.

If you are interested in the user’s node specifically, we have a convenience method that [returns the user’s node](/v3/users#get-the-user-node) which includes the UUID.

An easy way to determine the UUID for other nodes is to use the graph explorer in the [Zep Web app](https://app.getzep.com/).

You can also programmatically retrieve all the nodes for a given user using our [get nodes by user API](/v3/sdk-reference/graph/node/get-by-user-id), and then manually examine the nodes and take note of the UUID of the node of interest:
    
    
    1| # Initialize the Zep client  
    ---|---  
    2| zep_client = Zep(api_key=API_KEY)  
    3| nodes = zep_client.graph.node.get_by_user_id(user_id="some user ID")  
    4| print(nodes)  
      
    
    1| center_node_uuid = "your chosen center node UUID"  
    ---|---  
  
Lastly, if your user has a lot of nodes to look through, you can narrow down the search by only looking at the nodes relevant to a specific query, using our [graph search API](/v3/searching-the-graph):
    
    
    1| results = zep_client.graph.search(  
    ---|---  
    2|     user_id="some user ID",  
    3|     query="shoe", # To help narrow down the nodes you have to manually search  
    4|     scope="nodes"  
    5| )  
    6| relevant_nodes = results.nodes  
    7| print(relevant_nodes)  
      
    
    1| center_node_uuid = "your chosen center node UUID"  
    ---|---  
  
The most straightforward way to get facts related to your node is to retrieve all facts that are connected to your chosen node using the [get edges by user API](/v3/sdk-reference/graph/edge/get-by-user-id):
    
    
    1| edges = zep_client.graph.edge.get_by_user_id(user_id="some user ID")  
    ---|---  
    2| connected_edges = [edge for edge in edges if edge.source_node_uuid == center_node_uuid or edge.target_node_uuid == center_node_uuid]  
    3| relevant_facts = [edge.fact for edge in connected_edges]  
  
You can also retrieve facts relevant to your node by using the [graph search API](/v3/searching-the-graph) with the node distance re-ranker:
    
    
    1| results = zep_client.graph.search(  
    ---|---  
    2|     user_id="some user ID",  
    3|     query="some query",  
    4|     reranker="node_distance",  
    5|     center_node_uuid=center_node_uuid,  
    6| )  
    7| relevant_edges = results.edges  
    8| relevant_facts = [edge.fact for edge in relevant_edges]  
  
In this recipe, we went through how to retrieve facts which are related to a specific node in a Zep knowledge graph. We first went through some methods for determining the UUID of the node you are interested in. Then, we went through some methods for retrieving the facts related to that node.
