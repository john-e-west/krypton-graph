# Ontology System Design: Grouping & Namespace Management

## Executive Summary

This document outlines the design for managing entities and edges within Krypton Graph's ontology system, addressing the critical requirements of logical grouping, namespace isolation, and the flexibility to reuse names across different contexts while maintaining uniqueness within each ontology.

---

## Core Concepts

### 1. Three-Level Hierarchy

```
Industry/Domain (Top Level)
    ↓
Ontology Group (Middle Level)
    ↓
Saved Ontology (Zep Level)
```

#### Industry/Domain Level
High-level categorization for browsing and discovery:
- Healthcare
- Finance
- Technology
- Education
- Manufacturing
- Government
- Research
- Custom Domains

#### Ontology Group Level
Logical collections within Krypton Graph:
- Collections of related entities and edges
- Draft/working state before publishing
- Namespace boundary for name uniqueness
- Can contain multiple versions

#### Saved Ontology Level
Published to Zep as official ontology:
- Immutable once published
- Tagged with version number
- Becomes available for instantiation
- Maintains referential integrity

---

## Namespace Management Strategy

### Problem Statement
The same word (e.g., "Document", "Account", "Process") has different meanings in different contexts:
- **Healthcare**: Document = Medical Record
- **Finance**: Document = Financial Statement
- **Legal**: Document = Legal Contract

### Solution: Contextual Namespacing

```typescript
interface NamespaceContext {
  domain: string;           // e.g., "Healthcare"
  group: string;           // e.g., "PatientRecords"
  version: string;         // e.g., "v1.2"
  qualifier?: string;      // Optional additional context
}

interface QualifiedEntityName {
  localName: string;       // e.g., "Document"
  namespace: NamespaceContext;
  fullyQualifiedName: string; // e.g., "Healthcare.PatientRecords.Document"
}
```

### Naming Rules

1. **Within an Ontology Group**: Names must be unique
2. **Across Groups**: Same names allowed
3. **Display Format**: Show context when ambiguous
4. **Search/Reference**: Use fully qualified names

---

## UI/UX Design for Ontology Management

### Main Ontology Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Ontologies                                    [+ New] [Import]│
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────────────────────────────┐  │
│ │ Browse by    │ │ Your Ontology Groups                 │  │
│ │ Industry     │ │                                       │  │
│ │              │ │ ╔═══════════════════════════════════╗ │  │
│ │ □ Healthcare │ │ ║ Patient Management v2.1           ║ │  │
│ │ □ Finance    │ │ ║ 15 Entities | 23 Edges | Draft    ║ │  │
│ │ □ Technology │ │ ║ Last modified: 2 hours ago        ║ │  │
│ │ □ Education  │ │ ╚═══════════════════════════════════╝ │  │
│ │              │ │                                       │  │
│ │ Templates    │ │ ╔═══════════════════════════════════╗ │  │
│ │ ─────────    │ │ ║ Financial Transactions v1.0       ║ │  │
│ │ ★ Popular    │ │ ║ 8 Entities | 12 Edges | Published ║ │  │
│ │ ◉ Verified   │ │ ║ In use by: 3 projects             ║ │  │
│ │ ⚡ Quick Start│ │ ╚═══════════════════════════════════╝ │  │
│ └──────────────┘ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Ontology Group Editor

