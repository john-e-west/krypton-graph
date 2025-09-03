# Testing Guide for Krypton-Graph Admin UI

## Overview
This project uses a comprehensive testing strategy including unit tests, integration tests, and end-to-end tests.

## Testing Stack

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking for tests
- **Cypress** - End-to-end testing framework
- **Prettier** - Code formatting
- **ESLint** - Code linting

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests
```bash
# Install Cypress (if not already installed)
npm install --save-dev cypress

# Open Cypress Test Runner (interactive)
npx cypress open

# Run Cypress tests headlessly
npx cypress run
```

### Code Quality
```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint
```

## Test Structure

```
src/
├── __tests__/
│   ├── unit/
│   │   └── services/
│   │       └── airtableService.test.ts    # Service unit tests
│   └── integration/
│       └── pages/
│           └── Dashboard.test.tsx          # Component integration tests
├── mocks/
│   ├── handlers.ts                        # MSW request handlers
│   ├── server.ts                          # MSW server for Node
│   └── browser.ts                         # MSW worker for browser
└── setupTests.ts                          # Jest configuration

cypress/
├── e2e/
│   ├── dashboard.cy.ts                    # Dashboard E2E tests
│   └── ontology-management.cy.ts          # Ontology management E2E tests
├── support/
│   ├── commands.ts                        # Custom Cypress commands
│   └── e2e.ts                            # E2E support file
└── fixtures/                              # Test data fixtures
```

## Writing Tests

### Unit Test Example
```typescript
import { airtableService } from '../../../services/airtableService';

describe('AirtableService', () => {
  it('should fetch ontologies', async () => {
    const result = await airtableService.getOntologies();
    expect(result).toHaveLength(2);
  });
});
```

### Component Test Example
```typescript
import { render, screen } from '@testing-library/react';
import Dashboard from '../../../pages/Dashboard';

it('should render dashboard title', () => {
  render(<Dashboard />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

### E2E Test Example
```typescript
describe('Dashboard E2E', () => {
  it('should display metrics', () => {
    cy.visit('/dashboard');
    cy.contains('Ontologies').should('be.visible');
  });
});
```

## MSW (Mock Service Worker)

MSW is configured to mock API responses during tests. The handlers are defined in `src/mocks/handlers.ts`.

### Using MSW in Tests
```typescript
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Override default handler for a specific test
server.use(
  http.get('/api/ontologies', () => {
    return HttpResponse.json([
      { id: '1', name: 'Test Ontology' }
    ]);
  })
);
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Testing Library Queries**: Prefer queries that reflect how users interact with your app
3. **Mock External Dependencies**: Use MSW for API calls, mock timers, etc.
4. **Keep Tests Simple**: Each test should test one thing
5. **Use Descriptive Names**: Test names should clearly describe what is being tested
6. **Avoid Snapshot Tests**: They're brittle and don't test behavior
7. **Run Tests Before Committing**: Use husky hooks to ensure tests pass

## Coverage Goals

- Unit Tests: >80% coverage
- Integration Tests: Critical user paths
- E2E Tests: Happy paths and critical workflows

## Debugging Tests

### Jest Tests
```bash
# Run tests in debug mode
node --inspect-brk ./node_modules/.bin/react-scripts test --runInBand
```

### Cypress Tests
- Use `cy.debug()` to pause execution
- Use `cy.pause()` to step through commands
- Chrome DevTools are available during test runs

## CI/CD Integration

Tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:coverage
  
- name: Run E2E Tests
  run: |
    npm start &
    npx wait-on http://localhost:3000
    npx cypress run
```

## Troubleshooting

### Common Issues

1. **Tests failing due to async operations**
   - Use `waitFor` from Testing Library
   - Increase timeout values if needed

2. **Cypress not finding elements**
   - Ensure the dev server is running
   - Use proper selectors and wait for elements

3. **MSW not intercepting requests**
   - Check that handlers match the request URL
   - Verify MSW is properly initialized

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Cypress Documentation](https://docs.cypress.io/)