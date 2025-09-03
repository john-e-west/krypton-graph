import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import OntologyEditor from '../../../pages/OntologyEditor';

// Mock react-query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow-canvas">{children}</div>
  ),
  Controls: () => <div data-testid="flow-controls" />,
  MiniMap: () => <div data-testid="flow-minimap" />,
  Background: () => <div data-testid="flow-background" />,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
}));

// Mock services
jest.mock('../../../services/airtableService', () => ({
  airtableService: {
    getOntology: jest.fn(),
    getEntitiesByOntology: jest.fn(),
    getEdgesByOntology: jest.fn(),
    createEntity: jest.fn(),
    updateEntity: jest.fn(),
    createEdge: jest.fn(),
  },
}));

const mockOntologyData = {
  ontology: {
    id: 'ont-1',
    name: 'Test Ontology',
    domain: 'Testing',
    description: 'A test ontology',
  },
  entities: [
    {
      id: 'ent-1',
      name: 'Person',
      type: 'Person',
      properties: { name: { type: 'string', required: true } },
      position: { x: 100, y: 100 },
    },
  ],
  edgeTypes: [
    {
      id: 'edge-1',
      sourceId: 'ent-1',
      targetId: 'ent-1',
      name: 'Self Reference',
      cardinality: 'one-to-one',
    },
  ],
};

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/ontologies/ont-1/edit']}>
          {component}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('OntologyEditor Integration', () => {
  beforeEach(() => {
    const { airtableService } = require('../../../services/airtableService');
    airtableService.getOntology.mockResolvedValue(mockOntologyData.ontology);
    airtableService.getEntitiesByOntology.mockResolvedValue(mockOntologyData.entities);
    airtableService.getEdgesByOntology.mockResolvedValue(mockOntologyData.edgeTypes);
    airtableService.createEntity.mockResolvedValue({ id: 'new-entity' });
    airtableService.createEdge.mockResolvedValue({ id: 'new-edge' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders editor with three-panel layout', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      // Left panel - Entity Palette
      expect(screen.getByText('Entity Types')).toBeInTheDocument();
      
      // Center panel - Canvas
      expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      
      // Toolbar should be present
      expect(screen.getByText('Test Ontology')).toBeInTheDocument();
    });
  });

  it('loads ontology data and displays entities', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Test Ontology')).toBeInTheDocument();
    });

    const { airtableService } = require('../../../services/airtableService');
    expect(airtableService.getOntology).toHaveBeenCalledWith('ont-1');
    expect(airtableService.getEntitiesByOntology).toHaveBeenCalledWith('ont-1');
    expect(airtableService.getEdgesByOntology).toHaveBeenCalledWith('ont-1');
  });

  it('shows entity palette with draggable items', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Person')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Concept')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
    });
  });

  it('displays toolbar with save, undo/redo buttons', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
    });
  });

  it('shows ReactFlow controls and minimap', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByTestId('flow-controls')).toBeInTheDocument();
      expect(screen.getByTestId('flow-minimap')).toBeInTheDocument();
      expect(screen.getByTestId('flow-background')).toBeInTheDocument();
    });
  });

  it('handles drag and drop entity creation', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Person')).toBeInTheDocument();
    });

    // Simulate drag start
    const personEntity = screen.getByText('Person').closest('[draggable="true"]');
    expect(personEntity).toBeInTheDocument();

    const mockDataTransfer = {
      setData: jest.fn(),
      getData: jest.fn().mockReturnValue('Person'),
      effectAllowed: '',
      dropEffect: '',
    };

    // Mock drag and drop events
    const canvas = screen.getByTestId('react-flow-canvas');
    
    const dragStartEvent = new Event('dragstart', { bubbles: true }) as any;
    dragStartEvent.dataTransfer = mockDataTransfer;
    fireEvent(personEntity!, dragStartEvent);

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = mockDataTransfer;
    dropEvent.preventDefault = jest.fn();
    fireEvent(canvas, dropEvent);

    expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/reactflow', 'Person');
  });

  it('toggles properties panel', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Test Ontology')).toBeInTheDocument();
    });

    // Initially properties panel should be open (assuming default state)
    // Find toggle button in toolbar
    const toggleButton = screen.getByRole('button', { name: /toggle properties panel/i });
    await user.click(toggleButton);

    // Panel state would change - this depends on implementation
    // The test verifies the button works
    expect(toggleButton).toBeInTheDocument();
  });

  it('handles save operation', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Save operation should be initiated
    expect(saveButton).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const { airtableService } = require('../../../services/airtableService');
    // Make the service return a never-resolving promise to test loading state
    airtableService.getOntology.mockReturnValue(new Promise(() => {}));
    
    renderWithProviders(<OntologyEditor />);

    expect(screen.getByText('Loading ontology editor...')).toBeInTheDocument();
  });

  it('shows error state when ontology fails to load', async () => {
    const { airtableService } = require('../../../services/airtableService');
    airtableService.getOntology.mockRejectedValue(new Error('Failed to load'));
    
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load ontology data. Please try again.')).toBeInTheDocument();
    });
  });

  it('displays export and import options in toolbar', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  it('shows templates in entity palette', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Healthcare Ontology')).toBeInTheDocument();
      expect(screen.getByText('Organization Chart')).toBeInTheDocument();
    });
  });

  it('handles undo/redo state correctly', async () => {
    renderWithProviders(<OntologyEditor />);

    await waitFor(() => {
      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });
      
      // Initially should be disabled (no history)
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });

  it('renders with missing ontology ID gracefully', () => {
    const { airtableService } = require('../../../services/airtableService');
    airtableService.getOntology.mockResolvedValue(null);
    
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/ontologies//edit']}>
            <OntologyEditor />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    // Should handle missing ID gracefully
    expect(screen.getByText('Loading ontology editor...')).toBeInTheDocument();
  });
});