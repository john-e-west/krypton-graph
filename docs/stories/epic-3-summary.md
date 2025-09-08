# Epic 3: Ontology Management System - Summary

## Epic Overview
- **Epic Number**: 3
- **Epic Goal**: Create comprehensive ontology management for defining Pydantic-based entity and edge schemas with validation
- **Total Story Points**: 31 points
- **Estimated Duration**: 2 sprints (4 weeks)
- **Priority**: P0 - Must Have
- **Dependencies**: Epics 1 and 2 provide foundation

## Stories Summary

### Story 3.1: Ontology List and Management Interface
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - CRUD operations for ontologies
  - Search and filtering
  - Clone functionality
  - Export/import (Python/JSON)
  - Dependency checking

### Story 3.2: Entity Type Definition Editor
- **Points**: 8
- **Status**: Draft
- **Key Features**:
  - Visual Pydantic model builder
  - Field type support (int, str, float, datetime, bool, list)
  - Constraint configuration
  - Code preview with syntax highlighting
  - Protected attribute validation

### Story 3.3: Edge Type Definition Builder
- **Points**: 8
- **Status**: Draft
- **Key Features**:
  - Edge attribute definition
  - Source-target mapping configuration
  - Cardinality settings (1:1, 1:n, n:n)
  - Template library
  - Fallback patterns

### Story 3.4: Test Dataset Creation
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - Dynamic form generation from schemas
  - CSV batch import
  - Edge creation with validation
  - Sample text generation
  - Python fixture export

### Story 3.5: Ontology Code Generation and Export
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - Complete Python module generation
  - Edge type map dictionary
  - Syntax validation
  - Multi-file export
  - Version tracking

## Technical Architecture

### System Flow
```
Define Ontology → Create Entity Types → Define Edge Types → Test Data → Generate Code
       ↓              ↓                    ↓                ↓            ↓
   [Validate]    [Preview Code]      [Map Relations]   [Validate]  [Export Python]
```

### Key Technologies
- **Frontend**: React, Form builders, Dynamic forms
- **Validation**: Zod schemas, Pydantic constraints
- **Code Generation**: Template engines, AST parsing
- **Storage**: Airtable (Ontologies, EntityDefinitions, EdgeDefinitions)
- **Export**: Python code, JSON, fixtures

### Data Models
```typescript
Ontology {
  id, name, version, status
  entityTypes: EntityDefinition[]
  edgeTypes: EdgeDefinition[]
}

EntityDefinition {
  name, fields: Field[]
  baseClass, validators
}

EdgeDefinition {
  name, attributes: Field[]
  mappings: SourceTargetMap[]
  cardinality
}
```

## Implementation Strategy

### Sprint 3 (Recommended)
**Week 1:**
- Story 3.1: Ontology Management (5 points)
- Story 3.2: Entity Editor - Start (4 points)

**Week 2:**
- Story 3.2: Entity Editor - Complete (4 points)
- Story 3.3: Edge Editor - Start (4 points)

### Sprint 4 (Recommended)
**Week 1:**
- Story 3.3: Edge Editor - Complete (4 points)
- Story 3.4: Test Data Creation (5 points)

**Week 2:**
- Story 3.5: Code Generation (5 points)
- Integration testing and refinement

## Dependency Analysis

### Can Develop in Parallel:
- **Story 3.1** - Independent foundation
- **Story 3.5** - Code generation logic (with mocks)

### Sequential Dependencies:
1. Story 3.1 → Story 3.2 (need ontology container)
2. Story 3.2 → Story 3.3 (entities before edges)
3. Story 3.2 & 3.3 → Story 3.4 (schemas for test data)
4. All → Story 3.5 (needs complete ontology)

## Risk Assessment

### High Priority Risks
1. **Pydantic Compatibility**: Generated code must be valid Python
   - Mitigation: Syntax validation and testing
2. **Complex Type Support**: Nested/union types complexity
   - Mitigation: Start with basic types, iterate
3. **Validation Accuracy**: Form validation must match Pydantic
   - Mitigation: Extensive test coverage

### Medium Priority Risks
1. **Performance**: Large ontologies may slow UI
   - Mitigation: Pagination and lazy loading
2. **Version Management**: Ontology evolution
   - Mitigation: Version tracking system

## Success Metrics
- [ ] Generate valid Pydantic models
- [ ] Support all common field types
- [ ] Export working Python code
- [ ] < 2 second code generation
- [ ] 100% syntax validation accuracy

## Integration Points

### With Epic 1 (Foundation)
- Uses Airtable service for storage
- Displays in Ontologies page
- Updates dashboard metrics

### With Epic 2 (Document Processing)
- Ontologies define extraction schemas
- Entity/edge types structure chunking
- Test data validates extraction

### With Epic 4 (Graph Operations)
- Ontologies define graph structure
- Entity/edge types used in graph creation
- Validation rules apply to graph data

## Testing Requirements

### Unit Tests
- Form generation logic
- Code generation templates
- Validation rules
- Export formats

### Integration Tests
- End-to-end ontology creation
- Code generation and validation
- Test data creation flow
- Export/import round-trip

### Validation Tests
- Pydantic model compliance
- Python syntax checking
- Edge mapping consistency
- Constraint enforcement

## Key UI Components

### Entity Type Editor
- Dynamic field builder
- Type selector with constraints
- Live code preview
- Validation feedback

### Edge Type Builder
- Source-target mapper
- Cardinality selector
- Attribute editor
- Template gallery

### Test Data Creator
- Dynamic forms from schemas
- CSV import wizard
- Batch validation
- Export options

## Documentation Requirements
- Ontology design guide
- Pydantic model documentation
- Field type reference
- Edge mapping patterns
- Code generation API

## Next Steps
1. Review and approve all 5 stories
2. Set up code generation templates
3. Design dynamic form system
4. Plan validation architecture
5. Create UI mockups for editors

---

**Epic Status**: Draft - Ready for Review
**Created by**: Bob (Scrum Master)
**Date**: 2025-01-05
**Version**: 1.0