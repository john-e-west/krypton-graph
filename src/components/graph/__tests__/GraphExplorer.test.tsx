import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GraphExplorer } from '@/pages/GraphExplorer';
import '@testing-library/jest-dom';

// Mock D3 if needed
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  })),
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    nodes: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCenter: vi.fn(),
  forceCollide: vi.fn(() => ({
    radius: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  })),
  zoomIdentity: {},
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
  })),
  pointer: vi.fn(() => [0, 0]),
}));

describe('GraphExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the graph explorer component', () => {
    render(<GraphExplorer />);
    expect(screen.getByText('Graph Explorer')).toBeInTheDocument();
  });

  it('renders layout selector', () => {
    render(<GraphExplorer />);
    const layoutButton = screen.getByRole('combobox');
    expect(layoutButton).toBeInTheDocument();
  });

  it('renders filter button', () => {
    render(<GraphExplorer />);
    const filterButton = screen.getByText('Filters');
    expect(filterButton).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(<GraphExplorer />);
    expect(screen.getByText('SVG')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
  });

  it('toggles filter panel visibility', async () => {
    render(<GraphExplorer />);
    const filterButton = screen.getByText('Filters');
    
    // Initially filters should be visible
    expect(screen.getByText('Entity Types')).toBeInTheDocument();
    
    // Click to hide
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.queryByText('Entity Types')).not.toBeInTheDocument();
    });
    
    // Click to show again
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.getByText('Entity Types')).toBeInTheDocument();
    });
  });

  it('changes layout when selecting from dropdown', async () => {
    render(<GraphExplorer />);
    const layoutSelector = screen.getByRole('combobox');
    
    fireEvent.click(layoutSelector);
    
    await waitFor(() => {
      const hierarchicalOption = screen.getByText('Hierarchical');
      expect(hierarchicalOption).toBeInTheDocument();
      fireEvent.click(hierarchicalOption);
    });
  });

  it('handles export SVG functionality', async () => {
    const mockDownload = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockLink = {
      href: '',
      download: '',
      click: mockDownload,
      remove: vi.fn(),
    };
    createElementSpy.mockReturnValue(mockLink as any);
    
    render(<GraphExplorer />);
    const exportSVGButton = screen.getByText('SVG');
    
    fireEvent.click(exportSVGButton);
    
    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });
});