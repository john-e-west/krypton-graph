# Existing Airtable Schema Documentation

## Base Information
- **Base ID**: appvLsaMZqtLc9EIX
- **Base Name**: Krypton-Graph
- **Status**: Active and configured

## Current Table Structure

### 1. Ontologies Table
**Table ID**: tblupVP410vrQERwa  
**Purpose**: Named ontology definitions for knowledge domain extraction

**Fields**:
- `Name` (Single Line Text) - Primary field
- `Description` (Multi-line Text)
- `Domain` (Single Select) - Options: Healthcare, Finance, Legal, Technology, Education, Manufacturing
- `Version` (Single Line Text)
- `Status` (Single Select) - Options: Draft, Testing, Published, Deprecated
- `Created By` (Single Collaborator)
- `Created Date` (DateTime)
- `Notes` (Multi-line Text)

**Relationships**:
- `EntityDefinitions` - Links to EntityDefinitions table
- `EdgeDefinitions` - Links to EdgeDefinitions table
- `TestRuns` - Links to TestRuns table
- `GraphAssignments` - Links to GraphAssignments table
- `FactRatingConfigs` - Links to FactRatingConfigs table

### 2. EntityDefinitions Table
**Table ID**: tbloHlpFxnP5CTBEh  
**Purpose**: Define entities within each ontology

**Fields**:
- `Entity Name`
- `Ontology` - Link to Ontologies
- `Entity Class`
- `Properties JSON`
- `Validation Rules`
- `Examples`
- `Priority`
- `Description`
- `EdgeDefinitions` (Multiple links)

### 3. EdgeDefinitions Table
**Table ID**: tbldR4dKr1EFlgOFZ  
**Purpose**: Define relationships between entities

### 4. TestDatasets Table
**Table ID**: tblf5a4g0VhFDlhSo  
**Purpose**: Store test data for ontology validation

### 5. TestRuns Table
**Table ID**: tble8wm5NYNGRPHkC  
**Purpose**: Track test executions against ontologies

### 6. GraphAssignments Table
**Table ID**: tbl2eLfeMmzwRpdMT  
**Purpose**: Assign graphs to specific contexts or uses

### 7. FactRatingConfigs Table
**Table ID**: tblGxLQO4N3z5Jz9P  
**Purpose**: Configure fact rating/validation rules

### 8. FactRatingTests Table
**Table ID**: tblLaHGbhn4YbCHDN  
**Purpose**: Test fact rating configurations

## Schema Observations

### Strengths
1. **Graph-oriented structure** - Tables support knowledge graph concepts
2. **Ontology-first design** - Central ontology table with related entities
3. **Test infrastructure** - Built-in testing and validation tables
4. **Status tracking** - Workflow states for ontologies
5. **Versioning support** - Version field for tracking changes

### Relationships Pattern
- Hub-and-spoke with Ontologies as the hub
- EntityDefinitions and EdgeDefinitions form the graph structure
- Testing tables separate from core data model
- Clear separation of configuration from runtime data

### Data Types Used
- Standard text fields for names and descriptions
- JSON fields for flexible property storage
- Single/Multiple select for enums
- DateTime for timestamps
- Collaborator for user tracking
- Multiple record links for relationships

## Integration Considerations

### For Krypton-Graph Project
1. **Leverage existing structure** - Don't reinvent the wheel
2. **Use JSON fields** - For flexible, schema-less properties
3. **Maintain relationship integrity** - Through linked records
4. **Status workflow** - Already defined (Draft → Testing → Published)
5. **Testing built-in** - Use TestDatasets and TestRuns tables

### MCP Capabilities Available
Based on the connected Airtable MCP:
- Full CRUD operations on all tables
- Schema introspection
- Filtered queries
- Batch operations
- Real-time updates through polling

## Recommendations

1. **Keep this schema** - It's well-designed for knowledge graphs
2. **Extend cautiously** - Add fields rather than new tables initially  
3. **Use views** - Create filtered views for common queries
4. **Document JSON schemas** - For Properties JSON and Validation Rules fields
5. **Implement client-side caching** - To reduce API calls