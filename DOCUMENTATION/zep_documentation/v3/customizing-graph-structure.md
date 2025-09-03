# Customizing Graph Structure | Zep Documentation

**Source URL:** https://help.getzep.com/v3/customizing-graph-structure  
**Scraped:** 2025-08-29 13:00:26

---

Zep enables the use of rich, domain-specific data structures in graphs through Entity Types and Edge Types, replacing generic graph nodes and edges with detailed models.

Zep classifies newly created nodes/edges as one of the default or custom types or leaves them unclassified. For example, a node representing a preference is classified as a Preference node, and attributes specific to that type are automatically populated. You may restrict graph queries to nodes/edges of a specific type, such as Preference.

The default entity and edge types are applied to all graphs by default, but you may define additional custom types as needed.

Each node/edge is classified as a single type only. Multiple classifications are not supported.

## Default Entity and Edge Types

### Definition

Zep provides default entity and edge types that are automatically applied to all graphs. These types help classify and structure the information extracted from conversations.

#### Default Entity Types

The default entity types are:

  * **User** : A human that is part of the current chat thread
  * **Assistant** : The AI assistant in the conversation
  * **Preference** : A user’s expressed like, dislike, or preference for something
  * **Location** : A physical or virtual place where activities occur or entities exist
  * **Event** : A time-bound activity, occurrence, or experience
  * **Object** : A physical item, tool, device, or possession
  * **Topic** : A subject of conversation, interest, or knowledge domain
  * **Organization** : A company, institution, group, or formal entity
  * **Document** : Information content in various forms

#### Default Edge Types

The default edge types are:

  * **LocatedAt** : Represents that an entity exists or occurs at a specific location
  * **OccurredAt** : Represents that an event happened at a specific time or location
  * **ParticipatedIn** : Represents that a user took part in an event or activity
  * **Owns** : Represents ownership or possession of an object
  * **Uses** : Represents usage or interaction with an object without ownership
  * **WorksFor** : Represents employment or professional relationship with an organization
  * **Discusses** : Represents that a user talks about or is interested in a topic
  * **RelatesTo** : Represents a general conceptual or contextual relationship between entities

Default entity and edge types apply to user graphs. All nodes and edges in any user graph will be classified into one of these types or none.

### Adding Data

When we add data to the graph, default entity and edge types are automatically created:

PythonTypeScriptGo
    
    
    1| from zep_cloud.types import Message  
    ---|---  
    2|   
    3| message = {  
    4|     "name": "John Doe",  
    5|     "role": "user",  
    6|     "content": "I really like pop music, and I don't like metal",  
    7| }  
    8|   
    9| client.thread.add_messages(thread_id=thread_id, messages=[Message(**message)])  
  
### Searching

When searching nodes in the graph, you may provide a list of types to filter the search by. The provided types are ORed together. Search results will only include nodes that satisfy one of the provided types:

PythonTypeScriptGo
    
    
    1| search_results = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="the user's music preferences",  
    4|     scope="nodes",  
    5|     search_filters={  
    6|         "node_labels": ["Preference"]  
    7|     }  
    8| )  
    9| for i, node in enumerate(search_results.nodes):  
    10|     preference = node.attributes  
    11|     print(f"Preference {i+1}:{preference}")  
      
    
    Preference 1: {'category': 'Music', 'description': 'Pop Music is a genre of music characterized by its catchy melodies and widespread appeal.', 'labels': ['Entity', 'Preference']}  
    ---  
    Preference 2: {'category': 'Music', 'description': 'Metal Music is a genre of music characterized by its heavy sound and complex compositions.', 'labels': ['Entity', 'Preference']}  
  
## Custom Entity and Edge Types

##### 

Start with fewer, more generic custom types with minimal fields and simple definitions, then incrementally add complexity as needed. This functionality requires prompt engineering and iterative optimization of the class and field descriptions, so it’s best to start simple.

### Definition

In addition to the default entity and edge types, you may specify your own custom entity and custom edge types. You need to provide a description of the type and a description for each of the fields. The syntax for this is different for each language.

You may not create more than 10 custom entity types and 10 custom edge types per project. The limit of 10 custom entity types does not include the default types. Each model may have up to 10 fields.

##### 

When creating custom entity or edge types, you may not use the following attribute names (including in Go struct tags), as they conflict with default node attributes: `uuid`, `name`, `graph_id`, `name_embedding`, `summary`, and `created_at`.

##### 