```
┌─────────────────────────────────────────────────────────────┐
│ Patient Management Ontology              [Save] [Publish]    │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Entities] [Edges] [Validate] [Preview]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Entities (15)                        Edges (23)             │
│  ┌─────────────────┐                 ┌─────────────────┐    │
│  │ □ Patient       │                 │ □ TREATED_BY    │    │
│  │ □ Doctor        │ ←───────────────│ □ DIAGNOSED_WITH│    │
│  │ □ Appointment   │                 │ □ SCHEDULED_FOR │    │
│  │ □ Medication    │                 │ □ PRESCRIBED    │    │
│  │ □ Diagnosis     │                 │ □ REFERS_TO     │    │
│  │ [+ Add Entity]  │                 │ [+ Add Edge]    │    │
│  └─────────────────┘                 └─────────────────┘    │
│                                                               │
│  Visual Preview:                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     [Patient]──TREATED_BY──>[Doctor]                  │  │
│  │         ↓                        ↓                     │  │
│  │   DIAGNOSED_WITH           PRESCRIBED                  │  │
│  │         ↓                        ↓                     │  │
│  │    [Diagnosis]             [Medication]                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Entity/Edge Creation with Namespace Context

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Entity                                            │
├─────────────────────────────────────────────────────────────┤
│ Name: [Document                    ]                         │
│                                                               │
│ ⚠️ "Document" already exists in:                             │
│   • Legal.Contracts (Different structure)                    │
│   • Finance.Reports (Different fields)                       │
│                                                               │
│ This will create: Healthcare.PatientRecords.Document        │
│                                                               │
│ □ Import structure from existing "Document" entity           │
│                                                               │
│ Description: [Medical document containing patient info    ]  │
│                                                               │
│ Fields:                                                      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ patient_id    | text     | Patient identifier        │   │
│ │ document_type | select   | Type of medical document  │   │
│ │ created_date  | datetime | Document creation date    │   │
│ │ [+ Add Field]                                         │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│                              [Cancel] [Create as Draft]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Architecture

### Data Model (Airtable Schema)

#### Ontology_Groups Table
```javascript
{
  id: "og_xxx",
  name: "Patient Management",
  domain: "Healthcare",
  status: "Draft|Testing|Published",
  version: "2.1",
  created_by: "user_id",
  created_at: "timestamp",
  published_at: "timestamp",
  zep_ontology_id: "zep_xxx", // When published to Zep
  entities: ["ent_xxx"], // Relations to Entities
  edges: ["edg_xxx"], // Relations to Edges
  parent_group: "og_xxx", // For versioning
  metadata: {
    description: "...",
    tags: ["medical", "patient-care"],
    usage_count: 42
  }
}
```

#### Entities Table (Enhanced)
```javascript
{
  id: "ent_xxx",
  local_name: "Document",
  ontology_group: "og_xxx",
  fully_qualified_name: "Healthcare.PatientRecords.Document",
  namespace_context: {
    domain: "Healthcare",
    group: "PatientRecords",
    version: "2.1"
  },
  zep_entity_type: "Document", // Maps to Zep's entity type
  fields: [...], // Entity field definitions
  is_default: false, // True for Zep's default types
  usage_stats: {
    instance_count: 150,
    last_used: "timestamp"
  }
}
```

#### Edges Table (Enhanced)
```javascript
{
  id: "edg_xxx",
  local_name: "TREATS",
  ontology_group: "og_xxx",
  fully_qualified_name: "Healthcare.PatientRecords.TREATS",
  source_entity: "ent_xxx", // Doctor
  target_entity: "ent_yyy", // Patient
  source_constraint: "Doctor",
  target_constraint: "Patient",
  zep_edge_type: "CUSTOM_TREATS",
  attributes: [...],
  cardinality: "one-to-many"
}
```

#### Namespace_Registry Table
```javascript
{
  id: "ns_xxx",
  name: "Document",
  occurrences: [
    {
      ontology_group: "og_xxx",
      domain: "Healthcare",
      entity_id: "ent_xxx"
    },
    {
      ontology_group: "og_yyy",
      domain: "Finance",
      entity_id: "ent_yyy"
    }
  ],
  disambiguation_hints: {
    Healthcare: "Medical records and patient documents",
    Finance: "Financial statements and reports"
  }
}
```

---

## Workflow: From Draft to Zep

### 1. Create Ontology Group
```mermaid
User → Create Group → Set Domain → Add Entities/Edges → Save Draft
```

### 2. Build and Validate
```mermaid
Draft → Add/Edit Items → Validate Names → Check Constraints → Test
```

### 3. Publish to Zep
```mermaid
Testing → Final Review → Generate Zep Schema → Call set_ontology() → Published
```

### Publishing Process
```typescript
async function publishOntologyToZep(groupId: string) {
  const group = await getOntologyGroup(groupId);
  
  // 1. Validate completeness
  const validation = await validateOntology(group);
  if (!validation.isValid) throw new Error(validation.errors);
  
  // 2. Check for naming conflicts in Zep
  const conflicts = await checkZepConflicts(group);
  if (conflicts.length > 0) {
    return resolveConflicts(conflicts);
  }
  
  // 3. Transform to Zep format
  const zepSchema = {
    entities: transformEntities(group.entities),
    edges: transformEdges(group.edges)
  };
  
  // 4. Call Zep API
  const result = await zepClient.graph.set_ontology(zepSchema);
  
  // 5. Update local records
  await updateGroupStatus(groupId, 'Published', result.ontologyId);
  
  return result;
}
```

---

## User Experience Flows

### Flow 1: Browse and Import
1. User browses by Healthcare domain
2. Finds "Standard Patient Care" template
3. Previews entities and edges
4. Imports as new group
5. Customizes for specific needs
6. Publishes to Zep

### Flow 2: Create from Scratch
1. Create new ontology group
2. Set domain context
3. Add entities (with namespace checking)
4. Define edges between entities
5. Validate structure
6. Test with sample data
7. Publish when ready

### Flow 3: Handle Name Conflicts
1. User creates "Account" entity
2. System detects existing "Account" in other contexts
3. Shows disambiguation dialog
4. User either:
   - Proceeds with contextual name
   - Imports and modifies existing
   - Chooses different name

---

## Benefits of This Design

### For Users
1. **Intuitive Organization**: Browse by industry/domain
2. **Reusability**: Import and customize existing ontologies
3. **Flexibility**: Same names in different contexts
4. **Safety**: Validation before publishing

### For System
1. **Scalability**: Supports unlimited ontology groups
2. **Zep Alignment**: Maps cleanly to Zep's ontology system
3. **Version Control**: Track changes over time
4. **Performance**: Efficient namespace lookups

### For Collaboration
1. **Sharing**: Share ontology groups with teams
2. **Templates**: Community-contributed ontologies
3. **Standards**: Industry-standard ontologies
4. **Evolution**: Fork and extend existing ontologies

---

## Next Steps

1. **Implement Core Tables**: Create Airtable schema
2. **Build UI Components**: Entity/Edge browsers and editors
3. **Namespace Service**: Implement conflict detection
4. **Zep Integration**: Publishing pipeline
5. **Template Library**: Pre-built ontologies
6. **Testing Suite**: Validation and quality checks
7. **Documentation**: User guides and API docs

---

## Appendix: Example Ontologies

### Healthcare Domain
```
Entities: Patient, Doctor, Appointment, Medication, Diagnosis
Edges: TREATED_BY, DIAGNOSED_WITH, PRESCRIBED, SCHEDULED_FOR
```

### Finance Domain
```
Entities: Account, Transaction, Customer, Product, Invoice
Edges: OWNS, PURCHASED, PAID_FOR, ISSUED_TO
```

### Education Domain
```
Entities: Student, Course, Instructor, Assignment, Grade
Edges: ENROLLED_IN, TEACHES, SUBMITTED, GRADED_BY
```