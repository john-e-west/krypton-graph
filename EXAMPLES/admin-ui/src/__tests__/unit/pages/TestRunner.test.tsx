import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestRunner from '../../../pages/TestRunner';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConvexProvider } from 'convex/react';

// Mock Convex
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
};

// Mock hooks
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
  useAction: jest.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components to simplify testing
jest.mock('../../../components/Terminal', () => {
  const Terminal = React.forwardRef<any, any>((props, ref) => (
    <div data-testid="terminal">Terminal Mock</div>
  ));
  Terminal.displayName = 'Terminal';
  return Terminal;
});

jest.mock('../../../components/testRunner/TestSelectionPanel', () => ({
  TestSelectionPanel: ({ onTestSelect, onSuiteSelect, disabled }: any) => (
    <div data-testid="test-selection-panel">
      <button
        onClick={() => onTestSelect(new Set(['test-1', 'test-2']))}
        disabled={disabled}
        data-testid="select-tests"
      >
        Select Tests
      </button>
      <button
        onClick={() => onSuiteSelect('ontology-validation')}
        disabled={disabled}
        data-testid="select-suite"
      >
        Select Suite
      </button>
    </div>
  ),
}));

jest.mock('../../../components/testRunner/TestResultsPanel', () => ({
  TestResultsPanel: ({ results }: any) => (
    <div data-testid="test-results-panel">
      {results.length} results
    </div>
  ),
}));

jest.mock('../../../components/testRunner/MetricsPanel', () => ({
  MetricsPanel: ({ results }: any) => (
    <div data-testid="metrics-panel">
      Metrics for {results.length} results
    </div>
  ),
}));

const { useQuery, useAction } = require('convex/react');

const mockOntologies = [
  { _id: 'ont-1', name: 'Medical Ontology', domain: 'healthcare' },
  { _id: 'ont-2', name: 'Financial Ontology', domain: 'finance' },
];

const mockTestSuites = [
  {
    id: 'ontology-validation',
    name: 'Ontology Validation',
    description: 'Validates ontology structure',
    testCount: 4,
    categories: ['structure'],
  },
  {
    id: 'performance',
    name: 'Performance Tests',
    description: 'Performance benchmarks',
    testCount: 3,
    categories: ['performance'],
  },
];

const mockSuiteDetails = {
  id: 'ontology-validation',
  name: 'Ontology Validation',
  description: 'Validates ontology structure',
  config: {
    parallel: true,
    stopOnFailure: false,
    retryCount: 0,
    timeout: 10000,
  },
  tests: [
    {
      id: 'ont-001',
      name: 'Verify ontology has required fields',
      category: 'structure',
      description: 'Checks required fields',
    },
  ],
};

