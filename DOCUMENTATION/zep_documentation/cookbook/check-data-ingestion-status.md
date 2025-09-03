# Check Data Ingestion Status | Zep Documentation

**Source URL:** https://help.getzep.com/cookbook/check-data-ingestion-status  
**Scraped:** 2025-08-29 13:01:47

---

Data added to Zep is processed asynchronously and can take a few seconds to a few minutes to finish processing. In this recipe, we show how to check whether a given data upload request (also known as an [Episode](/graphiti/graphiti/adding-episodes)) is finished processing by polling Zep with the `graph.episode.get` method.

First, let’s create a user:

PythonTypeScriptGo
    
    
    1| import os  
    ---|---  
    2| import uuid  
    3| import time  
    4| from dotenv import find_dotenv, load_dotenv  
    5| from zep_cloud.client import Zep  
    6|   
    7| load_dotenv(dotenv_path=find_dotenv())  
    8|   
    9| client = Zep(api_key=os.environ.get("ZEP_API_KEY"))  
    10| uuid_value = uuid.uuid4().hex[:4]  
    11| user_id = "-" + uuid_value  
    12| client.user.add(  
    13|     user_id=user_id,  
    14|     first_name = "John",  
    15|     last_name = "Doe",  
    16|     email="[[email protected]](/cdn-cgi/l/email-protection)"  
    17| )  
  
Now, let’s add some data and immediately try to search for that data; because data added to Zep is processed asynchronously and can take a few seconds to a few minutes to finish processing, our search results do not have the data we just added:

PythonTypeScriptGo
    
    
    1| episode = client.graph.add(  
    ---|---  
    2|     user_id=user_id,  
    3|     type="text",   
    4|     data="The user is an avid fan of Eric Clapton"  
    5| )  
    6|   
    7| search_results = client.graph.search(  
    8|     user_id=user_id,  
    9|     query="Eric Clapton",  
    10|     scope="nodes",  
    11|     limit=1,  
    12|     reranker="cross_encoder",  
    13| )  
    14|   
    15| print(search_results.nodes)  
      
    
    None  
    ---  
  
We can check the status of the episode to see when it has finished processing, using the episode returned from the `graph.add` method and the `graph.episode.get` method:

PythonTypeScriptGo
    
    
    1| while True:  
    ---|---  
    2|     episode = client.graph.episode.get(  
    3|         uuid_=episode.uuid_,  
    4|     )  
    5|     if episode.processed:  
    6|         print("Episode processed successfully")  
    7|         break  
    8|     print("Waiting for episode to process...")  
    9|     time.sleep(1)  
      
    
    Waiting for episode to process...  
    ---  
    Waiting for episode to process...  
    Waiting for episode to process...  
    Waiting for episode to process...  
    Waiting for episode to process...  
    Episode processed successfully  
  
Now that the episode has finished processing, we can search for the data we just added, and this time we get a result:

PythonTypeScriptGo
    
    
    1| search_results = client.graph.search(  
    ---|---  
    2|     user_id=user_id,  
    3|     query="Eric Clapton",  
    4|     scope="nodes",  
    5|     limit=1,  
    6|     reranker="cross_encoder",  
    7| )  
    8|   
    9| print(search_results.nodes)  
      
    
    [EntityNode(attributes={'category': 'Music', 'labels': ['Entity', 'Preference']}, created_at='2025-04-05T00:17:59.66565Z', labels=['Entity', 'Preference'], name='Eric Clapton', summary='The user is an avid fan of Eric Clapton.', uuid_='98808054-38ad-4cba-ba07-acd5f7a12bc0', graph_id='6961b53f-df05-48bb-9b8d-b2702dd72045')]  
    ---
