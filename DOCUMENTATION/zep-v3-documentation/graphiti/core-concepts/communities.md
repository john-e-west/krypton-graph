# Communities | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/core-concepts/communities  
**Scraped:** 2025-08-29 13:02:19

---

In Graphiti, communities (represented as `CommunityNode` objects) represent groups of related entity nodes. Communities can be generated using the `build_communities` method on the graphiti class.
    
    
    1| await graphiti.build_communities()  
    ---|---  
  
Communities are determined using the Leiden algorithm, which groups strongly connected nodes together. Communities contain a summary field that collates the summaries held on each of its member entities. This allows Graphiti to provide high-level synthesized information about what the graph contains in addition to the more granular facts stored on edges.

Once communities are built, they can also be updated with new episodes by passing in `update_communities=True` to the `add_episode` method. If a new node is added to the graph, we will determine which community it should be added to based on the most represented community of the new node’s surrounding nodes. This updating methodology is inspired by the label propagation algorithm for determining communities. However, we still recommend periodically rebuilding communities to ensure the most optimal grouping. Whenever the `build_communities` method is called it will remove any existing communities before creating new ones.
