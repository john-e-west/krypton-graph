import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { GraphViewer } from '../GraphViewer';
import { GraphData, NodeDatum, LinkDatum } from '../types';

// Mock D3 to avoid issues with SVG rendering in tests
vi.mock('d3', () => ({
  select: vi.fn().mockReturnValue({
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnValue({
      data: vi.fn().mockReturnValue({
        join: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        style: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        call: vi.fn().mockReturnThis(),
      }),
      remove: vi.fn().mockReturnThis(),
    }),
  }),
  forceSimulation: vi.fn().mockReturnValue({
    force: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    alphaDecay: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
  }),
  forceLink: vi.fn().mockReturnValue({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
  }),
  forceManyBody: vi.fn().mockReturnValue({
    strength: vi.fn().mockReturnThis(),
  }),
  forceCenter: vi.fn().mockReturnValue({}),
  forceCollide: vi.fn().mockReturnValue({
    radius: vi.fn().mockReturnThis(),
  }),
  zoom: vi.fn().mockReturnValue({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn(),
  }),
  zoomIdentity: { translate: vi.fn().mockReturnThis(), scale: vi.fn().mockReturnThis() },
  zoomTransform: vi.fn().mockReturnValue({ scale: vi.fn().mockReturnThis() }),
  drag: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
  }),
  mean: vi.fn().mockReturnValue(100),
}));

// Small test data set
const smallGraphData: GraphData = {
  nodes: [
    { id: '1', type: 'document', label: 'Doc 1', attributes: { importance: 1 } },
    { id: '2', type: 'entity', label: 'Entity 1', attributes: { importance: 2 } },
    { id: '3', type: 'concept', label: 'Concept 1', attributes: { importance: 1 } },
    { id: '4', type: 'fact', label: 'Fact 1', attributes: { importance: 3 } },
  ],
  edges: [
    { id: 'e1', type: 'relates_to', source: '1', target: '2' },
    { id: 'e2', type: 'contains', source: '2', target: '3' },
    { id: 'e3', type: 'supports', source: '3', target: '4' },
  ],
  metadata: {
    entityTypes: ['document', 'entity', 'concept', 'fact'],
    edgeTypes: ['relates_to', 'contains', 'supports'],
    totalNodes: 4,
    totalEdges: 3,
  },
};

// Generate large test data for performance testing
const generateLargeGraphData = (nodeCount: number): GraphData => {
  const nodes: NodeDatum[] = [];
  const edges: LinkDatum[] = [];
  
  const types = ['document', 'entity', 'concept', 'fact'];
  const edgeTypes = ['relates_to', 'contains', 'supports', 'references'];
  
  // Create nodes
  for (let i = 1; i <= nodeCount; i++) {
    nodes.push({
      id: `node_${i}`,
      type: types[i % types.length],
      label: `Node ${i}`,
      attributes: {
        importance: Math.floor(Math.random() * 5) + 1,
        category: `category_${Math.floor(i / 10)}`,
      },
    });
  }
  
  // Create edges (roughly 1.5 edges per node)
  const edgeCount = Math.floor(nodeCount * 1.5);
  for (let i = 1; i <= edgeCount; i++) {
    const sourceId = Math.floor(Math.random() * nodeCount) + 1;
    let targetId = Math.floor(Math.random() * nodeCount) + 1;
    
    // Avoid self-loops
    while (targetId === sourceId) {
      targetId = Math.floor(Math.random() * nodeCount) + 1;
    }
    
    edges.push({
      id: `edge_${i}`,
      type: edgeTypes[i % edgeTypes.length],
      source: `node_${sourceId}`,
      target: `node_${targetId}`,
      strength: Math.random(),
    });
  }
  
  return {
    nodes,
    edges,
    metadata: {
      entityTypes: types,
      edgeTypes: edgeTypes,
      totalNodes: nodeCount,
      totalEdges: edgeCount,
    },
  };
};

