# Test Design: Story SETUP-003 - Zep API Integration Layer

Date: 2025-09-01
Designer: Quinn (Test Architect)

## Test Strategy Overview

- Total test scenarios: 42
- Unit tests: 20 (48%)
- Integration tests: 15 (36%)
- E2E tests: 7 (16%)
- Priority distribution: P0: 28, P1: 10, P2: 4

## Test Scenarios by Acceptance Criteria

### AC1: Zep Client Setup

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-001 | Unit        | P0       | Validate API client constructor              | Core initialization logic             |
| SETUP3-UNIT-002 | Unit        | P0       | Verify authentication header creation        | Security credential handling          |
| SETUP3-UNIT-003 | Unit        | P0       | Test base URL configuration                  | Connection setup validation           |
| SETUP3-UNIT-004 | Unit        | P1       | Request interceptor configuration            | Request modification logic            |
| SETUP3-INT-001  | Integration | P0       | API key authentication succeeds              | External service authentication       |
| SETUP3-INT-002  | Integration | P0       | Invalid API key rejected                     | Security boundary validation          |
| SETUP3-E2E-001  | E2E         | P0       | Full authentication flow works               | Complete auth path verification       |

### AC2: Graph Operations

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-005 | Unit        | P0       | Create graph request formatting              | Request structure validation          |
| SETUP3-UNIT-006 | Unit        | P0       | Add node request validation                  | Data structure verification           |
| SETUP3-UNIT-007 | Unit        | P0       | Add edge request validation                  | Relationship structure check          |
| SETUP3-UNIT-008 | Unit        | P0       | Query graph request structure                | Query formatting validation           |
| SETUP3-UNIT-009 | Unit        | P1       | Delete graph request handling                | Cleanup operation logic               |
| SETUP3-INT-003  | Integration | P0       | Create knowledge graph in Zep                | Core graph creation flow              |
| SETUP3-INT-004  | Integration | P0       | Add nodes to existing graph                  | Entity insertion validation           |
| SETUP3-INT-005  | Integration | P0       | Add edges between nodes                      | Relationship creation verification    |
| SETUP3-INT-006  | Integration | P0       | Query graph for connected nodes              | Data retrieval validation             |
| SETUP3-INT-007  | Integration | P1       | Delete graph and cleanup                     | Resource cleanup verification         |
| SETUP3-E2E-002  | E2E         | P0       | Complete graph lifecycle                     | Full CRUD operations path             |

### AC3: Convex Integration

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-010 | Unit        | P0       | Convex action parameter validation           | Input validation logic                |
| SETUP3-UNIT-011 | Unit        | P0       | Sync status update logic                     | State management verification         |
| SETUP3-INT-008  | Integration | P0       | Convex action triggers Zep sync              | Server-side integration flow          |
| SETUP3-INT-009  | Integration | P0       | Error states propagate correctly             | Error handling flow                   |
| SETUP3-INT-010  | Integration | P0       | Sync status tracked in database              | State persistence verification        |
| SETUP3-INT-011  | Integration | P0       | Retry mechanism on failure                   | Resilience verification               |
| SETUP3-E2E-003  | E2E         | P0       | User triggers sync from UI                   | Complete user journey                 |

### AC4: Type Safety

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-012 | Unit        | P0       | TypeScript interfaces compile                | Type definition validation            |
| SETUP3-UNIT-013 | Unit        | P0       | Request types validated                      | Type safety for requests              |
| SETUP3-UNIT-014 | Unit        | P0       | Response types validated                     | Type safety for responses             |
| SETUP3-UNIT-015 | Unit        | P1       | Error types properly typed                   | Error handling type safety            |
| SETUP3-INT-012  | Integration | P1       | Type mismatches caught at runtime            | Runtime type validation               |

### AC5: Reliability

#### Scenarios

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-016 | Unit        | P0       | Timeout handling logic                       | Timeout boundary validation           |
| SETUP3-UNIT-017 | Unit        | P0       | Exponential backoff calculation              | Retry delay logic                     |
| SETUP3-UNIT-018 | Unit        | P1       | Circuit breaker triggers correctly           | Failure prevention logic              |
| SETUP3-UNIT-019 | Unit        | P0       | Error logging captures details               | Debugging support validation          |
| SETUP3-INT-013  | Integration | P0       | Timeout triggers on slow response            | Network resilience validation         |
| SETUP3-INT-014  | Integration | P0       | Retry succeeds after transient failure       | Recovery mechanism verification       |
| SETUP3-E2E-004  | E2E         | P1       | System recovers from Zep outage              | Resilience under failure              |

## Additional Test Scenarios

### Error Handling

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-UNIT-020 | Unit        | P0       | ZepApiError contains correct fields          | Error structure validation            |
| SETUP3-INT-015  | Integration | P0       | 4xx errors handled appropriately             | Client error handling                 |
| SETUP3-E2E-005  | E2E         | P1       | User sees meaningful error messages          | UX error communication                |

### Performance

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-E2E-006  | E2E         | P2       | API calls complete under 5 seconds           | Performance requirement               |
| SETUP3-E2E-007  | E2E         | P2       | Batch operations handle 100+ entities        | Scalability validation                |

### Environment Configuration

| ID              | Level       | Priority | Test                                          | Justification                         |
| --------------- | ----------- | -------- | --------------------------------------------- | ------------------------------------- |
| SETUP3-INT-016  | Integration | P2       | Missing environment variables handled        | Configuration error handling          |
| SETUP3-INT-017  | Integration | P2       | Environment switching works                  | Multi-environment support             |

## Risk Coverage

### Critical Integration Risks Mitigated

