# Test Design: Story CORE-002 - Entity and Edge Management

Date: 2025-09-01
Designer: Quinn (Test Architect)

## Test Strategy Overview

- Total test scenarios: 58
- Unit tests: 28 (48%)
- Integration tests: 20 (35%)
- E2E tests: 10 (17%)
- Priority distribution: P0: 40, P1: 14, P2: 4

## Test Scenarios by Acceptance Criteria

### AC1: Create Entity Types

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-001  | Unit        | P0       | Create entity type with valid schema         | Core type definition logic            |
| CORE2-UNIT-002  | Unit        | P0       | Validate property type definitions           | Schema validation logic               |
| CORE2-UNIT-003  | Unit        | P0       | Enforce required vs optional properties      | Property requirement validation       |
| CORE2-UNIT-004  | Unit        | P0       | Apply property validation rules              | Constraint enforcement logic          |
| CORE2-UNIT-005  | Unit        | P1       | Auto-generate entity ID                      | ID generation logic                   |
| CORE2-INT-001   | Integration | P0       | Assign entity type to ontology               | Ontology association verification     |
| CORE2-INT-002   | Integration | P0       | Prevent duplicate type names                 | Uniqueness constraint enforcement     |
| CORE2-E2E-001   | E2E         | P0       | Create entity type through UI                | Complete user flow validation         |

### AC2: Entity CRUD Operations

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-006  | Unit        | P0       | List entities with filtering                 | Query logic validation                |
| CORE2-UNIT-007  | Unit        | P0       | Filter entities by type                      | Type filtering logic                  |
| CORE2-UNIT-008  | Unit        | P0       | Update entity properties dynamically         | Property update logic                 |
| CORE2-UNIT-009  | Unit        | P0       | Delete entity with cascade options           | Cascade deletion logic                |
| CORE2-UNIT-010  | Unit        | P0       | Bulk create entities from JSON               | Batch processing logic                |
| CORE2-UNIT-011  | Unit        | P1       | Export entities to JSON format               | Serialization logic                   |
| CORE2-INT-003   | Integration | P0       | Entity persistence in database               | Database operation validation         |
| CORE2-INT-004   | Integration | P0       | Bulk operations transaction handling         | Transaction integrity                 |
| CORE2-INT-005   | Integration | P1       | Pagination for large datasets                | Performance optimization              |
| CORE2-E2E-002   | E2E         | P0       | Complete entity CRUD cycle                   | Full lifecycle validation             |

### AC3: Property Management

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-012  | Unit        | P0       | Support multiple property types              | Type system validation                |
| CORE2-UNIT-013  | Unit        | P0       | Define property constraints                  | Constraint definition logic           |
| CORE2-UNIT-014  | Unit        | P0       | Set default values for properties            | Default value application             |
| CORE2-UNIT-015  | Unit        | P0       | Property inheritance from type               | Inheritance logic                     |
| CORE2-UNIT-016  | Unit        | P0       | Validate properties on save                  | Validation execution                  |
| CORE2-INT-006   | Integration | P0       | Min/max constraint enforcement               | Numeric constraint validation         |
| CORE2-INT-007   | Integration | P0       | Regex pattern validation                     | String pattern validation             |
| CORE2-INT-008   | Integration | P0       | Enum constraint validation                   | Enumeration validation                |
| CORE2-E2E-003   | E2E         | P1       | Property validation error display            | User feedback validation              |

### AC4: Create Edge Types

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-017  | Unit        | P0       | Define edge with name and type               | Edge type definition logic            |
| CORE2-UNIT-018  | Unit        | P0       | Specify source and target entity types       | Type relationship logic               |
| CORE2-UNIT-019  | Unit        | P0       | Set cardinality constraints                  | Cardinality definition logic          |
| CORE2-UNIT-020  | Unit        | P1       | Define edge properties                       | Edge property schema                  |
| CORE2-UNIT-021  | Unit        | P1       | Directional vs bidirectional edges           | Direction handling logic              |
| CORE2-INT-009   | Integration | P0       | Validate entity type compatibility           | Type matching validation              |
| CORE2-INT-010   | Integration | P0       | Store edge type in database                  | Edge type persistence                 |
| CORE2-E2E-004   | E2E         | P0       | Create edge type through UI                  | User flow for edge creation          |

