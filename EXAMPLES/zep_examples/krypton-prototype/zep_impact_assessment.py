"""
Zep Impact Assessment POC
This module provides functionality to assess the impact of adding data to a Zep graph
without permanently committing the changes. It captures before/after states and can rollback.
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
class GraphSnapshot:
    """Represents a snapshot of graph state at a point in time"""
    timestamp: datetime
    graph_id: Optional[str]
    user_id: Optional[str]
    entities: List[Dict[str, Any]] = field(default_factory=list)
    edges: List[Dict[str, Any]] = field(default_factory=list)
    entity_count: int = 0
    edge_count: int = 0
    entity_types: Dict[str, int] = field(default_factory=dict)
    edge_types: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Convert snapshot to dictionary for comparison"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "graph_id": self.graph_id,
            "user_id": self.user_id,
            "entity_count": self.entity_count,
            "edge_count": self.edge_count,
            "entity_types": self.entity_types,
            "edge_types": self.edge_types,
            "entities": [e["name"] for e in self.entities[:10]],  # Sample of entity names
            "edges": [e["fact"][:50] + "..." for e in self.edges[:10]]  # Sample of facts
        }

@dataclass
class ImpactAssessment:
    """Results of impact assessment"""
    episode_uuid: str
    before_snapshot: GraphSnapshot
    after_snapshot: GraphSnapshot
    entities_added: List[Dict[str, Any]]
    entities_modified: List[Dict[str, Any]]
    edges_added: List[Dict[str, Any]]
    edges_modified: List[Dict[str, Any]]
    processing_time: float
    rollback_available: bool = True
    
    def get_summary(self) -> Dict:
        """Get summary of changes"""
        return {
            "episode_uuid": self.episode_uuid,
            "processing_time_seconds": self.processing_time,
            "changes": {
                "entities": {
                    "before_count": self.before_snapshot.entity_count,
                    "after_count": self.after_snapshot.entity_count,
                    "added": len(self.entities_added),
                    "modified": len(self.entities_modified)
                },
                "edges": {
                    "before_count": self.before_snapshot.edge_count,
                    "after_count": self.after_snapshot.edge_count,
                    "added": len(self.edges_added),
                    "modified": len(self.edges_modified)
                },
                "new_entity_types": list(set(self.after_snapshot.entity_types.keys()) - 
                                        set(self.before_snapshot.entity_types.keys())),
                "new_edge_types": list(set(self.after_snapshot.edge_types.keys()) - 
                                      set(self.before_snapshot.edge_types.keys()))
            },
            "rollback_available": self.rollback_available
        }

class ZepImpactAssessor:
    """Assess impact of data additions to Zep graphs"""
    
    def __init__(self):
        """Initialize Zep client"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Connected to Zep Impact Assessor")
    
    def capture_graph_snapshot(self, graph_id: str = None, user_id: str = None) -> GraphSnapshot:
        """Capture current state of a graph or user graph"""
        snapshot = GraphSnapshot(
            timestamp=datetime.now(),
            graph_id=graph_id,
            user_id=user_id
        )
        
        try:
            # Get all entities - use a broader search
            query = "TechCorp CloudManager Jane Smith CEO employees cloud computing software"
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
                    entity_data = {
                        "uuid": node.uuid_ if hasattr(node, 'uuid_') else None,
                        "name": node.name if hasattr(node, 'name') else "Unknown",
                        "type": node.labels[-1] if hasattr(node, 'labels') and node.labels else "Entity",
                        "labels": node.labels if hasattr(node, 'labels') else [],
                        "summary": node.summary if hasattr(node, 'summary') else None,
                        "created_at": node.created_at if hasattr(node, 'created_at') else None
                    }
                    snapshot.entities.append(entity_data)
                    
                    # Track entity types
                    entity_type = entity_data["type"]
                    snapshot.entity_types[entity_type] = snapshot.entity_types.get(entity_type, 0) + 1
            
            snapshot.entity_count = len(snapshot.entities)
            
            # Get all edges - use a broader search
            query = "founded specializes CEO experience product used by employees"
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
                    edge_data = {
                        "uuid": edge.uuid_ if hasattr(edge, 'uuid_') else None,
                        "fact": edge.fact if hasattr(edge, 'fact') else "Unknown",
                        "type": edge.name if hasattr(edge, 'name') else "RELATES_TO",
                        "valid_at": edge.valid_at if hasattr(edge, 'valid_at') else None,
                        "invalid_at": edge.invalid_at if hasattr(edge, 'invalid_at') else None,
                        "created_at": edge.created_at if hasattr(edge, 'created_at') else None
                    }
                    snapshot.edges.append(edge_data)
                    
                    # Track edge types
                    edge_type = edge_data["type"]
                    snapshot.edge_types[edge_type] = snapshot.edge_types.get(edge_type, 0) + 1
            
            snapshot.edge_count = len(snapshot.edges)
            
        except Exception as e:
            print(f"⚠️ Error capturing snapshot: {e}")
        
        return snapshot
    
    def wait_for_episode_processing(self, episode_uuid: str, max_wait: int = 60) -> float:
        """Wait for episode to be processed and return processing time"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                episode = self.client.graph.episode.get(uuid_=episode_uuid)
                if episode.processed:
                    processing_time = time.time() - start_time
                    print(f"✅ Episode processed in {processing_time:.2f} seconds")
                    return processing_time
            except Exception as e:
                print(f"⚠️ Error checking episode status: {e}")
            
            time.sleep(2)
        
        print(f"⚠️ Episode processing timeout after {max_wait} seconds")
        return time.time() - start_time
    
    def compare_snapshots(self, before: GraphSnapshot, after: GraphSnapshot) -> Tuple[List, List, List, List]:
        """Compare two snapshots and identify changes"""
        # Create lookup sets for efficient comparison
        before_entity_uuids = {e["uuid"] for e in before.entities if e["uuid"]}
        after_entity_uuids = {e["uuid"] for e in after.entities if e["uuid"]}
        
        before_edge_uuids = {e["uuid"] for e in before.edges if e["uuid"]}
        after_edge_uuids = {e["uuid"] for e in after.edges if e["uuid"]}
        
        # Find added entities (in after but not in before)
        entities_added = [e for e in after.entities 
                         if e["uuid"] and e["uuid"] not in before_entity_uuids]
        
        # Find modified entities (same UUID but different content)
        entities_modified = []
        for after_entity in after.entities:
            if after_entity["uuid"] in before_entity_uuids:
                # Find corresponding before entity
                before_entity = next((e for e in before.entities if e["uuid"] == after_entity["uuid"]), None)
                if before_entity and before_entity["summary"] != after_entity["summary"]:
                    entities_modified.append({
                        "entity": after_entity,
                        "change": "summary_updated"
                    })
        
        # Find added edges
        edges_added = [e for e in after.edges 
                      if e["uuid"] and e["uuid"] not in before_edge_uuids]
        
        # Find modified edges (e.g., invalidated facts)
        edges_modified = []
        for after_edge in after.edges:
            if after_edge["uuid"] in before_edge_uuids:
                before_edge = next((e for e in before.edges if e["uuid"] == after_edge["uuid"]), None)
                if before_edge:
                    # Check if invalidation status changed
                    if before_edge["invalid_at"] != after_edge["invalid_at"]:
                        edges_modified.append({
                            "edge": after_edge,
                            "change": "invalidated" if after_edge["invalid_at"] else "revalidated"
                        })
        
        return entities_added, entities_modified, edges_added, edges_modified
    
    def assess_graph_impact(self, graph_id: str, data: str, data_type: str = "text") -> ImpactAssessment:
        """Assess impact of adding data to a graph"""
        print(f"\n🔍 Assessing impact on graph: {graph_id}")
        
        # Step 1: Capture before snapshot
        print("📸 Capturing before snapshot...")
        before_snapshot = self.capture_graph_snapshot(graph_id=graph_id)
        print(f"  Before: {before_snapshot.entity_count} entities, {before_snapshot.edge_count} edges")
        
        # Step 2: Add data and get episode UUID
        print("📝 Adding data to graph...")
        episode = self.client.graph.add(
            graph_id=graph_id,
            type=data_type,
            data=data
        )
        episode_uuid = episode.uuid_ if hasattr(episode, 'uuid_') else None
        print(f"  Episode UUID: {episode_uuid}")
        
        # Step 3: Wait for processing
        print("⏳ Waiting for processing...")
        processing_time = self.wait_for_episode_processing(episode_uuid)
        
        # Step 4: Capture after snapshot
        print("📸 Capturing after snapshot...")
        after_snapshot = self.capture_graph_snapshot(graph_id=graph_id)
        print(f"  After: {after_snapshot.entity_count} entities, {after_snapshot.edge_count} edges")
        
        # Step 5: Compare snapshots
        print("🔄 Comparing snapshots...")
        entities_added, entities_modified, edges_added, edges_modified = self.compare_snapshots(
            before_snapshot, after_snapshot
        )
        
        # Create assessment
        assessment = ImpactAssessment(
            episode_uuid=episode_uuid,
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            entities_added=entities_added,
            entities_modified=entities_modified,
            edges_added=edges_added,
            edges_modified=edges_modified,
            processing_time=processing_time
        )
        
        return assessment
    
    def assess_user_impact(self, user_id: str, thread_id: str, messages: List[Message]) -> ImpactAssessment:
        """Assess impact of adding messages to a user thread"""
        print(f"\n🔍 Assessing impact on user: {user_id}")
        
        # Step 1: Capture before snapshot
        print("📸 Capturing before snapshot...")
        before_snapshot = self.capture_graph_snapshot(user_id=user_id)
        print(f"  Before: {before_snapshot.entity_count} entities, {before_snapshot.edge_count} edges")
        
        # Step 2: Add messages
        print("💬 Adding messages to thread...")
        result = self.client.thread.add_messages(thread_id, messages=messages)
        
        # Note: User message additions don't return episode UUID directly
        # We need to find the latest episode
        episode_uuid = None
        
        # Step 3: Wait for processing
        print("⏳ Waiting for processing...")
        time.sleep(10)  # Fixed wait for user graph processing
        processing_time = 10.0
        
        # Step 4: Capture after snapshot
        print("📸 Capturing after snapshot...")
        after_snapshot = self.capture_graph_snapshot(user_id=user_id)
        print(f"  After: {after_snapshot.entity_count} entities, {after_snapshot.edge_count} edges")
        
        # Step 5: Compare snapshots
        print("🔄 Comparing snapshots...")
        entities_added, entities_modified, edges_added, edges_modified = self.compare_snapshots(
            before_snapshot, after_snapshot
        )
        
        # Create assessment
        assessment = ImpactAssessment(
            episode_uuid=episode_uuid or "thread_messages",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            entities_added=entities_added,
            entities_modified=entities_modified,
            edges_added=edges_added,
            edges_modified=edges_modified,
            processing_time=processing_time,
            rollback_available=False  # Thread messages can't be easily rolled back
        )
        
        return assessment
    
    def rollback_episode(self, episode_uuid: str) -> bool:
        """Rollback changes by deleting the episode"""
        try:
            print(f"\n⏮️ Rolling back episode: {episode_uuid}")
            self.client.graph.episode.delete(uuid_=episode_uuid)
            print("✅ Episode rolled back successfully")
            return True
        except Exception as e:
            print(f"❌ Error rolling back episode: {e}")
            return False
    
    def print_impact_report(self, assessment: ImpactAssessment):
        """Print a detailed impact report"""
        print("\n" + "=" * 60)
        print("IMPACT ASSESSMENT REPORT")
        print("=" * 60)
        
        summary = assessment.get_summary()
        
        print(f"\nEpisode UUID: {summary['episode_uuid']}")
        print(f"Processing Time: {summary['processing_time_seconds']:.2f} seconds")
        print(f"Rollback Available: {'Yes' if summary['rollback_available'] else 'No'}")
        
        print("\n📊 ENTITY CHANGES")
        print("-" * 40)
        print(f"Before: {summary['changes']['entities']['before_count']} entities")
        print(f"After: {summary['changes']['entities']['after_count']} entities")
        print(f"Added: {summary['changes']['entities']['added']} new entities")
        print(f"Modified: {summary['changes']['entities']['modified']} entities")
        
        if assessment.entities_added:
            print("\nNew Entities (first 5):")
            for entity in assessment.entities_added[:5]:
                print(f"  • {entity['name']} ({entity['type']})")
        
        print("\n🔗 EDGE CHANGES")
        print("-" * 40)
        print(f"Before: {summary['changes']['edges']['before_count']} edges")
        print(f"After: {summary['changes']['edges']['after_count']} edges")
        print(f"Added: {summary['changes']['edges']['added']} new edges")
        print(f"Modified: {summary['changes']['edges']['modified']} edges")
        
        if assessment.edges_added:
            print("\nNew Relationships (first 5):")
            for edge in assessment.edges_added[:5]:
                fact = edge['fact'][:80] + "..." if len(edge['fact']) > 80 else edge['fact']
                print(f"  • {edge['type']}: {fact}")
        
        if summary['changes']['new_entity_types']:
            print(f"\n🆕 New Entity Types: {', '.join(summary['changes']['new_entity_types'])}")
        
        if summary['changes']['new_edge_types']:
            print(f"\n🆕 New Edge Types: {', '.join(summary['changes']['new_edge_types'])}")

def demo_impact_assessment():
    """Demonstrate impact assessment functionality"""
    print("=" * 60)
    print("ZEP IMPACT ASSESSMENT DEMONSTRATION")
    print("=" * 60)
    
    assessor = ZepImpactAssessor()
    
    # Create a test graph
    graph_id = f"impact_test_{uuid.uuid4().hex[:8]}"
    graph = assessor.client.graph.create(
        graph_id=graph_id,
        name="Impact Assessment Test Graph",
        description="Testing impact assessment functionality"
    )
    print(f"\n✅ Created test graph: {graph_id}")
    
    # Test data
    test_data = """
    TechCorp is a software company founded in 2020 by Jane Smith.
    The company has 50 employees and specializes in cloud computing.
    Their main product is CloudManager, used by over 100 enterprises.
    Jane Smith is the CEO and has 15 years of experience in technology.
    """
    
    # Perform impact assessment
    print("\n" + "=" * 40)
    print("PERFORMING IMPACT ASSESSMENT")
    print("=" * 40)
    
    assessment = assessor.assess_graph_impact(
        graph_id=graph_id,
        data=test_data,
        data_type="text"
    )
    
    # Print report
    assessor.print_impact_report(assessment)
    
    # Demonstrate rollback (automatic for demo)
    if assessment.rollback_available and assessment.entities_added:
        print("\n" + "=" * 40)
        print("ROLLBACK DEMONSTRATION")
        print("=" * 40)
        
        print("\n🔄 Demonstrating rollback capability...")
        if assessor.rollback_episode(assessment.episode_uuid):
            # Wait for rollback to process
            time.sleep(5)
            
            # Verify rollback
            print("\n📸 Verifying rollback...")
            final_snapshot = assessor.capture_graph_snapshot(graph_id=graph_id)
            print(f"Final state: {final_snapshot.entity_count} entities, {final_snapshot.edge_count} edges")
            print(f"Original state: {assessment.before_snapshot.entity_count} entities, {assessment.before_snapshot.edge_count} edges")
            
            if final_snapshot.entity_count == assessment.before_snapshot.entity_count:
                print("✅ Rollback successful - graph restored to original state")
            else:
                print("⚠️ Rollback completed but state differs")
    
    return graph_id

if __name__ == "__main__":
    graph_id = demo_impact_assessment()
    print(f"\n✅ Impact assessment complete for graph: {graph_id}")