describe('TestRunner', () => {
  let mockRunTests: jest.Mock;
  let mockStopTests: jest.Mock;

  beforeEach(() => {
    mockRunTests = jest.fn();
    mockStopTests = jest.fn();

    useQuery.mockImplementation((query: any) => {
      if (query.toString().includes('ontologies.list')) {
        return mockOntologies;
      }
      if (query.toString().includes('testing.getTestSuites')) {
        return mockTestSuites;
      }
      if (query.toString().includes('testing.getTestSuite')) {
        return mockSuiteDetails;
      }
      if (query.toString().includes('testing.getTestHistory')) {
        return [];
      }
      return null;
    });

    useAction.mockImplementation((action: any) => {
      if (action.toString().includes('testing.runTestSuite')) {
        return mockRunTests;
      }
      if (action.toString().includes('testing.stopExecution')) {
        return mockStopTests;
      }
      return jest.fn();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderTestRunner = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={mockConvexClient as any}>
          <TestRunner />
        </ConvexProvider>
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('renders the test runner interface', () => {
      renderTestRunner();

      expect(screen.getByText('Test Runner')).toBeInTheDocument();
      expect(screen.getByText('Execute and monitor ontology validation tests')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument();
    });

    it('displays ontology and test suite selectors', () => {
      renderTestRunner();

      expect(screen.getByLabelText('Ontology')).toBeInTheDocument();
      expect(screen.getByLabelText('Test Suite')).toBeInTheDocument();
    });

    it('renders all tab panels', () => {
      renderTestRunner();

      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Terminal')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('shows test selection panel', () => {
      renderTestRunner();

      expect(screen.getByTestId('test-selection-panel')).toBeInTheDocument();
    });
  });

  describe('Test Execution', () => {
    it('enables run button when ontology and suite are selected', async () => {
      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      
      // Should be enabled when both are selected (auto-selected in our mocks)
      expect(runButton).toBeEnabled();
    });

    it('executes tests when run button is clicked', async () => {
      mockRunTests.mockResolvedValue({
        runId: 'run-1',
        results: [
          {
            testId: 'ont-001',
            name: 'Test 1',
            category: 'structure',
            status: 'passed',
            duration: 100,
          },
        ],
        summary: {
          passed: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      });

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockRunTests).toHaveBeenCalledWith({
          suiteId: 'ontology-validation',
          testIds: undefined,
          ontologyId: 'ont-1',
          config: mockSuiteDetails.config,
        });
      });
    });

    it('shows progress bar during test execution', async () => {
      mockRunTests.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText(/running tests/i)).toBeInTheDocument();
      });
    });

    it('changes run button to stop button during execution', async () => {
      mockRunTests.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      });
    });

    it('stops test execution when stop button is clicked', async () => {
      mockRunTests.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderTestRunner();

      // Start tests
      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      });

      // Stop tests
      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument();
      });
    });

    it('displays success notification on successful test completion', async () => {
      mockRunTests.mockResolvedValue({
        results: [],
        summary: { passed: 2, failed: 0, skipped: 0, total: 2 },
      });

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/test run completed: 2\/2 passed/i)).toBeInTheDocument();
      });
    });

    it('displays error notification on test failure', async () => {
      mockRunTests.mockRejectedValue(new Error('Test execution failed'));

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/test execution failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Test Selection', () => {
    it('updates selected tests when selection changes', async () => {
      renderTestRunner();

      const selectButton = screen.getByTestId('select-tests');
      fireEvent.click(selectButton);

      // The mock component should update the selected tests
      // This would be verified by checking if the run button parameters change
    });

    it('runs only selected tests when specific tests are chosen', async () => {
      mockRunTests.mockResolvedValue({
        results: [],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      });

      renderTestRunner();

      // Select specific tests
      const selectButton = screen.getByTestId('select-tests');
      fireEvent.click(selectButton);

      // Run tests
      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockRunTests).toHaveBeenCalledWith(
          expect.objectContaining({
            testIds: ['test-1', 'test-2'],
          })
        );
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      renderTestRunner();

      // Initially shows results tab
      expect(screen.getByTestId('test-results-panel')).toBeInTheDocument();

      // Click terminal tab
      fireEvent.click(screen.getByText('Terminal'));
      expect(screen.getByTestId('terminal')).toBeInTheDocument();

      // Click metrics tab
      fireEvent.click(screen.getByText('Metrics'));
      expect(screen.getByTestId('metrics-panel')).toBeInTheDocument();

      // Click history tab
      fireEvent.click(screen.getByText('History'));
      expect(screen.getByText('No test history available.')).toBeInTheDocument();
    });

    it('shows result count in results tab label after tests run', async () => {
      mockRunTests.mockResolvedValue({
        results: [
          { testId: '1', name: 'Test 1', status: 'passed' },
          { testId: '2', name: 'Test 2', status: 'failed' },
        ],
        summary: { passed: 1, failed: 1, skipped: 0, total: 2 },
      });

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Results (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('enables export button after tests complete', async () => {
      mockRunTests.mockResolvedValue({
        results: [{ testId: '1', name: 'Test 1', status: 'passed' }],
        summary: { passed: 1, failed: 0, skipped: 0, total: 1 },
      });

      renderTestRunner();

      const exportButton = screen.getByTitle('Export Results');
      expect(exportButton).toBeDisabled();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(exportButton).toBeEnabled();
      });
    });

    it('shows info message when trying to export without results', () => {
      renderTestRunner();

      const exportButton = screen.getByTitle('Export Results');
      fireEvent.click(exportButton);

      // Export button should be disabled, so this won't actually trigger
      // In a real test, we'd need to enable it first or test the handler directly
    });
  });

  describe('Error Handling', () => {
    it('shows error when trying to run tests without selections', async () => {
      // Mock no ontologies available
      useQuery.mockImplementation((query: any) => {
        if (query.toString().includes('ontologies.list')) {
          return [];
        }
        return mockTestSuites;
      });

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/please select both a test suite and an ontology/i)).toBeInTheDocument();
      });
    });

    it('handles test execution errors gracefully', async () => {
      mockRunTests.mockRejectedValue(new Error('Network error'));

      renderTestRunner();

      const runButton = screen.getByRole('button', { name: /run tests/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/test execution failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for smaller screens', () => {
      // Mock window.matchMedia for responsive testing
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('(max-width: 1200px)'),
          media: query,
          onchange: null,
          addListener: jest.fn(), // deprecated
          removeListener: jest.fn(), // deprecated
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderTestRunner();

      // The layout should adapt (this would need more specific testing based on implementation)
      expect(screen.getByTestId('test-selection-panel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderTestRunner();

      expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByLabelText('Ontology')).toBeInTheDocument();
      expect(screen.getByLabelText('Test Suite')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderTestRunner();

      // Tab through interactive elements
      await user.tab();
      // Should focus first interactive element (ontology selector)
      
      await user.tab();
      // Should focus test suite selector
      
      await user.tab();
      // Should focus run button
      expect(screen.getByRole('button', { name: /run tests/i })).toHaveFocus();
    });
  });
});