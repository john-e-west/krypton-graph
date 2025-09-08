# Testing Strategy

## Overview

The Krypton Graph testing strategy provides comprehensive coverage across all layers of the application with a focus on reliability, maintainability, and developer productivity. We achieve >70% code coverage through a balanced approach of unit, integration, and end-to-end testing.

## Testing Framework & Tools

### Core Framework
- **Vitest**: Primary test runner with native TypeScript support
- **React Testing Library**: Component testing with user-centric approach
- **jsdom**: Browser environment simulation
- **MSW (Mock Service Worker)**: API mocking for integration tests

### Coverage & Reporting
- **@vitest/coverage-v8**: Code coverage with V8 provider
- **Coverage Thresholds**: 70% minimum for branches, functions, lines, and statements
- **HTML Reports**: Interactive coverage reports for detailed analysis

### Testing Utilities
- **Custom Render**: Wrapped RTL render with providers
- **Test Fixtures**: Reusable mock data and utilities
- **Mock Factories**: Consistent mock implementations

## Test Categories

### 1. Unit Tests
**Purpose**: Test individual functions and components in isolation

**Location**: `src/__tests__/components/` and `src/__tests__/lib/`

**Coverage**: >80% target

**Examples**:
```typescript
// Component unit test
describe('MetricsDashboard', () => {
  it('renders dashboard with loading state', () => {
    render(<MetricsDashboard graphId="test-graph" />)
    expect(screen.getByText(/loading classification metrics/i)).toBeInTheDocument()
  })

  it('displays metrics data correctly', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => mockMetrics })
    render(<MetricsDashboard graphId="test-graph" />)
    
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument()
    })
  })
})
```

### 2. API Tests
**Purpose**: Test API endpoints with mocked dependencies

**Location**: `src/__tests__/api/`

**Coverage**: 100% of endpoints

**Examples**:
```typescript
// API endpoint test
describe('/api/ontologies/merge', () => {
  it('successfully merges ontologies with union strategy', async () => {
    const request = new NextRequest('http://localhost/api/ontologies/merge', {
      method: 'POST',
      body: JSON.stringify({
        ontologyIds: ['ont1', 'ont2'],
        strategy: 'union',
        mergedOntologyName: 'Test Merge'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.mergedOntology.entityTypes).toHaveLength(3)
  })
})
```

### 3. Integration Tests
**Purpose**: Test complete workflows across multiple components

**Location**: `src/__tests__/integration/`

**Coverage**: Critical user journeys

**Examples**:
```typescript
// End-to-end workflow test
describe('Story 9.3: Complete Knowledge Graph Creation & Matching System', () => {
  it('completes full knowledge graph creation and management workflow', async () => {
    // Step 1: Create ontology template
    const ontologyResponse = await createOntologyTemplate(testOntology)
    expect(ontologyResponse.status).toBe(201)

    // Step 2: Create graph using ontology
    const graphResponse = await createGraph(testGraphConfig)
    expect(graphResponse.status).toBe(201)

    // Step 3: Retrieve metrics
    const metricsResponse = await getClassificationMetrics(graphId)
    expect(metricsResponse.status).toBe(200)

    // Step 4: Export ontology
    const exportResponse = await exportOntology(ontologyId)
    expect(exportResponse.status).toBe(200)
  })
})
```

## Test Configuration

### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/components/ui/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
})
```

### Test Setup
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })
}))

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id'
  }))
}))

// Mock global fetch
global.fetch = vi.fn()
```

## Mock Strategy

### 1. External Dependencies
- **Airtable MCP**: Mocked with realistic response shapes
- **Clerk Auth**: Mocked authentication state
- **Next.js Router**: Mocked navigation functions
- **Web APIs**: ResizeObserver, IntersectionObserver, matchMedia

### 2. Component Dependencies
- **Recharts**: Mocked chart components for UI testing
- **D3.js**: Mocked for graph visualization tests
- **File APIs**: Mocked for export/import functionality

### 3. API Layer
```typescript
// Mock MCP functions globally
const mockMcpFunctions = {
  'mcp__airtable__list_records': vi.fn(),
  'mcp__airtable__create_record': vi.fn(),
  'mcp__airtable__update_records': vi.fn(),
  'mcp__airtable__delete_records': vi.fn()
}

Object.assign(global, mockMcpFunctions)
```

## Test Data & Fixtures

### Mock Data Structure
```typescript
// Sample ontology for testing
const mockOntologies = [
  {
    id: 'medical-ont',
    fields: {
      Name: 'Medical Ontology',
      Description: 'Healthcare domain ontology',
      Category: 'healthcare',
      OntologyDefinition: JSON.stringify({
        entityTypes: [
          { id: 'Patient', name: 'Patient', description: 'Medical patient' }
        ],
        edgeTypes: [
          { id: 'treats', name: 'treats', description: 'Doctor treats patient' }
        ]
      })
    }
  }
]

// Sample metrics data
const mockMetrics = {
  graphId: 'test-graph',
  totalEntities: 1250,
  totalEdges: 3420,
  averageAccuracy: 94.5,
  topEntityTypes: [
    { name: 'Patient', count: 450, accuracy: 96.2 }
  ]
}
```

