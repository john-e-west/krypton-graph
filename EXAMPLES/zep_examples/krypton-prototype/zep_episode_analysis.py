"""
Zep Episode Analysis POC
This script:
a) Uploads sample data to user_id and graph_id
b) Waits for episode processing
c) Queries all episodes related to the uploaded data
d) Presents all entities, edges and their types for each episode
"""

import os
import uuid
import json
import time
from datetime import datetime
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message
from typing import Dict, List, Any

# Load environment variables
load_dotenv()

class ZepEpisodeAnalyzer:
    def __init__(self):
        """Initialize Zep client"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Connected to Zep")
        
        # Store created IDs for tracking
        self.graph_id = None
        self.user_id = None
        self.thread_id = None
    
    def load_sample_data(self) -> Dict[str, Any]:
        """Load sample data files"""
        print("\n📂 Loading sample data files...")
        
        # Load JSON data
        with open('sample_company_data.json', 'r') as f:
            company_data = json.load(f)
        
        # Load conversation text
        with open('sample_conversation.txt', 'r') as f:
            conversation_text = f.read()
        
        print("✅ Loaded sample_company_data.json")
        print("✅ Loaded sample_conversation.txt")
        
        return {
            "company_data": company_data,
            "conversation_text": conversation_text
        }
    
    def create_and_populate_graph(self, company_data: Dict) -> str:
        """Create a graph and upload company data"""
        print("\n📊 Creating and populating general graph...")
        
        # Create graph
        self.graph_id = f"company_graph_{uuid.uuid4().hex[:8]}"
        graph = self.client.graph.create(
            graph_id=self.graph_id,
            name="NeuralTech Industries Knowledge Graph",
            description="Company information and structure data"
        )
        print(f"✅ Created graph: {self.graph_id}")
        
        # Upload JSON data
        self.client.graph.add(
            graph_id=self.graph_id,
            type="json",
            data=json.dumps(company_data)
        )
        print("✅ Uploaded company JSON data to graph")
        
        # Also add as text for better relationship extraction
        company_text = f"""
        NeuralTech Industries was founded in 2019 with headquarters in San Francisco.
        Sarah Chen serves as CEO since 2019, previously at Google AI Research.
        Michael Rodriguez is the CTO since 2020, formerly at Microsoft Azure ML.
        Emily Watson joined as VP of Engineering in 2021 from OpenAI.
        
        The company has three main products:
        - VisionAI Pro: Computer Vision Platform with 150 customers and $12M ARR
        - NLP Studio: Natural Language Processing Suite with 85 customers and $8M ARR  
        - AutoML Enterprise: Automated Machine Learning with 45 customers and $5M ARR
        
        Engineering teams include Core ML (35 people, led by David Kim),
        Platform Engineering (28 people, led by Lisa Zhang),
        and Applied AI (42 people, led by James Thompson).
        """
        
        self.client.graph.add(
            graph_id=self.graph_id,
            type="text",
            data=company_text
        )
        print("✅ Uploaded company text summary to graph")
        
        return self.graph_id
    
    def create_and_populate_user(self, conversation_text: str) -> tuple:
        """Create a user and upload conversation data"""
        print("\n👤 Creating and populating user graph...")
        
        # Create user
        self.user_id = f"robert_chen_{uuid.uuid4().hex[:8]}"
        user = self.client.user.add(
            user_id=self.user_id,
            email="robert.chen@neuraltech.com",
            first_name="Robert",
            last_name="Chen"
        )
        print(f"✅ Created user: {self.user_id}")
        
        # Create thread
        self.thread_id = f"review_thread_{uuid.uuid4().hex[:8]}"
        self.client.thread.create(
            thread_id=self.thread_id,
            user_id=self.user_id
        )
        print(f"✅ Created thread: {self.thread_id}")
        
        # Parse conversation into messages
        messages = []
        lines = conversation_text.split('\n')
        current_speaker = None
        current_content = []
        
        for line in lines:
            if line.startswith('Robert:'):
                if current_speaker and current_content:
                    messages.append(Message(
                        name=current_speaker,
                        content=' '.join(current_content),
                        role="user" if current_speaker == "Robert Chen" else "assistant"
                    ))
                current_speaker = "Robert Chen"
                current_content = [line.replace('Robert:', '').strip()]
            elif line.startswith('Manager:'):
                if current_speaker and current_content:
                    messages.append(Message(
                        name=current_speaker,
                        content=' '.join(current_content),
                        role="user" if current_speaker == "Robert Chen" else "assistant"
                    ))
                current_speaker = "Manager"
                current_content = [line.replace('Manager:', '').strip()]
            elif line.strip() and current_content:
                current_content.append(line.strip())
        
        # Add last message
        if current_speaker and current_content:
            messages.append(Message(
                name=current_speaker,
                content=' '.join(current_content),
                role="user" if current_speaker == "Robert Chen" else "assistant"
            ))
        
        # Upload messages
        if messages:
            self.client.thread.add_messages(self.thread_id, messages=messages)
            print(f"✅ Uploaded {len(messages)} conversation messages to thread")
        
        return self.user_id, self.thread_id
    
    def wait_for_processing(self, wait_time: int = 30):
        """Wait for episodes to be processed"""
        print(f"\n⏳ Waiting {wait_time} seconds for episode processing...")
        for i in range(wait_time, 0, -5):
            print(f"   {i} seconds remaining...")
            time.sleep(5)
        print("✅ Processing wait complete")
    
    def query_graph_episodes(self) -> Dict:
        """Query and analyze episodes from the graph"""
        print(f"\n🔍 Querying episodes for graph: {self.graph_id}")
        results = {
            "graph_id": self.graph_id,
            "episodes": [],
            "entities": [],
            "edges": []
        }
        
        try:
            # Search for all nodes in the graph
            node_results = self.client.graph.search(
                graph_id=self.graph_id,
                query="all entities and information",
                scope="nodes",
                limit=50
            )
            
            if node_results.nodes:
                print(f"📊 Found {len(node_results.nodes)} entities in graph")
                for node in node_results.nodes:
                    entity_info = {
                        "name": node.name if hasattr(node, 'name') else "Unknown",
                        "type": node.labels[-1] if hasattr(node, 'labels') and node.labels else "Entity",
                        "labels": node.labels if hasattr(node, 'labels') else [],
                        "summary": node.summary if hasattr(node, 'summary') else None
                    }
                    results["entities"].append(entity_info)
                    print(f"  • Entity: {entity_info['name']} (Type: {entity_info['type']})")
            
            # Search for all edges in the graph
            edge_results = self.client.graph.search(
                graph_id=self.graph_id,
                query="all relationships and connections",
                scope="edges",
                limit=50
            )
            
            if edge_results.edges:
                print(f"🔗 Found {len(edge_results.edges)} relationships in graph")
                for edge in edge_results.edges:
                    edge_info = {
                        "fact": edge.fact if hasattr(edge, 'fact') else "Unknown",
                        "type": edge.name if hasattr(edge, 'name') else "RELATES_TO",
                        "valid_at": edge.valid_at if hasattr(edge, 'valid_at') else None,
                        "invalid_at": edge.invalid_at if hasattr(edge, 'invalid_at') else None
                    }
                    results["edges"].append(edge_info)
                    print(f"  • Edge: {edge_info['type']} - {edge_info['fact'][:80]}...")
            
            # Try to get episode information
            # Note: Direct episode queries may require different API endpoints
            episode_results = self.client.graph.search(
                graph_id=self.graph_id,
                query="data sources and episodes",
                scope="episodes",
                limit=10
            )
            
            if hasattr(episode_results, 'episodes') and episode_results.episodes:
                print(f"📝 Found {len(episode_results.episodes)} episodes")
                for ep in episode_results.episodes:
                    episode_info = {
                        "id": ep.uuid if hasattr(ep, 'uuid') else None,
                        "name": ep.name if hasattr(ep, 'name') else "Unknown",
                        "created_at": ep.created_at if hasattr(ep, 'created_at') else None
                    }
                    results["episodes"].append(episode_info)
            
        except Exception as e:
            print(f"⚠️ Error querying graph: {e}")
        
        return results
    
    def query_user_episodes(self) -> Dict:
        """Query and analyze episodes from the user graph"""
        print(f"\n🔍 Querying episodes for user: {self.user_id}")
        results = {
            "user_id": self.user_id,
            "thread_id": self.thread_id,
            "context": None,
            "entities": [],
            "edges": []
        }
        
        try:
            # Get user context
            memory = self.client.thread.get_user_context(thread_id=self.thread_id)
            if memory.context:
                results["context"] = memory.context
                print("📝 Retrieved user context")
                print("Context preview:")
                for line in memory.context.split('\n')[:5]:
                    if line.strip():
                        print(f"  {line.strip()}")
            
            # Search for entities in user graph
            node_results = self.client.graph.search(
                user_id=self.user_id,
                query="all people, companies, projects, and preferences",
                scope="nodes",
                limit=50
            )
            
            if node_results.nodes:
                print(f"📊 Found {len(node_results.nodes)} entities in user graph")
                for node in node_results.nodes:
                    entity_info = {
                        "name": node.name if hasattr(node, 'name') else "Unknown",
                        "type": node.labels[-1] if hasattr(node, 'labels') and node.labels else "Entity",
                        "labels": node.labels if hasattr(node, 'labels') else [],
                        "attributes": node.attributes if hasattr(node, 'attributes') else {}
                    }
                    results["entities"].append(entity_info)
                    
                    # Categorize by type
                    entity_type = entity_info['type']
                    print(f"  • {entity_type}: {entity_info['name']}")
            
            # Search for relationships in user graph
            edge_results = self.client.graph.search(
                user_id=self.user_id,
                query="all relationships, employment, and interactions",
                scope="edges",
                limit=50
            )
            
            if edge_results.edges:
                print(f"🔗 Found {len(edge_results.edges)} relationships in user graph")
                for edge in edge_results.edges:
                    edge_info = {
                        "fact": edge.fact if hasattr(edge, 'fact') else "Unknown",
                        "type": edge.name if hasattr(edge, 'name') else "RELATES_TO",
                        "valid_at": edge.valid_at if hasattr(edge, 'valid_at') else None,
                        "invalid_at": edge.invalid_at if hasattr(edge, 'invalid_at') else None
                    }
                    results["edges"].append(edge_info)
                    
                    # Group by type
                    edge_type = edge_info['type']
                    print(f"  • {edge_type}: {edge_info['fact'][:80]}...")
            
            # Try to get episode information
            episode_results = self.client.graph.search(
                user_id=self.user_id,
                query="conversation messages and episodes",
                scope="episodes",
                limit=10
            )
            
            if hasattr(episode_results, 'episodes') and episode_results.episodes:
                print(f"📝 Found {len(episode_results.episodes)} episodes")
                results["episodes"] = episode_results.episodes
            
        except Exception as e:
            print(f"⚠️ Error querying user graph: {e}")
        
        return results
    
    def generate_report(self, graph_results: Dict, user_results: Dict):
        """Generate comprehensive analysis report"""
        print("\n" + "=" * 60)
        print("EPISODE ANALYSIS REPORT")
        print("=" * 60)
        
        # Graph Analysis
        print(f"\n📊 GRAPH ANALYSIS ({graph_results['graph_id']})")
        print("-" * 40)
        
        print(f"\nEntities Summary:")
        entity_types = {}
        for entity in graph_results['entities']:
            etype = entity['type']
            if etype not in entity_types:
                entity_types[etype] = []
            entity_types[etype].append(entity['name'])
        
        for etype, names in entity_types.items():
            print(f"\n{etype} ({len(names)} found):")
            for name in names[:5]:  # Show first 5
                print(f"  • {name}")
            if len(names) > 5:
                print(f"  ... and {len(names) - 5} more")
        
        print(f"\nRelationships Summary:")
        edge_types = {}
        for edge in graph_results['edges']:
            etype = edge['type']
            if etype not in edge_types:
                edge_types[etype] = []
            edge_types[etype].append(edge['fact'])
        
        for etype, facts in edge_types.items():
            print(f"\n{etype} ({len(facts)} found):")
            for fact in facts[:3]:  # Show first 3
                print(f"  • {fact[:100]}...")
            if len(facts) > 3:
                print(f"  ... and {len(facts) - 3} more")
        
        # User Analysis
        print(f"\n\n👤 USER ANALYSIS ({user_results['user_id']})")
        print("-" * 40)
        
        print(f"\nEntities Summary:")
        user_entity_types = {}
        for entity in user_results['entities']:
            etype = entity['type']
            if etype not in user_entity_types:
                user_entity_types[etype] = []
            user_entity_types[etype].append(entity['name'])
        
        for etype, names in user_entity_types.items():
            print(f"\n{etype} ({len(names)} found):")
            for name in names[:5]:
                print(f"  • {name}")
            if len(names) > 5:
                print(f"  ... and {len(names) - 5} more")
        
        print(f"\nRelationships Summary:")
        user_edge_types = {}
        for edge in user_results['edges']:
            etype = edge['type']
            if etype not in user_edge_types:
                user_edge_types[etype] = []
            user_edge_types[etype].append(edge['fact'])
        
        for etype, facts in user_edge_types.items():
            print(f"\n{etype} ({len(facts)} found):")
            for fact in facts[:3]:
                print(f"  • {fact[:100]}...")
            if len(facts) > 3:
                print(f"  ... and {len(facts) - 3} more")
        
        # Summary Statistics
        print("\n\n📈 SUMMARY STATISTICS")
        print("-" * 40)
        print(f"Graph Entities: {len(graph_results['entities'])}")
        print(f"Graph Relationships: {len(graph_results['edges'])}")
        print(f"User Entities: {len(user_results['entities'])}")
        print(f"User Relationships: {len(user_results['edges'])}")
        print(f"\nTotal Unique Entity Types: {len(set(list(entity_types.keys()) + list(user_entity_types.keys())))}")
        print(f"Total Unique Edge Types: {len(set(list(edge_types.keys()) + list(user_edge_types.keys())))}")

def main():
    """Main execution function"""
    print("=" * 60)
    print("ZEP EPISODE ANALYSIS POC")
    print("=" * 60)
    
    analyzer = ZepEpisodeAnalyzer()
    
    # Step A: Load and upload sample data
    print("\n📤 STEP A: Upload Sample Data")
    print("-" * 40)
    data = analyzer.load_sample_data()
    
    graph_id = analyzer.create_and_populate_graph(data["company_data"])
    user_id, thread_id = analyzer.create_and_populate_user(data["conversation_text"])
    
    # Step B: Wait for processing
    print("\n⏱️ STEP B: Wait for Episode Processing")
    print("-" * 40)
    analyzer.wait_for_processing(30)
    
    # Step C: Query episodes
    print("\n🔎 STEP C: Query Episodes")
    print("-" * 40)
    graph_results = analyzer.query_graph_episodes()
    user_results = analyzer.query_user_episodes()
    
    # Step D: Present analysis
    print("\n📊 STEP D: Present Entity/Edge Analysis")
    print("-" * 40)
    analyzer.generate_report(graph_results, user_results)
    
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    
    return {
        "graph_id": graph_id,
        "user_id": user_id, 
        "thread_id": thread_id,
        "graph_entities": len(graph_results['entities']),
        "graph_edges": len(graph_results['edges']),
        "user_entities": len(user_results['entities']),
        "user_edges": len(user_results['edges'])
    }

if __name__ == "__main__":
    results = main()
    print("\n📋 Final Summary:")
    for key, value in results.items():
        print(f"  {key}: {value}")