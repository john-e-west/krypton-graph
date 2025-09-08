# Custom Entity and Edge Types | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/core-concepts/custom-entity-and-edge-types  
**Scraped:** 2025-08-29 13:01:53

---

Graphiti allows you to define custom entity types and edge types to better represent your domain-specific knowledge. This enables more structured data extraction and richer semantic relationships in your knowledge graph.

## Defining Custom Entity and Edge Types

Custom entity types and edge types are defined using Pydantic models. Each model represents a specific type with custom attributes.
    
    
    1| from pydantic import BaseModel, Field  
    ---|---  
    2| from datetime import datetime  
    3| from typing import Optional  
    4|   
    5| # Custom Entity Types  
    6| class Person(BaseModel):  
    7|     """A person entity with biographical information."""  
    8|     age: Optional[int] = Field(None, description="Age of the person")  
    9|     occupation: Optional[str] = Field(None, description="Current occupation")  
    10|     location: Optional[str] = Field(None, description="Current location")  
    11|     birth_date: Optional[datetime] = Field(None, description="Date of birth")  
    12|   
    13| class Company(BaseModel):  
    14|     """A business organization."""  
    15|     industry: Optional[str] = Field(None, description="Primary industry")  
    16|     founded_year: Optional[int] = Field(None, description="Year company was founded")  
    17|     headquarters: Optional[str] = Field(None, description="Location of headquarters")  
    18|     employee_count: Optional[int] = Field(None, description="Number of employees")  
    19|   
    20| class Product(BaseModel):  
    21|     """A product or service."""  
    22|     category: Optional[str] = Field(None, description="Product category")  
    23|     price: Optional[float] = Field(None, description="Price in USD")  
    24|     release_date: Optional[datetime] = Field(None, description="Product release date")  
    25|   
    26| # Custom Edge Types  
    27| class Employment(BaseModel):  
    28|     """Employment relationship between a person and company."""  
    29|     position: Optional[str] = Field(None, description="Job title or position")  
    30|     start_date: Optional[datetime] = Field(None, description="Employment start date")  
    31|     end_date: Optional[datetime] = Field(None, description="Employment end date")  
    32|     salary: Optional[float] = Field(None, description="Annual salary in USD")  
    33|     is_current: Optional[bool] = Field(None, description="Whether employment is current")  
    34|   
    35| class Investment(BaseModel):  
    36|     """Investment relationship between entities."""  
    37|     amount: Optional[float] = Field(None, description="Investment amount in USD")  
    38|     investment_type: Optional[str] = Field(None, description="Type of investment (equity, debt, etc.)")  
    39|     stake_percentage: Optional[float] = Field(None, description="Percentage ownership")  
    40|     investment_date: Optional[datetime] = Field(None, description="Date of investment")  
    41|   
    42| class Partnership(BaseModel):  
    43|     """Partnership relationship between companies."""  
    44|     partnership_type: Optional[str] = Field(None, description="Type of partnership")  
    45|     duration: Optional[str] = Field(None, description="Expected duration")  
    46|     deal_value: Optional[float] = Field(None, description="Financial value of partnership")  
  
## Using Custom Entity and Edge Types

Pass your custom entity types and edge types to the add_episode method:
    
    
    1| entity_types = {  
    ---|---  
    2|     "Person": Person,  
    3|     "Company": Company,  
    4|     "Product": Product  
    5| }  
    6|   
    7| edge_types = {  
    8|     "Employment": Employment,  
    9|     "Investment": Investment,  
    10|     "Partnership": Partnership  
    11| }  
    12|   
    13| edge_type_map = {  
    14|     ("Person", "Company"): ["Employment"],  
    15|     ("Company", "Company"): ["Partnership", "Investment"],  
    16|     ("Person", "Person"): ["Partnership"],  
    17|     ("Entity", "Entity"): ["Investment"],  # Apply to any entity type  
    18| }  
    19|   
    20| await graphiti.add_episode(  
    21|     name="Business Update",  
    22|     episode_body="Sarah joined TechCorp as CTO in January 2023 with a $200K salary. TechCorp partnered with DataCorp in a $5M deal.",  
    23|     source_description="Business news",  
    24|     reference_time=datetime.now(),  
    25|     entity_types=entity_types,  
    26|     edge_types=edge_types,  
    27|     edge_type_map=edge_type_map  
    28| )  
  
## Searching with Custom Types

You can filter search results to specific entity types or edge types using SearchFilters:
    
    
    1| from graphiti_core.search.search_filters import SearchFilters  
    ---|---  
    2|   
    3| # Search for only specific entity types  
    4| search_filter = SearchFilters(  
    5|     node_labels=["Person", "Company"]  # Only return Person and Company entities  
    6| )  
    7|   
    8| results = await graphiti.search_(  
    9|     query="Who works at tech companies?",  
    10|     search_filter=search_filter  
    11| )  
    12|   
    13| # Search for only specific edge types  
    14| search_filter = SearchFilters(  
    15|     edge_types=["Employment", "Partnership"]  # Only return Employment and Partnership edges  
    16| )  
    17|   
    18| results = await graphiti.search_(  
    19|     query="Tell me about business relationships",  
    20|     search_filter=search_filter  
    21| )  
  
## How Custom Types Work

### Entity Extraction Process

  1. **Extraction** : Graphiti extracts entities from text and classifies them using your custom types
  2. **Validation** : Each entity is validated against the appropriate Pydantic model
  3. **Attribute Population** : Custom attributes are extracted from the text and populated
  4. **Storage** : Entities are stored with their custom attributes

