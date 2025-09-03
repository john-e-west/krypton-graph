# Quickstart | Zep Documentation

**Source URL:** https://help.getzep.com/v3/quickstart  
**Scraped:** 2025-08-29 13:00:25

---

Zep is a context engineering platform that systematically assembles personalized context—user preferences, traits, and business data—for reliable agent applications. Zep combines agent memory, Graph RAG, and context assembly capabilities to deliver comprehensive personalized context that reduces hallucinations and improves accuracy. This quickstart will walk you through Zep’s two core capabilities: giving your agent persistent memory of user interactions through Agent Memory, and providing your agent with up-to-date knowledge through Dynamic Graph RAG.

##### 

Looking for a more in-depth understanding? Check out our [Key Concepts](/v3/concepts) page.

##### 

Migrating from Mem0? Check out our [Mem0 Migration](/v3/mem0-to-zep) guide.

Make sure to [set up your environment](/v3/install-sdks) before getting started.

## Provide your agent with up-to-date user memory (Agent Memory)

### Create user graph

##### 

It is important to provide at least the first name and ideally the last name of the user when calling `user.add`. Otherwise, Zep may not be able to correctly associate the user with references to the user in the data you add. If you don’t have this information at the time the user is created, you can add it later with our [update user](/v3/sdk-reference/user/update) method.

PythonTypeScriptGo
    
    
    1| # Create a new user  
    ---|---  
    2| user_id = "user123"  
    3| new_user = client.user.add(  
    4|     user_id=user_id,  
    5|     email="[[email protected]](/cdn-cgi/l/email-protection)",  
    6|     first_name="Jane",  
    7|     last_name="Smith",  
    8| )  
  
### Create thread

PythonTypeScriptGo
    
    
    1| import uuid  
    ---|---  
    2|   
    3| # Generate a unique thread ID  
    4| thread_id = uuid.uuid4().hex  
    5|   
    6| # Create a new thread for the user  
    7| client.thread.create(  
    8|     thread_id=thread_id,  
    9|     user_id=user_id,  
    10| )  
  
### Add messages

Add chat messages to a thread using the `thread.add_messages` method. These messages will be stored in the thread history and used to build the user’s knowledge graph.

##### 

It is important to provide the name of the user in the name field if possible, to help with graph construction. It’s also helpful to provide a meaningful name for the assistant in its name field.

PythonTypeScriptGo
    
    
    1| # Define messages to add  
    ---|---  
    2| from zep_cloud.types import Message  
    3|   
    4| messages = [  
    5|     Message(  
    6|         name="Jane",  
    7|         content="Hi, my name is Jane Smith and I work at Acme Corp.",  
    8|         role="user",  
    9|     ),  
    10|     Message(  
    11|         name="AI Assistant",  
    12|         content="Hello Jane! Nice to meet you. How can I help you with Acme Corp today?",  
    13|         role="assistant",  
    14|     )  
    15| ]  
    16|   
    17| # Add messages to the thread  
    18| client.thread.add_messages(thread_id, messages=messages)  
  
### Add business data (Optional)

You can add business data directly to a user’s graph using the `graph.add` method. This data can be in the form of messages, text, or JSON.

PythonTypeScriptGo
    
    
    1| # Add JSON data to a user's graph  
    ---|---  
    2| import json  
    3| json_data = {  
    4|     "employee": {  
    5|         "name": "Jane Smith",  
    6|         "position": "Senior Software Engineer",  
    7|         "department": "Engineering",  
    8|         "projects": ["Project Alpha", "Project Beta"]  
    9|     }  
    10| }  
    11| client.graph.add(  
    12|     user_id=user_id,  
    13|     type="json",  
    14|     data=json.dumps(json_data)  
    15| )  
    16|   
    17| # Add text data to a user's graph  
    18| client.graph.add(  
    19|     user_id=user_id,  
    20|     type="text",  
    21|     data="Jane Smith is working on Project Alpha and Project Beta."  
    22| )  
  
### Retrieve context

Use the `thread.get_user_context` method to retrieve relevant context for a thread. This includes a context block with facts and entities that can be used in your prompt.