### AC5: Edge CRUD Operations

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-022  | Unit        | P0       | Create edges between entities                | Edge creation logic                   |
| CORE2-UNIT-023  | Unit        | P0       | Validate source/target compatibility         | Compatibility checking logic          |
| CORE2-UNIT-024  | Unit        | P0       | List edges by ontology                       | Edge query logic                      |
| CORE2-UNIT-025  | Unit        | P1       | Filter edges by type or entities             | Edge filtering logic                  |
| CORE2-UNIT-026  | Unit        | P1       | Update edge properties                       | Edge property modification            |
| CORE2-UNIT-027  | Unit        | P1       | Delete edges with cleanup                    | Edge deletion logic                   |
| CORE2-INT-011   | Integration | P0       | Create bidirectional edges                   | Bidirectional edge handling           |
| CORE2-INT-012   | Integration | P0       | Query connected entities                     | Graph traversal validation            |
| CORE2-E2E-005   | E2E         | P0       | Complete edge lifecycle                      | Full edge CRUD validation             |

### AC6: Relationship Validation

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-UNIT-028  | Unit        | P0       | Enforce entity type constraints              | Type constraint logic                 |
| CORE2-INT-013   | Integration | P0       | Validate one-to-one cardinality              | Strictest cardinality enforcement     |
| CORE2-INT-014   | Integration | P0       | Validate one-to-many cardinality             | Common cardinality pattern            |
| CORE2-INT-015   | Integration | P0       | Validate many-to-one cardinality             | Reverse cardinality pattern           |
| CORE2-INT-016   | Integration | P0       | Validate many-to-many cardinality            | Flexible cardinality pattern          |
| CORE2-INT-017   | Integration | P0       | Prevent circular dependencies                | Graph cycle detection                 |
| CORE2-INT-018   | Integration | P0       | Check for orphaned edges                     | Referential integrity check           |
| CORE2-INT-019   | Integration | P0       | Maintain referential integrity               | Consistency enforcement               |
| CORE2-E2E-006   | E2E         | P0       | Cardinality violation error handling         | User feedback for violations          |

## Additional Test Scenarios

### Performance and Scale

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-E2E-007   | E2E         | P1       | Handle 1000+ entities efficiently            | Scale validation                      |
| CORE2-E2E-008   | E2E         | P1       | Complex graph queries under 1s               | Query performance validation          |

### Error Handling

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-INT-020   | Integration | P1       | Graceful handling of invalid schemas         | Error recovery validation             |
| CORE2-E2E-009   | E2E         | P1       | Clear error messages for violations          | User experience validation            |

### Data Integrity

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-E2E-010   | E2E         | P2       | Import/export data consistency               | Data portability validation           |

### Audit and Stats

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| CORE2-INT-021   | Integration | P2       | Update ontology stats on changes             | Statistics accuracy                   |
| CORE2-INT-022   | Integration | P2       | Timestamp tracking for entities/edges        | Audit trail validation                |

## Risk Coverage

### Critical Data Modeling Risks Mitigated

- **RISK-001: Data Corruption** - Covered by: CORE2-UNIT-016, CORE2-INT-006, CORE2-INT-007, CORE2-INT-008
- **RISK-002: Invalid Relationships** - Covered by: CORE2-INT-013 through CORE2-INT-019
- **RISK-003: Schema Violations** - Covered by: CORE2-UNIT-002, CORE2-UNIT-003, CORE2-UNIT-012
- **RISK-004: Referential Integrity Loss** - Covered by: CORE2-UNIT-009, CORE2-INT-018, CORE2-INT-019
- **RISK-005: Cardinality Violations** - Covered by: CORE2-INT-013 through CORE2-INT-016
- **RISK-006: Performance Degradation** - Covered by: CORE2-INT-005, CORE2-E2E-007, CORE2-E2E-008
- **RISK-007: Bulk Operation Failures** - Covered by: CORE2-UNIT-010, CORE2-INT-004

## Recommended Execution Order

1. **P0 Unit tests** (48% - validate core logic)
   - Entity type creation and schema validation (CORE2-UNIT-001 through CORE2-UNIT-005)
   - Property management and validation (CORE2-UNIT-012 through CORE2-UNIT-016)
   - Edge type definitions (CORE2-UNIT-017 through CORE2-UNIT-019)
   - Basic CRUD operations (CORE2-UNIT-006 through CORE2-UNIT-009)

2. **P0 Integration tests** (35% - verify data integrity)
   - Database operations (CORE2-INT-001, CORE2-INT-003)
   - Constraint enforcement (CORE2-INT-006 through CORE2-INT-008)
   - Cardinality validation (CORE2-INT-013 through CORE2-INT-016)
   - Referential integrity (CORE2-INT-017 through CORE2-INT-019)

