"""
Zep Clone-Based Impact Assessment POC
This module implements a safer impact assessment approach using graph cloning:
1. Clone the master graph to create a copy
2. Add episodes to the copy
3. Compare copy vs master to show differences
4. Approve: Make copy the new master / Reject: Delete copy
"""

import os
import uuid
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message
from dataclasses import dataclass, field

# Load environment variables
load_dotenv()

@dataclass
class GraphComparison:
    """Results of comparing two graphs"""
    master_id: str
    copy_id: str
    master_entities: List[Dict[str, Any]]
    copy_entities: List[Dict[str, Any]]
    master_edges: List[Dict[str, Any]]
    copy_edges: List[Dict[str, Any]]
    entities_added: List[Dict[str, Any]]
    edges_added: List[Dict[str, Any]]
    entities_modified: List[Dict[str, Any]]
    edges_modified: List[Dict[str, Any]]
    processing_time: float
    
    def get_summary(self) -> Dict:
        """Get summary of differences"""
        return {
            "master_graph": self.master_id,
            "copy_graph": self.copy_id,
            "processing_time": f"{self.processing_time:.2f}s",
            "changes": {
                "entities": {
                    "master_count": len(self.master_entities),
                    "copy_count": len(self.copy_entities),
                    "added": len(self.entities_added),
                    "modified": len(self.entities_modified)
                },
                "edges": {
                    "master_count": len(self.master_edges),
                    "copy_count": len(self.copy_edges),
                    "added": len(self.edges_added),
                    "modified": len(self.edges_modified)
                }
            }
        }