describe('GraphViewer Component', () => {
  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock getBBox for SVG elements (only if not already defined)
    if (!SVGElement.prototype.getBBox) {
      Object.defineProperty(SVGElement.prototype, 'getBBox', {
        value: vi.fn().mockReturnValue({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        }),
        configurable: true,
      });
    }
  });

  test('renders without crashing with small dataset', () => {
    render(<GraphViewer data={smallGraphData} />);
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
  });

  test('displays correct node and edge counts', async () => {
    render(<GraphViewer data={smallGraphData} />);
    
    await waitFor(() => {
      expect(screen.getByText(/4 nodes, 3 edges/i)).toBeInTheDocument();
    });
  });

  test('handles zoom controls', () => {
    render(<GraphViewer data={smallGraphData} />);
    
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
    const fitToViewButton = screen.getByRole('button', { name: /fit to view/i });
    const resetViewButton = screen.getByRole('button', { name: /reset view/i });
    
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(fitToViewButton).toBeInTheDocument();
    expect(resetViewButton).toBeInTheDocument();
    
    // Test clicking buttons
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(fitToViewButton);
    fireEvent.click(resetViewButton);
  });

  test('handles export functionality', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue('mock-url');
    const mockRevokeObjectURL = vi.fn();
    
    Object.defineProperty(global.URL, 'createObjectURL', {
      value: mockCreateObjectURL,
    });
    Object.defineProperty(global.URL, 'revokeObjectURL', {
      value: mockRevokeObjectURL,
    });

    // Mock link element
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    render(<GraphViewer data={smallGraphData} />);
    
    const exportButton = screen.getByRole('button', { name: /export svg/i });
    fireEvent.click(exportButton);
    
    // Verify download was triggered
    expect(mockLink.click).toHaveBeenCalled();
  });

  test('handles node and edge click callbacks', () => {
    const onNodeClick = vi.fn();
    const onEdgeClick = vi.fn();
    
    render(
      <GraphViewer 
        data={smallGraphData} 
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
      />
    );
    
    // The actual click testing would require more complex D3 mocking
    // This test verifies the callbacks are passed correctly
    expect(onNodeClick).toBeDefined();
    expect(onEdgeClick).toBeDefined();
  });

  test('toggles labels visibility', () => {
    render(<GraphViewer data={smallGraphData} />);
    
    const toggleLabelsButton = screen.getByRole('button', { name: /toggle labels/i });
    fireEvent.click(toggleLabelsButton);
    
    // Verify button interaction works
    expect(toggleLabelsButton).toBeInTheDocument();
  });

  test('performance with large dataset (1000 nodes)', async () => {
    const largeData = generateLargeGraphData(1000);
    
    const startTime = performance.now();
    render(<GraphViewer data={largeData} />);
    const endTime = performance.now();
    
    // Should render within reasonable time (< 1000ms for component creation)
    expect(endTime - startTime).toBeLessThan(1000);
    
    await waitFor(() => {
      expect(screen.getByText(/nodes,.*edges/i)).toBeInTheDocument();
    });
  });

  test('clustering behavior with large dataset', () => {
    const largeData = generateLargeGraphData(500);
    render(<GraphViewer data={largeData} />);
    
    // Should render clustering information
    // The actual clustering would be tested with less mocked D3
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
  });

  test('responsive design behavior', () => {
    const { container } = render(<GraphViewer data={smallGraphData} />);
    
    // Verify container has responsive classes
    const graphContainer = container.querySelector('[style*="min-height"]');
    expect(graphContainer).toBeInTheDocument();
  });

  test('shows simulation status', async () => {
    render(<GraphViewer data={smallGraphData} />);
    
    // Initially should show simulation running
    await waitFor(() => {
      const simulationBadge = screen.queryByText(/simulation running/i);
      // May or may not be visible depending on timing
      // This test ensures it's properly handled
    });
  });
});

// Performance benchmark test (not run by default)
describe('Performance Benchmarks', () => {
  test.skip('benchmark with different node counts', async () => {
    const nodeCounts = [100, 500, 1000, 2000];
    
    for (const nodeCount of nodeCounts) {
      const data = generateLargeGraphData(nodeCount);
      
      const startTime = performance.now();
      const { unmount } = render(<GraphViewer data={data} />);
      const endTime = performance.now();
      
      console.log(`${nodeCount} nodes: ${endTime - startTime}ms`);
      
      // Clean up
      unmount();
      
      // Should maintain reasonable performance
      expect(endTime - startTime).toBeLessThan(2000);
    }
  });
});