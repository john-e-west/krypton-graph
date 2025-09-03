"""
Comprehensive Zep POC Test with Data Verification
This script tests all aspects of Zep with proper wait times for processing
"""

import os
import uuid
import json
import time
from datetime import datetime
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message
from zep_cloud.external_clients.ontology import EntityModel, EdgeModel, EntityText, EntityBoolean, EntityFloat, EntityInt
from zep_cloud import EntityEdgeSourceTarget
from pydantic import Field

# Load environment variables
load_dotenv()

# Custom Entity Types
class TechnologyCompany(EntityModel):
    """Represents a technology company."""
    industry_sector: EntityText = Field(description="Tech sector: AI, SaaS, etc.", default=None)
    founding_year: EntityInt = Field(description="Year founded", default=None)

class Developer(EntityModel):
    """Represents a software developer."""
    primary_language: EntityText = Field(description="Primary programming language", default=None)
    years_experience: EntityInt = Field(description="Years of experience", default=None)

# Custom Edge Types
class EmployedBy(EdgeModel):
    """Employment relationship."""
    position: EntityText = Field(description="Job title", default=None)
    department: EntityText = Field(description="Department", default=None)

def test_zep_functionality():
    """Test all Zep functionality"""
    print("=" * 60)
    print("COMPREHENSIVE ZEP FUNCTIONALITY TEST")
    print("=" * 60)
    
    # Initialize client
    api_key = os.getenv('ZEP_API_KEY')
    if not api_key or api_key == 'your_zep_api_key_here':
        raise ValueError("Please set your ZEP_API_KEY in the .env file")
    
    client = Zep(api_key=api_key)
    print("✅ Connected to Zep")
    
    # Test 1: Create and populate a general graph
    print("\n📊 TEST 1: General Graph with Custom Types")
    print("-" * 40)
    
    graph_id = f"test_graph_{uuid.uuid4().hex[:8]}"
    graph = client.graph.create(
        graph_id=graph_id,
        name="Test Tech Graph",
        description="Testing custom entity and edge types"
    )
    print(f"✅ Created graph: {graph_id}")
    
    # Set custom types for the graph
    entities = {
        "TechnologyCompany": TechnologyCompany,
        "Developer": Developer
    }
    
    edges = {
        "EMPLOYED_BY": (
            EmployedBy,
            [EntityEdgeSourceTarget(source="Developer", target="TechnologyCompany")]
        )
    }
    
    client.graph.set_ontology(
        graph_ids=[graph_id],
        entities=entities,
        edges=edges
    )
    print("✅ Set custom ontology for graph")
    
    # Add data to graph
    tech_data = {
        "company": "InnovateTech",
        "type": "Technology Company",
        "sector": "Artificial Intelligence",
        "founded": 2021,
        "developers": [
            {"name": "John Smith", "language": "Python", "experience": 7},
            {"name": "Jane Doe", "language": "JavaScript", "experience": 5}
        ]
    }
    
    client.graph.add(
        graph_id=graph_id,
        type="json",
        data=json.dumps(tech_data)
    )
    
    # Add relationship data
    relationships = """
    John Smith is employed by InnovateTech as Senior Developer in the AI department.
    Jane Doe is employed by InnovateTech as Frontend Developer in the Product department.
    InnovateTech is a technology company specializing in AI, founded in 2021.
    """
    
    client.graph.add(
        graph_id=graph_id,
        type="text",
        data=relationships
    )
    print("✅ Added data to graph")
    
    # Test 2: Create and populate a user graph
    print("\n👤 TEST 2: User Graph with Conversations")
    print("-" * 40)
    
    user_id = f"test_user_{uuid.uuid4().hex[:8]}"
    user = client.user.add(
        user_id=user_id,
        email=f"{user_id}@test.com",
        first_name="Alice",
        last_name="Johnson"
    )
    print(f"✅ Created user: {user_id}")
    
    thread_id = f"thread_{uuid.uuid4().hex[:8]}"
    client.thread.create(thread_id=thread_id, user_id=user_id)
    print(f"✅ Created thread: {thread_id}")
    
    # Add conversation
    messages = [
        Message(
            name="Alice Johnson",
            content="I prefer Python over Java for machine learning projects.",
            role="user"
        ),
        Message(
            name="Assistant",
            content="Python is indeed popular for ML. What frameworks do you use?",
            role="assistant"
        ),
        Message(
            name="Alice Johnson",
            content="I mainly use TensorFlow and PyTorch. I work at DataCorp as a ML Engineer.",
            role="user"
        ),
        Message(
            name="Assistant",
            content="Both are excellent frameworks. How long have you been at DataCorp?",
            role="assistant"
        ),
        Message(
            name="Alice Johnson",
            content="I've been there for 3 years now, working on computer vision projects.",
            role="user"
        )
    ]
    
    client.thread.add_messages(thread_id, messages=messages)
    print("✅ Added conversation messages")
    
    # Wait for processing
    print("\n⏳ Waiting for data processing (10 seconds)...")
    time.sleep(10)
    
    # Test 3: Search and verify data
    print("\n🔍 TEST 3: Search and Verification")
    print("-" * 40)
    
    # Search general graph
    try:
        results = client.graph.search(
            graph_id=graph_id,
            query="technology companies and developers",
            scope="edges",
            limit=10
        )
        
        print(f"\nGeneral Graph - Found {len(results.edges) if results.edges else 0} edges")
        if results.edges:
            for edge in results.edges[:3]:
                print(f"  • {edge.fact if hasattr(edge, 'fact') else edge}")
    except Exception as e:
        print(f"  Error searching graph: {e}")
    
    # Get user context
    try:
        memory = client.thread.get_user_context(thread_id=thread_id)
        print(f"\nUser Graph Context:")
        if memory.context:
            lines = memory.context.split('\n')[:5]  # Show first 5 lines
            for line in lines:
                if line.strip():
                    print(f"  • {line.strip()}")
    except Exception as e:
        print(f"  Error getting context: {e}")
    
    # Search user graph for preferences
    try:
        results = client.graph.search(
            user_id=user_id,
            query="programming preferences",
            scope="nodes",
            search_filters={"node_labels": ["Preference"]},
            limit=5
        )
        
        print(f"\nUser Preferences - Found {len(results.nodes) if results.nodes else 0} nodes")
        if results.nodes:
            for node in results.nodes:
                print(f"  • {node.name}")
    except Exception as e:
        print(f"  Error searching user graph: {e}")
    
    # Test 4: Demonstrate difference between graph types
    print("\n📝 TEST 4: Key Differences")
    print("-" * 40)
    print("1. General graphs: No default types, must set custom ontology")
    print("2. User graphs: Have default types (User, Preference, Organization, etc.)")
    print("3. Custom types: Can override defaults for specific graphs/users")
    print("4. Processing: Data needs time to be processed into the graph")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    
    return {
        "graph_id": graph_id,
        "user_id": user_id,
        "thread_id": thread_id
    }

if __name__ == "__main__":
    results = test_zep_functionality()
    print("\n📋 Created Resources:")
    for key, value in results.items():
        print(f"  {key}: {value}")