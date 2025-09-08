# Edge Management User Stories

## Epic: Edge Management for Ontologies
Enable users to define, manage, and visualize relationships (edges) between entities in their knowledge graphs, supporting both default and custom edge types aligned with Zep's v3 Graph API.

---

## Story 1: Browse Pre-Existing Edge Templates
**As a** Krypton Graph user  
**I want to** browse pre-existing edge templates organized by relationship type  
**So that** I can quickly establish meaningful connections between entities

### Acceptance Criteria
- [ ] Display Zep's default edge types (LocatedAt, OccurredAt, ParticipatedIn, Owns, Uses, WorksFor, Discusses, RelatesTo)
- [ ] Group edges by relationship category (Spatial, Temporal, Ownership, Activity, Association)
- [ ] Show industry-specific edge examples
- [ ] Preview edge with source/target entity constraints
- [ ] Display common usage patterns for each edge type
- [ ] Filter by verb type, domain, or complexity

### Edge Categories
```
Spatial Relations: LocatedAt, NearTo, Contains
Temporal Relations: OccurredAt, Before, After, During
Ownership: Owns, BelongsTo, Controls
Activity: ParticipatedIn, Uses, Creates, Modifies
Association: WorksFor, MemberOf, RelatesTo, Discusses
```

---

## Story 2: Create Custom Edge Type
**As a** knowledge architect  
**I want to** create custom edge types with specific attributes  
**So that** I can model domain-specific relationships accurately

### Acceptance Criteria
- [ ] Define edge name (verb form) and description
- [ ] Specify source entity type constraints (optional)
- [ ] Specify target entity type constraints (optional)
- [ ] Add up to 10 custom fields per edge (Zep limit)
- [ ] Field types: text, boolean, number, date for edge attributes
- [ ] Provide clear descriptions for AI classification
- [ ] Set directional properties (unidirectional/bidirectional)
- [ ] Preview edge visualization

### UI Components
```
Edge Creation Form:
- Edge Name: [___________] (e.g., "MENTORS", "REPORTS_TO")
- Edge Description: [___________]
- Direction: ( ) Unidirectional  ( ) Bidirectional
- Source Entity: [Dropdown: Any / Specific Entity Type]
- Target Entity: [Dropdown: Any / Specific Entity Type]
- Custom Attributes:
  [+ Add Attribute]
  - Attribute Name | Type | Description | Required | [Delete]
- [Save as Draft] [Publish to Ontology]
```

---

## Story 3: Edge Validation Rules
**As an** ontology designer  
**I want to** define validation rules for edges  
**So that** only meaningful relationships are created