Including attributes on custom entity and edge types is an advanced feature designed for precision context engineering where you only want to utilize specific field values when constructing your context block. [See here for an example](/v3/cookbook/customize-your-context-block#example-2-utilizing-custom-entity-and-edge-types). Many agent memory use cases can be solved with node summaries and facts alone. Custom attributes should only be added when you need structured field values for precise context retrieval rather than general conversational memory.

PythonTypeScriptGo
    
    
    1| from zep_cloud.external_clients.ontology import EntityModel, EntityText, EdgeModel, EntityBoolean  
    ---|---  
    2| from pydantic import Field  
    3|   
    4| class Restaurant(EntityModel):  
    5|     """  
    6|     Represents a specific restaurant.  
    7|     """  
    8|     cuisine_type: EntityText = Field(description="The cuisine type of the restaurant, for example: American, Mexican, Indian, etc.", default=None)  
    9|     dietary_accommodation: EntityText = Field(description="The dietary accommodation of the restaurant, if any, for example: vegetarian, vegan, etc.", default=None)  
    10|   
    11| class Audiobook(EntityModel):  
    12|     """  
    13|     Represents an audiobook entity.  
    14|     """  
    15|     genre: EntityText = Field(description="The genre of the audiobook, for example: self-help, fiction, nonfiction, etc.", default=None)  
    16|   
    17| class RestaurantVisit(EdgeModel):  
    18|     """  
    19|     Represents the fact that the user visited a restaurant.  
    20|     """  
    21|     restaurant_name: EntityText = Field(description="The name of the restaurant the user visited", default=None)  
    22|   
    23| class AudiobookListen(EdgeModel):  
    24|     """  
    25|     Represents the fact that the user listened to or played an audiobook.  
    26|     """  
    27|     audiobook_title: EntityText = Field(description="The title of the audiobook the user listened to or played", default=None)  
    28|   
    29| class DietaryPreference(EdgeModel):  
    30|     """  
    31|     Represents the fact that the user has a dietary preference or dietary restriction.  
    32|     """  
    33|     preference_type: EntityText = Field(description="Preference type of the user: anything, vegetarian, vegan, peanut allergy, etc.", default=None)  
    34|     allergy: EntityBoolean = Field(description="Whether this dietary preference represents a user allergy: True or false", default=None)  
  
### Setting Entity and Edge Types

You can set these custom entity and edge types as the graph ontology for your current [Zep project](/projects). The ontology can be applied either project-wide to all users and graphs, or targeted to specific users and graphs only.

#### Setting Types Project Wide

When no user IDs or graph IDs are provided, the ontology is set for the entire project. All users and graphs within the project will use this ontology. Note that for custom edge types, you can require the source and destination nodes to be a certain type, or allow them to be any type:

PythonTypeScriptGo
    
    
    1| from zep_cloud import EntityEdgeSourceTarget  
    ---|---  
    2|   
    3| client.graph.set_ontology(  
    4|     entities={  
    5|         "Restaurant": Restaurant,  
    6|         "Audiobook": Audiobook,  
    7|     },  
    8|     edges={  
    9|         "RESTAURANT_VISIT": (  
    10|             RestaurantVisit,  
    11|             [EntityEdgeSourceTarget(source="User", target="Restaurant")]  
    12|         ),  
    13|         "AUDIOBOOK_LISTEN": (  
    14|             AudiobookListen,  
    15|             [EntityEdgeSourceTarget(source="User", target="Audiobook")]  
    16|         ),  
    17|         "DIETARY_PREFERENCE": (  
    18|             DietaryPreference,  
    19|             [EntityEdgeSourceTarget(source="User")]  
    20|         ),  
    21|     }  
    22| )  
  
#### Setting Types For Specific Graphs

You can also set the ontology for specific users and/or graphs by providing user IDs and graph IDs. When these parameters are provided, the ontology will only apply to the specified users and graphs, while other users and graphs in the project will continue using the previously set ontology (whether that was due to a project-wide setting of ontology or due to a graph-specific setting of ontology):

PythonTypeScriptGo
    
    
    1| from zep_cloud import EntityEdgeSourceTarget  
    ---|---  
    2|   
    3| await client.graph.set_ontology(  
    4|     user_ids=["user_1234", "user_5678"],  
    5|     graph_ids=["graph_1234", "graph_5678"],  
    6|     entities={  
    7|         "Restaurant": Restaurant,  
    8|         "Audiobook": Audiobook,  
    9|     },  
    10|     edges={  
    11|         "RESTAURANT_VISIT": (  
    12|             RestaurantVisit,  
    13|             [EntityEdgeSourceTarget(source="User", target="Restaurant")]  
    14|         ),  
    15|         "AUDIOBOOK_LISTEN": (  
    16|             AudiobookListen,  
    17|             [EntityEdgeSourceTarget(source="User", target="Audiobook")]  
    18|         ),  
    19|         "DIETARY_PREFERENCE": (  
    20|             DietaryPreference,  
    21|             [EntityEdgeSourceTarget(source="User")]  
    22|         ),  
    23|     }  
    24| )  
  
### Adding Data

Now, when you add data to the graph, new nodes and edges are classified into exactly one of the overall set of entity or edge types respectively, or no type:

PythonTypeScriptGo
    
    
    1| from zep_cloud import Message  
    ---|---  
    2| import uuid  
    3|   
    4| messages_thread1 = [  
    5|     Message(content="Take me to a lunch place", role="user", name="John Doe"),  
    6|     Message(content="How about Panera Bread, Chipotle, or Green Leaf Cafe, which are nearby?", role="assistant", name="Assistant"),  
    7|     Message(content="Do any of those have vegetarian options? I'm vegetarian", role="user", name="John Doe"),  
    8|     Message(content="Yes, Green Leaf Cafe has vegetarian options", role="assistant", name="Assistant"),  
    9|     Message(content="Let's go to Green Leaf Cafe", role="user", name="John Doe"),  
    10|     Message(content="Navigating to Green Leaf Cafe", role="assistant", name="Assistant"),  
    11| ]  
    12|   
    13| messages_thread2 = [  
    14|     Message(content="Play the 7 habits of highly effective people", role="user", name="John Doe"),  
    15|     Message(content="Playing the 7 habits of highly effective people", role="assistant", name="Assistant"),  
    16| ]  
    17|   
    18| user_id = f"user-{uuid.uuid4()}"  
    19| client.user.add(user_id=user_id, first_name="John", last_name="Doe", email="[[email protected]](/cdn-cgi/l/email-protection)")  
    20|   
    21| thread1_id = f"thread-{uuid.uuid4()}"  
    22| thread2_id = f"thread-{uuid.uuid4()}"  
    23| client.thread.create(thread_id=thread1_id, user_id=user_id)  
    24| client.thread.create(thread_id=thread2_id, user_id=user_id)  
    25|   
    26| client.thread.add_messages(thread_id=thread1_id, messages=messages_thread1, ignore_roles=["assistant"])  
    27| client.thread.add_messages(thread_id=thread2_id, messages=messages_thread2, ignore_roles=["assistant"])  
  
### Searching/Retrieving

Now that a graph with custom entity and edge types has been created, you may filter node search results by entity type, or edge search results by edge type.

Below, you can see the examples that were created from our data of each of the entity and edge types that we defined:

PythonTypeScriptGo
    
    
    1| search_results_restaurants = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Take me to a restaurant",  
    4|     scope="nodes",  
    5|     search_filters={  
    6|         "node_labels": ["Restaurant"]  
    7|     },  
    8|     limit=1,  
    9| )  
    10| node = search_results_restaurants.nodes[0]  
    11| print(f"Node name: {node.name}")  
    12| print(f"Node labels: {node.labels}")  
    13| print(f"Cuisine type: {node.attributes.get('cuisine_type')}")  
    14| print(f"Dietary accommodation: {node.attributes.get('dietary_accommodation')}")  
      
    
    Node name: Green Leaf Cafe  
    ---  
    Node labels: Entity,Restaurant  
    Cuisine type: undefined  
    Dietary accommodation: vegetarian  
  
