"""
Zep Cascade Impact Test
Demonstrates how small changes can have large cascading effects in interconnected graphs.
Creates a "fragile" graph where many relationships depend on specific facts that can be
easily invalidated or changed.
"""

import os
import uuid
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Tuple
from dotenv import load_dotenv
from zep_cloud.client import Zep

# Load environment variables
load_dotenv()

class ZepCascadeImpactTester:
    """Test cascading impact of small changes on interconnected graphs"""
    
    def __init__(self):
        """Initialize Zep client"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Connected to Zep Cascade Impact Tester")
    
    def create_fragile_master_graph(self) -> str:
        """Create a master graph with many interconnected, fragile relationships"""
        print("\n" + "=" * 60)
        print("CREATING FRAGILE MASTER GRAPH")
        print("=" * 60)
        
        master_id = f"fragile_master_{uuid.uuid4().hex[:8]}"
        master = self.client.graph.create(
            graph_id=master_id,
            name="Fragile Master Graph",
            description="Graph with interconnected fragile relationships"
        )
        print(f"✅ Created master graph: {master_id}")
        
        # Episode 1: Company hierarchy and dependencies
        print("\n📝 Episode 1: Company Structure")
        company_structure = """
        MegaCorp is the parent company that owns TechDivision, FinanceDivision, and RetailDivision.
        TechDivision manages 500 employees and generates $100M revenue annually.
        FinanceDivision manages 300 employees and generates $80M revenue annually.
        RetailDivision manages 1000 employees and generates $200M revenue annually.
        
        John Smith is the CEO of MegaCorp since 2015.
        Sarah Johnson is the CTO of TechDivision reporting to John Smith.
        Michael Brown is the CFO of FinanceDivision reporting to John Smith.
        Emily Davis is the COO of RetailDivision reporting to John Smith.
        
        All divisions are headquartered in Silicon Valley Campus.
        The Silicon Valley Campus was established in 2010 and houses 1800 employees total.
        """
        
        episode1 = self.client.graph.add(
            graph_id=master_id,
            type="text",
            data=company_structure
        )
        print(f"  Added Episode 1: {episode1.uuid_}")
        
        # Episode 2: Product dependencies
        print("\n📝 Episode 2: Product Ecosystem")
        product_ecosystem = """
        TechDivision develops CloudPlatform, which is used by FinanceDivision and RetailDivision.
        CloudPlatform processes 10 million transactions daily across all divisions.
        FinanceDivision's TradingSystem depends entirely on CloudPlatform for real-time processing.
        RetailDivision's InventorySystem depends entirely on CloudPlatform for synchronization.
        
        CloudPlatform is maintained by the Platform Team led by Sarah Johnson.
        The Platform Team consists of 50 engineers including Alex Chen, Lisa Wang, and David Lee.
        Alex Chen is the lead architect of CloudPlatform's core infrastructure.
        Lisa Wang manages CloudPlatform's security protocols.
        David Lee oversees CloudPlatform's API integrations.
        """
        
        episode2 = self.client.graph.add(
            graph_id=master_id,
            type="text",
            data=product_ecosystem
        )
        print(f"  Added Episode 2: {episode2.uuid_}")
        
        # Episode 3: Financial relationships
        print("\n📝 Episode 3: Financial Dependencies")
        financial_deps = """
        MegaCorp's total valuation is $2 billion based on combined division performance.
        TechDivision's CloudPlatform generates $50M of its $100M revenue.
        FinanceDivision pays TechDivision $10M annually for CloudPlatform usage.
        RetailDivision pays TechDivision $15M annually for CloudPlatform usage.
        
        John Smith owns 30% of MegaCorp shares worth $600M.
        Sarah Johnson owns 5% of MegaCorp shares worth $100M.
        Michael Brown owns 3% of MegaCorp shares worth $60M.
        Emily Davis owns 3% of MegaCorp shares worth $60M.
        
        MegaCorp's board includes John Smith, Sarah Johnson, and external directors.
        The board meets quarterly at Silicon Valley Campus.
        """
        
        episode3 = self.client.graph.add(
            graph_id=master_id,
            type="text",
            data=financial_deps
        )
        print(f"  Added Episode 3: {episode3.uuid_}")
        
        # Episode 4: Strategic partnerships
        print("\n📝 Episode 4: Strategic Relationships")
        partnerships = """
        MegaCorp has exclusive partnerships with CloudProvider Inc and DataAnalytics Corp.
        CloudProvider Inc provides infrastructure for CloudPlatform at $5M annually.
        DataAnalytics Corp processes all customer data for RetailDivision.
        
        John Smith serves on the board of CloudProvider Inc.
        Sarah Johnson collaborates with CloudProvider Inc's technical team.
        Michael Brown manages the financial relationship with DataAnalytics Corp.
        
        All three divisions depend on CloudProvider Inc's infrastructure.
        CloudProvider Inc's CEO James Wilson meets monthly with John Smith.
        The partnership agreements are reviewed annually by the board.
        """
        
        episode4 = self.client.graph.add(
            graph_id=master_id,
            type="text",
            data=partnerships
        )
        print(f"  Added Episode 4: {episode4.uuid_}")
        
        # Episode 5: Customer relationships
        print("\n📝 Episode 5: Customer Dependencies")
        customers = """
        RetailDivision serves 1 million customers through CloudPlatform's e-commerce system.
        FinanceDivision manages $500M in assets for 10,000 clients through TradingSystem.
        TechDivision has 100 enterprise clients using CloudPlatform directly.
        
        BigRetailer is RetailDivision's largest customer generating $50M annually.
        InvestmentFirm is FinanceDivision's largest client with $100M under management.
        TechStartup is TechDivision's newest client paying $1M annually for CloudPlatform.
        
        Customer satisfaction depends on CloudPlatform's 99.9% uptime guarantee.
        All customer data is stored in Silicon Valley Campus data centers.
        """
        
        episode5 = self.client.graph.add(
            graph_id=master_id,
            type="text",
            data=customers
        )
        print(f"  Added Episode 5: {episode5.uuid_}")
        
        print("\n⏳ Waiting for all episodes to process (20 seconds)...")
        time.sleep(20)
        
        print("✅ Fragile master graph created with 5 interconnected episodes")
        return master_id
    
    def create_disruptive_episode(self) -> str:
        """Create a small episode that will disrupt many relationships"""
        print("\n" + "=" * 60)
        print("CREATING DISRUPTIVE EPISODE")
        print("=" * 60)
        
        # This small change will cascade through the graph
        disruptive_data = """
        BREAKING NEWS: As of today, John Smith has resigned as CEO of MegaCorp effective immediately.
        Sarah Johnson has been appointed as the new CEO of MegaCorp.
        Sarah Johnson is no longer CTO of TechDivision.
        Alex Chen has been promoted to CTO of TechDivision replacing Sarah Johnson.
        
        MegaCorp is relocating headquarters from Silicon Valley Campus to Austin, Texas.
        The Silicon Valley Campus will be closed by end of year.
        CloudPlatform will be migrated to CloudProvider Inc's Texas datacenter.
        """
        
        print("📝 Disruptive Episode Content:")
        print("-" * 40)
        for line in disruptive_data.strip().split('\n'):
            if line.strip():
                print(f"  • {line.strip()}")
        
        print("\n💥 This episode contains:")
        print("  - 3 leadership changes")
        print("  - 1 headquarters relocation")
        print("  - 1 datacenter migration")
        print("\n⚠️ Expected cascading impacts:")
        print("  - Invalidates CEO/CTO relationships")
        print("  - Affects all 'reporting to' edges")
        print("  - Impacts location-based relationships")
        print("  - Changes infrastructure dependencies")
        print("  - Affects board composition")
        print("  - Modifies shareholding contexts")
        
        return disruptive_data
    
    def analyze_graph_state(self, graph_id: str) -> Dict[str, Any]:
        """Analyze the current state of a graph"""
        entities = []
        edges = []
        
        # Comprehensive search queries
        search_queries = [
            "John Smith Sarah Johnson CEO CTO MegaCorp TechDivision",
            "CloudPlatform Silicon Valley Campus Austin Texas",
            "Alex Chen Michael Brown Emily Davis divisions",
            "revenue employees reporting headquarters",
            "CloudProvider DataAnalytics partnerships board",
            "customers clients TradingSystem InventorySystem"
        ]
        
        try:
            # Search for entities
            for query in search_queries:
                node_results = self.client.graph.search(
                    graph_id=graph_id,
                    query=query,
                    scope="nodes",
                    limit=50
                )
                
                if node_results.nodes:
                    for node in node_results.nodes:
                        node_uuid = node.uuid_ if hasattr(node, 'uuid_') else None
                        if node_uuid and not any(e.get("uuid") == node_uuid for e in entities):
                            entities.append({
                                "uuid": node_uuid,
                                "name": node.name if hasattr(node, 'name') else "Unknown",
                                "type": node.labels[-1] if hasattr(node, 'labels') and node.labels else "Entity"
                            })
            
            # Search for edges
            for query in search_queries:
                edge_results = self.client.graph.search(
                    graph_id=graph_id,
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
                                "invalid_at": edge.invalid_at if hasattr(edge, 'invalid_at') else None
                            })
        
        except Exception as e:
            print(f"⚠️ Error analyzing graph: {e}")
        
        # Count invalidated edges
        invalidated_edges = [e for e in edges if e.get("invalid_at") is not None]
        
        return {
            "graph_id": graph_id,
            "entity_count": len(entities),
            "edge_count": len(edges),
            "invalidated_edge_count": len(invalidated_edges),
            "entities": entities,
            "edges": edges,
            "invalidated_edges": invalidated_edges
        }
    
    def run_cascade_test(self):
        """Run the complete cascade impact test"""
        print("\n" + "=" * 60)
        print("CASCADE IMPACT TEST")
        print("=" * 60)
        
        # Step 1: Create fragile master
        master_id = self.create_fragile_master_graph()
        
        # Analyze master state
        print("\n📊 Analyzing Master Graph State...")
        master_state = self.analyze_graph_state(master_id)
        print(f"  Master: {master_state['entity_count']} entities, {master_state['edge_count']} edges")
        
        # Step 2: Create disruptive episode
        disruptive_data = self.create_disruptive_episode()
        
        # Step 3: Clone master
        print("\n📋 Cloning master graph...")
        copy_id = f"{master_id}_copy"
        result = self.client.graph.clone(
            source_graph_id=master_id,
            target_graph_id=copy_id
        )
        print(f"✅ Created copy: {copy_id}")
        
        # Step 4: Apply disruptive episode to copy
        print("\n💥 Applying disruptive episode to copy...")
        episode = self.client.graph.add(
            graph_id=copy_id,
            type="text",
            data=disruptive_data
        )
        print(f"  Episode UUID: {episode.uuid_}")
        
        # Wait for processing
        print("⏳ Waiting for cascade effects to process (20 seconds)...")
        time.sleep(20)
        
        # Step 5: Analyze copy state
        print("\n📊 Analyzing Copy Graph State...")
        copy_state = self.analyze_graph_state(copy_id)
        print(f"  Copy: {copy_state['entity_count']} entities, {copy_state['edge_count']} edges")
        print(f"  Invalidated edges: {copy_state['invalidated_edge_count']}")
        
        # Step 6: Compare and show impact
        self.show_cascade_impact(master_state, copy_state)
        
        return master_id, copy_id, master_state, copy_state
    
    def show_cascade_impact(self, master_state: Dict, copy_state: Dict):
        """Display the cascading impact analysis"""
        print("\n" + "=" * 60)
        print("CASCADE IMPACT ANALYSIS")
        print("=" * 60)
        
        # Calculate changes
        entity_change = copy_state['entity_count'] - master_state['entity_count']
        edge_change = copy_state['edge_count'] - master_state['edge_count']
        
        print(f"\n📊 QUANTITATIVE IMPACT")
        print("-" * 40)
        print(f"Entities: {master_state['entity_count']} → {copy_state['entity_count']} ({entity_change:+d})")
        print(f"Edges: {master_state['edge_count']} → {copy_state['edge_count']} ({edge_change:+d})")
        print(f"Invalidated Edges: 0 → {copy_state['invalidated_edge_count']}")
        
        # Find new entities
        master_uuids = {e['uuid'] for e in master_state['entities']}
        new_entities = [e for e in copy_state['entities'] if e['uuid'] not in master_uuids]
        
        if new_entities:
            print(f"\n🆕 NEW ENTITIES ({len(new_entities)})")
            print("-" * 40)
            for entity in new_entities[:10]:
                print(f"  • {entity['name']} ({entity['type']})")
        
        # Show invalidated relationships
        if copy_state['invalidated_edges']:
            print(f"\n❌ INVALIDATED RELATIONSHIPS ({len(copy_state['invalidated_edges'])})")
            print("-" * 40)
            
            # Group by type
            by_type = {}
            for edge in copy_state['invalidated_edges']:
                edge_type = edge['type']
                if edge_type not in by_type:
                    by_type[edge_type] = []
                by_type[edge_type].append(edge['fact'])
            
            for edge_type, facts in by_type.items():
                print(f"\n  {edge_type} ({len(facts)} invalidated):")
                for fact in facts[:3]:
                    print(f"    • {fact[:80]}...")
        
        # Find new edges
        master_edge_uuids = {e['uuid'] for e in master_state['edges']}
        new_edges = [e for e in copy_state['edges'] 
                    if e['uuid'] not in master_edge_uuids and not e.get('invalid_at')]
        
        if new_edges:
            print(f"\n✅ NEW RELATIONSHIPS ({len(new_edges)})")
            print("-" * 40)
            for edge in new_edges[:10]:
                fact = edge['fact'][:80] + "..." if len(edge['fact']) > 80 else edge['fact']
                print(f"  • {edge['type']}: {fact}")
        
        # Calculate amplification factor
        print(f"\n📈 AMPLIFICATION METRICS")
        print("-" * 40)
        print(f"Input: ~7 facts in disruptive episode")
        print(f"Output: {copy_state['invalidated_edge_count']} invalidated edges")
        if copy_state['invalidated_edge_count'] > 0:
            amplification = copy_state['invalidated_edge_count'] / 7
            print(f"Amplification Factor: {amplification:.1f}x")
        
        print(f"\n💡 CONCLUSION")
        print("-" * 40)
        print(f"A small episode with leadership and location changes cascaded through")
        print(f"the graph, affecting {copy_state['invalidated_edge_count']} relationships and creating {len(new_entities)} new entities.")
        print(f"This demonstrates how interconnected 'fragile' relationships can")
        print(f"amplify the impact of seemingly minor changes.")

def main():
    """Run the cascade impact demonstration"""
    print("=" * 60)
    print("ZEP CASCADE IMPACT DEMONSTRATION")
    print("=" * 60)
    print("\nThis test will demonstrate how small changes can have")
    print("large cascading effects in interconnected graphs.")
    
    tester = ZepCascadeImpactTester()
    
    # Run the test
    master_id, copy_id, master_state, copy_state = tester.run_cascade_test()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print(f"\n📋 Summary:")
    print(f"  Master Graph: {master_id}")
    print(f"  Copy Graph: {copy_id}")
    print(f"  Entities Created: {master_state['entity_count']}")
    print(f"  Relationships Affected: {copy_state['invalidated_edge_count']}")
    
    return master_id, copy_id

if __name__ == "__main__":
    master_id, copy_id = main()
    print(f"\n✅ Cascade impact test complete!")