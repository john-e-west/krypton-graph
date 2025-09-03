# Graph Overview | Zep Documentation

**Source URL:** https://help.getzep.com/graph-overview  
**Scraped:** 2025-08-29 13:00:34

---

Zep’s temporal knowledge graph powers its context engineering capabilities, including agent memory and Graph RAG. Zep’s graph is built on [Graphiti](/graphiti/graphiti/overview), Zep’s open-source temporal graph library, which is fully integrated into Zep. Developers do not need to interact directly with Graphiti or understand its underlying implementation.

What is a Knowledge Graph?

A knowledge graph is a network of interconnected facts, such as _“Kendra loves Adidas shoes.”_ Each fact is a _“triplet”_ represented by two entities, or nodes ( _“Kendra”, “Adidas shoes”_ ), and their relationship, or edge ( _“loves”_ ).

  

Knowledge Graphs have been explored extensively for information retrieval. What makes Zep unique is its ability to autonomously build temporal knowledge graphs while handling changing relationships and maintaining historical context.

Zep automatically constructs a temporal knowledge graph for each of your users. The knowledge graph contains entities, relationships, and facts related to your user, while automatically handling changing relationships and facts over time.

Here’s an example of how Zep might extract graph data from a chat message, and then update the graph once new information is available:

![graphiti intro slides](https://files.buildwithfern.com/zep.docs.buildwithfern.com/2025-08-28T23:32:12.149Z/images/graphiti-graph-intro.gif)

Each node and edge contains certain attributes - notably, a fact is always stored as an edge attribute. There are also datetime attributes for when the fact becomes valid and when it becomes invalid.

## Graph Data Structure

Zep’s graph database stores data in three main types:

  1. Entity edges (edges): Represent relationships between nodes and include semantic facts representing the relationship between the edge’s nodes.
  2. Entity nodes (nodes): Represent entities extracted from episodes, containing summaries of relevant information.
  3. Episodic nodes (episodes): Represent raw data stored in Zep, either through chat history or the `graph.add` endpoint.

## Working with the Graph

To learn more about interacting with Zep’s graph, refer to the following sections:

  * [Adding Data to the Graph](/v3/adding-data-to-the-graph): Learn how to add new data to the graph.
  * [Reading Data from the Graph](/v3/reading-data-from-the-graph): Discover how to retrieve information from the graph.
  * [Searching the Graph](/v3/searching-the-graph): Explore techniques for efficiently searching the graph.

These guides will help you leverage the full power of Zep’s knowledge graph in your applications.
