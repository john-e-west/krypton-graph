"""
Zep Entity and Edge Types Research POC
This script demonstrates:
1. Understanding default Entity/Edge Types
2. Creating custom Entity/Edge Types
3. Applying types to graphs and user graphs
4. Testing the differences between graph_id and user_id type handling
"""

import os
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message
from zep_cloud.external_clients.ontology import EntityModel, EdgeModel, EntityText, EntityBoolean, EntityFloat, EntityInt
from zep_cloud import EntityEdgeSourceTarget
from pydantic import Field

# Load environment variables
load_dotenv()

# ============================================
# CUSTOM ENTITY AND EDGE TYPE DEFINITIONS
# ============================================

class TechnologyCompany(EntityModel):
    """
    Represents a technology company with specific attributes.
    """
    industry_sector: EntityText = Field(
        description="Specific tech sector: AI, SaaS, Hardware, Cybersecurity, etc.", 
        default=None
    )
    founding_year: EntityInt = Field(
        description="Year the company was founded", 
        default=None
    )
    is_public: EntityBoolean = Field(
        description="Whether the company is publicly traded", 
        default=None
    )

class Developer(EntityModel):
    """
    Represents a software developer with technical expertise.
    """
    primary_language: EntityText = Field(
        description="Primary programming language: Python, JavaScript, Java, etc.", 
        default=None
    )
    years_experience: EntityInt = Field(
        description="Years of professional development experience", 
        default=None
    )
    specialization: EntityText = Field(
        description="Area of specialization: Frontend, Backend, Full-stack, DevOps, ML, etc.", 
        default=None
    )

class Project(EntityModel):
    """
    Represents a software project or product.
    """
    project_type: EntityText = Field(
        description="Type of project: Web App, Mobile App, API, Library, Framework, etc.", 
        default=None
    )
    tech_stack: EntityText = Field(
        description="Primary technologies used in the project", 
        default=None
    )
    status: EntityText = Field(
        description="Current status: Planning, Development, Testing, Production, Deprecated", 
        default=None
    )

class WorksOn(EdgeModel):
    """
    Represents the relationship between a developer and a project they work on.
    """
    role: EntityText = Field(
        description="Role in the project: Lead Developer, Contributor, Architect, Reviewer", 
        default=None
    )
    start_date: EntityText = Field(
        description="When the developer started working on the project", 
        default=None
    )
    contribution_level: EntityText = Field(
        description="Level of contribution: Primary, Secondary, Minor", 
        default=None
    )

class EmployedBy(EdgeModel):
    """
    Represents employment relationship between a developer and a company.
    """
    position: EntityText = Field(
        description="Job title or position at the company", 
        default=None
    )
    department: EntityText = Field(
        description="Department within the company: Engineering, R&D, Product, etc.", 
        default=None
    )
    employment_type: EntityText = Field(
        description="Type of employment: Full-time, Part-time, Contract, Intern", 
        default=None
    )

class Develops(EdgeModel):
    """
    Represents that a company develops/owns a project.
    """
    project_priority: EntityText = Field(
        description="Priority level of the project: High, Medium, Low", 
        default=None
    )
    investment_amount: EntityFloat = Field(
        description="Investment amount in the project in USD", 
        default=None
    )

# ============================================
# ZEP POC CLASS WITH ENTITY/EDGE TYPES
# ============================================