PythonTypeScriptGo
    
    
    1| search_results_audiobook_nodes = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Play an audiobook",  
    4|     scope="nodes",  
    5|     search_filters={  
    6|         "node_labels": ["Audiobook"]  
    7|     },  
    8|     limit=1,  
    9| )  
    10| node = search_results_audiobook_nodes.nodes[0]  
    11| print(f"Node name: {node.name}")  
    12| print(f"Node labels: {node.labels}")  
    13| print(f"Genre: {node.attributes.get('genre')}")  
      
    
    Node name: 7 habits of highly effective people  
    ---  
    Node labels: Entity,Audiobook  
    Genre: undefined  
  
PythonTypeScriptGo
    
    
    1| search_results_visits = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Take me to a restaurant",  
    4|     scope="edges",  
    5|     search_filters={  
    6|         "edge_types": ["RESTAURANT_VISIT"]  
    7|     },  
    8|     limit=1,  
    9| )  
    10| edge = search_results_visits.edges[0]  
    11| print(f"Edge fact: {edge.fact}")  
    12| print(f"Edge type: {edge.name}")  
    13| print(f"Restaurant name: {edge.attributes.get('restaurant_name')}")  
      
    
    Edge fact: User John Doe is going to Green Leaf Cafe  
    ---  
    Edge type: RESTAURANT_VISIT  
    Restaurant name: Green Leaf Cafe  
  
