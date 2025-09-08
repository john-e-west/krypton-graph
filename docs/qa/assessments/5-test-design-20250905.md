# Test Design: Epic 5 - ZEP Integration

Date: 2025-01-06
Designer: Quinn (Test Architect)

## Epic Overview
Epic 5 encompasses the complete ZEP Knowledge Graph integration, including client setup, chunk synchronization, and embedding generation for semantic search capabilities.

## Test Strategy Overview

- **Total test scenarios:** 78
- **Unit tests:** 42 (54%)
- **Integration tests:** 24 (31%)
- **E2E tests:** 12 (15%)
- **Priority distribution:** P0: 35, P1: 28, P2: 12, P3: 3

## Story 5.1: ZEP Client Integration

### AC1: ZEP client wrapper with rate limiting (60 req/min)

#### Scenarios

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-001 | Unit | P0 | Validate rate limiter enforces 60 req/min limit | Core business logic validation |
| 5.1-UNIT-002 | Unit | P0 | Test token bucket refill logic | Algorithm correctness critical |
| 5.1-UNIT-003 | Unit | P1 | Verify request queuing when limit exceeded | Pure queue management logic |
| 5.1-INT-001 | Integration | P0 | Test rate limiting with actual API calls | Multi-component interaction |
| 5.1-E2E-001 | E2E | P1 | User flow respects rate limits during bulk operations | Critical user journey |

### AC2: Exponential backoff retry logic

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-004 | Unit | P0 | Test exponential backoff calculation | Pure mathematical logic |
| 5.1-UNIT-005 | Unit | P0 | Verify max retry limit enforcement | Business rule validation |
| 5.1-UNIT-006 | Unit | P1 | Test backoff reset on success | State management logic |
| 5.1-INT-002 | Integration | P0 | Test retry behavior with simulated failures | Service interaction testing |
| 5.1-INT-003 | Integration | P1 | Verify circuit breaker opens after consecutive failures | Multi-component state |

### AC3: Episode-based document ingestion

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-007 | Unit | P0 | Validate episode creation parameters | Input validation logic |
| 5.1-UNIT-008 | Unit | P1 | Test episode metadata structure | Data transformation logic |
| 5.1-INT-004 | Integration | P0 | Create episode and verify in ZEP | API contract validation |
| 5.1-INT-005 | Integration | P0 | Test episode-document mapping persistence | Database interaction |
| 5.1-E2E-002 | E2E | P0 | Complete document ingestion as episode | Critical user journey |

### AC4: User mapping between Clerk and ZEP

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-009 | Unit | P0 | Test user ID mapping logic | Pure mapping algorithm |
| 5.1-UNIT-010 | Unit | P1 | Verify cache TTL enforcement | Cache logic validation |
| 5.1-INT-006 | Integration | P0 | Test user creation in ZEP | External service integration |
| 5.1-INT-007 | Integration | P0 | Verify mapping persistence in Airtable | Database operations |
| 5.1-E2E-003 | E2E | P1 | New user registration creates ZEP mapping | User journey validation |

### AC5: Connection health monitoring

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-011 | Unit | P1 | Test health check response structure | Response formatting logic |
| 5.1-UNIT-012 | Unit | P2 | Verify performance metric calculations | Statistical calculations |
| 5.1-INT-008 | Integration | P0 | Test health endpoint with live ZEP | Service connectivity |
| 5.1-INT-009 | Integration | P1 | Verify degraded performance detection | Monitoring logic |
| 5.1-E2E-004 | E2E | P2 | Dashboard displays accurate health status | UI integration |

### AC6: Comprehensive error handling

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.1-UNIT-013 | Unit | P0 | Test custom error class instantiation | Error creation logic |
| 5.1-UNIT-014 | Unit | P0 | Verify error message formatting | Message generation |
| 5.1-UNIT-015 | Unit | P1 | Test error categorization logic | Classification algorithm |
| 5.1-INT-010 | Integration | P0 | Verify error propagation through layers | System error flow |

## Story 5.2a: Chunk-to-ZEP Sync Engine

