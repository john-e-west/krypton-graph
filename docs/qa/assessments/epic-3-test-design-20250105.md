# Test Design: Epic 3 - Ontology Management System

Date: 2025-01-05
Designer: Quinn (Test Architect)

## Test Strategy Overview

- Total test scenarios: 127
- Unit tests: 68 (54%)
- Integration tests: 42 (33%)
- E2E tests: 17 (13%)
- Priority distribution: P0: 45, P1: 48, P2: 24, P3: 10

## Story 3.1: Ontology List and Management Interface

### AC1: List view displaying all ontologies

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-001 | Unit | P0 | Parse ontology data structure | Data transformation logic |
| 3.1-UNIT-002 | Unit | P1 | Calculate entity/edge counts | Pure calculation function |
| 3.1-UNIT-003 | Unit | P1 | Format dates for display | Date formatting logic |
| 3.1-INT-001 | Integration | P0 | Fetch ontologies from Airtable | Database operation |
| 3.1-INT-002 | Integration | P1 | Sort ontologies by columns | Multi-component interaction |
| 3.1-E2E-001 | E2E | P0 | View complete ontology list | Critical user journey |

### AC2: Create new ontology

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-004 | Unit | P0 | Validate ontology name format | Input validation logic |
| 3.1-UNIT-005 | Unit | P0 | Check for duplicate names | Business rule validation |
| 3.1-INT-003 | Integration | P0 | Create ontology in Airtable | Database write operation |
| 3.1-INT-004 | Integration | P1 | Update UI after creation | State management flow |
| 3.1-E2E-002 | E2E | P0 | Complete ontology creation flow | Core user journey |

### AC3: Edit ontology metadata

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-006 | Unit | P1 | Toggle active/inactive status | State change logic |
| 3.1-INT-005 | Integration | P0 | Update ontology record | Database update operation |
| 3.1-INT-006 | Integration | P1 | Optimistic UI updates | UI state synchronization |

### AC4: Delete ontology with confirmation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-007 | Unit | P0 | Check for dependencies | Critical business logic |
| 3.1-UNIT-008 | Unit | P0 | Calculate cascade impact | Dependency analysis |
| 3.1-INT-007 | Integration | P0 | Delete ontology with cascade | Complex database operation |
| 3.1-INT-008 | Integration | P0 | Soft delete implementation | Data safety mechanism |
| 3.1-E2E-003 | E2E | P0 | Delete with dependency warning | Critical safety flow |

### AC5: Search and filter ontologies

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-009 | Unit | P1 | Filter by name search | Search algorithm |
| 3.1-UNIT-010 | Unit | P1 | Filter by status | Filter logic |
| 3.1-UNIT-011 | Unit | P2 | Apply date range filter | Date comparison logic |
| 3.1-INT-009 | Integration | P1 | Combined filter application | Multi-filter interaction |

### AC6: Clone existing ontology

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-012 | Unit | P1 | Generate new ontology ID | ID generation logic |
| 3.1-UNIT-013 | Unit | P1 | Deep copy entity/edge definitions | Complex cloning logic |
| 3.1-INT-010 | Integration | P1 | Clone with all relationships | Database operation |
| 3.1-E2E-004 | E2E | P1 | Complete clone workflow | User journey |

### AC7: Export/import ontology definitions

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.1-UNIT-014 | Unit | P0 | Generate Python export | Code generation logic |
| 3.1-UNIT-015 | Unit | P0 | Generate JSON export | Data serialization |
| 3.1-UNIT-016 | Unit | P0 | Parse import format | Import validation |
| 3.1-UNIT-017 | Unit | P0 | Handle version conflicts | Conflict resolution logic |
| 3.1-INT-011 | Integration | P0 | Import and create ontology | Database creation from import |
| 3.1-E2E-005 | E2E | P0 | Export and re-import cycle | Complete data portability |

## Story 3.2: Entity Type Definition Editor

### AC1: Form-based interface for entity types

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-001 | Unit | P0 | Validate entity name PascalCase | Naming convention |
| 3.2-UNIT-002 | Unit | P0 | Check base class selection | Configuration validation |
| 3.2-INT-001 | Integration | P0 | Save entity definition | Database operation |
| 3.2-E2E-001 | E2E | P0 | Create complete entity type | Core user flow |

