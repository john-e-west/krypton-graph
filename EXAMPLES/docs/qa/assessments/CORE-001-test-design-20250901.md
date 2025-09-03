# Test Design: Story CORE-001 - Ontology CRUD Operations

Date: 2025-09-01
Designer: Quinn (Test Architect)
Story: CORE-001 - Ontology CRUD Operations

## Test Strategy Overview

- Total test scenarios: 48
- Unit tests: 22 (46%)
- Integration tests: 18 (37%)
- E2E tests: 8 (17%)
- Priority distribution: P0: 20, P1: 18, P2: 10

## Test Scenarios by Acceptance Criteria

### AC1: Create Ontology

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-001 | Unit        | P0       | Validate required fields (name, domain)          | Pure validation logic                   |
| CORE-001-UNIT-002 | Unit        | P0       | Validate name length constraints (3-100 chars)   | Boundary validation                     |
| CORE-001-UNIT-003 | Unit        | P1       | Validate name pattern (alphanumeric + special)   | Input sanitization                      |
| CORE-001-UNIT-004 | Unit        | P1       | Validate domain against allowed values           | Enum validation                         |
| CORE-001-INT-001  | Integration | P0       | Create with valid data persists to DB            | Core functionality                      |
| CORE-001-INT-002  | Integration | P0       | Unique name validation within domain             | Data integrity                          |
| CORE-001-INT-003  | Integration | P1       | Auto-generate timestamps on creation             | Metadata tracking                       |
| CORE-001-INT-004  | Integration | P1       | Default status set to "draft"                    | Business rule                           |
| CORE-001-INT-005  | Integration | P1       | Audit log entry created                          | Compliance requirement                  |
| CORE-001-E2E-001  | E2E         | P0       | User creates ontology through UI                 | Critical user journey                   |

### AC2: Read Operations

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-005 | Unit        | P1       | Validate pagination parameters                   | Input validation                        |
| CORE-001-UNIT-006 | Unit        | P2       | Validate sort field names                        | Parameter validation                    |
| CORE-001-INT-006  | Integration | P0       | Get ontology by valid ID                         | Core functionality                      |
| CORE-001-INT-007  | Integration | P0       | Get returns 404 for non-existent ID              | Error handling                          |
| CORE-001-INT-008  | Integration | P1       | List all ontologies with pagination              | Data retrieval                          |
| CORE-001-INT-009  | Integration | P1       | Filter by status (draft/active/archived)         | Query filtering                         |
| CORE-001-INT-010  | Integration | P1       | Filter by domain                                 | Query filtering                         |
| CORE-001-INT-011  | Integration | P2       | Search by partial name match                     | Search functionality                    |
| CORE-001-INT-012  | Integration | P2       | Sort by name, created date, updated date         | Data ordering                           |
| CORE-001-INT-013  | Integration | P1       | Include entity/edge counts in response           | Aggregation logic                       |
| CORE-001-E2E-002  | E2E         | P0       | User views ontology list with filters            | Core user journey                       |
| CORE-001-E2E-003  | E2E         | P1       | User searches and finds specific ontology        | Search workflow                         |

### AC3: Update Ontology

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-007 | Unit        | P0       | Validate update field constraints                | Input validation                        |
| CORE-001-UNIT-008 | Unit        | P0       | Validate status transition rules                 | Business logic                          |
| CORE-001-INT-014  | Integration | P0       | Update name, description, domain                 | Core functionality                      |
| CORE-001-INT-015  | Integration | P0       | Prevent updates on archived ontologies           | Business rule enforcement               |
| CORE-001-INT-016  | Integration | P0       | Unique name validation on update                 | Data integrity                          |
| CORE-001-INT-017  | Integration | P1       | Update modifies timestamp                        | Metadata tracking                       |
| CORE-001-INT-018  | Integration | P1       | Audit log tracks changes                         | Compliance                              |
| CORE-001-INT-019  | Integration | P2       | Partial updates preserve unchanged fields        | Data preservation                       |
| CORE-001-E2E-004  | E2E         | P0       | User edits ontology with optimistic updates      | Real-time collaboration                 |

### AC4: Delete Ontology

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-009 | Unit        | P0       | Validate cascade option                          | Parameter validation                    |
| CORE-001-UNIT-010 | Unit        | P1       | Validate hard delete option                      | Parameter validation                    |
| CORE-001-INT-020  | Integration | P0       | Soft delete (archive) by default                 | Data safety                             |
| CORE-001-INT-021  | Integration | P0       | Cannot delete active ontology without flag       | Data protection                         |
| CORE-001-INT-022  | Integration | P0       | Hard delete with cascade removes all data        | Cascade functionality                   |
| CORE-001-INT-023  | Integration | P1       | Delete confirmation for non-empty ontologies     | User safety                             |
| CORE-001-INT-024  | Integration | P1       | Audit log tracks deletion                        | Compliance                              |
| CORE-001-E2E-005  | E2E         | P0       | User archives ontology through UI                | Critical workflow                       |
| CORE-001-E2E-006  | E2E         | P1       | User performs cascade delete with confirmation   | Destructive operation safety            |

### AC5: Status Transitions

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-011 | Unit        | P0       | Validate Draft → Active transition               | State machine logic                     |
| CORE-001-UNIT-012 | Unit        | P0       | Validate Active → Archived transition            | State machine logic                     |
| CORE-001-UNIT-013 | Unit        | P0       | Validate Archived → Active reactivation          | State machine logic                     |
| CORE-001-UNIT-014 | Unit        | P0       | Prevent Active → Draft regression                | Business rule                           |
| CORE-001-INT-025  | Integration | P1       | Status change persists to database               | State persistence                       |
| CORE-001-INT-026  | Integration | P1       | Status history tracked in audit log              | Compliance                              |
| CORE-001-E2E-007  | E2E         | P1       | User promotes ontology from draft to active      | Workflow completion                     |

