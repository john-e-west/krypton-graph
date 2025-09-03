# Adding Fact Triples | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/working-with-data/adding-fact-triples  
**Scraped:** 2025-08-29 13:02:27

---

A “fact triple” consists of two nodes and an edge between them, where the edge typically contains some fact. You can manually add a fact triple of your choosing to the graph like this:
    
    
    1| from graphiti_core.nodes import EpisodeType, EntityNode  
    ---|---  
    2| from graphiti_core.edges import EntityEdge  
    3| import uuid  
    4| from datetime import datetime  
    5|   
    6| source_name = "Bob"  
    7| target_name = "bananas"  
    8| source_uuid = "some existing UUID" # This is an existing node, so we use the existing UUID obtained from Neo4j Desktop  
    9| target_uuid = str(uuid.uuid4()) # This is a new node, so we create a new UUID  
    10| edge_name = "LIKES"  
    11| edge_fact = "Bob likes bananas"  
    12|   
    13|   
    14| source_node = EntityNode(  
    15|     uuid=source_uuid,  
    16|     name=source_name,  
    17|     group_id=""  
    18| )  
    19| target_node = EntityNode(  
    20|     uuid=target_uuid,  
    21|     name=target_name,  
    22|     group_id=""  
    23| )  
    24| edge = EntityEdge(  
    25|     group_id="",  
    26|     source_node_uuid=source_uuid,  
    27|     target_node_uuid=target_uuid,  
    28|     created_at=datetime.now(),  
    29|     name=edge_name,  
    30|     fact=edge_fact  
    31| )  
    32|   
    33| await graphiti.add_triplet(source_node, edge, target_node)  
  
When you add a fact triple, Graphiti will attempt to deduplicate your passed in nodes and edge with the already existing nodes and edges in the graph. If there are no duplicates, it will add them as new nodes and edges.

Also, you can avoid constructing `EntityEdge` or `EntityNode` objects manually by using the results of a Graphiti search (see [Searching the Graph](/graphiti/graphiti/searching)).