3. **P0 E2E tests** (17% - validate user workflows)
   - Entity type creation flow (CORE2-E2E-001)
   - Complete CRUD cycles (CORE2-E2E-002, CORE2-E2E-005)
   - Cardinality enforcement UI (CORE2-E2E-006)

4. **P1 tests** (important enhancements)
   - Bulk operations and exports
   - Advanced filtering and queries
   - Performance optimizations
   - Error handling improvements

5. **P2 tests** (nice to have)
   - Import/export consistency
   - Statistics accuracy
   - Audit trail completeness

## Test Data Requirements

### Entity Types
- Simple type: Name only, no properties
- Complex type: 10+ properties with mixed types
- Constrained type: Properties with all constraint types
- Inherited type: Properties from parent type

### Entities
- Minimal entity: Required properties only
- Complete entity: All properties populated
- Invalid entity: Constraint violations for testing
- Large dataset: 1000+ entities for performance

### Edge Types
- One-to-one: Manager to Office
- One-to-many: Department to Employees
- Many-to-one: Employees to Department
- Many-to-many: Students to Courses
- Bidirectional: Friend relationships

### Test Graphs
- Linear graph: A→B→C→D
- Tree structure: Hierarchical organization
- Cyclic graph: A→B→C→A (for cycle detection)
- Disconnected components: Multiple isolated subgraphs
- Dense graph: High edge-to-node ratio

## Testing Approach

### Unit Testing Strategy
```typescript
describe('Entity Type Creation', () => {
  test('creates type with valid schema', async () => {
    const schema = {
      properties: [
        { name: 'age', type: 'number', required: true },
        { name: 'email', type: 'string', required: true }
      ]
    };
    const typeId = await createEntityType('Person', schema);
    expect(typeId).toBeDefined();
  });

  test('validates property constraints', async () => {
    const entity = { age: 200, email: 'invalid' };
    await expect(validateProperties(entity, schema))
      .rejects.toContain(['age must be <= 150']);
  });
});
```

### Integration Testing Strategy
```typescript
describe('Cardinality Enforcement', () => {
  test('enforces one-to-one relationships', async () => {
    const edge1 = await createEdge(manager1, office1);
    // Should fail - manager already has office
    await expect(createEdge(manager1, office2))
      .rejects.toThrow('one-to-one constraint');
  });

  test('maintains referential integrity', async () => {
    await deleteEntity(entityId, { cascade: false });
    const orphanedEdges = await getOrphanedEdges();
    expect(orphanedEdges).toHaveLength(0);
  });
});
```

### E2E Testing Strategy
```typescript
describe('Complete Entity Lifecycle', () => {
  test('creates, updates, and deletes entity', async () => {
    // Create through UI
    await page.click('[data-testid="create-entity"]');
    await page.fill('[name="name"]', 'Test Entity');
    await page.click('[type="submit"]');
    
    // Verify creation
    await expect(page.locator('text=Test Entity')).toBeVisible();
    
    // Update
    await page.click('[data-testid="edit-entity"]');
    await page.fill('[name="description"]', 'Updated');
    
    // Delete with cascade
    await page.click('[data-testid="delete-entity"]');
    await page.click('[data-testid="confirm-cascade"]');
  });
});
```

## Quality Checklist

Before test execution:

- ✅ All 23 acceptance criteria have test coverage
- ✅ Schema validation thoroughly tested
- ✅ Cardinality constraints verified for all patterns
- ✅ Referential integrity maintained in all scenarios
- ✅ Property validation covers all constraint types
- ✅ Bulk operations tested for correctness and performance
- ✅ Error scenarios have clear feedback
- ✅ Graph operations validate connectivity
- ✅ Performance benchmarks established

## Key Testing Principles Applied

- **Data Integrity First**: 40% of tests focus on validation and constraints
- **Graph Correctness**: Comprehensive cardinality and relationship testing
- **Scalability Focus**: Performance tests for realistic data volumes
- **Error Path Coverage**: Validation failures tested as thoroughly as success
- **User Journey Testing**: E2E tests cover complete workflows

## Notes for Test Implementation

1. **Test Database**: Use isolated test ontologies to prevent interference
2. **Data Generators**: Create factories for complex test data
3. **Transaction Rollback**: Ensure test cleanup after each scenario
4. **Performance Baselines**: Establish metrics for query times
5. **Constraint Testing**: Test boundary conditions for all constraints
6. **Cascade Testing**: Verify both cascade and restrict deletion modes
7. **Concurrent Updates**: Test for race conditions in cardinality enforcement
8. **Graph Validation**: Use graph algorithms to verify structure integrity