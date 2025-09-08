import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import GraphCreationWizard from '../GraphCreationWizard';

// Mock fetch globally
global.fetch = vi.fn();

const mockEntityTypes = [
  {
    id: 'person',
    name: 'Person',
    description: 'Individual people',
    pattern: '\\b[A-Z][a-z]+ [A-Z][a-z]+\\b'
  },
  {
    id: 'organization',
    name: 'Organization',
    description: 'Companies and institutions',
    attributes: [
      { name: 'industry', type: 'string', required: false }
    ]
  }
];

const mockEdgeTypes = [
  {
    id: 'works_at',
    name: 'WORKS_AT',
    description: 'Employment relationship',
    sourceTypes: ['Person'],
    targetTypes: ['Organization']
  }
];

const defaultProps = {
  documentId: 'doc-123',
  documentName: 'Test Document',
  entityTypes: mockEntityTypes,
  edgeTypes: mockEdgeTypes,
  onCancel: vi.fn(),
  onComplete: vi.fn()
};

describe('GraphCreationWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('renders summary step initially', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    expect(screen.getByText('Create Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('Review your ontology selection')).toBeInTheDocument();
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Person')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('WORKS_AT')).toBeInTheDocument();
  });

  it('shows correct entity and edge type counts', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    expect(screen.getByText('Entity Types (2)')).toBeInTheDocument();
    expect(screen.getByText('Edge Types (1)')).toBeInTheDocument();
  });

  it('navigates to configuration step when clicking Configure Graph', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Configure Graph'));
    
    expect(screen.getByText('Configure graph settings')).toBeInTheDocument();
    expect(screen.getByText('Graph Configuration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Document Knowledge Graph')).toBeInTheDocument();
  });

  it('allows editing graph name and description in configuration step', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Configure Graph'));
    
    const nameInput = screen.getByDisplayValue('Test Document Knowledge Graph');
    const descriptionInput = screen.getByDisplayValue('Automatically generated knowledge graph from Test Document');
    
    fireEvent.change(nameInput, { target: { value: 'My Custom Graph' } });
    fireEvent.change(descriptionInput, { target: { value: 'Custom description' } });
    
    expect(screen.getByDisplayValue('My Custom Graph')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom description')).toBeInTheDocument();
  });

  it('shows privacy controls in configuration step', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Configure Graph'));
    
    expect(screen.getByText('Private Graph')).toBeInTheDocument();
    expect(screen.getByText('Only you can access this graph')).toBeInTheDocument();
  });

  it('generates smart tag suggestions based on document name and types', () => {
    const propsWithMeetingDoc = {
      ...defaultProps,
      documentName: 'Meeting Minutes'
    };
    
    render(<GraphCreationWizard {...propsWithMeetingDoc} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    
    expect(screen.getByText('Meeting Analysis')).toBeInTheDocument();
    expect(screen.getByText('People Networks')).toBeInTheDocument();
  });

  it('can add and remove tags', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    
    // Add a tag
    fireEvent.click(screen.getByText('People Networks'));
    expect(screen.getByText('Selected:')).toBeInTheDocument();
    expect(screen.getByText('People Networks ×')).toBeInTheDocument();
    
    // Remove the tag
    fireEvent.click(screen.getByText('People Networks ×'));
    expect(screen.queryByText('Selected:')).not.toBeInTheDocument();
  });

  it('disables create button when graph name is empty', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    
    const nameInput = screen.getByDisplayValue('Test Document Knowledge Graph');
    fireEvent.change(nameInput, { target: { value: '' } });
    
    const createButton = screen.getByText('Create Knowledge Graph');
    expect(createButton).toBeDisabled();
  });

  it('starts graph creation when clicking Create Knowledge Graph', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ graphId: 'graph-456' })
    });

    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Create Knowledge Graph'));
    
    expect(screen.getByText('Creating Your Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('This may take a minute...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/doc-123/apply-types',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  it('shows error message when creation fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false
    });

    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Create Knowledge Graph'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create knowledge graph')).toBeInTheDocument();
    });
  });

  it('shows completion step after successful creation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ graphId: 'graph-456' })
    });

    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Create Knowledge Graph'));
    
    await waitFor(() => {
      expect(screen.getByText('Knowledge Graph Created!')).toBeInTheDocument();
      expect(screen.getByText('Your graph is ready for exploration')).toBeInTheDocument();
    });
  });

  it('calls onComplete when clicking Explore Knowledge Graph', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ graphId: 'graph-456' })
    });

    const onComplete = vi.fn();
    render(<GraphCreationWizard {...defaultProps} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Create Knowledge Graph'));
    
    await waitFor(() => {
      expect(screen.getByText('Explore Knowledge Graph')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Explore Knowledge Graph'));
    expect(onComplete).toHaveBeenCalledWith('graph-456');
  });

  it('calls onCancel from any step', () => {
    const onCancel = vi.fn();
    render(<GraphCreationWizard {...defaultProps} onCancel={onCancel} />);
    
    // From summary step
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    
    onCancel.mockClear();
    
    // From configuration step
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Back'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows correct graph summary in completion step', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ graphId: 'graph-456' })
    });

    render(<GraphCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Configure Graph'));
    fireEvent.click(screen.getByText('Create Knowledge Graph'));
    
    await waitFor(() => {
      expect(screen.getByText('2 entity types')).toBeInTheDocument();
      expect(screen.getByText('1 edge types')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  it('navigates back from configuration to summary', () => {
    render(<GraphCreationWizard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Configure Graph'));
    expect(screen.getByText('Configure graph settings')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Review your ontology selection')).toBeInTheDocument();
  });
});