### Fixture Organization
```
src/__tests__/
├── fixtures/
│   ├── ontologies.ts     # Sample ontology data
│   ├── graphs.ts         # Sample graph data
│   ├── metrics.ts        # Sample metrics data
│   └── users.ts          # Sample user data
├── mocks/
│   ├── airtable.ts       # Airtable MCP mocks
│   ├── clerk.ts          # Authentication mocks
│   └── apis.ts           # External API mocks
└── utils/
    ├── render.tsx        # Custom render with providers
    ├── factories.ts      # Mock data factories
    └── helpers.ts        # Test utility functions
```

## Testing Patterns

### 1. Component Testing Pattern
```typescript
describe('ComponentName', () => {
  const defaultProps = { /* minimal required props */ }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default state', () => {
    render(<ComponentName {...defaultProps} />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const onAction = vi.fn()
    render(<ComponentName {...defaultProps} onAction={onAction} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalledWith(expect.any(Object))
  })

  it('handles error states gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    render(<ComponentName {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

### 2. API Testing Pattern
```typescript
describe('API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createRequest = (body: any) => new NextRequest('http://localhost/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(body)
  })

  it('handles valid requests successfully', async () => {
    mockValidation.mockResolvedValue({ data: validData })
    mockMcpFunction.mockResolvedValue({ records: mockRecords })

    const response = await POST(createRequest(validData))
    expect(response.status).toBe(201)
  })

  it('validates input and returns errors', async () => {
    const response = await POST(createRequest(invalidData))
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('validation')
  })
})
```

### 3. Integration Testing Pattern
```typescript
describe('User Journey: Feature Name', () => {
  it('completes end-to-end workflow', async () => {
    // Setup: Create necessary data
    await setupTestData()

    // Act: Perform user actions in sequence
    const step1Result = await performStep1()
    const step2Result = await performStep2(step1Result)
    const finalResult = await performStep3(step2Result)

    // Assert: Verify complete workflow
    expect(finalResult.success).toBe(true)
    expect(finalResult.data).toMatchObject(expectedShape)
  })
})
```

## Performance Testing

### 1. Component Performance
```typescript
it('handles large datasets efficiently', async () => {
  const largeDataset = generateMockData(1000)
  const startTime = performance.now()
  
  render(<DataTable data={largeDataset} />)
  
  const renderTime = performance.now() - startTime
  expect(renderTime).toBeLessThan(100) // 100ms threshold
})
```

### 2. Memory Leak Detection
```typescript
it('cleans up resources properly', () => {
  const { unmount } = render(<ComponentWithListeners />)
  
  // Verify listeners are attached
  expect(mockAddEventListener).toHaveBeenCalled()
  
  unmount()
  
  // Verify cleanup
  expect(mockRemoveEventListener).toHaveBeenCalled()
})
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test -- --coverage
      - run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Quality Gates
- **Linting**: ESLint with TypeScript rules
- **Type Checking**: Strict TypeScript compilation
- **Test Coverage**: Minimum 70% threshold
- **Build Success**: Production build must complete

## Best Practices

### 1. Test Writing Guidelines
- **Arrange-Act-Assert**: Clear test structure
- **Single Responsibility**: One concept per test
- **Descriptive Names**: Clear test intentions
- **Independent Tests**: No test dependencies
- **Realistic Scenarios**: Real-world use cases

### 2. Mock Guidelines
- **Minimal Mocking**: Mock only what's necessary
- **Consistent Interfaces**: Match real API shapes
- **Reset Between Tests**: Clean slate for each test
- **Verify Interactions**: Ensure mocks are called correctly

### 3. Coverage Guidelines
- **Meaningful Coverage**: Focus on critical paths
- **Edge Cases**: Test error conditions
- **User Scenarios**: Test from user perspective
- **Performance**: Include performance-critical tests

## Common Testing Scenarios

### 1. Error Handling
```typescript
it('handles network errors gracefully', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'))
  render(<ComponentWithFetch />)
  
  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
```

### 2. Loading States
```typescript
it('shows loading spinner during async operations', async () => {
  mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
  render(<AsyncComponent />)
  
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
})
```

### 3. Form Validation
```typescript
it('validates form inputs and shows errors', async () => {
  render(<FormComponent />)
  
  fireEvent.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/required field/i)).toBeInTheDocument()
  })
})
```

---

**Last Updated**: January 2025  
**Coverage Target**: >70% (currently achieved)  
**Test Count**: 50+ tests across all categories