# Using LangGraph and Graphiti | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/integrations/lang-graph-agent  
**Scraped:** 2025-08-29 13:02:17

---

##### 

A Jupyter notebook version of this example is available [on GitHub](https://github.com/getzep/graphiti/blob/main/examples/langgraph-agent/agent.ipynb).

##### 

Looking for a managed Graphiti service? Check out [Zep Cloud](https://www.getzep.com/).

  * Designed as a self-improving memory layer for Agents.
  * No need to run Neo4j or other dependencies.
  * Additional features for startups and enterprises alike.
  * Fast and scalable.

The following example demonstrates building an agent using LangGraph. Graphiti is used to personalize agent responses based on information learned from prior conversations. Additionally, a database of products is loaded into the Graphiti graph, enabling the agent to speak to these products.

The agent implements:

  * persistance of new chat turns to Graphiti and recall of relevant Facts using the most recent message.
  * a tool for querying Graphiti for shoe information
  * an in-memory `MemorySaver` to maintain agent state.

## Install dependencies
    
    
    $| pip install graphiti-core langchain-openai langgraph ipywidgets  
    ---|---  
  
##### 

Ensure that you’ve followed the [Graphiti installation instructions](/v3/graphiti/getting-started/quick-start). In particular, installation of `neo4j`.
    
    
    1| import asyncio  
    ---|---  
    2| import json  
    3| import logging  
    4| import os  
    5| import sys  
    6| import uuid  
    7| from contextlib import suppress  
    8| from datetime import datetime  
    9| from pathlib import Path  
    10| from typing import Annotated  
    11|   
    12| import ipywidgets as widgets  
    13| from dotenv import load_dotenv  
    14| from IPython.display import Image, display  
    15| from typing_extensions import TypedDict  
    16|   
    17| load_dotenv()  
      
    
    1| def setup_logging():  
    ---|---  
    2|     logger = logging.getLogger()  
    3|     logger.setLevel(logging.ERROR)  
    4|     console_handler = logging.StreamHandler(sys.stdout)  
    5|     console_handler.setLevel(logging.INFO)  
    6|     formatter = logging.Formatter('%(name)s - %(levelname)s - %(message)s')  
    7|     console_handler.setFormatter(formatter)  
    8|     logger.addHandler(console_handler)  
    9|     return logger  
    10|   
    11|   
    12| logger = setup_logging()  
  
## Configure Graphiti

Ensure that you have `neo4j` running and a database created. You’ll need the following environment variables configured:
    
    
    $| NEO4J_URI=  
    ---|---  
    >| NEO4J_USER=  
    >| NEO4J_PASSWORD=  
      
    
    1| # Configure Graphiti  
    ---|---  
    2|   
    3| from graphiti_core import Graphiti  
    4| from graphiti_core.edges import EntityEdge  
    5| from graphiti_core.nodes import EpisodeType  
    6| from graphiti_core.utils.bulk_utils import RawEpisode  
    7| from graphiti_core.utils.maintenance.graph_data_operations import clear_data  
    8|   
    9| neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')  
    10| neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')  
    11| neo4j_password = os.environ.get('NEO4J_PASSWORD', 'password')  
    12|   
    13| client = Graphiti(  
    14|     neo4j_uri,  
    15|     neo4j_user,  
    16|     neo4j_password,  
    17| )  
  
## Generating a database schema

The following is only required for the first run of this notebook or when you’d like to start your database over.

##### 

`clear_data` is destructive and will wipe your entire database.
    
    
    1| # Note: This will clear the database  
    ---|---  
    2| await clear_data(client.driver)  
    3| await client.build_indices_and_constraints()  
  
## Load Shoe Data into the Graph

Load several shoe and related products into the Graphiti. This may take a while.

##### 

This only needs to be done once. If you run `clear_data` you’ll need to rerun this step.
    
    
    1| async def ingest_products_data(client: Graphiti):  
    ---|---  
    2|     script_dir = Path.cwd().parent  
    3|     json_file_path = script_dir / 'data' / 'manybirds_products.json'  
    4|   
    5|     with open(json_file_path) as file:  
    6|         products = json.load(file)['products']  
    7|   
    8|     episodes: list[RawEpisode] = [  
    9|         RawEpisode(  
    10|             name=product.get('title', f'Product {i}'),  
    11|             content=str({k: v for k, v in product.items() if k != 'images'}),  
    12|             source_description='ManyBirds products',  
    13|             source=EpisodeType.json,  
    14|             reference_time=datetime.now(),  
    15|         )  
    16|         for i, product in enumerate(products)  
    17|     ]  
    18|   
    19|     await client.add_episode_bulk(episodes)  
    20|   
    21|   
    22| await ingest_products_data(client)  
  
## Create a user node in the Graphiti graph

In your own app, this step could be done later once the user has identified themselves and made their sales intent known. We do this here so we can configure the agent with the user’s `node_uuid`.
    
    
    1| user_name = 'jess'  
    ---|---  
    2|   
    3| await client.add_episode(  
    4|     name='User Creation',  
    5|     episode_body=(f'{user_name} is interested in buying a pair of shoes'),  
    6|     source=EpisodeType.text,  
    7|     reference_time=datetime.now(),  
    8|     source_description='SalesBot',  
    9| )  
    10|   
    11| # let's get Jess's node uuid  
    12| nl = await client.get_nodes_by_query(user_name)  
    13|   
    14| user_node_uuid = nl[0].uuid  
    15|   
    16| # and the ManyBirds node uuid  
    17| nl = await client.get_nodes_by_query('ManyBirds')  
    18| manybirds_node_uuid = nl[0].uuid  
  
## Helper Functions and LangChain Imports
    
    
    1| def edges_to_facts_string(entities: list[EntityEdge]):  
    ---|---  
    2|     return '-' + '\n- '.join([edge.fact for edge in entities])  
      
    
    1| from langchain_core.messages import AIMessage, SystemMessage  
    ---|---  
    2| from langchain_core.tools import tool  
    3| from langchain_openai import ChatOpenAI  
    4| from langgraph.checkpoint.memory import MemorySaver  
    5| from langgraph.graph import END, START, StateGraph, add_messages  
    6| from langgraph.prebuilt import ToolNode  
  
## `get_shoe_data` Tool

The agent will use this to search the Graphiti graph for information about shoes. We center the search on the `manybirds_node_uuid` to ensure we rank shoe-related data over user data.
    
    
    1| @tool  
    ---|---  
    2| async def get_shoe_data(query: str) -> str:  
    3|     """Search the graphiti graph for information about shoes"""  
    4|     edge_results = await client.search(  
    5|         query,  
    6|         center_node_uuid=manybirds_node_uuid,  
    7|         num_results=10,  
    8|     )  
    9|     return edges_to_facts_string(edge_results)  
    10|   
    11|   
    12| tools = [get_shoe_data]  
    13| tool_node = ToolNode(tools)  
  
## Initialize the LLM and bind tools
    
    
    1| llm = ChatOpenAI(model='gpt-4o-mini', temperature=0).bind_tools(tools)  
    ---|---  
  
### Test the tool node
    
    
    1| await tool_node.ainvoke({'messages': [await llm.ainvoke('wool shoes')]})  
    ---|---  
      
    
    1| {  
    ---|---  
    2|     "messages": [  
    3|         {  
    4|             "content": "-The product 'Men's SuperLight Wool Runners - Dark Grey (Medium Grey Sole)' is made of Wool.\n- Women's Tree Breezers Knit - Rugged Beige (Hazy Beige Sole) has sizing options related to women's move shoes half sizes.\n- TinyBirds Wool Runners - Little Kids - Natural Black (Blizzard Sole) is a type of Shoes.\n- The product 'Men's SuperLight Wool Runners - Dark Grey (Medium Grey Sole)' belongs to the category Shoes.\n- The product 'Men's SuperLight Wool Runners - Dark Grey (Medium Grey Sole)' uses SuperLight Foam technology.\n- TinyBirds Wool Runners - Little Kids - Natural Black (Blizzard Sole) is sold by Manybirds.\n- Jess is interested in buying a pair of shoes.\n- TinyBirds Wool Runners - Little Kids - Natural Black (Blizzard Sole) has the handle TinyBirds-wool-runners-little-kids.\n- ManyBirds Men's Couriers are a type of Shoes.\n- Women's Tree Breezers Knit - Rugged Beige (Hazy Beige Sole) belongs to the Shoes category.",  
    5|             "name": "get_shoe_data",  
    6|             "tool_call_id": "call_EPpOpD75rdq9jKRBUsfRnfxx"  
    7|         }  
    8|     ]  
    9| }  
  
## Chatbot Function Explanation

The chatbot uses Graphiti to provide context-aware responses in a shoe sales scenario. Here’s how it works:

  1. **Context Retrieval** : It searches the Graphiti graph for relevant information based on the latest message, using the user’s node as the center point. This ensures that user-related facts are ranked higher than other information in the graph.

  2. **System Message** : It constructs a system message incorporating facts from Graphiti, setting the context for the AI’s response.

  3. **Knowledge Persistence** : After generating a response, it asynchronously adds the interaction to the Graphiti graph, allowing future queries to reference this conversation.

This approach enables the chatbot to maintain context across interactions and provide personalized responses based on the user’s history and preferences stored in the Graphiti graph.
    
    
    1| class State(TypedDict):  
    ---|---  
    2|     messages: Annotated[list, add_messages]  
    3|     user_name: str  
    4|     user_node_uuid: str  
    5|   
    6|   
    7| async def chatbot(state: State):  
    8|     facts_string = None  
    9|     if len(state['messages']) > 0:  
    10|         last_message = state['messages'][-1]  
    11|         graphiti_query = f'{"SalesBot" if isinstance(last_message, AIMessage) else state["user_name"]}: {last_message.content}'  
    12|         # search graphiti using Jess's node uuid as the center node  
    13|         # graph edges (facts) further from the Jess node will be ranked lower  
    14|         edge_results = await client.search(  
    15|             graphiti_query, center_node_uuid=state['user_node_uuid'], num_results=5  
    16|         )  
    17|         facts_string = edges_to_facts_string(edge_results)  
    18|   
    19|     system_message = SystemMessage(  
    20|         content=f"""You are a skillfull shoe salesperson working for ManyBirds. Review information about the user and their prior conversation below and respond accordingly.  
    21|         Keep responses short and concise. And remember, always be selling (and helpful!)  
    22|   
    23|         Things you'll need to know about the user in order to close a sale:  
    24|         - the user's shoe size  
    25|         - any other shoe needs? maybe for wide feet?  
    26|         - the user's preferred colors and styles  
    27|         - their budget  
    28|   
    29|         Ensure that you ask the user for the above if you don't already know.  
    30|   
    31|         Facts about the user and their conversation:  
    32|         {facts_string or 'No facts about the user and their conversation'}"""  
    33|     )  
    34|   
    35|     messages = [system_message] + state['messages']  
    36|   
    37|     response = await llm.ainvoke(messages)  
    38|   
    39|     # add the response to the graphiti graph.  
    40|     # this will allow us to use the graphiti search later in the conversation  
    41|     # we're doing async here to avoid blocking the graph execution  
    42|     asyncio.create_task(  
    43|         client.add_episode(  
    44|             name='Chatbot Response',  
    45|             episode_body=f"{state['user_name']}: {state['messages'][-1]}\nSalesBot: {response.content}",  
    46|             source=EpisodeType.message,  
    47|             reference_time=datetime.now(),  
    48|             source_description='Chatbot',  
    49|         )  
    50|     )  
    51|   
    52|     return {'messages': [response]}  
  
## Setting up the Agent

This section sets up the Agent’s LangGraph graph:

  1. **Graph Structure** : It defines a graph with nodes for the agent (chatbot) and tools, connected in a loop.

  2. **Conditional Logic** : The `should_continue` function determines whether to end the graph execution or continue to the tools node based on the presence of tool calls.

  3. **Memory Management** : It uses a MemorySaver to maintain conversation state across turns. This is in addition to using Graphiti for facts.

    
    
    1| graph_builder = StateGraph(State)  
    ---|---  
    2|   
    3| memory = MemorySaver()  
    4|   
    5|   
    6| # Define the function that determines whether to continue or not  
    7| async def should_continue(state, config):  
    8|     messages = state['messages']  
    9|     last_message = messages[-1]  
    10|     # If there is no function call, then we finish  
    11|     if not last_message.tool_calls:  
    12|         return 'end'  
    13|     # Otherwise if there is, we continue  
    14|     else:  
    15|         return 'continue'  
    16|   
    17|   
    18| graph_builder.add_node('agent', chatbot)  
    19| graph_builder.add_node('tools', tool_node)  
    20|   
    21| graph_builder.add_edge(START, 'agent')  
    22| graph_builder.add_conditional_edges('agent', should_continue, {'continue': 'tools', 'end': END})  
    23| graph_builder.add_edge('tools', 'agent')  
    24|   
    25|   
    26| graph = graph_builder.compile(checkpointer=memory)  
  
Our LangGraph agent graph is illustrated below.
    
    
    1| with suppress(Exception):  
    ---|---  
    2|     display(Image(graph.get_graph().draw_mermaid_png()))  
  
![LangGraph Illustration](https://files.buildwithfern.com/zep.docs.buildwithfern.com/2025-08-28T23:32:12.149Z/images/agent_24_0.jpg)

## Running the Agent

Let’s test the agent with a single call
    
    
    1| await graph.ainvoke(  
    ---|---  
    2|     {  
    3|         'messages': [  
    4|             {  
    5|                 'role': 'user',  
    6|                 'content': 'What sizes do the TinyBirds Wool Runners in Natural Black come in?',  
    7|             }  
    8|         ],  
    9|         'user_name': user_name,  
    10|         'user_node_uuid': user_node_uuid,  
    11|     },  
    12|     config={'configurable': {'thread_id': uuid.uuid4().hex}},  
    13| )  
      
    
    1| {  
    ---|---  
    2|     "messages": [  
    3|         {  
    4|             "content": "What sizes do the TinyBirds Wool Runners in Natural Black come in?",  
    5|             "id": "6a940637-70a0-4c95-a4d7-4c4846909747",  
    6|             "type": "HumanMessage"  
    7|         },  
    8|         {  
    9|             "content": "The TinyBirds Wool Runners in Natural Black are available in the following sizes for little kids: 5T, 6T, 8T, 9T, and 10T. \n\nDo you have a specific size in mind, or are you looking for something else? Let me know your needs, and I can help you find the perfect pair!",  
    10|             "additional_kwargs": {  
    11|                 "refusal": null  
    12|             },  
    13|             "response_metadata": {  
    14|                 "token_usage": {  
    15|                     "completion_tokens": 76,  
    16|                     "prompt_tokens": 314,  
    17|                     "total_tokens": 390  
    18|                 },  
    19|                 "model_name": "gpt-4o-mini-2024-07-18",  
    20|                 "system_fingerprint": "fp_f33667828e",  
    21|                 "finish_reason": "stop",  
    22|                 "logprobs": null  
    23|             },  
    24|             "id": "run-d2f79c7f-4d41-4896-88dc-476a8e38bea8-0",  
    25|             "usage_metadata": {  
    26|                 "input_tokens": 314,  
    27|                 "output_tokens": 76,  
    28|                 "total_tokens": 390  
    29|             },  
    30|             "type": "AIMessage"  
    31|         }  
    32|     ],  
    33|     "user_name": "jess",  
    34|     "user_node_uuid": "186a845eee4849619d1e625b178d1845"  
    35| }  
  
## Viewing the Graph

At this stage, the graph would look something like this. The `jess` node is `INTERESTED_IN` the `TinyBirds Wool Runner` node. The image below was generated using Neo4j Desktop.

![Graph State](https://files.buildwithfern.com/zep.docs.buildwithfern.com/2025-08-28T23:32:12.149Z/images/agent_28_0.png)

## Running the Agent interactively

The following code will run the agent in a Jupyter notebook event loop. You can modify the code to suite your own needs.

Just enter a message into the box and click submit.
    
    
    1| conversation_output = widgets.Output()  
    ---|---  
    2| config = {'configurable': {'thread_id': uuid.uuid4().hex}}  
    3| user_state = {'user_name': user_name, 'user_node_uuid': user_node_uuid}  
    4|   
    5|   
    6| async def process_input(user_state: State, user_input: str):  
    7|     conversation_output.append_stdout(f'\nUser: {user_input}\n')  
    8|     conversation_output.append_stdout('\nAssistant: ')  
    9|   
    10|     graph_state = {  
    11|         'messages': [{'role': 'user', 'content': user_input}],  
    12|         'user_name': user_state['user_name'],  
    13|         'user_node_uuid': user_state['user_node_uuid'],  
    14|     }  
    15|   
    16|     try:  
    17|         async for event in graph.astream(  
    18|             graph_state,  
    19|             config=config,  
    20|         ):  
    21|             for value in event.values():  
    22|                 if 'messages' in value:  
    23|                     last_message = value['messages'][-1]  
    24|                     if isinstance(last_message, AIMessage) and isinstance(  
    25|                         last_message.content, str  
    26|                     ):  
    27|                         conversation_output.append_stdout(last_message.content)  
    28|     except Exception as e:  
    29|         conversation_output.append_stdout(f'Error: {e}')  
    30|   
    31|   
    32| def on_submit(b):  
    33|     user_input = input_box.value  
    34|     input_box.value = ''  
    35|     asyncio.create_task(process_input(user_state, user_input))  
    36|   
    37|   
    38| input_box = widgets.Text(placeholder='Type your message here...')  
    39| submit_button = widgets.Button(description='Send')  
    40| submit_button.on_click(on_submit)  
    41|   
    42| conversation_output.append_stdout('Asssistant: Hello, how can I help you find shoes today?')  
    43|   
    44| display(widgets.VBox([input_box, submit_button, conversation_output]))