### AC2: Field editor supporting Optional types

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-003 | Unit | P0 | Toggle Optional wrapper | Field configuration |
| 3.2-UNIT-004 | Unit | P1 | Reorder fields | UI state management |
| 3.2-INT-002 | Integration | P0 | Update field definitions | Database update |

### AC3: Support multiple field types

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-005 | Unit | P0 | Validate int type constraints | Type validation |
| 3.2-UNIT-006 | Unit | P0 | Validate str type constraints | Type validation |
| 3.2-UNIT-007 | Unit | P0 | Validate datetime format | Type validation |
| 3.2-UNIT-008 | Unit | P0 | Validate List[T] types | Complex type validation |
| 3.2-UNIT-009 | Unit | P1 | Validate Dict[K,V] types | Complex type validation |
| 3.2-UNIT-010 | Unit | P2 | Validate Union types | Advanced type validation |

### AC4: Pydantic Field configuration

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-011 | Unit | P0 | Apply min/max constraints | Constraint logic |
| 3.2-UNIT-012 | Unit | P0 | Apply regex patterns | Pattern validation |
| 3.2-UNIT-013 | Unit | P1 | Set default values | Default handling |
| 3.2-UNIT-014 | Unit | P1 | Configure enum constraints | Enum validation |
| 3.2-INT-003 | Integration | P0 | Save constraints to database | Persistence operation |

### AC5: Code generation preview

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-015 | Unit | P0 | Generate Pydantic model code | Code generation |
| 3.2-UNIT-016 | Unit | P0 | Include Field configurations | Field serialization |
| 3.2-UNIT-017 | Unit | P1 | Generate validators | Validator generation |
| 3.2-INT-004 | Integration | P1 | Syntax highlighting | UI component integration |

### AC6: Validation of field names

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-018 | Unit | P0 | Check protected attributes | Critical validation |
| 3.2-UNIT-019 | Unit | P0 | Check Python reserved words | Language compliance |
| 3.2-UNIT-020 | Unit | P0 | Detect duplicate field names | Data integrity |
| 3.2-UNIT-021 | Unit | P0 | Validate Python identifiers | Syntax compliance |

### AC7: Syntax validation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.2-UNIT-022 | Unit | P0 | Validate generated Python syntax | Code validity |
| 3.2-INT-005 | Integration | P0 | Test model instantiation | Runtime validation |
| 3.2-E2E-002 | E2E | P0 | Generate and validate complete entity | End-to-end validation |

## Story 3.3: Edge Type Definition Builder

### AC1: Form interface for edge types

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-001 | Unit | P0 | Validate edge name format | Naming convention |
| 3.3-UNIT-002 | Unit | P1 | Toggle directional property | Configuration logic |
| 3.3-INT-001 | Integration | P0 | Save edge definition | Database operation |
| 3.3-E2E-001 | E2E | P0 | Create complete edge type | Core user flow |

### AC2: Attribute definition

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-003 | Unit | P0 | Validate attribute types | Type validation |
| 3.3-UNIT-004 | Unit | P1 | Reorder attributes | State management |
| 3.3-INT-002 | Integration | P0 | Update attribute definitions | Database update |

### AC3: Edge type mapping configuration

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-005 | Unit | P0 | Validate source/target entities | Mapping validation |
| 3.3-UNIT-006 | Unit | P0 | Check cardinality constraints | Relationship rules |
| 3.3-UNIT-007 | Unit | P1 | Detect mapping conflicts | Conflict detection |
| 3.3-INT-003 | Integration | P0 | Save mapping configuration | Database operation |

### AC4: Entity fallback patterns

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-008 | Unit | P1 | Apply wildcard mappings | Pattern matching |
| 3.3-UNIT-009 | Unit | P2 | Resolve mapping precedence | Priority logic |
| 3.3-INT-004 | Integration | P1 | Test fallback resolution | Multi-component flow |

### AC5: Generate edge type code

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-010 | Unit | P0 | Generate edge class | Code generation |
| 3.3-UNIT-011 | Unit | P0 | Generate edge_type_map | Map generation |
| 3.3-INT-005 | Integration | P0 | Preview with syntax highlighting | UI integration |