class ZepEntityTypePOC:
    def __init__(self):
        """Initialize Zep client with API key from environment"""
        api_key = os.getenv('ZEP_API_KEY')
        if not api_key or api_key == 'your_zep_api_key_here':
            raise ValueError("Please set your ZEP_API_KEY in the .env file")
        
        self.client = Zep(api_key=api_key)
        print("✅ Successfully connected to Zep")
    
    def explore_default_types(self):
        """Research and document default Entity and Edge Types"""
        print("\n" + "=" * 60)
        print("DEFAULT ENTITY AND EDGE TYPES IN ZEP")
        print("=" * 60)
        
        print("\n📚 Default Entity Types (applied to user graphs):")
        default_entities = [
            "User - A human that is part of the current chat thread",
            "Assistant - The AI assistant in the conversation", 
            "Preference - A user's expressed like, dislike, or preference",
            "Location - A physical or virtual place",
            "Event - A time-bound activity or occurrence",
            "Object - A physical item, tool, device, or possession",
            "Topic - A subject of conversation or interest",
            "Organization - A company, institution, or group",
            "Document - Information content in various forms"
        ]
        for entity in default_entities:
            print(f"  • {entity}")
        
        print("\n🔗 Default Edge Types (relationships):")
        default_edges = [
            "LocatedAt - Entity exists at a specific location",
            "OccurredAt - Event happened at a specific time/location",
            "ParticipatedIn - User took part in an event",
            "Owns - Ownership or possession of an object",
            "Uses - Usage or interaction with an object",
            "WorksFor - Employment relationship with organization",
            "Discusses - User talks about or is interested in a topic",
            "RelatesTo - General conceptual relationship"
        ]
        for edge in default_edges:
            print(f"  • {edge}")
        
        print("\n💡 Key Insight:")
        print("  User graphs automatically use these default types to classify")
        print("  entities and relationships extracted from conversations.")
        print("  General graphs don't use types by default unless custom types are set.")
    
    def set_custom_types_for_graph(self, graph_id=None):
        """Set custom entity and edge types for a specific graph"""
        try:
            print("\n🎯 Setting custom types for graph...")
            
            # Define the ontology
            entities = {
                "TechnologyCompany": TechnologyCompany,
                "Developer": Developer,
                "Project": Project
            }
            
            edges = {
                "WORKS_ON": (
                    WorksOn,
                    [EntityEdgeSourceTarget(source="Developer", target="Project")]
                ),
                "EMPLOYED_BY": (
                    EmployedBy,
                    [EntityEdgeSourceTarget(source="Developer", target="TechnologyCompany")]
                ),
                "DEVELOPS": (
                    Develops,
                    [EntityEdgeSourceTarget(source="TechnologyCompany", target="Project")]
                )
            }
            
            # Set ontology for specific graph if provided, otherwise project-wide
            if graph_id:
                self.client.graph.set_ontology(
                    graph_ids=[graph_id],
                    entities=entities,
                    edges=edges
                )
                print(f"✅ Custom types set for graph: {graph_id}")
            else:
                self.client.graph.set_ontology(
                    entities=entities,
                    edges=edges
                )
                print("✅ Custom types set project-wide")
                
            return True
        except Exception as e:
            print(f"❌ Error setting custom types: {e}")
            return False
    
    def set_custom_types_for_user(self, user_id):
        """Set custom entity and edge types for a specific user"""
        try:
            print("\n🎯 Setting custom types for user graph...")
            
            # Define the ontology (can be same or different from graph ontology)
            entities = {
                "TechnologyCompany": TechnologyCompany,
                "Developer": Developer,
                "Project": Project
            }
            
            edges = {
                "WORKS_ON": (
                    WorksOn,
                    [EntityEdgeSourceTarget(source="User", target="Project"),
                     EntityEdgeSourceTarget(source="Developer", target="Project")]
                ),
                "EMPLOYED_BY": (
                    EmployedBy,
                    [EntityEdgeSourceTarget(source="User", target="TechnologyCompany"),
                     EntityEdgeSourceTarget(source="Developer", target="TechnologyCompany")]
                ),
                "DEVELOPS": (
                    Develops,
                    [EntityEdgeSourceTarget(source="TechnologyCompany", target="Project")]
                )
            }
            
            self.client.graph.set_ontology(
                user_ids=[user_id],
                entities=entities,
                edges=edges
            )
            print(f"✅ Custom types set for user: {user_id}")
            return True
        except Exception as e:
            print(f"❌ Error setting custom types for user: {e}")
            return False
    
    def create_and_populate_graph_with_types(self):
        """Create a graph and add typed data"""
        print("\n" + "=" * 60)
        print("TESTING CUSTOM TYPES WITH GENERAL GRAPH")
        print("=" * 60)
        
        # Create graph
        graph_id = f"tech_graph_{uuid.uuid4().hex[:8]}"
        try:
            graph = self.client.graph.create(
                graph_id=graph_id,
                name="Technology Companies Graph",
                description="Graph with custom entity and edge types for tech domain"
            )
            print(f"✅ Created graph: {graph_id}")
        except Exception as e:
            print(f"❌ Error creating graph: {e}")
            return None
        
        # Set custom types for this graph
        if not self.set_custom_types_for_graph(graph_id):
            return None
        
        # Add JSON data that should trigger custom types
        tech_data = {
            "companies": [
                {
                    "name": "TechVentures Inc",
                    "type": "Technology Company",
                    "industry": "AI and Machine Learning",
                    "founded": 2020,
                    "public": False,
                    "developers": [
                        {
                            "name": "Alex Chen",
                            "role": "Senior Developer",
                            "language": "Python",
                            "experience": 8,
                            "specialization": "Machine Learning"
                        },
                        {
                            "name": "Maria Garcia",
                            "role": "Lead Developer", 
                            "language": "JavaScript",
                            "experience": 10,
                            "specialization": "Full-stack"
                        }
                    ],
                    "projects": [
                        {
                            "name": "AI Assistant Platform",
                            "type": "Web Application",
                            "stack": "Python, React, PostgreSQL",
                            "status": "Production"
                        },
                        {
                            "name": "Data Pipeline Framework",
                            "type": "Library",
                            "stack": "Python, Apache Spark",
                            "status": "Development"
                        }
                    ]
                }
            ],
            "relationships": [
                "Alex Chen works on AI Assistant Platform as Lead Developer since January 2023",
                "Maria Garcia works on Data Pipeline Framework as Architect",
                "TechVentures Inc develops both projects with high priority",
                "Alex Chen is employed by TechVentures Inc as Senior ML Engineer in the R&D department",
                "Maria Garcia is employed by TechVentures Inc as Lead Full-stack Developer"
            ]
        }
        
        try:
            # Add as JSON
            self.client.graph.add(
                graph_id=graph_id,
                type="json",
                data=json.dumps(tech_data)
            )
            print("✅ Added JSON data with tech entities")
            
            # Also add as text to ensure relationships are captured
            text_data = "\n".join(tech_data["relationships"])
            self.client.graph.add(
                graph_id=graph_id,
                type="text",
                data=text_data
            )
            print("✅ Added relationship text data")
            
        except Exception as e:
            print(f"❌ Error adding data: {e}")
        
        return graph_id
    
    def create_and_populate_user_with_types(self):
        """Create a user and add typed conversation data"""
        print("\n" + "=" * 60)
        print("TESTING CUSTOM TYPES WITH USER GRAPH")
        print("=" * 60)
        
        # Create user
        user_id = f"dev_user_{uuid.uuid4().hex[:8]}"
        thread_id = f"thread_{uuid.uuid4().hex[:8]}"
        
        try:
            user = self.client.user.add(
                user_id=user_id,
                email=f"{user_id}@techcorp.com",
                first_name="Sam",
                last_name="Developer"
            )
            print(f"✅ Created user: {user_id}")
            
            self.client.thread.create(
                thread_id=thread_id,
                user_id=user_id
            )
            print(f"✅ Created thread: {thread_id}")
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            return None, None
        
        # Set custom types for this user
        if not self.set_custom_types_for_user(user_id):
            return user_id, thread_id
        
        # Add conversation that should trigger custom types
        messages = [
            Message(
                name="Sam Developer",
                content="I'm a Python developer with 5 years of experience, specializing in backend development.",
                role="user"
            ),
            Message(
                name="Assistant",
                content="Great! What projects are you currently working on?",
                role="assistant"
            ),
            Message(
                name="Sam Developer",
                content="I work at CloudTech Solutions, a SaaS company founded in 2019. I'm the lead developer on our API Gateway project, which is a microservices framework built with Python and FastAPI. It's currently in production.",
                role="user"
            ),
            Message(
                name="Assistant",
                content="That sounds interesting! How long have you been working on the API Gateway?",
                role="assistant"
            ),
            Message(
                name="Sam Developer",
                content="I've been working on it since March 2023 as the primary contributor. CloudTech develops this as a high-priority project with over $500K invested in it.",
                role="user"
            )
        ]
        
        try:
            self.client.thread.add_messages(thread_id, messages=messages)
            print("✅ Added conversation with tech-specific content")
        except Exception as e:
            print(f"❌ Error adding messages: {e}")
        
        return user_id, thread_id
    
    def search_and_verify_types(self, graph_id=None, user_id=None):
        """Search graphs and verify entity/edge types are applied"""
        print("\n" + "=" * 60)
        print("VERIFYING ENTITY AND EDGE TYPES")
        print("=" * 60)
        
        if graph_id:
            print(f"\n🔍 Searching graph {graph_id} for typed entities...")
            
            # Search for Developer entities
            try:
                results = self.client.graph.search(
                    graph_id=graph_id,
                    query="developers working on projects",
                    scope="nodes",
                    search_filters={"node_labels": ["Developer"]},
                    limit=5
                )
                
                print("\n📊 Developer Entities Found:")
                if results.nodes:
                    for node in results.nodes:
                        print(f"  Name: {node.name}")
                        print(f"  Labels: {node.labels if hasattr(node, 'labels') else 'N/A'}")
                        if hasattr(node, 'attributes') and node.attributes:
                            attrs = node.attributes
                            print(f"  Primary Language: {attrs.get('primary_language', 'N/A')}")
                            print(f"  Specialization: {attrs.get('specialization', 'N/A')}")
                            print(f"  Years Experience: {attrs.get('years_experience', 'N/A')}")
                        print("  ---")
                else:
                    print("  No Developer entities found")
                    
            except Exception as e:
                print(f"  Error searching for developers: {e}")
            
            # Search for EMPLOYED_BY edges
            try:
                results = self.client.graph.search(
                    graph_id=graph_id,
                    query="employment relationships",
                    scope="edges",
                    search_filters={"edge_types": ["EMPLOYED_BY"]},
                    limit=5
                )
                
                print("\n🔗 EMPLOYED_BY Relationships Found:")
                if results.edges:
                    for edge in results.edges:
                        print(f"  Fact: {edge.fact if hasattr(edge, 'fact') else 'N/A'}")
                        print(f"  Type: {edge.name if hasattr(edge, 'name') else 'N/A'}")
                        if hasattr(edge, 'attributes') and edge.attributes:
                            attrs = edge.attributes
                            print(f"  Position: {attrs.get('position', 'N/A')}")
                            print(f"  Department: {attrs.get('department', 'N/A')}")
                        print("  ---")
                else:
                    print("  No EMPLOYED_BY relationships found")
                    
            except Exception as e:
                print(f"  Error searching for employment edges: {e}")
        
        if user_id:
            print(f"\n🔍 Searching user {user_id} for typed entities...")
            
            # Search user graph for custom types
            try:
                # Search for Project entities
                results = self.client.graph.search(
                    user_id=user_id,
                    query="projects being developed",
                    scope="nodes",
                    search_filters={"node_labels": ["Project"]},
                    limit=5
                )
                
                print("\n📊 Project Entities in User Graph:")
                if results.nodes:
                    for node in results.nodes:
                        print(f"  Name: {node.name}")
                        print(f"  Labels: {node.labels if hasattr(node, 'labels') else 'N/A'}")
                        if hasattr(node, 'attributes') and node.attributes:
                            attrs = node.attributes
                            print(f"  Project Type: {attrs.get('project_type', 'N/A')}")
                            print(f"  Tech Stack: {attrs.get('tech_stack', 'N/A')}")
                            print(f"  Status: {attrs.get('status', 'N/A')}")
                        print("  ---")
                else:
                    print("  No Project entities found")
                    
                # Also check for default Preference types (should still work)
                results = self.client.graph.search(
                    user_id=user_id,
                    query="user preferences",
                    scope="nodes",
                    search_filters={"node_labels": ["Preference"]},
                    limit=5
                )
                
                print("\n📊 Default Preference Entities (if any):")
                if results.nodes:
                    for node in results.nodes:
                        print(f"  Name: {node.name}")
                        print(f"  Labels: {node.labels if hasattr(node, 'labels') else 'N/A'}")
                else:
                    print("  No Preference entities found")
                    
            except Exception as e:
                print(f"  Error searching user graph: {e}")