- **RISK-001: Zep Service Unavailable** - Covered by: SETUP3-INT-013, SETUP3-INT-014, SETUP3-E2E-004
- **RISK-002: Authentication Failure** - Covered by: SETUP3-INT-001, SETUP3-INT-002, SETUP3-E2E-001
- **RISK-003: Data Sync Corruption** - Covered by: SETUP3-INT-009, SETUP3-INT-010, SETUP3-INT-011
- **RISK-004: Type Mismatches** - Covered by: SETUP3-UNIT-012 through SETUP3-UNIT-015, SETUP3-INT-012
- **RISK-005: Network Timeouts** - Covered by: SETUP3-UNIT-016, SETUP3-INT-013
- **RISK-006: Rate Limiting** - Covered by: SETUP3-UNIT-017, SETUP3-INT-014
- **RISK-007: Data Loss on Failure** - Covered by: SETUP3-INT-010, SETUP3-INT-011

## Recommended Execution Order

1. **P0 Unit tests** (48% - fail fast on core logic)
   - API client initialization (SETUP3-UNIT-001 through SETUP3-UNIT-003)
   - Request validation (SETUP3-UNIT-005 through SETUP3-UNIT-008)
   - Type safety (SETUP3-UNIT-012 through SETUP3-UNIT-014)
   - Error handling (SETUP3-UNIT-016, SETUP3-UNIT-017, SETUP3-UNIT-019, SETUP3-UNIT-020)

2. **P0 Integration tests** (36% - verify external integration)
   - Authentication flow (SETUP3-INT-001, SETUP3-INT-002)
   - Graph operations (SETUP3-INT-003 through SETUP3-INT-006)
   - Convex integration (SETUP3-INT-008 through SETUP3-INT-011)
   - Reliability (SETUP3-INT-013, SETUP3-INT-014, SETUP3-INT-015)

3. **P0 E2E tests** (16% - validate complete flows)
   - Authentication (SETUP3-E2E-001)
   - Graph lifecycle (SETUP3-E2E-002)
   - User sync flow (SETUP3-E2E-003)

4. **P1 tests** (important but not blocking)
   - Request interceptors
   - Delete operations
   - Circuit breaker
   - Error messaging
   - Recovery scenarios

5. **P2 tests** (nice to have)
   - Performance benchmarks
   - Batch scalability
   - Environment configuration

## Test Data Requirements

### Mock Data
- Valid Zep API key for testing
- Invalid API key for error cases
- Sample ontology with 5+ entities and 3+ edge types
- Large dataset (100+ entities) for scalability testing

### Test Graphs
- Simple graph: 3 nodes, 2 edges
- Complex graph: 50 nodes, 100 edges
- Isolated nodes: nodes without edges
- Cyclic relationships: A→B→C→A

### Error Scenarios
- Network timeout (>30 seconds)
- 401 Unauthorized
- 429 Rate Limited
- 500 Internal Server Error
- Network connection failure

## Testing Approach

### Unit Testing Strategy
```typescript
// Mock fetch for Zep client tests
jest.mock('global.fetch');

// Test timeout handling
it('should timeout after configured duration', async () => {
  const client = new ZepClient({ timeout: 100 });
  // Mock slow response
  expect(client.createGraph()).rejects.toThrow('timeout');
});

// Test retry logic
it('should retry with exponential backoff', async () => {
  const delays = [];
  await retryWithBackoff(failingFn, 3, 100);
  expect(delays).toEqual([100, 200, 400]);
});
```

### Integration Testing Strategy
```typescript
// Test with real Zep sandbox
describe('Zep Integration', () => {
  let testGraphId: string;
  
  afterEach(async () => {
    if (testGraphId) {
      await zep.deleteGraph(testGraphId);
    }
  });
  
  test('complete graph lifecycle', async () => {
    const graph = await zep.createGraph('test');
    testGraphId = graph.id;
    
    const node = await zep.addNode(graph.id, {...});
    expect(node.id).toBeDefined();
  });
});
```

### E2E Testing Strategy
```typescript
// Cypress test for user flow
describe('Zep Sync Flow', () => {
  it('syncs ontology to Zep', () => {
    cy.login();
    cy.visit('/ontologies/test-id');
    cy.contains('Sync to Zep').click();
    cy.contains('Syncing...').should('be.visible');
    cy.contains('Synced', { timeout: 10000 });
  });
});
```

## Quality Checklist

Before test execution:

- ✅ Every AC has comprehensive test coverage
- ✅ Test levels follow shift-left principle (48% unit tests)
- ✅ No duplicate test coverage across levels
- ✅ All P0 risks have mitigation tests
- ✅ Test IDs follow consistent naming convention
- ✅ Error scenarios comprehensively covered
- ✅ Performance requirements validated
- ✅ Type safety thoroughly tested
- ✅ Retry and resilience mechanisms verified

## Key Testing Principles Applied

- **Integration First**: External API integration is core functionality
- **Type Safety Focus**: TypeScript validation critical for maintainability
- **Resilience Testing**: Network failures and retries thoroughly tested
- **Mock Isolation**: Unit tests use mocked Zep responses
- **Real Integration**: Integration tests use Zep sandbox environment
- **Error Path Coverage**: Equal focus on success and failure paths

## Notes for Test Implementation

1. **Zep Sandbox**: Obtain sandbox API credentials for integration testing
2. **Mock Responses**: Create comprehensive mock response library
3. **Network Simulation**: Use tools to simulate network conditions
4. **Parallel Execution**: Run unit tests in parallel for speed
5. **Test Cleanup**: Ensure all test graphs are deleted after tests
6. **Environment Isolation**: Use separate test database in Convex
7. **Rate Limit Testing**: Implement gradual load increase for rate limit tests
8. **Monitoring**: Track API call counts and response times during tests