### AC6: Validate edge consistency

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-012 | Unit | P0 | Check entity type existence | Reference validation |
| 3.3-UNIT-013 | Unit | P0 | Prevent circular dependencies | Graph validation |
| 3.3-UNIT-014 | Unit | P1 | Validate cardinality rules | Business rules |
| 3.3-INT-006 | Integration | P0 | Cross-validate with entities | Data consistency |

### AC7: Template library

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.3-UNIT-015 | Unit | P2 | Apply template patterns | Template logic |
| 3.3-INT-007 | Integration | P2 | Import template definitions | Database operation |
| 3.3-E2E-002 | E2E | P2 | Use template to create edge | User workflow |

## Story 3.4: Test Dataset Creation

### AC1: Dynamic form generation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-001 | Unit | P0 | Generate form from entity schema | Dynamic UI generation |
| 3.4-UNIT-002 | Unit | P0 | Render field by type | Field rendering logic |
| 3.4-UNIT-003 | Unit | P1 | Handle nested types | Complex type support |
| 3.4-INT-001 | Integration | P0 | Load schema and generate form | Component integration |

### AC2: Field validation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-004 | Unit | P0 | Apply Pydantic constraints | Validation logic |
| 3.4-UNIT-005 | Unit | P0 | Check required fields | Field requirement |
| 3.4-UNIT-006 | Unit | P0 | Validate type compatibility | Type checking |
| 3.4-INT-002 | Integration | P0 | Real-time validation feedback | UI interaction |

### AC3: Batch creation from CSV

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-007 | Unit | P0 | Parse CSV format | File parsing |
| 3.4-UNIT-008 | Unit | P0 | Map columns to fields | Data mapping |
| 3.4-UNIT-009 | Unit | P0 | Transform data types | Type conversion |
| 3.4-INT-003 | Integration | P0 | Import and validate CSV data | Batch processing |
| 3.4-E2E-001 | E2E | P1 | Complete CSV import flow | User journey |

### AC4: Test edge creation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-010 | Unit | P1 | Filter valid source entities | Selection logic |
| 3.4-UNIT-011 | Unit | P1 | Filter valid target entities | Selection logic |
| 3.4-INT-004 | Integration | P1 | Create edge with attributes | Database operation |

### AC5: Sample text generation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-012 | Unit | P2 | Generate text from template | Template processing |
| 3.4-UNIT-013 | Unit | P2 | Replace entity placeholders | String manipulation |
| 3.4-INT-005 | Integration | P2 | Generate text with entities | Multi-component |

### AC6: Export test fixtures

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-014 | Unit | P1 | Generate pytest fixtures | Code generation |
| 3.4-UNIT-015 | Unit | P2 | Format Python code | Code formatting |
| 3.4-INT-006 | Integration | P1 | Export complete test dataset | File generation |

### AC7: Validation report

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.4-UNIT-016 | Unit | P1 | Calculate validation statistics | Data analysis |
| 3.4-UNIT-017 | Unit | P1 | Generate recommendations | Rule engine |
| 3.4-INT-007 | Integration | P1 | Generate and export report | Report generation |
| 3.4-E2E-002 | E2E | P2 | Complete validation workflow | User journey |

## Story 3.5: Ontology Code Generation and Export

### AC1: Generate complete Python module

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-001 | Unit | P0 | Order definitions by dependencies | Dependency resolution |
| 3.5-UNIT-002 | Unit | P0 | Handle circular dependencies | Graph algorithm |
| 3.5-UNIT-003 | Unit | P0 | Generate module structure | Code organization |
| 3.5-INT-001 | Integration | P0 | Generate complete module | Multi-component |

### AC2: Include proper imports

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-004 | Unit | P0 | Analyze required imports | Import detection |
| 3.5-UNIT-005 | Unit | P0 | Sort and group imports | Code formatting |
| 3.5-UNIT-006 | Unit | P1 | Remove unused imports | Code optimization |

### AC3: Generate edge_type_map

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-007 | Unit | P0 | Generate mapping dictionary | Data structure generation |
| 3.5-UNIT-008 | Unit | P0 | Include cardinality info | Metadata inclusion |
| 3.5-UNIT-009 | Unit | P1 | Add fallback patterns | Pattern generation |

