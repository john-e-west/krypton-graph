# Adding Episodes | Zep Documentation

**Source URL:** https://help.getzep.com/graphiti/graphiti/adding-episodes  
**Scraped:** 2025-08-29 13:00:04

---

##### 

Refer to the [Custom Entity Types](/graphiti/core-concepts/custom-entity-and-edge-types) page for detailed instructions on adding user-defined ontology to your graph.

### Adding Episodes

Episodes represent a single data ingestion event. An `episode` is itself a node, and any nodes identified while ingesting the episode are related to the episode via `MENTIONS` edges.

Episodes enable querying for information at a point in time and understanding the provenance of nodes and their edge relationships.

Supported episode types:

  * `text`: Unstructured text data
  * `message`: Conversational messages of the format `speaker: message...`
  * `json`: Structured data, processed distinctly from the other types

The graph below was generated using the code in the [Quick Start](/graphiti/getting-started/quick-start). Each **podcast** is an individual episode.

![Simple Graph Visualization](https://raw.githubusercontent.com/getzep/graphiti/main/images/simple_graph.svg)

#### Adding a `text` or `message` Episode

Using the `EpisodeType.text` type:
    
    
    1| await graphiti.add_episode(  
    ---|---  
    2|     name="tech_innovation_article",  
    3|     episode_body=(  
    4|         "MIT researchers have unveiled 'ClimateNet', an AI system capable of predicting "  
    5|         "climate patterns with unprecedented accuracy. Early tests show it can forecast "  
    6|         "major weather events up to three weeks in advance, potentially revolutionizing "  
    7|         "disaster preparedness and agricultural planning."  
    8|     ),  
    9|     source=EpisodeType.text,  
    10|     # A description of the source (e.g., "podcast", "news article")  
    11|     source_description="Technology magazine article",  
    12|     # The timestamp for when this episode occurred or was created  
    13|     reference_time=datetime(2023, 11, 15, 9, 30),  
    14| )  
  
Using the `EpisodeType.message` type supports passing in multi-turn conversations in the `episode_body`.

The text should be structured in `{role/name}: {message}` pairs.
    
    
    1| await graphiti.add_episode(  
    ---|---  
    2|     name="Customer_Support_Interaction_1",  
    3|     episode_body=(  
    4|         "Customer: Hi, I'm having trouble with my Allbirds shoes. "  
    5|         "The sole is coming off after only 2 months of use.\n"  
    6|         "Support: I'm sorry to hear that. Can you please provide your order number?"  
    7|     ),  
    8|     source=EpisodeType.message,  
    9|     source_description="Customer support chat",  
    10|     reference_time=datetime(2024, 3, 15, 14, 45),  
    11| )  
  
#### Adding an Episode using structured data in JSON format

JSON documents can be arbitrarily nested. However, it’s advisable to keep documents compact, as they must fit within your LLM’s context window.

##### 

For large data imports, consider using the `add_episode_bulk` API to efficiently add multiple episodes at once.
    
    
    1| product_data = {  
    ---|---  
    2|     "id": "PROD001",  
    3|     "name": "Men's SuperLight Wool Runners",  
    4|     "color": "Dark Grey",  
    5|     "sole_color": "Medium Grey",  
    6|     "material": "Wool",  
    7|     "technology": "SuperLight Foam",  
    8|     "price": 125.00,  
    9|     "in_stock": True,  
    10|     "last_updated": "2024-03-15T10:30:00Z"  
    11| }  
    12|   
    13| # Add the episode to the graph  
    14| await graphiti.add_episode(  
    15|     name="Product Update - PROD001",  
    16|     episode_body=product_data,  # Pass the Python dictionary directly  
    17|     source=EpisodeType.json,  
    18|     source_description="Allbirds product catalog update",  
    19|     reference_time=datetime.now(),  
    20| )  
  
#### Loading Episodes in Bulk

Graphiti offers `add_episode_bulk` for efficient batch ingestion of episodes, significantly outperforming `add_episode` for large datasets. This method is highly recommended for bulk loading.

##### 

Use `add_episode_bulk` only for populating empty graphs or when edge invalidation is not required. The bulk ingestion pipeline does not perform edge invalidation operations.
    
    
    1| product_data = [  
    ---|---  
    2|     {  
    3|         "id": "PROD001",  
    4|         "name": "Men's SuperLight Wool Runners",  
    5|         "color": "Dark Grey",  
    6|         "sole_color": "Medium Grey",  
    7|         "material": "Wool",  
    8|         "technology": "SuperLight Foam",  
    9|         "price": 125.00,  
    10|         "in_stock": true,  
    11|         "last_updated": "2024-03-15T10:30:00Z"  
    12|     },  
    13|     ...  
    14|     {  
    15|         "id": "PROD0100",  
    16|         "name": "Kids Wool Runner-up Mizzles",  
    17|         "color": "Natural Grey",  
    18|         "sole_color": "Orange",  
    19|         "material": "Wool",  
    20|         "technology": "Water-repellent",  
    21|         "price": 80.00,  
    22|         "in_stock": true,  
    23|         "last_updated": "2024-03-17T14:45:00Z"  
    24|     }  
    25| ]  
    26|   
    27| # Prepare the episodes for bulk loading  
    28|   
    29| bulk_episodes = [  
    30| RawEpisode(  
    31| name=f"Product Update - {product['id']}",  
    32| content=json.dumps(product),  
    33| source=EpisodeType.json,  
    34| source_description="Allbirds product catalog update",  
    35| reference_time=datetime.now()  
    36| )  
    37| for product in product_data  
    38| ]  
    39|   
    40| await graphiti.add_episode_bulk(bulk_episodes)