Zep’s context block can either be in summarized or basic form (summarized by default). Retrieving basic results reduces latency (P95 < 200 ms). Read more about Zep’s context block [here](/v3/retrieving-memory#retrieving-zeps-context-block).

###### Summary (default)

###### Basic (fast)

PythonTypeScriptGo
    
    
    1| # Get memory for the thread  
    ---|---  
    2| memory = client.thread.get_user_context(thread_id=thread_id)  
    3|   
    4| # Access the context block (for use in prompts)  
    5| context_block = memory.context  
    6| print(context_block)  
      
    
    - On 2024-07-30, account Emily0e62 made a failed transaction of $99.99.  
    ---  
    - The transaction failed due to the card with last four digits 1234.  
    - The failure reason was 'Card expired' as of 2024-09-15.  
    - Emily0e62 is a user account belonging to Emily Painter.  
    - On 2024-11-14, user account Emily0e62 was suspended due to payment failure.  
    - Since 2024-11-14, Emily Painter (Emily0e62) has experienced issues with logging in.  
    - As of the present, account Emily0e62 remains suspended and Emily continues to face login issues due to unresolved payment failure from an expired card.  
  
You can also directly [search the user graph](/v3/searching-the-graph) and [assemble the context block](/v3/cookbook/customize-your-context-block) for more customized results.

### View your knowledge graph

Since you’ve created memory, you can view your knowledge graph by navigating to [the Zep Dashboard](https://app.getzep.com/), then Users > “user123” > View Graph. You can also click the “View Episodes” button to see when data is finished being added to the knowledge graph.

### Explore further

Refer to our [agent memory walk-through](/v3/walkthrough) for a more complete example.

## Provide your agent with up-to-date knowledge (Dynamic Graph RAG)

### Create graph

PythonTypeScriptGo
    
    
    1| graph = client.graph.create(  
    ---|---  
    2|     graph_id="some-graph-id",   
    3|     name="Graph Name",  
    4|     description="This is a description."  
    5| )  
  
### Add data

You can add business data directly to a graph using the `graph.add` method. This data can be in the form of text or JSON.

PythonTypeScriptGo
    
    
    1| # Add JSON data to a graph  
    ---|---  
    2| import json  
    3| json_data = {  
    4|     "employee": {  
    5|         "name": "Jane Smith",  
    6|         "position": "Senior Software Engineer",  
    7|         "department": "Engineering",  
    8|         "projects": ["Project Alpha", "Project Beta"]  
    9|     }  
    10| }  
    11| graph_id = "engineering_team"  
    12| client.graph.add(  
    13|     graph_id=graph_id,  
    14|     type="json",  
    15|     data=json.dumps(json_data)  
    16| )  
    17|   
    18| # Add text data to a graph  
    19| client.graph.add(  
    20|     graph_id=graph_id,  
    21|     type="text",  
    22|     data="The engineering team is working on Project Alpha and Project Beta."  
    23| )  
  
### Search the graph

Use the `graph.search` method to search for edges, nodes, or episodes in the graph. This is useful for finding specific information about a user or graph.

PythonTypeScriptGo
    
    
    1| query = "What projects is Jane working on?"  
    ---|---  
    2|   
    3| # Search for edges in a graph  
    4| edge_results = client.graph.search(  
    5|     graph_id=graph_id,  
    6|     query=query,  
    7|     scope="edges",  # Default is "edges"  
    8|     limit=5  
    9| )  
    10|   
    11| # Search for nodes in a graph  
    12| node_results = client.graph.search(  
    13|     graph_id=graph_id,  
    14|     query=query,  
    15|     scope="nodes",  
    16|     limit=5  
    17| )  
    18|   
    19| # Search for episodes in a graph  
    20| episode_results = client.graph.search(  
    21|     graph_id=graph_id,  
    22|     query=query,  
    23|     scope="episodes",  
    24|     limit=5  
    25| )  
  
### Assemble context block

Using the search results, you can build a context block to include in your prompts. For a complete example with helper functions and code samples, see our [Customize your context block cookbook](/v3/cookbook/customize-your-context-block).

### View your knowledge graph

Since you’ve created memory, you can view your knowledge graph by navigating to [the Zep Dashboard](https://app.getzep.com/), then Users > “user123” > View Graph. You can also click the “View Episodes” button to see when data is finished being added to the knowledge graph.

## Use Zep as an Agentic Tool

Zep’s memory retrieval methods can be used as agentic tools, enabling your agent to query Zep for relevant information. The example below shows how to create a LangChain LangGraph tool to search for facts in a user’s graph.

Python
    
    
    1| from zep_cloud.client import AsyncZep  
    ---|---  
    2|   
    3| from langchain_core.tools import tool  
    4| from langchain_openai import ChatOpenAI  
    5| from langgraph.graph import StateGraph, MessagesState  
    6| from langgraph.prebuilt import ToolNode  
    7|   
    8| zep = AsyncZep(api_key=os.environ.get('ZEP_API_KEY'))  
    9|   
    10| @tool  
    11| async def search_facts(state: MessagesState, query: str, limit: int = 5):  
    12|     """Search for facts in all conversations had with a user.  
    13|       
    14|     Args:  
    15|         state (MessagesState): The Agent's state.  
    16|         query (str): The search query.  
    17|         limit (int): The number of results to return. Defaults to 5.  
    18|     Returns:  
    19|         list: A list of facts that match the search query.  
    20|     """  
    21|     search_results = await zep.graph.search(  
    22|       user_id=state['user_name'],   
    23|       query=query,   
    24|       limit=limit,   
    25|     )  
    26|   
    27|     return [edge.fact for edge in search_results.edges]  
    28|   
    29| tools = [search_facts]  
    30| tool_node = ToolNode(tools)  
    31| llm = ChatOpenAI(model='gpt-4o-mini', temperature=0).bind_tools(tools)  
  
## Next Steps

Now that you’ve learned the basics of using Zep, you can:

  * Learn more about [Key Concepts](/v3/concepts)
  * Explore the [Graph API](/v3/adding-data-to-the-graph) for adding and retrieving data
  * Understand [Users and Threads](/v3/users) in more detail
  * Learn about our [Context Block](/v3/retrieving-memory#retrieving-zeps-context-block) for building better prompts
  * Explore [Graph Search](/v3/searching-the-graph) for advanced search capabilities