### AC4: Include documentation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-010 | Unit | P1 | Generate docstrings | Documentation |
| 3.5-UNIT-011 | Unit | P1 | Include field descriptions | Documentation |
| 3.5-UNIT-012 | Unit | P2 | Generate module docstring | Documentation |

### AC5: Export functionality

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-013 | Unit | P0 | Generate file download | File generation |
| 3.5-UNIT-014 | Unit | P1 | Copy to clipboard | Clipboard operation |
| 3.5-INT-002 | Integration | P0 | Download generated file | File system operation |
| 3.5-E2E-001 | E2E | P0 | Complete export workflow | Critical user journey |

### AC6: Syntax validation

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-015 | Unit | P0 | Validate Python syntax | Code validation |
| 3.5-INT-003 | Integration | P0 | Run syntax checker | External validation |
| 3.5-E2E-002 | E2E | P0 | Generate and validate code | End-to-end validation |

### AC7: Version tracking

#### Test Scenarios

| ID | Level | Priority | Test | Justification |
| --- | --- | --- | --- | --- |
| 3.5-UNIT-016 | Unit | P2 | Generate version metadata | Metadata generation |
| 3.5-UNIT-017 | Unit | P2 | Apply git-friendly formatting | Code formatting |
| 3.5-UNIT-018 | Unit | P3 | Calculate checksum | Data integrity |

## Risk Coverage

### High-Risk Areas (P0 Coverage)

1. **Data Integrity**: All CRUD operations have comprehensive P0 test coverage
2. **Code Generation**: Python code generation and syntax validation fully covered
3. **Dependency Management**: Cascade delete and circular dependency detection tested
4. **Field Validation**: Protected attributes and Python reserved words validated
5. **Import/Export**: Data portability thoroughly tested with round-trip scenarios

### Medium-Risk Areas (P1 Coverage)

1. **UI State Management**: Optimistic updates and real-time validation covered
2. **Complex Types**: List, Dict, and Union type handling tested
3. **Batch Operations**: CSV import with type validation covered
4. **Search and Filtering**: Multi-criteria filtering tested

### Low-Risk Areas (P2/P3 Coverage)

1. **Templates**: Basic template application tested
2. **Text Generation**: Sample text generation has minimal coverage
3. **Advanced Features**: Version tracking and checksums have basic tests

## Recommended Execution Order

### Phase 1: Critical Path (P0 Tests)
1. Unit tests for data validation and business logic (3.1-UNIT-001 through 3.5-UNIT-015)
2. Integration tests for database operations (3.1-INT-001 through 3.5-INT-003)
3. E2E tests for core user journeys (3.1-E2E-001 through 3.5-E2E-002)

### Phase 2: Core Functionality (P1 Tests)
1. Unit tests for secondary features
2. Integration tests for UI state management
3. E2E tests for complete workflows

### Phase 3: Nice-to-Have (P2/P3 Tests)
1. Template and text generation tests
2. Advanced filtering and search tests
3. Version tracking and metadata tests

## Test Environment Requirements

### Unit Test Environment
- Jest/Vitest for TypeScript unit tests
- Mock Airtable API responses
- In-memory test data

### Integration Test Environment
- Test Airtable base with sample data
- React Testing Library for component integration
- MSW for API mocking

### E2E Test Environment
- Playwright or Cypress for browser automation
- Staging environment with test Airtable instance
- Test user accounts with appropriate permissions

## Quality Gates

### Definition of Done
- All P0 tests passing (100% pass rate)
- P1 tests >90% pass rate
- Code coverage >80% for critical paths
- No critical or high-severity bugs
- Performance benchmarks met (response time <500ms)

### Exit Criteria
- All acceptance criteria have test coverage
- No duplicate test scenarios across levels
- Test execution time <10 minutes for unit/integration
- E2E test suite runs in <30 minutes

## Traceability Matrix

All 7 acceptance criteria across 5 stories have comprehensive test coverage:
- Story 3.1: 17 unit, 11 integration, 5 E2E tests
- Story 3.2: 22 unit, 5 integration, 2 E2E tests
- Story 3.3: 15 unit, 7 integration, 2 E2E tests
- Story 3.4: 17 unit, 7 integration, 2 E2E tests
- Story 3.5: 18 unit, 3 integration, 2 E2E tests

Total coverage ensures all functional requirements are validated at appropriate test levels.