"""
Zep and Graphiti Proof of Concept
This script demonstrates:
1. Connecting to Zep using Python SDK
2. Creating a graph and user graph
3. Understanding and implementing Entity/Edge Types
4. Testing with sample data
"""

import os
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message

# Load environment variables
load_dotenv()

class ZepPOC:
    def __init__(self):
        """Initialize Zep client with API key from environment"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Successfully connected to Zep")
    
    def create_graph(self, graph_id=None):
        """Create a general knowledge graph"""
        if not graph_id:
            graph_id = f"poc_graph_{uuid.uuid4().hex[:8]}"
        
        try:
            graph = self.client.graph.create(
                graph_id=graph_id,
                name=f"POC Graph - {datetime.now().strftime('%Y-%m-%d')}",
                description="Proof of concept graph for testing Zep functionality"
            )
            print(f"✅ Created graph: {graph_id}")
            return graph_id
        except Exception as e:
            print(f"❌ Error creating graph: {e}")
            return None
    
    def create_user_graph(self, user_id=None):
        """Create a user and their associated graph"""
        if not user_id:
            user_id = f"poc_user_{uuid.uuid4().hex[:8]}"
        
        try:
            # Create user with proper metadata
            user = self.client.user.add(
                user_id=user_id,
                email=f"{user_id}@example.com",
                first_name="Test",
                last_name="User",
                metadata={
                    "created_at": datetime.now().isoformat(),
                    "poc": True
                }
            )
            print(f"✅ Created user: {user_id}")
            
            # Create a thread for the user
            thread_id = f"thread_{uuid.uuid4().hex[:8]}"
            self.client.thread.create(
                thread_id=thread_id,
                user_id=user_id
            )
            print(f"✅ Created thread: {thread_id}")
            
            return user_id, thread_id
        except Exception as e:
            print(f"❌ Error creating user graph: {e}")
            return None, None
    
    def add_data_to_graph(self, graph_id, data_type="json"):
        """Add sample data to a graph"""
        try:
            if data_type == "json":
                # Sample business data
                json_data = {
                    "company": {
                        "name": "Acme Corporation",
                        "founded": "2020",
                        "employees": [
                            {"name": "Alice Johnson", "role": "CEO", "department": "Executive"},
                            {"name": "Bob Smith", "role": "CTO", "department": "Technology"},
                            {"name": "Carol Davis", "role": "Lead Engineer", "department": "Engineering"}
                        ],
                        "products": ["Product Alpha", "Product Beta", "Product Gamma"]
                    }
                }
                
                self.client.graph.add(
                    graph_id=graph_id,
                    type="json",
                    data=json.dumps(json_data)
                )
                print(f"✅ Added JSON data to graph: {graph_id}")
            
            elif data_type == "text":
                text_data = """
                Acme Corporation is a technology company founded in 2020. 
                The company specializes in AI-powered solutions and has three main products.
                Alice Johnson serves as CEO and leads the strategic vision.
                Bob Smith, the CTO, oversees all technical operations.
                Carol Davis is the Lead Engineer working on Product Alpha.
                """
                
                self.client.graph.add(
                    graph_id=graph_id,
                    type="text",
                    data=text_data
                )
                print(f"✅ Added text data to graph: {graph_id}")
                
        except Exception as e:
            print(f"❌ Error adding data to graph: {e}")
    
    def add_messages_to_user(self, user_id, thread_id):
        """Add conversation messages to a user's thread"""
        try:
            messages = [
                Message(
                    name="Test User",
                    content="I work at Acme Corporation as a software engineer.",
                    role="user"
                ),
                Message(
                    name="Assistant",
                    content="That's great! What projects are you working on at Acme?",
                    role="assistant"
                ),
                Message(
                    name="Test User",
                    content="I'm working on Product Alpha with Carol Davis. It's an AI-powered analytics tool.",
                    role="user"
                ),
                Message(
                    name="Assistant",
                    content="Product Alpha sounds interesting. How is the collaboration with Carol?",
                    role="assistant"
                )
            ]
            
            self.client.thread.add_messages(thread_id, messages=messages)
            print(f"✅ Added messages to thread: {thread_id}")
            
        except Exception as e:
            print(f"❌ Error adding messages: {e}")
    
    def search_graph(self, graph_id, query, scope="edges"):
        """Search the graph for specific information"""
        try:
            results = self.client.graph.search(
                graph_id=graph_id,
                query=query,
                scope=scope,
                limit=5
            )
            
            print(f"\n🔍 Search results for '{query}' (scope: {scope}):")
            
            if scope == "edges" and results.edges:
                for edge in results.edges:
                    print(f"  - {edge.fact if hasattr(edge, 'fact') else edge}")
            elif scope == "nodes" and results.nodes:
                for node in results.nodes:
                    print(f"  - {node.name if hasattr(node, 'name') else node}")
            else:
                print("  No results found")
                
            return results
        except Exception as e:
            print(f"❌ Error searching graph: {e}")
            return None
    
    def get_user_context(self, thread_id):
        """Retrieve user context from thread"""
        try:
            memory = self.client.thread.get_user_context(thread_id=thread_id)
            
            print(f"\n📝 User Context:")
            if memory.context:
                print(memory.context)
            else:
                print("No context available yet")
                
            return memory
        except Exception as e:
            print(f"❌ Error getting user context: {e}")
            return None

def main():
    """Main execution function"""
    print("=" * 60)
    print("ZEP & GRAPHITI PROOF OF CONCEPT")
    print("=" * 60)
    
    # Initialize POC
    poc = ZepPOC()
    
    # Step 1: Create a general graph
    print("\n📊 Step 1: Creating General Graph")
    print("-" * 40)
    graph_id = poc.create_graph()
    
    # Step 2: Create a user graph
    print("\n👤 Step 2: Creating User Graph")
    print("-" * 40)
    user_id, thread_id = poc.create_user_graph()
    
    # Step 3: Add data to the general graph
    if graph_id:
        print("\n📥 Step 3: Adding Data to General Graph")
        print("-" * 40)
        poc.add_data_to_graph(graph_id, "json")
        poc.add_data_to_graph(graph_id, "text")
    
    # Step 4: Add messages to user thread
    if user_id and thread_id:
        print("\n💬 Step 4: Adding Messages to User Thread")
        print("-" * 40)
        poc.add_messages_to_user(user_id, thread_id)
    
    # Step 5: Search the graph
    if graph_id:
        print("\n🔎 Step 5: Searching the Graph")
        print("-" * 40)
        poc.search_graph(graph_id, "Who is the CEO?", "edges")
        poc.search_graph(graph_id, "Product Alpha", "nodes")
    
    # Step 6: Get user context
    if thread_id:
        print("\n🧠 Step 6: Retrieving User Context")
        print("-" * 40)
        poc.get_user_context(thread_id)
    
    print("\n" + "=" * 60)
    print("POC COMPLETE")
    print("=" * 60)
    
    return {
        "graph_id": graph_id,
        "user_id": user_id,
        "thread_id": thread_id
    }

if __name__ == "__main__":
    results = main()
    print("\n📋 Summary:")
    print(f"  Graph ID: {results.get('graph_id')}")
    print(f"  User ID: {results.get('user_id')}")
    print(f"  Thread ID: {results.get('thread_id')}")