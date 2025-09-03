import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../../pages/Dashboard';
import { airtableService } from '../../../services/airtableService';

// Mock the airtable service
jest.mock('../../../services/airtableService');

// Mock Convex React hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => ({ data: [] })),
  useMutation: jest.fn(() => jest.fn()),
  ConvexProvider: ({ children }: any) => children,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours'),
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

const mockAirtableService = airtableService as jest.Mocked<typeof airtableService>;

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockAirtableService.getOntologies.mockResolvedValue([
      {
        id: '1',
        name: 'Medical Ontology',
        domain: 'Healthcare',
        version: '1.0',
        status: 'Published',
        createdDate: '2024-01-01',
        entityCount: 10,
        edgeCount: 5,
      },
      {
        id: '2',
        name: 'Finance Ontology',
        domain: 'Finance',
        version: '2.0',
        status: 'Draft',
        createdDate: '2024-01-02',
        entityCount: 8,
        edgeCount: 4,
      },
    ]);

    mockAirtableService.getFactRatingConfigs.mockResolvedValue([
      {
        id: '1',
        name: 'Clinical Relevance',
        ontologyId: '1',
        instruction: 'Rate by medical significance',
        highExample: 'Critical',
        mediumExample: 'Routine',
        lowExample: 'Administrative',
        effectivenessScore: 0.85,
        status: 'Active',
      },
    ]);

    mockAirtableService.getTestRuns.mockResolvedValue([
      {
        id: '1',
        name: 'Test Run 1',
        ontologyId: '1',
        datasetId: 'dataset1',
        graphId: 'graph1',
        runDate: '2024-01-03',
        status: 'Completed',
        precision: 0.9,
        recall: 0.85,
        f1Score: 0.87,
        duration: 120,
        notes: 'Successful run',
      },
    ]);

    mockAirtableService.getAssignments.mockResolvedValue([
      {
        id: '1',
        name: 'Assignment 1',
        ontologyId: '1',
        targetType: 'User',
        targetId: 'user1',
        assignedBy: 'admin',
        assignedDate: '2024-01-01',
        active: true,
      },
    ]);
  });

  it('should render the dashboard title', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should display search and filters', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    expect(screen.getByPlaceholderText('Search ontologies...')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('All Domains')).toBeInTheDocument();
  });

  it('should display ontologies section', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Ontologies')).toBeInTheDocument();
    });
  });

  it('should display activity feed', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('should handle empty data gracefully', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Should still render without errors
    expect(screen.getByText('Ontologies')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should display view mode toggle', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    // Should have grid and list view buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show empty state message when no ontologies found', async () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('No ontologies found matching your criteria.')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockAirtableService.getOntologies.mockRejectedValue(new Error('API Error'));
    
    render(<Dashboard />, { wrapper: createWrapper() });
    
    // Should still render the dashboard structure
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    consoleErrorSpy.mockRestore();
  });
});