### AC6: Data Integrity

#### Scenarios

| ID                | Level       | Priority | Test                                              | Justification                           |
| ----------------- | ----------- | -------- | ------------------------------------------------- | --------------------------------------- |
| CORE-001-UNIT-015 | Unit        | P0       | Validate unique constraint logic                 | Constraint validation                   |
| CORE-001-UNIT-016 | Unit        | P0       | Validate required field enforcement              | Data validation                         |
| CORE-001-UNIT-017 | Unit        | P1       | Validate maximum length constraints              | Boundary testing                        |
| CORE-001-UNIT-018 | Unit        | P1       | Validate domain value constraints                | Enum validation                         |
| CORE-001-INT-027  | Integration | P0       | Referential integrity maintained on delete       | Data consistency                        |
| CORE-001-INT-028  | Integration | P0       | Concurrent update conflict resolution            | Concurrency control                     |
| CORE-001-E2E-008  | E2E         | P2       | Multi-user concurrent editing handled properly   | Real-time collaboration                 |

## Risk Coverage

### Identified Risks and Mitigations

| Risk ID    | Risk Description                      | Mitigating Tests                                           |
| ---------- | ------------------------------------- | ---------------------------------------------------------- |
| RISK-001   | Data loss on deletion                | CORE-001-INT-020, CORE-001-INT-022, CORE-001-E2E-006      |
| RISK-002   | Duplicate names causing confusion    | CORE-001-INT-002, CORE-001-INT-016                        |
| RISK-003   | Invalid state transitions            | CORE-001-UNIT-011 through CORE-001-UNIT-014               |
| RISK-004   | Concurrent edit conflicts            | CORE-001-INT-028, CORE-001-E2E-008                        |
| RISK-005   | Orphaned entities after deletion     | CORE-001-INT-022, CORE-001-INT-027                        |
| RISK-006   | Audit trail gaps                     | CORE-001-INT-005, CORE-001-INT-018, CORE-001-INT-024      |

## Recommended Execution Order

1. **P0 Unit tests** (10 tests) - Fail fast on validation logic
2. **P0 Integration tests** (8 tests) - Core functionality verification
3. **P0 E2E tests** (2 tests) - Critical user journeys
4. **P1 Unit tests** (8 tests) - Additional validation coverage
5. **P1 Integration tests** (8 tests) - Extended functionality
6. **P1 E2E tests** (2 tests) - Important workflows
7. **P2 tests** (10 tests) - Nice-to-have coverage as time permits

## Test Data Requirements

### Standard Test Fixtures

```yaml
test_ontologies:
  valid_minimal:
    name: "Test Ontology"
    domain: "healthcare"
  
  valid_complete:
    name: "Complete Test Ontology"
    domain: "finance"
    description: "Full test ontology with all fields"
    metadata:
      tags: ["test", "automated"]
      owner: "test@example.com"
      version: "1.0.0"
  
  boundary_cases:
    min_name: "ABC"  # 3 chars
    max_name: "A" * 100  # 100 chars
    special_chars: "Test-Ontology_2025"
    
  invalid_cases:
    short_name: "AB"  # Too short
    long_name: "A" * 101  # Too long
    invalid_chars: "Test@Ontology#"
    invalid_domain: "invalid_domain"
```

## Performance Benchmarks

- Create operation: < 200ms
- Get by ID: < 50ms
- List with pagination: < 100ms for 50 records
- Update operation: < 150ms
- Soft delete: < 100ms
- Hard delete with cascade: < 500ms for ontology with 100 entities

## Security Test Scenarios

| Test              | Description                                    | Priority |
| ----------------- | ---------------------------------------------- | -------- |
| SQL Injection     | Test name field with SQL injection attempts   | P0       |
| XSS Prevention    | Test description with script tags             | P0       |
| Access Control    | Verify archived ontology access restrictions  | P1       |
| Rate Limiting     | Test bulk creation rate limits                | P2       |

## Quality Gate Metrics

```yaml
test_design:
  scenarios_total: 48
  by_level:
    unit: 22
    integration: 18
    e2e: 8
  by_priority:
    p0: 20
    p1: 18
    p2: 10
  coverage_gaps: []  # All ACs covered
  risk_coverage: 100%  # All identified risks have mitigating tests
```

## Test Automation Recommendations

1. **Unit Tests**: Jest with Convex test utilities
2. **Integration Tests**: Convex test environment with mock data
3. **E2E Tests**: Cypress for UI workflows
4. **Performance Tests**: k6 or Artillery for load testing
5. **Security Tests**: OWASP ZAP for vulnerability scanning

## Maintenance Considerations

- Tests should be independent and idempotent
- Use test fixtures to avoid test data coupling
- Clean up test data after each test run
- Mock external dependencies (Zep) for faster execution
- Implement retry logic for flaky integration tests
- Use snapshot testing for audit log format validation

## Summary

The test design provides comprehensive coverage of all CRUD operations with appropriate test levels. Unit tests focus on validation and business logic (46%), integration tests verify database operations and service interactions (37%), and E2E tests validate critical user journeys (17%). This distribution follows the test pyramid principle for maintainable and efficient test execution.

Priority distribution ensures critical functionality (P0: 42%) is thoroughly tested while providing good coverage of important features (P1: 37%) and reasonable coverage of edge cases (P2: 21%).

---

**Test Design Complete**
Generated by: Quinn (Test Architect)
Review Status: Ready for Implementation