# Utilizing Facts and Summaries | Zep Documentation

**Source URL:** https://help.getzep.com/facts  
**Scraped:** 2025-08-29 13:00:30

---

## Facts

Facts are precise and time-stamped information stored on [edges](/sdk-reference/graph/edge/get) that capture detailed relationships about specific events. They include `valid_at` and `invalid_at` timestamps, ensuring temporal accuracy and preserving a clear history of changes over time.

### How Zep Updates Facts

When incorporating new data, Zep looks for existing nodes and edges in the graph and decides whether to add new nodes/edges or to update existing ones. An update could mean updating an edge (for example, indicating the previous fact is no longer valid).

Here’s an example of how Zep might extract graph data from a chat message, and then update the graph once new information is available:

![graphiti intro slides](https://files.buildwithfern.com/zep.docs.buildwithfern.com/2025-08-28T23:32:12.149Z/images/graphiti-graph-intro.gif)

As shown in the example above, when Kendra initially loves Adidas shoes but later is angry that the shoes broke and states a preference for Puma shoes, Zep invalidates the fact that Kendra loves Adidas shoes and creates two new facts: “Kendra’s Adidas shoes broke” and “Kendra likes Puma shoes”.

Zep also looks for dates in all ingested data, such as the timestamp on a chat message or an article’s publication date, informing how Zep sets the edge attributes. This assists your agent in reasoning with time.

### The Four Fact Timestamps

Each fact stored on an edge includes four different timestamp attributes that track the lifecycle of that information:

Edge attribute| Example  
---|---  
 **created_at**|  The time Zep learned that the user got married  
 **valid_at**|  The time the user got married  
 **invalid_at**|  The time the user got divorced  
 **expired_at**|  The time Zep learned that the user got divorced  
  
The `valid_at` and `invalid_at` attributes for each fact are then included in Zep’s Context Block which is given to your agent:
    
    
    # format: FACT (Date range: from - to)  
    ---  
    User account Emily0e62 has a suspended status due to payment failure. (2024-11-14 02:03:58+00:00 - present)  
  
### Rating Facts for Relevancy

Not all `relevant_facts` are equally important to your specific use-case. For example, a relationship coach app may need to recall important facts about a user’s family, but what the user ate for breakfast Friday last week is unimportant.

Fact ratings are a way to help Zep understand the importance of `relevant_facts` to your particular use case. After implementing fact ratings, you can specify a `minRating` when retrieving `relevant_facts` from Zep, ensuring that the memory `context` string contains customized content.

#### Implementing Fact Ratings

The `fact_rating_instruction` framework consists of an instruction and three example facts, one for each of a `high`, `medium`, and `low` rating. These are passed when [Adding a User graph](/sdk-reference/user/add) or [Adding a graph](/sdk-reference/graph/create) and become a property of the Graph.

#### Example: Fact Rating Implementation

Rating Facts for PoignancyUse Case-Specific Fact Rating
    
    
    1| fact_rating_instruction = """Rate the facts by poignancy. Highly poignant   
    ---|---  
    2| facts have a significant emotional impact or relevance to the user.   
    3| Facts with low poignancy are minimally relevant or of little emotional  
    4| significance."""  
    5| fact_rating_examples = FactRatingExamples(  
    6|     high="The user received news of a family member's serious illness.",  
    7|     medium="The user completed a challenging marathon.",  
    8|     low="The user bought a new brand of toothpaste.",  
    9| )  
    10| client.user.add(  
    11|     user_id=user_id,  
    12|     fact_rating_instruction=FactRatingInstruction(  
    13|         instruction=fact_rating_instruction,  
    14|         examples=fact_rating_examples,  
    15|     ),  
    16| )  
  
All facts are rated on a scale between 0 and 1.

#### Limiting Memory Recall to High-Rating Facts

You can filter the facts that will make it into the context block by setting the `minRating` parameter in [Get User Context](/sdk-reference/thread/get-user-context#request.query.minRating.minRating).
    
    
    1| result = client.thread.get_user_context(thread_id, min_rating=0.7)  
    ---|---  
  
## Summaries

Summaries are high-level overviews of entities or concepts stored on [nodes](/sdk-reference/graph/node/get). They provide a broad snapshot of an entity or concept and its relationships to other nodes. Summaries offer an aggregated and concise representation, making it easier to understand key information at a glance.

##### Choosing Between Facts and Summaries

Zep does not recommend relying solely on summaries for grounding LLM responses. While summaries provide a high-level overview, they lack the temporal accuracy necessary for precise reasoning. Instead, the [Context Block](/retrieving-memory#retrieving-zeps-context-block) should be used since it includes relevant facts (each with valid and invalid timestamps). This ensures that conversations are based on up-to-date and contextually accurate information.

## Adding or Deleting Facts or Summaries

Facts and summaries are generated as part of the ingestion process. If you follow the directions for [adding data to the graph](/adding-data-to-the-graph), new facts and summaries will be created.

Deleting facts and summaries is handled by deleting data from the graph. Facts and summaries will be deleted when you [delete the edge or node](/deleting-data-from-the-graph) they exist on.

## APIs Related to Facts and Summaries

You can extract facts and summaries using the following methods:

Method| Description  
---|---  
[Get User Context](/sdk-reference/thread/get-user-context)| Retrieves the `context` string and `relevant_facts`  
[Add User](/sdk-reference/user/add)   
[Update User](/sdk-reference/user/update)   
[Create Graph](/sdk-reference/graph/create)   
[Update Graph](/sdk-reference/graph/update)| Allows specifying `fact_rating_instruction`  
[Get User](/sdk-reference/user/get)   
[Get Users](/sdk-reference/user/list-ordered)   
[Get Graph](/sdk-reference/graph/get)   
[Get All Graphs](/sdk-reference/graph/list-all)| Retrieves `fact_rating_instruction` for each user or graph  
[Search the Graph](/sdk-reference/graph/search)| Returns a list. Each item is an `edge` or `node` and has an associated `fact` or `summary`  
[Get User Edges](/sdk-reference/graph/edge/get-by-user-id)   
[Get Graph Edges](/sdk-reference/graph/edge/get-by-graph-id)   
[Get Edge](/sdk-reference/graph/edge/get)| Retrieves `fact` on each `edge`  
[Get User Nodes](/sdk-reference/graph/node/get-by-user-id)   
[Get Graph Nodes](/sdk-reference/graph/node/get-by-graph-id)   
[Get Node](/sdk-reference/graph/node/get)| Retrieves `summary` on each `node`