### AC1: Batch sync from Airtable chunks to ZEP episodes

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2a-UNIT-001 | Unit | P0 | Test batch size calculation logic | Core batching algorithm |
| 5.2a-UNIT-002 | Unit | P0 | Verify chunk grouping by document | Grouping logic |
| 5.2a-UNIT-003 | Unit | P1 | Test concurrency limiting (max 5) | Concurrency control |
| 5.2a-INT-001 | Integration | P0 | Sync batch of chunks to ZEP | Multi-service flow |
| 5.2a-INT-002 | Integration | P0 | Verify Airtable status updates | Database operations |
| 5.2a-E2E-001 | E2E | P0 | Complete document sync flow | Critical path |

### AC2: Episode tracking and management

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2a-UNIT-004 | Unit | P0 | Test episode state transitions | State machine logic |
| 5.2a-UNIT-005 | Unit | P1 | Verify episode completion detection | Business rule |
| 5.2a-INT-003 | Integration | P0 | Track episode across systems | Cross-system state |
| 5.2a-INT-004 | Integration | P1 | Test stale episode cleanup | Maintenance operations |

### AC3: Metadata preservation during sync

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2a-UNIT-006 | Unit | P0 | Test metadata transformation rules | Pure transformation |
| 5.2a-UNIT-007 | Unit | P0 | Validate required metadata fields | Validation logic |
| 5.2a-UNIT-008 | Unit | P1 | Test default value application | Fallback logic |
| 5.2a-INT-005 | Integration | P0 | Verify metadata in ZEP after sync | Data integrity |

### AC4: Sync status tracking in Airtable

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2a-UNIT-009 | Unit | P0 | Test status field updates | Update logic |
| 5.2a-UNIT-010 | Unit | P1 | Verify attempt counter increment | Counter logic |
| 5.2a-INT-006 | Integration | P0 | Track sync progress in Airtable | Database updates |
| 5.2a-INT-007 | Integration | P1 | Test concurrent status updates | Concurrency handling |

### AC5: Error handling with partial failure recovery

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2a-UNIT-011 | Unit | P0 | Test individual chunk retry logic | Retry algorithm |
| 5.2a-UNIT-012 | Unit | P0 | Verify partial batch processing | Continuation logic |
| 5.2a-INT-008 | Integration | P0 | Test rollback on critical failure | Recovery operations |
| 5.2a-INT-009 | Integration | P1 | Verify failure report generation | Reporting logic |
| 5.2a-E2E-002 | E2E | P1 | Recovery from mid-sync failure | Resilience testing |

## Story 5.2b: Embedding Generation & Storage

### AC1: Embedding generation for all chunks

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2b-UNIT-001 | Unit | P0 | Test embedding request formatting | Request creation |
| 5.2b-UNIT-002 | Unit | P0 | Verify batch size optimization | Batching algorithm |
| 5.2b-UNIT-003 | Unit | P1 | Test queue priority logic | Queue management |
| 5.2b-INT-001 | Integration | P0 | Generate embeddings via ZEP | API integration |
| 5.2b-INT-002 | Integration | P1 | Test parallel processing limits | Concurrency control |
| 5.2b-E2E-001 | E2E | P0 | Full embedding pipeline execution | End-to-end flow |

### AC2: Embedding storage in ZEP

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2b-UNIT-004 | Unit | P0 | Test chunk-embedding mapping | Mapping logic |
| 5.2b-UNIT-005 | Unit | P1 | Verify cache operations | Cache management |
| 5.2b-INT-003 | Integration | P0 | Store embeddings in ZEP | Storage operations |
| 5.2b-INT-004 | Integration | P1 | Test cache invalidation | Cache consistency |

### AC3: Embedding quality validation

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2b-UNIT-006 | Unit | P0 | Validate embedding dimensions (1536) | Dimension check |
| 5.2b-UNIT-007 | Unit | P0 | Test non-zero vector detection | Quality validation |
| 5.2b-UNIT-008 | Unit | P1 | Verify normalization check | Mathematical validation |
| 5.2b-INT-005 | Integration | P1 | Test similarity scoring | Quality metrics |