class ZepCloneImpactAssessor:
    """Impact assessment using graph cloning strategy"""
    
    def __init__(self):
        """Initialize Zep client"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Connected to Zep Clone Impact Assessor")
        
        # Track active clones for cleanup
        self.active_clones = {}
    
    def clone_graph(self, source_graph_id: str = None, source_user_id: str = None) -> str:
        """Clone a graph and return the copy ID"""
        try:
            if source_graph_id:
                # Clone regular graph
                copy_id = f"{source_graph_id}_copy_{uuid.uuid4().hex[:6]}"
                result = self.client.graph.clone(
                    source_graph_id=source_graph_id,
                    target_graph_id=copy_id
                )
                print(f"✅ Cloned graph {source_graph_id} to {copy_id}")
                self.active_clones[copy_id] = {
                    "type": "graph",
                    "source": source_graph_id,
                    "created_at": datetime.now()
                }
                return copy_id
            elif source_user_id:
                # Clone user graph
                copy_id = f"{source_user_id}_copy_{uuid.uuid4().hex[:6]}"
                result = self.client.graph.clone(
                    source_user_id=source_user_id,
                    target_user_id=copy_id
                )
                print(f"✅ Cloned user {source_user_id} to {copy_id}")
                self.active_clones[copy_id] = {
                    "type": "user",
                    "source": source_user_id,
                    "created_at": datetime.now()
                }
                return copy_id
        except Exception as e:
            print(f"❌ Error cloning graph: {e}")
            return None
    
    def get_graph_contents(self, graph_id: str = None, user_id: str = None) -> Tuple[List, List]:
        """Get all entities and edges from a graph"""
        entities = []
        edges = []
        
        try:
            # Search for entities - use specific terms from our data
            search_queries = [
                "Acme Corporation John Smith CEO StartupXYZ Sarah Johnson",
                "technology company employees San Francisco acquisition",
                "founded million AI capabilities TechConf"
            ]
            
            for query in search_queries:
                if graph_id:
                    node_results = self.client.graph.search(
                        graph_id=graph_id,
                        query=query,
                        scope="nodes",
                        limit=50
                    )
                else:
                    node_results = self.client.graph.search(
                        user_id=user_id,
                        query=query,
                        scope="nodes",
                        limit=50
                    )
                
                if node_results.nodes:
                    for node in node_results.nodes:
                        # Check if we already have this node
                        node_uuid = node.uuid_ if hasattr(node, 'uuid_') else None
                        if node_uuid and not any(e.get("uuid") == node_uuid for e in entities):
                            entities.append({
                                "uuid": node_uuid,
                                "name": node.name if hasattr(node, 'name') else "Unknown",
                                "type": node.labels[-1] if hasattr(node, 'labels') and node.labels else "Entity",
                                "summary": node.summary if hasattr(node, 'summary') else None
                            })
            
            # Search for edges
            for query in search_queries:
                if graph_id:
                    edge_results = self.client.graph.search(
                        graph_id=graph_id,
                        query=query,
                        scope="edges",
                        limit=50
                    )
                else:
                    edge_results = self.client.graph.search(
                        user_id=user_id,
                        query=query,
                        scope="edges",
                        limit=50
                    )
                
                if edge_results.edges:
                    for edge in edge_results.edges:
                        edge_uuid = edge.uuid_ if hasattr(edge, 'uuid_') else None
                        if edge_uuid and not any(e.get("uuid") == edge_uuid for e in edges):
                            edges.append({
                                "uuid": edge_uuid,
                                "fact": edge.fact if hasattr(edge, 'fact') else "Unknown",
                                "type": edge.name if hasattr(edge, 'name') else "RELATES_TO",
                                "valid_at": edge.valid_at if hasattr(edge, 'valid_at') else None
                            })
            
        except Exception as e:
            print(f"⚠️ Error getting graph contents: {e}")
        
        return entities, edges
    
    def compare_graphs(self, master_id: str, copy_id: str, is_user: bool = False) -> GraphComparison:
        """Compare master and copy graphs to identify differences"""
        print(f"\n🔍 Comparing graphs: {master_id} vs {copy_id}")
        
        # Get contents of both graphs
        if is_user:
            master_entities, master_edges = self.get_graph_contents(user_id=master_id)
            copy_entities, copy_edges = self.get_graph_contents(user_id=copy_id)
        else:
            master_entities, master_edges = self.get_graph_contents(graph_id=master_id)
            copy_entities, copy_edges = self.get_graph_contents(graph_id=copy_id)
        
        print(f"  Master: {len(master_entities)} entities, {len(master_edges)} edges")
        print(f"  Copy: {len(copy_entities)} entities, {len(copy_edges)} edges")
        
        # Find differences
        master_entity_uuids = {e["uuid"] for e in master_entities if e.get("uuid")}
        copy_entity_uuids = {e["uuid"] for e in copy_entities if e.get("uuid")}
        
        master_edge_uuids = {e["uuid"] for e in master_edges if e.get("uuid")}
        copy_edge_uuids = {e["uuid"] for e in copy_edges if e.get("uuid")}
        
        # New entities in copy
        entities_added = [e for e in copy_entities 
                         if e.get("uuid") and e["uuid"] not in master_entity_uuids]
        
        # Modified entities
        entities_modified = []
        for copy_entity in copy_entities:
            if copy_entity.get("uuid") in master_entity_uuids:
                master_entity = next((e for e in master_entities 
                                     if e.get("uuid") == copy_entity["uuid"]), None)
                if master_entity and master_entity.get("summary") != copy_entity.get("summary"):
                    entities_modified.append({
                        "entity": copy_entity,
                        "change": "summary_updated"
                    })
        
        # New edges in copy
        edges_added = [e for e in copy_edges 
                      if e.get("uuid") and e["uuid"] not in master_edge_uuids]
        
        # Modified edges
        edges_modified = []
        for copy_edge in copy_edges:
            if copy_edge.get("uuid") in master_edge_uuids:
                master_edge = next((e for e in master_edges 
                                   if e.get("uuid") == copy_edge["uuid"]), None)
                if master_edge and master_edge != copy_edge:
                    edges_modified.append({
                        "edge": copy_edge,
                        "change": "modified"
                    })
        
        return GraphComparison(
            master_id=master_id,
            copy_id=copy_id,
            master_entities=master_entities,
            copy_entities=copy_entities,
            master_edges=master_edges,
            copy_edges=copy_edges,
            entities_added=entities_added,
            edges_added=edges_added,
            entities_modified=entities_modified,
            edges_modified=edges_modified,
            processing_time=0  # Will be updated later
        )
    
    def assess_impact_with_clone(self, graph_id: str = None, user_id: str = None, 
                                 data: str = None, data_type: str = "text",
                                 messages: List[Message] = None, thread_id: str = None) -> GraphComparison:
        """Assess impact using clone strategy"""
        start_time = time.time()
        
        print("\n" + "=" * 60)
        print("CLONE-BASED IMPACT ASSESSMENT")
        print("=" * 60)
        
        # Step 1: Clone the graph
        print("\n📋 Step 1: Cloning graph...")
        if graph_id:
            copy_id = self.clone_graph(source_graph_id=graph_id)
            master_id = graph_id
            is_user = False
        else:
            copy_id = self.clone_graph(source_user_id=user_id)
            master_id = user_id
            is_user = True
            
            # Need to create thread for copy user
            if messages and thread_id:
                copy_thread_id = f"{thread_id}_copy"
                self.client.thread.create(thread_id=copy_thread_id, user_id=copy_id)
                print(f"  Created thread for copy user: {copy_thread_id}")
        
        if not copy_id:
            print("❌ Failed to create clone")
            return None
        
        # Step 2: Add data to the copy
        print(f"\n📝 Step 2: Adding data to copy graph...")
        if graph_id and data:
            # Add data to graph copy
            episode = self.client.graph.add(
                graph_id=copy_id,
                type=data_type,
                data=data
            )
            episode_uuid = episode.uuid_ if hasattr(episode, 'uuid_') else None
            print(f"  Added episode: {episode_uuid}")
            
            # Wait for processing
            print("⏳ Waiting for processing...")
            if episode_uuid:
                self.wait_for_episode(episode_uuid)
            else:
                time.sleep(10)
                
        elif user_id and messages:
            # Add messages to user copy
            self.client.thread.add_messages(copy_thread_id, messages=messages)
            print(f"  Added {len(messages)} messages")
            
            # Wait for processing
            print("⏳ Waiting for processing...")
            time.sleep(10)
        
        # Step 3: Compare graphs
        print(f"\n🔄 Step 3: Comparing master vs copy...")
        comparison = self.compare_graphs(master_id, copy_id, is_user)
        comparison.processing_time = time.time() - start_time
        
        return comparison
    
    def wait_for_episode(self, episode_uuid: str, max_wait: int = 30):
        """Wait for episode to be processed"""
        start = time.time()
        while time.time() - start < max_wait:
            try:
                episode = self.client.graph.episode.get(uuid_=episode_uuid)
                if episode.processed:
                    print(f"  ✅ Episode processed")
                    return
            except:
                pass
            time.sleep(2)
        print(f"  ⚠️ Processing timeout")
    
    def approve_changes(self, comparison: GraphComparison) -> bool:
        """Approve changes by making copy the new master"""
        print("\n✅ APPROVING CHANGES")
        print("-" * 40)
        
        # Note: Zep doesn't have a way to "swap" graphs or delete the master
        # In production, you would:
        # 1. Keep copy_id as the new working graph
        # 2. Mark master as deprecated/archived
        # 3. Update all references to point to copy_id
        
        print(f"  Copy graph {comparison.copy_id} is now the active graph")
        print(f"  Original graph {comparison.master_id} should be archived")
        
        # Remove from active clones
        if comparison.copy_id in self.active_clones:
            del self.active_clones[comparison.copy_id]
        
        return True
    
    def reject_changes(self, comparison: GraphComparison) -> bool:
        """Reject changes by deleting the copy"""
        print("\n❌ REJECTING CHANGES")
        print("-" * 40)
        
        # Note: Since Zep doesn't have graph.delete, we would:
        # 1. Stop using the copy_id
        # 2. Let it remain but mark as rejected
        # 3. Continue using master_id
        
        print(f"  Abandoning copy graph {comparison.copy_id}")
        print(f"  Continuing with master graph {comparison.master_id}")
        
        # Remove from active clones
        if comparison.copy_id in self.active_clones:
            del self.active_clones[comparison.copy_id]
        
        return True
    
    def print_comparison_report(self, comparison: GraphComparison):
        """Print detailed comparison report"""
        print("\n" + "=" * 60)
        print("COMPARISON REPORT")
        print("=" * 60)
        
        summary = comparison.get_summary()
        
        print(f"\nMaster Graph: {summary['master_graph']}")
        print(f"Copy Graph: {summary['copy_graph']}")
        print(f"Processing Time: {summary['processing_time']}")
        
        print("\n📊 ENTITY CHANGES")
        print("-" * 40)
        changes = summary['changes']['entities']
        print(f"Master: {changes['master_count']} entities")
        print(f"Copy: {changes['copy_count']} entities")
        print(f"Added: {changes['added']} new entities")
        print(f"Modified: {changes['modified']} entities")
        
        if comparison.entities_added:
            print("\nNew Entities:")
            for entity in comparison.entities_added[:5]:
                print(f"  • {entity['name']} ({entity['type']})")
        
        print("\n🔗 EDGE CHANGES")
        print("-" * 40)
        changes = summary['changes']['edges']
        print(f"Master: {changes['master_count']} edges")
        print(f"Copy: {changes['copy_count']} edges")
        print(f"Added: {changes['added']} new edges")
        print(f"Modified: {changes['modified']} edges")
        
        if comparison.edges_added:
            print("\nNew Relationships:")
            for edge in comparison.edges_added[:5]:
                fact = edge['fact'][:70] + "..." if len(edge['fact']) > 70 else edge['fact']
                print(f"  • {edge['type']}: {fact}")

def demo_clone_assessment():
    """Demonstrate clone-based impact assessment"""
    print("=" * 60)
    print("CLONE-BASED IMPACT ASSESSMENT DEMO")
    print("=" * 60)
    
    assessor = ZepCloneImpactAssessor()
    
    # Create a master graph with initial data
    print("\n📊 Creating master graph with initial data...")
    master_id = f"master_{uuid.uuid4().hex[:8]}"
    master = assessor.client.graph.create(
        graph_id=master_id,
        name="Master Graph",
        description="Master graph for clone assessment demo"
    )
    print(f"✅ Created master graph: {master_id}")
    
    # Add some initial data to master
    initial_data = """
    Acme Corporation is a technology company founded in 2018.
    The company has 100 employees and is based in San Francisco.
    John Smith is the CEO of Acme Corporation.
    """
    
    print("📝 Adding initial data to master...")
    episode = assessor.client.graph.add(
        graph_id=master_id,
        type="text",
        data=initial_data
    )
    
    # Wait for processing
    print("⏳ Waiting for initial data processing...")
    time.sleep(10)
    
    # Now perform impact assessment with new data
    new_data = """
    Acme Corporation just acquired StartupXYZ for $50 million.
    StartupXYZ was founded in 2020 and has 25 employees.
    Sarah Johnson is the CEO of StartupXYZ.
    The acquisition will expand Acme's AI capabilities.
    John Smith announced the acquisition at TechConf 2025.
    """
    
    print("\n" + "=" * 40)
    print("ASSESSING IMPACT OF NEW DATA")
    print("=" * 40)
    
    # Perform clone-based assessment
    comparison = assessor.assess_impact_with_clone(
        graph_id=master_id,
        data=new_data,
        data_type="text"
    )
    
    if comparison:
        # Print report
        assessor.print_comparison_report(comparison)
        
        # Decision point
        print("\n" + "=" * 40)
        print("DECISION POINT")
        print("=" * 40)
        print("\nBased on the changes above:")
        print("1. APPROVE - Make copy the new master")
        print("2. REJECT - Discard copy and keep master")
        
        # Auto-approve for demo
        print("\n🤖 Auto-approving for demonstration...")
        assessor.approve_changes(comparison)
        
        print(f"\n✅ Assessment complete")
        print(f"  Active graph: {comparison.copy_id}")
        print(f"  Archived graph: {comparison.master_id}")
    
    return master_id

if __name__ == "__main__":
    master_id = demo_clone_assessment()
    print(f"\n✅ Clone-based assessment demo complete")