# Customize Your Context Block | Zep Documentation

**Source URL:** https://help.getzep.com/cookbook/customize-your-context-block  
**Scraped:** 2025-08-29 12:59:54

---

When [searching the graph](/searching-the-graph) instead of [using Zep’s Context Block](/retrieving-memory#retrieving-zeps-context-block), you need to use the search results to create a custom context block. In this recipe, we will demonstrate how to build a custom Context Block using the [graph search API](/searching-the-graph). We will also use the [custom entity and edge types feature](/customizing-graph-structure#custom-entity-and-edge-types), though using this feature is optional.

# Add data

First, we define our [custom entity and edge types](/customizing-graph-structure#definition-1), create a user, and add some example data:

PythonTypeScriptGo
    
    
    1| import uuid  
    ---|---  
    2| from zep_cloud import Message  
    3| from zep_cloud.external_clients.ontology import EntityModel, EntityText, EdgeModel, EntityBoolean  
    4| from zep_cloud import EntityEdgeSourceTarget  
    5| from pydantic import Field  
    6|   
    7| class Restaurant(EntityModel):  
    8|     """  
    9|     Represents a specific restaurant.  
    10|     """  
    11|     cuisine_type: EntityText = Field(description="The cuisine type of the restaurant, for example: American, Mexican, Indian, etc.", default=None)  
    12|     dietary_accommodation: EntityText = Field(description="The dietary accommodation of the restaurant, if any, for example: vegetarian, vegan, etc.", default=None)  
    13|   
    14| class RestaurantVisit(EdgeModel):  
    15|     """  
    16|     Represents the fact that the user visited a restaurant.  
    17|     """  
    18|     restaurant_name: EntityText = Field(description="The name of the restaurant the user visited", default=None)  
    19|   
    20| class DietaryPreference(EdgeModel):  
    21|     """  
    22|     Represents the fact that the user has a dietary preference or dietary restriction.  
    23|     """  
    24|     preference_type: EntityText = Field(description="Preference type of the user: anything, vegetarian, vegan, peanut allergy, etc.", default=None)  
    25|     allergy: EntityBoolean = Field(description="Whether this dietary preference represents a user allergy: True or false", default=None)  
    26|   
    27| client.graph.set_ontology(  
    28|     entities={  
    29|         "Restaurant": Restaurant,  
    30|     },  
    31|     edges={  
    32|         "RESTAURANT_VISIT": (  
    33|             RestaurantVisit,  
    34|             [EntityEdgeSourceTarget(source="User", target="Restaurant")]  
    35|         ),  
    36|         "DIETARY_PREFERENCE": (  
    37|             DietaryPreference,  
    38|             [EntityEdgeSourceTarget(source="User")]  
    39|         ),  
    40|     }  
    41| )  
    42|   
    43| messages_thread1 = [  
    44|     Message(content="Take me to a lunch place", role="user", name="John Doe"),  
    45|     Message(content="How about Panera Bread, Chipotle, or Green Leaf Cafe, which are nearby?", role="assistant", name="Assistant"),  
    46|     Message(content="Do any of those have vegetarian options? I’m vegetarian", role="user", name="John Doe"),  
    47|     Message(content="Yes, Green Leaf Cafe has vegetarian options", role="assistant", name="Assistant"),  
    48|     Message(content="Let’s go to Green Leaf Cafe", role="user", name="John Doe"),  
    49|     Message(content="Navigating to Green Leaf Cafe", role="assistant", name="Assistant"),  
    50| ]  
    51|   
    52| messages_thread2 = [  
    53|     Message(content="Take me to dessert", role="user", name="John Doe"),  
    54|     Message(content="How about getting some ice cream?", role="assistant", name="Assistant"),  
    55|     Message(content="I can't have ice cream, I'm lactose intolerant, but I'm craving a chocolate chip cookie", role="user", name="John Doe"),  
    56|     Message(content="Sure, there's Insomnia Cookies nearby.", role="assistant", name="Assistant"),  
    57|     Message(content="Perfect, let's go to Insomnia Cookies", role="user", name="John Doe"),  
    58|     Message(content="Navigating to Insomnia Cookies.", role="assistant", name="Assistant"),  
    59| ]  
    60|   
    61| user_id = f"user-{uuid.uuid4()}"  
    62| client.user.add(user_id=user_id, first_name="John", last_name="Doe", email="[[email protected]](/cdn-cgi/l/email-protection)")  
    63|   
    64| thread1_id = f"thread-{uuid.uuid4()}"  
    65| thread2_id = f"thread-{uuid.uuid4()}"  
    66| client.thread.create(thread_id=thread1_id, user_id=user_id)  
    67| client.thread.create(thread_id=thread2_id, user_id=user_id)  
    68|   
    69| client.thread.add_messages(thread_id=thread1_id, messages=messages_thread1, ignore_roles=["assistant"])  
    70| client.thread.add_messages(thread_id=thread2_id, messages=messages_thread2, ignore_roles=["assistant"])  
  
# Example 1: Basic custom context block

## Search

For a basic custom context block, we search the graph for edges and nodes relevant to our custom query string, which typically represents a user message. Note that the default [Context Block](/retrieving-memory#retrieving-zeps-context-block) returned by `thread.get_user_context` uses the past few messages as the query instead.

##### 

These searches can be performed in parallel to reduce latency, using our [async Python client](/quickstart#initialize-the-client), TypeScript promises, or goroutines.

PythonTypeScriptGo
    
    
    1| query = "Find some food around here"  
    ---|---  
    2|   
    3| search_results_nodes = client.graph.search(  
    4|     query=query,  
    5|     user_id=user_id,  
    6|     scope='nodes',  
    7|     reranker='cross_encoder',  
    8|     limit=10  
    9| )  
    10| search_results_edges = client.graph.search(  
    11|     query=query,  
    12|     user_id=user_id,  
    13|     scope='edges',  
    14|     reranker='cross_encoder',  
    15|     limit=10  
    16| )  
  
## Build the context block

Using the search results and a few helper functions, we can build the context block. Note that for nodes, we typically want to unpack the node name and node summary, and for edges we typically want to unpack the fact and the temporal validity information:

PythonTypeScriptGo
    
    
    1| from zep_cloud import EntityEdge, EntityNode  
    ---|---  
    2|   
    3| CONTEXT_STRING_TEMPLATE = """  
    4| FACTS and ENTITIES represent relevant context to the current conversation.  
    5| # These are the most relevant facts and their valid date ranges  
    6| # format: FACT (Date range: from - to)  
    7| <FACTS>  
    8| {facts}  
    9| </FACTS>  
    10|   
    11| # These are the most relevant entities  
    12| # ENTITY_NAME: entity summary  
    13| <ENTITIES>  
    14| {entities}  
    15| </ENTITIES>  
    16| """  
    17|   
    18|   
    19| def format_fact(edge: EntityEdge) -> str:  
    20|     valid_at = edge.valid_at if edge.valid_at is not None else "date unknown"  
    21|     invalid_at = edge.invalid_at if edge.invalid_at is not None else "present"  
    22|     formatted_fact = f"  - {edge.fact} (Date range: {valid_at} - {invalid_at})"  
    23|     return formatted_fact  
    24|   
    25| def format_entity(node: EntityNode) -> str:  
    26|     formatted_entity = f"  - {node.name}: {node.summary}"  
    27|     return formatted_entity  
    28|   
    29| def compose_context_block(edges: list[EntityEdge], nodes: list[EntityNode]) -> str:  
    30|     facts = [format_fact(edge) for edge in edges]  
    31|     entities = [format_entity(node) for node in nodes]  
    32|     return CONTEXT_STRING_TEMPLATE.format(facts='\n'.join(facts), entities='\n'.join(entities))  
    33|   
    34| edges = search_results_edges.edges  
    35| nodes = search_results_nodes.nodes  
    36|   
    37| context_block = compose_context_block(edges, nodes)  
    38| print(context_block)  
      
    
    FACTS and ENTITIES represent relevant context to the current conversation.  
    ---  
    # These are the most relevant facts and their valid date ranges  
    # format: FACT (Date range: from - to)  
    <FACTS>  
      - User wants to go to dessert (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe wants to go to a lunch place (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe said 'Perfect, let's go to Insomnia Cookies' indicating he will visit Insomnia Cookies. (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe said 'Let’s go to Green Leaf Cafe' indicating intention to visit (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe is craving a chocolate chip cookie (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe states that he is vegetarian. (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe is lactose intolerant (Date range: 2025-06-16T02:17:25Z - present)  
    </FACTS>  
       
    # These are the most relevant entities  
    # ENTITY_NAME: entity summary  
    <ENTITIES>  
      - lunch place: The entity is a lunch place, but no specific details about its cuisine or dietary accommodations are provided.  
      - dessert: The entity 'dessert' refers to a preference related to sweet courses typically served at the end of a meal. The context indicates that the user has expressed an interest in going to a dessert place, but no specific dessert or place has been named. The entity is categorized as a Preference and Entity, but no additional attributes are provided or inferred from the messages.  
      - Green Leaf Cafe: Green Leaf Cafe is a restaurant that offers vegetarian options, making it suitable for vegetarian diners.  
      - user: The user is John Doe, with the email [[email protected]](/cdn-cgi/l/email-protection). He has shown interest in visiting Green Leaf Cafe, which offers vegetarian options, and has also expressed a preference for lactose-free options, craving a chocolate chip cookie. The user has decided to go to Insomnia Cookies.  
      - vegetarian: The user is interested in lunch places such as Panera Bread, Chipotle, and Green Leaf Cafe. They are specifically looking for vegetarian options at these restaurants.  
      - chocolate chip cookie: The entity is a chocolate chip cookie, which the user desires as a snack. The user is lactose intolerant and cannot have ice cream, but is craving a chocolate chip cookie.  
      - Insomnia Cookies: Insomnia Cookies is a restaurant that offers cookies, including chocolate chip cookies. The user is interested in a dessert and has chosen to go to Insomnia Cookies. No specific cuisine type or dietary accommodations are mentioned in the messages.  
      - lactose intolerant: The entity is a preference indicating lactose intolerance, which is a dietary restriction that prevents the individual from consuming lactose, a sugar found in milk and dairy products. The person is specifically craving a chocolate chip cookie but cannot have ice cream due to lactose intolerance.  
      - John Doe: The user is John Doe, with user ID user-34c7a6c1-ded6-4797-9620-8b80a5e7820f, email [[email protected]](/cdn-cgi/l/email-protection), and role user. He inquired about nearby lunch options and vegetarian choices, and expressed a preference for a chocolate chip cookie due to lactose intolerance.  
    </ENTITIES>  
  
# Example 2: Utilizing custom entity and edge types

## Search

For a custom context block that uses custom entity and edge types, we perform multiple searches (with our custom query string) filtering to the custom entity or edge type we want to include in the context block:

##### 

These searches can be performed in parallel to reduce latency, using our [async Python client](/quickstart#initialize-the-client), TypeScript promises, or goroutines.

PythonTypeScriptGo
    
    
    1| query = "Find some food around here"  
    ---|---  
    2|   
    3| search_results_restaurant_visits = client.graph.search(  
    4|     query=query,  
    5|     user_id=user_id,  
    6|     scope='edges',  
    7|     search_filters={  
    8|         "edge_types": ["RESTAURANT_VISIT"]  
    9|     },  
    10|     reranker='cross_encoder',  
    11|     limit=10  
    12| )  
    13| search_results_dietary_preferences = client.graph.search(  
    14|     query=query,  
    15|     user_id=user_id,  
    16|     scope='edges',  
    17|     search_filters={  
    18|         "edge_types": ["DIETARY_PREFERENCE"]  
    19|     },  
    20|     reranker='cross_encoder',  
    21|     limit=10  
    22| )  
    23| search_results_restaurants = client.graph.search(  
    24|     query=query,  
    25|     user_id=user_id,  
    26|     scope='nodes',  
    27|     search_filters={  
    28|         "node_labels": ["Restaurant"]  
    29|     },  
    30|     reranker='cross_encoder',  
    31|     limit=10  
    32| )  
  
## Build the context block

Using the search results and a few helper functions, we can compose the context block. Note that in this example, we focus on unpacking the custom attributes of the nodes and edges, but this is a design choice that you can experiment with for your use case.

Note also that we designed the context block template around the custom entity and edge types that we are unpacking into the context block:

PythonTypeScriptGo
    
    
    1| from zep_cloud import EntityEdge, EntityNode  
    ---|---  
    2|   
    3| CONTEXT_STRING_TEMPLATE = """  
    4| PREVIOUS_RESTAURANT_VISITS, DIETARY_PREFERENCES, and RESTAURANTS represent relevant context to the current conversation.  
    5| # These are the most relevant restaurants the user has previously visited  
    6| # format: restaurant_name: RESTAURANT_NAME  
    7| <PREVIOUS_RESTAURANT_VISITS>  
    8| {restaurant_visits}  
    9| </PREVIOUS_RESTAURANT_VISITS>  
    10|   
    11| # These are the most relevant dietary preferences of the user, whether they represent an allergy, and their valid date ranges  
    12| # format: allergy: True/False; preference_type: PREFERENCE_TYPE (Date range: from - to)  
    13| <DIETARY_PREFERENCES>  
    14| {dietary_preferences}  
    15| </DIETARY_PREFERENCES>  
    16|   
    17| # These are the most relevant restaurants the user has discussed previously  
    18| # format: name: RESTAURANT_NAME; cuisine_type: CUISINE_TYPE; dietary_accommodation: DIETARY_ACCOMMODATION  
    19| <RESTAURANTS>  
    20| {restaurants}  
    21| </RESTAURANTS>  
    22| """  
    23|   
    24| def format_edge_with_attributes(edge: EntityEdge, include_timestamps: bool = True) -> str:  
    25|     attrs_str = '; '.join(f"{k}: {v}" for k, v in sorted(edge.attributes.items()))  
    26|     if include_timestamps:  
    27|         valid_at = edge.valid_at if edge.valid_at is not None else "date unknown"  
    28|         invalid_at = edge.invalid_at if edge.invalid_at is not None else "present"  
    29|         return f"  - {attrs_str} (Date range: {valid_at} - {invalid_at})"  
    30|     return f"  - {attrs_str}"  
    31|   
    32| def format_node_with_attributes(node: EntityNode) -> str:  
    33|     attributes = {k: v for k, v in node.attributes.items() if k != "labels"}  
    34|     attrs_str = '; '.join(f"{k}: {v}" for k, v in sorted(attributes.items()))  
    35|     base = f"  - name: {node.name}; {attrs_str}"  
    36|     return base  
    37|   
    38| def compose_context_block(restaurant_visit_edges: list[EntityEdge], dietary_preference_edges: list[EntityEdge], restaurant_nodes: list[EntityNode]) -> str:  
    39|     restaurant_visits = [format_edge_with_attributes(edge, include_timestamps=False) for edge in restaurant_visit_edges]  
    40|     dietary_preferences = [format_edge_with_attributes(edge, include_timestamps=True) for edge in dietary_preference_edges]  
    41|     restaurant_nodes = [format_node_with_attributes(node) for node in restaurant_nodes]  
    42|     return CONTEXT_STRING_TEMPLATE.format(restaurant_visits='\n'.join(restaurant_visits), dietary_preferences='\n'.join(dietary_preferences), restaurants='\n'.join(restaurant_nodes))  
    43|   
    44|   
    45| restaurant_visit_edges = search_results_restaurant_visits.edges  
    46| dietary_preference_edges = search_results_dietary_preferences.edges  
    47| restaurant_nodes = search_results_restaurants.nodes  
    48|   
    49| context_block = compose_context_block(restaurant_visit_edges, dietary_preference_edges, restaurant_nodes)  
    50| print(context_block)  
      
    
    PREVIOUS_RESTAURANT_VISITS, DIETARY_PREFERENCES, and RESTAURANTS represent relevant context to the current conversation.  
    ---  
    # These are the most relevant restaurants the user has previously visited  
    # format: restaurant_name: RESTAURANT_NAME  
    <PREVIOUS_RESTAURANT_VISITS>  
      - restaurant_name: Insomnia Cookies  
      - restaurant_name: Green Leaf Cafe  
    </PREVIOUS_RESTAURANT_VISITS>  
       
    # These are the most relevant dietary preferences of the user, whether they represent an allergy, and their valid date ranges  
    # format: allergy: True/False; preference_type: PREFERENCE_TYPE (Date range: from - to)  
    <DIETARY_PREFERENCES>  
      - allergy: False; preference_type: vegetarian (Date range: 2025-06-16T02:17:25Z - present)  
      - allergy: False; preference_type: lactose intolerance (Date range: 2025-06-16T02:17:25Z - present)  
    </DIETARY_PREFERENCES>  
       
    # These are the most relevant restaurants the user has discussed previously  
    # format: name: RESTAURANT_NAME; cuisine_type: CUISINE_TYPE; dietary_accommodation: DIETARY_ACCOMMODATION  
    <RESTAURANTS>  
      - name: Green Leaf Cafe; dietary_accommodation: vegetarian  
      - name: Insomnia Cookies;   
    </RESTAURANTS>  
  
# Example 3: Basic custom context block with BFS

## Search

For a more advanced custom context block, we can enhance the search results by using Breadth-First Search (BFS) to make them more relevant to the user’s recent history. In this example, we retrieve the past several [episodes](/graphiti/graphiti/adding-episodes) and use those episode IDs as the BFS node IDs. We use BFS here to make the search results more relevant to the user’s recent history. You can read more about how BFS works in the [Breadth-First Search section](/graph/searching-the-graph#breadth-first-search-bfs) of our searching the graph documentation.

##### 

These searches can be performed in parallel to reduce latency, using our [async Python client](/quickstart#initialize-the-client), TypeScript promises, or goroutines.

PythonTypeScriptGo
    
    
    1| query = "Find some food around here"  
    ---|---  
    2|   
    3| episodes = client.graph.episode.get_by_user_id(  
    4|     user_id=user_id,  
    5|     lastn=10  
    6| ).episodes  
    7|   
    8| episode_uuids = [episode.uuid_ for episode in episodes if episode.role_type == 'user']  
    9|   
    10| search_results_nodes = client.graph.search(  
    11|     query=query,  
    12|     user_id=user_id,  
    13|     scope='nodes',  
    14|     reranker='cross_encoder',  
    15|     limit=10,  
    16|     bfs_origin_node_uuids=episode_uuids  
    17| )  
    18| search_results_edges = client.graph.search(  
    19|     query=query,  
    20|     user_id=user_id,  
    21|     scope='edges',  
    22|     reranker='cross_encoder',  
    23|     limit=10,  
    24|     bfs_origin_node_uuids=episode_uuids  
    25| )  
  
## Build the context block

Using the search results and a few helper functions, we can build the context block. Note that for nodes, we typically want to unpack the node name and node summary, and for edges we typically want to unpack the fact and the temporal validity information:

PythonTypeScriptGo
    
    
    1| from zep_cloud import EntityEdge, EntityNode  
    ---|---  
    2|   
    3| CONTEXT_STRING_TEMPLATE = """  
    4| FACTS and ENTITIES represent relevant context to the current conversation.  
    5| # These are the most relevant facts and their valid date ranges  
    6| # format: FACT (Date range: from - to)  
    7| <FACTS>  
    8| {facts}  
    9| </FACTS>  
    10|   
    11| # These are the most relevant entities  
    12| # ENTITY_NAME: entity summary  
    13| <ENTITIES>  
    14| {entities}  
    15| </ENTITIES>  
    16| """  
    17|   
    18|   
    19| def format_fact(edge: EntityEdge) -> str:  
    20|     valid_at = edge.valid_at if edge.valid_at is not None else "date unknown"  
    21|     invalid_at = edge.invalid_at if edge.invalid_at is not None else "present"  
    22|     formatted_fact = f"  - {edge.fact} (Date range: {valid_at} - {invalid_at})"  
    23|     return formatted_fact  
    24|   
    25| def format_entity(node: EntityNode) -> str:  
    26|     formatted_entity = f"  - {node.name}: {node.summary}"  
    27|     return formatted_entity  
    28|   
    29| def compose_context_block(edges: list[EntityEdge], nodes: list[EntityNode]) -> str:  
    30|     facts = [format_fact(edge) for edge in edges]  
    31|     entities = [format_entity(node) for node in nodes]  
    32|     return CONTEXT_STRING_TEMPLATE.format(facts='\n'.join(facts), entities='\n'.join(entities))  
    33|   
    34| edges = search_results_edges.edges  
    35| nodes = search_results_nodes.nodes  
    36|   
    37| context_block = compose_context_block(edges, nodes)  
    38| print(context_block)  
      
    
    FACTS and ENTITIES represent relevant context to the current conversation.  
    ---  
    # These are the most relevant facts and their valid date ranges  
    # format: FACT (Date range: from - to)  
    <FACTS>  
      - User wants to go to dessert (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe wants to go to a lunch place (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe said 'Perfect, let's go to Insomnia Cookies' indicating he will visit Insomnia Cookies. (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe said 'Let's go to Green Leaf Cafe' indicating intention to visit (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe is craving a chocolate chip cookie (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe states that he is vegetarian. (Date range: 2025-06-16T02:17:25Z - present)  
      - John Doe is lactose intolerant (Date range: 2025-06-16T02:17:25Z - present)  
    </FACTS>  
       
    # These are the most relevant entities  
    # ENTITY_NAME: entity summary  
    <ENTITIES>  
      - lunch place: The entity is a lunch place, but no specific details about its cuisine or dietary accommodations are provided.  
      - dessert: The entity 'dessert' refers to a preference related to sweet courses typically served at the end of a meal. The context indicates that the user has expressed an interest in going to a dessert place, but no specific dessert or place has been named. The entity is categorized as a Preference and Entity, but no additional attributes are provided or inferred from the messages.  
      - Green Leaf Cafe: Green Leaf Cafe is a restaurant that offers vegetarian options, making it suitable for vegetarian diners.  
      - user: The user is John Doe, with the email [[email protected]](/cdn-cgi/l/email-protection). He has shown interest in visiting Green Leaf Cafe, which offers vegetarian options, and has also expressed a preference for lactose-free options, craving a chocolate chip cookie. The user has decided to go to Insomnia Cookies.  
      - vegetarian: The user is interested in lunch places such as Panera Bread, Chipotle, and Green Leaf Cafe. They are specifically looking for vegetarian options at these restaurants.  
      - chocolate chip cookie: The entity is a chocolate chip cookie, which the user desires as a snack. The user is lactose intolerant and cannot have ice cream, but is craving a chocolate chip cookie.  
      - Insomnia Cookies: Insomnia Cookies is a restaurant that offers cookies, including chocolate chip cookies. The user is interested in a dessert and has chosen to go to Insomnia Cookies. No specific cuisine type or dietary accommodations are mentioned in the messages.  
      - lactose intolerant: The entity is a preference indicating lactose intolerance, which is a dietary restriction that prevents the individual from consuming lactose, a sugar found in milk and dairy products. The person is specifically craving a chocolate chip cookie but cannot have ice cream due to lactose intolerance.  
      - John Doe: The user is John Doe, with user ID user-34c7a6c1-ded6-4797-9620-8b80a5e7820f, email [[email protected]](/cdn-cgi/l/email-protection), and role user. He inquired about nearby lunch options and vegetarian choices, and expressed a preference for a chocolate chip cookie due to lactose intolerance.  
    </ENTITIES>