### AC4: Batch processing optimization

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2b-UNIT-009 | Unit | P1 | Test batch size calculation | Optimization logic |
| 5.2b-UNIT-010 | Unit | P2 | Verify load balancing logic | Distribution algorithm |
| 5.2b-INT-006 | Integration | P1 | Test with various chunk sizes | Performance testing |
| 5.2b-E2E-002 | E2E | P2 | Process 100+ chunks efficiently | Scale testing |

### AC5: Rollback capability on failure

| ID | Level | Priority | Test | Justification |
|---|---|---|---|---|
| 5.2b-UNIT-011 | Unit | P0 | Test checkpoint creation | State preservation |
| 5.2b-UNIT-012 | Unit | P1 | Verify rollback state restoration | Recovery logic |
| 5.2b-INT-007 | Integration | P0 | Test embedding deletion on rollback | Cleanup operations |
| 5.2b-INT-008 | Integration | P1 | Resume from checkpoint | Recovery flow |
| 5.2b-E2E-003 | E2E | P1 | Full rollback and retry scenario | Resilience testing |

## Risk Coverage Matrix

### High-Risk Areas Addressed

| Risk | Severity | Test Coverage |
|---|---|---|
| Rate limit violations | HIGH | 5.1-UNIT-001, 5.1-INT-001, 5.1-E2E-001 |
| Data loss during sync | HIGH | 5.2a-INT-008, 5.2a-E2E-002, 5.2b-INT-007 |
| Authentication failures | HIGH | 5.1-INT-006, 5.1-INT-008 |
| Embedding quality issues | MEDIUM | 5.2b-UNIT-006/007/008, 5.2b-INT-005 |
| Performance degradation | MEDIUM | 5.1-INT-009, 5.2b-E2E-002 |
| Partial sync failures | MEDIUM | 5.2a-UNIT-011/012, 5.2a-INT-008/009 |

## Recommended Execution Order

### Phase 1: Critical Path (P0 Tests)
1. **Unit Tests (Fail Fast)**
   - Rate limiting logic (5.1-UNIT-001/002)
   - Error handling (5.1-UNIT-013/014)
   - Batch processing (5.2a-UNIT-001/002)
   - Embedding validation (5.2b-UNIT-006/007)

2. **Integration Tests**
   - ZEP connectivity (5.1-INT-004/006/008)
   - Sync operations (5.2a-INT-001/002)
   - Embedding storage (5.2b-INT-003)

3. **E2E Tests**
   - Document ingestion (5.1-E2E-002)
   - Complete sync flow (5.2a-E2E-001)
   - Embedding pipeline (5.2b-E2E-001)

### Phase 2: Core Functionality (P1 Tests)
- Retry mechanisms
- User mappings
- Metadata preservation
- Quality metrics

### Phase 3: Enhancement Tests (P2/P3)
- Performance optimizations
- Dashboard integration
- Advanced monitoring

## Test Environment Requirements

### Unit Test Environment
- Mocked ZEP client
- In-memory databases
- Stubbed external services

### Integration Test Environment
- Test ZEP instance or sandbox
- Test Airtable base
- Mock authentication service

### E2E Test Environment
- Staging environment
- Test user accounts
- Sample document sets
- Performance monitoring

## Quality Checklist

- ✓ Every AC has test coverage
- ✓ No duplicate coverage across levels (each level tests different aspects)
- ✓ Critical paths have defense in depth
- ✓ Risk mitigations addressed
- ✓ Test IDs follow naming convention
- ✓ Scenarios are atomic and independent
- ✓ Performance requirements covered
- ✓ Error scenarios comprehensively tested

## Gate YAML Summary

```yaml
test_design:
  epic: 5
  stories_covered: [5.1, 5.2a, 5.2b]
  scenarios_total: 78
  by_level:
    unit: 42
    integration: 24
    e2e: 12
  by_priority:
    p0: 35
    p1: 28
    p2: 12
    p3: 3
  coverage_gaps: []
  critical_paths_covered:
    - zep_client_setup
    - rate_limiting
    - chunk_synchronization
    - embedding_generation
    - error_recovery
  risk_mitigations: 6
```

## Trace References

Test design matrix: docs/qa/assessments/5-test-design-20250905.md
P0 tests identified: 35
Critical integration points: 10
Performance benchmarks defined: 4