def main():
    """Main execution function"""
    print("=" * 60)
    print("ZEP ENTITY AND EDGE TYPES RESEARCH POC")
    print("=" * 60)
    
    # Initialize POC
    poc = ZepEntityTypePOC()
    
    # Step 1: Explore default types
    poc.explore_default_types()
    
    # Step 2: Create and test graph with custom types
    graph_id = poc.create_and_populate_graph_with_types()
    
    # Step 3: Create and test user with custom types
    user_id, thread_id = poc.create_and_populate_user_with_types()
    
    # Step 4: Verify types are applied
    poc.search_and_verify_types(graph_id=graph_id, user_id=user_id)
    
    print("\n" + "=" * 60)
    print("KEY FINDINGS")
    print("=" * 60)
    print("\n📝 Summary:")
    print("1. Default Types: User graphs automatically use default entity/edge types")
    print("2. Custom Types: Can be set project-wide or for specific graphs/users")
    print("3. Graph vs User: General graphs need explicit type setting, user graphs")
    print("   have defaults but can be overridden with custom types")
    print("4. Type Application: Entities and edges are classified into exactly one type")
    print("5. Flexibility: Types can be changed but don't affect existing nodes/edges")
    
    return {
        "graph_id": graph_id,
        "user_id": user_id,
        "thread_id": thread_id
    }

if __name__ == "__main__":
    results = main()
    print("\n📋 Created Resources:")
    print(f"  Graph ID: {results.get('graph_id')}")
    print(f"  User ID: {results.get('user_id')}")
    print(f"  Thread ID: {results.get('thread_id')}")