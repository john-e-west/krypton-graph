# Entity Management User Stories

## Epic: Entity Management for Ontologies
Enable users to create, manage, and organize entities that form the foundation of their knowledge graphs in Krypton Graph.

---

## Story 1: Browse Pre-Existing Entity Templates
**As a** Krypton Graph user  
**I want to** browse pre-existing entity templates grouped by industry/domain  
**So that** I can quickly start building my ontology without creating everything from scratch

### Acceptance Criteria
- [ ] Display entity templates organized by categories (Healthcare, Finance, Technology, Education, etc.)
- [ ] Each category shows relevant default Zep entity types (User, Organization, Location, Event, Object, Topic, Document, Preference)
- [ ] Show custom entity examples specific to each domain
- [ ] Preview entity structure with fields and descriptions
- [ ] Allow filtering by industry, complexity level, or use case
- [ ] Display usage count and community rating for popular templates

### Technical Notes
- Leverage Zep's default entity types as foundation
- Store custom entity templates in Airtable with domain categorization
- Support Zep's EntityModel structure with EntityText, EntityBoolean fields

---

## Story 2: Create Custom Entity Type
**As a** knowledge architect  
**I want to** create custom entity types with specific fields  
**So that** I can model domain-specific concepts accurately

### Acceptance Criteria
- [ ] Form to define entity name and description
- [ ] Add up to 10 custom fields per entity (Zep limit)
- [ ] Field types: text, boolean, number, date
- [ ] Provide field descriptions for AI classification
- [ ] Validate against reserved field names (uuid, name, graph_id, etc.)
- [ ] Preview how the entity will appear in the graph
- [ ] Save as draft or publish to ontology

### UI Components
```
Entity Creation Form:
- Entity Name: [___________]
- Entity Description: [___________]
- Category: [Dropdown: Domain selection]
- Fields:
  [+ Add Field]
  - Field Name | Type | Description | Required | [Delete]
- [Save as Draft] [Publish to Ontology]
```

---

## Story 3: Entity Library Management
**As an** ontology manager  
**I want to** organize entities into logical groups  
**So that** I can maintain namespace isolation and reuse entities across contexts

### Acceptance Criteria
- [ ] Create entity groups/collections (e.g., "Healthcare Entities", "Financial Entities")
- [ ] Assign entities to one or more groups
- [ ] Tag entities with keywords for searchability
- [ ] Duplicate entity with modifications for similar use cases
- [ ] Version control for entity definitions
- [ ] Archive deprecated entities while maintaining references

### Technical Implementation
- Store entity groups in Airtable with many-to-many relationships
- Implement soft delete for entity archival
- Track entity lineage and versions

---

## Story 4: Import Entity from Existing Ontology
**As a** user building a new ontology  
**I want to** import entities from existing ontologies  
**So that** I can reuse proven entity structures

### Acceptance Criteria
- [ ] Browse entities from published ontologies
- [ ] Search entities by name, type, or domain
- [ ] Preview entity structure before importing
- [ ] Option to import as-is or customize during import
- [ ] Handle naming conflicts (suggest alternatives)
- [ ] Maintain reference to source ontology
- [ ] Bulk import multiple entities

### Import Flow
1. Select source ontology or browse all available
2. Filter/search for relevant entities
3. Preview and select entities to import
4. Resolve conflicts and customize if needed
5. Add to current working ontology

---

## Story 5: Entity Validation and Constraints
**As a** data quality manager  
**I want to** define validation rules for entities  
**So that** data integrity is maintained when entities are created

### Acceptance Criteria
- [ ] Set required fields for entity types
- [ ] Define field validation patterns (regex for text fields)
- [ ] Set allowed value ranges for numeric fields
- [ ] Create field dependencies (if X then Y is required)
- [ ] Validate entity names for uniqueness within ontology
- [ ] Show validation errors in real-time during entity creation
- [ ] Bulk validation report for existing entities

---

## Story 6: Entity Relationship Preview
**As an** ontology designer  
**I want to** see how entities can connect with edges  
**So that** I can design a coherent knowledge structure

### Acceptance Criteria
- [ ] Visual preview showing entity as node
- [ ] Display compatible edge types for the entity
- [ ] Show which entities can be source/target
- [ ] Preview with sample data
- [ ] Highlight potential relationship patterns
- [ ] Warning for orphaned entities (no possible connections)

### Visualization Features
- Interactive node representing the entity
- Dotted lines showing potential connections
- Color coding by entity type/domain
- Expandable details panel

---

## Story 7: Entity Usage Analytics
**As an** ontology administrator  
**I want to** see how entities are being used  
**So that** I can optimize the ontology structure

### Acceptance Criteria
- [ ] Display count of instances for each entity type
- [ ] Show most/least used entities
- [ ] Track entity creation frequency over time
- [ ] Identify entities with no instances (unused)
- [ ] Show entity relationships heat map
- [ ] Export usage reports

### Dashboard Metrics
- Total entities defined
- Active vs. unused entities
- Entity instances by type
- Creation trends
- Relationship density

---

## Story 8: Batch Entity Operations
**As a** power user  
**I want to** perform operations on multiple entities at once  
**So that** I can efficiently manage large ontologies

### Acceptance Criteria
- [ ] Multi-select entities from list
- [ ] Bulk edit common properties
- [ ] Batch assign to groups/categories
- [ ] Mass enable/disable entities
- [ ] Bulk export entity definitions
- [ ] Batch validation check
- [ ] Undo/redo for batch operations

---

## Story 9: Entity Search and Discovery
**As a** user exploring the system  
**I want to** easily find relevant entities  
**So that** I can understand what's available for my use case

### Acceptance Criteria
- [ ] Full-text search across entity names and descriptions
- [ ] Filter by domain, status, creator
- [ ] Advanced search with field-level criteria
- [ ] Search suggestions based on context
- [ ] Recently viewed entities
- [ ] Favorite/bookmark entities for quick access
- [ ] Share entity links with team members

---

## Story 10: Entity Change Management
**As an** ontology maintainer  
**I want to** track and manage changes to entity definitions  
**So that** I can maintain consistency and handle migrations

### Acceptance Criteria
- [ ] View entity change history
- [ ] Compare versions side-by-side
- [ ] Rollback to previous version
- [ ] Impact analysis for entity changes
- [ ] Migration wizard for schema updates
- [ ] Notify users of breaking changes
- [ ] Change approval workflow for published entities

### Change Tracking
- Who changed what and when
- Reason for change (change notes)
- Affected instances count
- Downstream impact assessment

---

## Technical Considerations

### Zep Integration
- Respect Zep's 10 custom entity types limit per project
- Handle default entity types (User, Assistant, Preference, Location, Event, Object, Topic, Organization, Document)
- Implement EntityModel with proper field types (EntityText, EntityBoolean)
- Avoid reserved attribute names

### Data Storage (Airtable)
- Entities table with JSON schema for field definitions
- Entity_Groups for logical organization
- Entity_Instances for tracking usage
- Entity_Versions for change history

### UI/UX Principles
- Progressive disclosure - basic to advanced features
- Visual feedback for entity relationships
- Contextual help and examples
- Consistent naming conventions
- Mobile-responsive entity management

### Performance
- Lazy load entity lists
- Cache frequently used entities
- Optimize search with indices
- Paginate large entity collections