PythonTypeScriptGo
    
    
    1| search_results_audiobook_listens = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Play an audiobook",  
    4|     scope="edges",  
    5|     search_filters={  
    6|         "edge_types": ["AUDIOBOOK_LISTEN"]  
    7|     },  
    8|     limit=1,  
    9| )  
    10| edge = search_results_audiobook_listens.edges[0]  
    11| print(f"Edge fact: {edge.fact}")  
    12| print(f"Edge type: {edge.name}")  
    13| print(f"Audiobook title: {edge.attributes.get('audiobook_title')}")  
      
    
    Edge fact: John Doe requested to play the audiobook '7 habits of highly effective people'  
    ---  
    Edge type: AUDIOBOOK_LISTEN  
    Audiobook title: 7 habits of highly effective people  
  
PythonTypeScriptGo
    
    
    1| search_results_dietary_preference = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Find some food around here",  
    4|     scope="edges",  
    5|     search_filters={  
    6|         "edge_types": ["DIETARY_PREFERENCE"]  
    7|     },  
    8|     limit=1,  
    9| )  
    10| edge = search_results_dietary_preference.edges[0]  
    11| print(f"Edge fact: {edge.fact}")  
    12| print(f"Edge type: {edge.name}")  
    13| print(f"Preference type: {edge.attributes.get('preference_type')}")  
    14| print(f"Allergy: {edge.attributes.get('allergy')}")  
      
    
    Edge fact: User states 'I'm vegetarian' indicating a dietary preference.  
    ---  
    Edge type: DIETARY_PREFERENCE  
    Preference type: vegetarian  
    Allergy: false  
  
Additionally, you can provide multiple types in search filters, and the types will be ORed together:

PythonTypeScriptGo
    
    
    1| search_results_dietary_preference = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Find some food around here",  
    4|     scope="edges",  
    5|     search_filters={  
    6|         "edge_types": ["DIETARY_PREFERENCE", "RESTAURANT_VISIT"]  
    7|     },  
    8|     limit=2,  
    9| )  
    10| for edge in search_results_dietary_preference.edges:  
    11|     print(f"Edge fact: {edge.fact}")  
    12|     print(f"Edge type: {edge.name}")  
    13|     if edge.name == "DIETARY_PREFERENCE":  
    14|         print(f"Preference type: {edge.attributes.get('preference_type')}")  
    15|         print(f"Allergy: {edge.attributes.get('allergy')}")  
    16|     elif edge.name == "RESTAURANT_VISIT":  
    17|         print(f"Restaurant name: {edge.attributes.get('restaurant_name')}")  
    18|     print("\n")  
      
    
    Edge fact: User John Doe is going to Green Leaf Cafe  
    ---  
    Edge type: RESTAURANT_VISIT  
    Restaurant name: Green Leaf Cafe  
      
    
    Edge fact: User states 'I'm vegetarian' indicating a dietary preference.  
    ---  
    Edge type: DIETARY_PREFERENCE  
    Preference type: vegetarian  
    Allergy: false  
  
### Important Notes/Tips

Some notes regarding custom entity and edge types:

  * The `set_ontology` method overwrites any previously defined custom entity and edge types, so the set of custom entity and edge types is always the list of types provided in the last `set_ontology` method call
  * The overall set of entity and edge types for a project includes both the custom entity and edge types you set and the default entity and edge types
  * You can overwrite the default entity and edge types by providing custom types with the same names
  * Changing the custom entity or edge types will not update previously created nodes or edges. The classification and attributes of existing nodes and edges will stay the same. The only thing that can change existing classifications or attributes is adding data that provides new information.
  * When creating custom entity or edge types, avoid using the following attribute names (including in Go struct tags), as they conflict with default attributes: `uuid`, `name`, `graph_id`, `name_embedding`, `summary`, and `created_at`
  * **Tip** : Design custom entity types to represent entities/nouns, and design custom edge types to represent relationships/verbs. Otherwise, your type might be represented in the graph as an edge more often than as a node or vice versa.
  * **Tip** : If you have overlapping entity or edge types (e.g. ‘Hobby’ and ‘Hiking’), you can prioritize one type over another by mentioning which to prioritize in the entity or edge type descriptions