### Edge Extraction Process

  1. **Relationship Detection** : Graphiti identifies relationships between extracted entities
  2. **Type Classification** : Based on the entity types involved and your edge_type_map, relationships are classified
  3. **Attribute Extraction** : For custom edge types, additional attributes are extracted from the context
  4. **Validation** : Edge attributes are validated against the Pydantic model
  5. **Storage** : Edges are stored with their custom attributes and relationship metadata

## Edge Type Mapping

The edge_type_map parameter defines which edge types can exist between specific entity type pairs:
    
    
    1| edge_type_map = {  
    ---|---  
    2|     ("Person", "Company"): ["Employment"],  
    3|     ("Company", "Company"): ["Partnership", "Investment"],  
    4|     ("Person", "Person"): ["Partnership"],  
    5|     ("Entity", "Entity"): ["Investment"],  # Apply to any entity type  
    6| }  
  
If an entity pair doesn’t have a defined edge type mapping, Graphiti will use default relationship types and the relationship will still be captured with a generic RELATES_TO type.

## Schema Evolution

Your knowledge graph’s schema can evolve over time as your needs change. You can update entity types by adding new attributes to existing types without breaking existing nodes. When you add new attributes, existing nodes will preserve their original attributes while supporting the new ones for future updates. This flexible approach allows your knowledge graph to grow and adapt while maintaining backward compatibility with historical data.

For example, if you initially defined a “Customer” type with basic attributes like name and email, you could later add attributes like “loyalty_tier” or “acquisition_channel” without needing to modify or migrate existing customer nodes in your graph.

## Best Practices

### Model Design

  * **Clear Descriptions** : Always include detailed descriptions in docstrings and Field descriptions
  * **Optional Fields** : Make custom attributes optional to handle cases where information isn’t available
  * **Appropriate Types** : Use specific types (datetime, int, float) rather than strings when possible
  * **Validation** : Consider adding Pydantic validators for complex validation rules
  * **Atomic Attributes** : Attributes should be broken down into their smallest meaningful units rather than storing compound information

    
    
    1| from pydantic import validator  
    ---|---  
    2|   
    3| class Person(BaseModel):  
    4|     """A person entity."""  
    5|     age: Optional[int] = Field(None, description="Age in years")  
    6|       
    7|     @validator('age')  
    8|     def validate_age(cls, v):  
    9|         if v is not None and (v < 0 or v > 150):  
    10|             raise ValueError('Age must be between 0 and 150')  
    11|         return v  
  
**Instead of compound information:**
    
    
    1| class Customer(BaseModel):  
    ---|---  
    2|     contact_info: Optional[str] = Field(None, description="Name and email")  # Don't do this  
  
**Use atomic attributes:**
    
    
    1| class Customer(BaseModel):  
    ---|---  
    2|     name: Optional[str] = Field(None, description="Customer name")  
    3|     email: Optional[str] = Field(None, description="Customer email address")  
  
### Naming Conventions

  * **Entity Types** : Use PascalCase (e.g., Person, TechCompany)
  * **Edge Types** : Use PascalCase for custom types (e.g., Employment, Partnership)
  * **Attributes** : Use snake_case (e.g., start_date, employee_count)
  * **Descriptions** : Be specific and actionable for the LLM
  * **Consistency** : Maintain consistent naming conventions across related entity types

### Edge Type Mapping Strategy

  * **Specific Mappings** : Define specific entity type pairs for targeted relationships
  * **Fallback to Entity** : Use (“Entity”, “Entity”) as a fallback for general relationships
  * **Balanced Scope** : Don’t make edge types too specific or too general
  * **Domain Coverage** : Ensure your edge types cover the main relationships in your domain

    
    
    1| # Good: Specific and meaningful  
    ---|---  
    2| edge_type_map = {  
    3|     ("Person", "Company"): ["Employment", "Investment"],  
    4|     ("Company", "Company"): ["Partnership", "Acquisition"],  
    5|     ("Person", "Product"): ["Usage", "Review"],  
    6|     ("Entity", "Entity"): ["RELATES_TO"]  # Fallback for unexpected relationships  
    7| }  
    8|   
    9| # Avoid: Too granular  
    10| edge_type_map = {  
    11|     ("CEO", "TechCompany"): ["CEOEmployment"],  
    12|     ("Engineer", "TechCompany"): ["EngineerEmployment"],  
    13|     # This creates too many specific types  
    14| }  
  
## Entity Type Exclusion

You can exclude specific entity types from extraction using the excluded_entity_types parameter:
    
    
    1| await graphiti.add_episode(  
    ---|---  
    2|     name="Business Update",  
    3|     episode_body="The meeting discussed various topics including weather and sports.",  
    4|     source_description="Meeting notes",  
    5|     reference_time=datetime.now(),  
    6|     entity_types=entity_types,  
    7|     excluded_entity_types=["Person"]  # Won't extract Person entities  
    8| )  
  
## Migration Guide

If you’re upgrading from a previous version of Graphiti:

  * You can add entity types to new episodes, even if existing episodes in the graph did not have entity types. Existing nodes will continue to work without being classified.
  * To add types to previously ingested data, you need to re-ingest it with entity types set into a new graph.

## Important Constraints

### Protected Attribute Names

Custom entity type attributes cannot use protected names that are already used by Graphiti’s core EntityNode class:

  * `uuid`, `name`, `group_id`, `labels`, `created_at`, `summary`, `attributes`, `name_embedding`

Custom entity types and edge types provide powerful ways to structure your knowledge graph according to your domain needs. They enable more precise extraction, better organization, and richer semantic relationships in your data.