### Acceptance Criteria
- [ ] Enforce source/target entity type constraints
- [ ] Prevent self-referential edges (if desired)
- [ ] Set cardinality rules (one-to-one, one-to-many, many-to-many)
- [ ] Define temporal constraints (valid from/to dates)
- [ ] Validate edge attributes against defined schemas
- [ ] Check for duplicate edges between same entities
- [ ] Enforce business rules (e.g., person can't work for multiple companies simultaneously)

### Validation Examples
- User can only have one "WORKS_FOR" edge to Organization at a time
- "MANAGES" edge requires source=User, target=User
- "LOCATED_AT" cannot connect two Location entities

---

## Story 4: Visual Edge Designer
**As a** visual thinker  
**I want to** design edges using a graphical interface  
**So that** I can see relationships as I create them

### Acceptance Criteria
- [ ] Drag-and-drop interface to connect entities
- [ ] Visual representation of edge direction (arrows)
- [ ] Color coding for different edge types
- [ ] Preview with sample data
- [ ] Show edge labels and attributes
- [ ] Validate connections in real-time
- [ ] Generate edge definition from visual design

### Visual Features
- Canvas with entity nodes
- Click and drag to create edges
- Right-click for edge properties
- Different line styles for edge types
- Hover to see edge details

---

## Story 5: Edge Library Management
**As an** ontology manager  
**I want to** organize edges into logical groups  
**So that** I can maintain consistency across different contexts

### Acceptance Criteria
- [ ] Create edge collections by domain or purpose
- [ ] Tag edges with keywords
- [ ] Version control for edge definitions
- [ ] Clone and modify existing edges
- [ ] Archive deprecated edges
- [ ] Track edge usage across ontologies
- [ ] Export/import edge definitions

### Organization Structure
```
Edge Collections:
├── Business Relationships
│   ├── WORKS_FOR
│   ├── MANAGES
│   └── REPORTS_TO
├── Social Connections
│   ├── KNOWS
│   ├── MENTORS
│   └── COLLABORATES_WITH
└── System Relations
    ├── TRIGGERS
    ├── DEPENDS_ON
    └── INCLUDES
```

---

## Story 6: Temporal Edge Management
**As a** data analyst  
**I want to** manage temporal aspects of edges  
**So that** I can track how relationships change over time

### Acceptance Criteria
- [ ] Set valid_from and valid_until dates for edges
- [ ] Track edge invalidation (as per Zep's fact invalidation)
- [ ] View edge history timeline
- [ ] Query edges at specific points in time
- [ ] Visualize temporal changes in relationships
- [ ] Handle edge succession (e.g., job changes)
- [ ] Generate temporal reports

### Temporal Features
- Timeline view of edge validity
- "As of" date queries
- Change detection and alerts
- Historical relationship graphs

---

## Story 7: Edge Conflict Resolution
**As a** data steward  
**I want to** resolve conflicts when edges contradict each other  
**So that** the knowledge graph remains consistent

### Acceptance Criteria
- [ ] Detect conflicting edges automatically
- [ ] Present conflicts with context
- [ ] Provide resolution options (keep one, merge, invalidate)
- [ ] Track conflict resolution decisions
- [ ] Apply resolution rules automatically for known patterns
- [ ] Generate conflict reports
- [ ] Notification system for new conflicts

### Conflict Types
- Temporal overlaps (two WORKS_FOR edges at same time)
- Logical contradictions (OWNS and DOES_NOT_OWN)
- Cardinality violations
- Circular dependencies

---

## Story 8: Edge Pattern Templates
**As a** domain expert  
**I want to** define common edge patterns  
**So that** users can quickly implement standard relationship structures

### Acceptance Criteria
- [ ] Create reusable edge pattern templates
- [ ] Define multi-edge patterns (e.g., employment = WORKS_FOR + LOCATED_AT + REPORTS_TO)
- [ ] Set pattern constraints and rules
- [ ] Apply patterns to entity sets
- [ ] Validate pattern completeness
- [ ] Share patterns across teams
- [ ] Pattern usage analytics

### Pattern Examples
```
Employment Pattern:
- Person WORKS_FOR Organization
- Person LOCATED_AT Location
- Person REPORTS_TO Person
- Person HAS_ROLE Role

Family Pattern:
- Person PARENT_OF Person
- Person SPOUSE_OF Person
- Person SIBLING_OF Person
```

---

## Story 9: Edge Search and Discovery
**As a** user exploring relationships  
**I want to** search and filter edges efficiently  
**So that** I can understand the relationship landscape

### Acceptance Criteria
- [ ] Full-text search across edge names and descriptions
- [ ] Filter by source/target entity types
- [ ] Filter by edge attributes
- [ ] Advanced query builder for complex searches
- [ ] Save and share search queries
- [ ] Export search results
- [ ] Visual search through graph exploration

### Search Features
- Quick search bar
- Advanced filter panel
- Saved searches
- Search history
- Relevance ranking

---

## Story 10: Bulk Edge Operations
**As a** power user  
**I want to** perform operations on multiple edges simultaneously  
**So that** I can efficiently manage large relationship sets

### Acceptance Criteria
- [ ] Multi-select edges from list or graph view
- [ ] Bulk update edge attributes
- [ ] Mass invalidate edges with reason
- [ ] Batch create edges from CSV/Excel
- [ ] Bulk delete with confirmation
- [ ] Undo/redo for bulk operations
- [ ] Progress tracking for large operations

### Bulk Operations
- Select by: type, date range, entities involved
- Operations: update, delete, export, validate
- Import formats: CSV, JSON, Excel
- Validation before applying changes

---

## Story 11: Edge Analytics Dashboard
**As an** ontology administrator  
**I want to** analyze edge usage and patterns  
**So that** I can optimize the relationship model

### Acceptance Criteria
- [ ] Display edge type distribution
- [ ] Show most/least used edge types
- [ ] Relationship density metrics
- [ ] Edge creation trends over time
- [ ] Identify orphaned edges
- [ ] Network analysis metrics (centrality, clustering)
- [ ] Export analytics reports

### Dashboard Metrics
```
Edge Statistics:
- Total edges: 10,543
- Edge types used: 23 of 30
- Average edges per entity: 3.2
- Temporal edges: 2,341 (22%)
- Invalid edges: 145 (1.4%)
- Most connected entity: User_John (142 edges)
```

---

## Story 12: Edge Inference and Suggestions
**As a** knowledge graph builder  
**I want to** receive intelligent edge suggestions  
**So that** I can discover non-obvious relationships

### Acceptance Criteria
- [ ] AI-powered edge suggestions based on entity attributes
- [ ] Pattern-based relationship inference
- [ ] Transitive relationship detection
- [ ] Missing edge identification
- [ ] Confidence scoring for suggestions
- [ ] Accept/reject suggested edges
- [ ] Learn from user feedback

### Inference Examples
- If A MANAGES B and B MANAGES C, suggest A INDIRECT_MANAGES C
- If Person lives in City and City in Country, infer Person RESIDENT_OF Country
- Suggest COLLEAGUE_OF based on same WORKS_FOR edges

---

## Technical Considerations

### Zep Integration
- Support default edge types (LocatedAt, OccurredAt, ParticipatedIn, Owns, Uses, WorksFor, Discusses, RelatesTo)
- Implement EdgeModel with proper field types
- Handle EntityEdgeSourceTarget constraints
- Manage fact invalidation for temporal edges
- Respect 10 custom edge types limit per project

### Data Storage (Airtable)
- Edges table with source_id, target_id, type
- Edge_Types table for definitions
- Edge_Attributes for custom fields
- Edge_History for temporal tracking
- Edge_Patterns for reusable templates

### Performance Optimization
- Index edges by source, target, and type
- Cache frequently accessed edges
- Lazy load edge details
- Batch edge operations
- Optimize graph traversal queries

### UI/UX Principles
- Clear visual distinction between edge types
- Intuitive edge creation workflow
- Contextual help for edge constraints
- Real-time validation feedback
- Consistent edge naming conventions

### Relationship Integrity
- Enforce referential integrity
- Handle cascade deletes carefully
- Maintain edge consistency during entity updates
- Track edge lineage and provenance
- Support edge migration during schema changes