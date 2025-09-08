# D3.js Graph Viewer Component

A high-performance, interactive graph visualization component built with D3.js v7 and React, supporting 1000+ nodes with intelligent clustering.

## Features

- **🚀 High Performance**: Optimized for 1000+ nodes with automatic clustering
- **🎯 Force-Directed Layout**: D3.js simulation with configurable parameters  
- **🔍 Interactive Controls**: Zoom (0.1x-10x), pan, drag nodes, click selection
- **📊 Smart Clustering**: Automatic type-based grouping for large datasets
- **💾 SVG Export**: One-click high-quality vector export
- **📱 Responsive Design**: Mobile-friendly with touch support
- **⚡ Level-of-Detail**: Automatic label hiding and performance optimization
- **🎨 Customizable**: TypeScript support with comprehensive theming

## Performance Targets (MVP)

✅ **1,000+ nodes** with clustering  
✅ **60 FPS** during idle state  
✅ **30 FPS** during zoom/pan interactions  
✅ **<1s** initial render for 1000 nodes  
✅ **<100ms** zoom/pan response time  

## Quick Start

```tsx
import { GraphViewer } from '@/components/graph/GraphViewer';
import { GraphData } from '@/components/graph/types';

const myGraphData: GraphData = {
  nodes: [
    { id: '1', type: 'document', label: 'Document 1', attributes: { importance: 1 } },
    { id: '2', type: 'entity', label: 'Entity 1', attributes: { importance: 2 } },
  ],
  edges: [
    { id: 'e1', type: 'relates_to', source: '1', target: '2' },
  ],
  metadata: {
    entityTypes: ['document', 'entity'],
    edgeTypes: ['relates_to'],
    totalNodes: 2,
    totalEdges: 1,
  },
};

function MyComponent() {
  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
  };

  const handleEdgeClick = (edge) => {
    console.log('Edge clicked:', edge);
  };

  return (
    <GraphViewer
      data={myGraphData}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      className="h-96"
    />
  );
}
```

## Props API

### GraphViewer Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `GraphData` | ✅ | Graph data with nodes, edges, and metadata |
| `onNodeClick` | `(node: NodeDatum) => void` | ❌ | Callback when node is clicked |
| `onEdgeClick` | `(edge: LinkDatum) => void` | ❌ | Callback when edge is clicked |
| `className` | `string` | ❌ | Additional CSS classes |

### GraphData Interface

```typescript
interface GraphData {
  nodes: NodeDatum[];
  edges: LinkDatum[];
  metadata: {
    entityTypes: string[];
    edgeTypes: string[];
    totalNodes: number;
    totalEdges: number;
  };
}
```

### NodeDatum Interface

```typescript
interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  attributes: Record<string, any>;
  group?: string;
  size?: number;
  color?: string;
  selected?: boolean;
  highlighted?: boolean;
  showLabel?: boolean;
  simplified?: boolean;
}
```

### LinkDatum Interface

```typescript
interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  id: string;
  type: string;
  label?: string;
  attributes?: Record<string, any>;
  strength?: number;
  selected?: boolean;
  highlighted?: boolean;
}
```

## Built-in Controls

The component includes a comprehensive toolbar with the following controls:

### Zoom Controls
- **Zoom In**: Increase zoom level
- **Zoom Out**: Decrease zoom level  
- **Fit to View**: Auto-fit all nodes in viewport
- **Reset View**: Return to default zoom/position

### Display Controls
- **Toggle Labels**: Show/hide node labels (auto-hides when zoomed out)
- **Export SVG**: Download current view as vector graphics

### Information Display
- **Node/Edge Count**: Real-time statistics
- **Simulation Status**: Visual indicator when force simulation is running

## Interactions

### Mouse/Touch Interactions
- **Drag nodes**: Click and drag to reposition nodes
- **Pan**: Click and drag background to pan view
- **Zoom**: Mouse wheel or pinch to zoom in/out
- **Select**: Click nodes/edges to trigger callbacks
- **Hover**: Visual feedback on hover

### Keyboard Shortcuts
- **Mouse wheel**: Zoom in/out
- **Click + Drag**: Pan or drag nodes
- **Double-click**: Future enhancement hook

## Clustering Algorithm

For datasets with >100 nodes, the component automatically applies intelligent clustering:

### Type-Based Clustering
- Groups nodes by `type` field
- Creates cluster nodes for groups >10 nodes
- Maintains individual nodes for smaller groups
- Shows cluster size in parentheses

### Cluster Interactions
- **Click cluster**: Future expansion capability
- **Visual indicators**: Larger radius based on cluster size
- **Performance**: Reduces DOM elements for better performance

## Styling & Theming

### Built-in Node Colors
```typescript
const nodeColors = {
  document: "#3B82F6",  // blue
  entity: "#10B981",    // green
  concept: "#F59E0B",   // amber
  fact: "#8B5CF6",      // purple
  cluster: "#6B7280",   // gray
  default: "#6B7280"    // gray
};
```

### Customization
The component uses shadcn/ui design tokens and can be styled with:
- Custom CSS classes via `className` prop
- CSS custom properties for theming
- Tailwind CSS utility classes

## Performance Optimization

### Automatic Optimizations
- **Viewport Culling**: Only renders visible elements
- **Level-of-Detail**: Reduces complexity at high zoom levels
- **Batch Updates**: Efficient DOM manipulation
- **Smart Clustering**: Reduces node count for large graphs
- **requestAnimationFrame**: Smooth animations

### Performance Monitoring
```typescript
// Built-in performance measurement in demo
const measureRenderTime = () => {
  const start = performance.now();
  // ... render operation ...
  const end = performance.now();
  console.log(`Render time: ${end - start}ms`);
};
```

## Advanced Usage

### Custom Node Rendering
```typescript
// Future enhancement: Custom node renderers
interface CustomNodeProps {
  node: NodeDatum;
  scale: number;
}

const CustomNode: React.FC<CustomNodeProps> = ({ node, scale }) => {
  // Custom visualization logic
};
```

### Performance Tuning
```typescript
// Adjust force simulation parameters
const customForceParams = {
  charge: -300,        // Node repulsion strength
  linkDistance: 100,   // Preferred edge length
  alphaDecay: 0.01,   // Simulation cooling rate
};
```

### Large Dataset Best Practices

For optimal performance with large datasets:

1. **Pre-process data**: Clean and optimize before passing to component
2. **Use clustering**: Let the automatic clustering handle >1000 nodes
3. **Monitor performance**: Check frame rates during interactions
4. **Batch updates**: Update data in chunks for real-time scenarios

```typescript
// Example: Processing large dataset
const processLargeDataset = (rawData: RawGraphData): GraphData => {
  // Filter and optimize nodes
  const nodes = rawData.nodes
    .filter(node => node.importance > threshold)
    .map(node => ({
      ...node,
      label: node.label.substring(0, 20), // Truncate labels
    }));
  
  // Optimize edges
  const edges = rawData.edges
    .filter(edge => edge.strength > minStrength);
    
  return { nodes, edges, metadata: generateMetadata(nodes, edges) };
};
```

## Testing

The component includes comprehensive tests in `__tests__/GraphViewer.test.tsx`:

- **Unit tests** for core functionality
- **Performance benchmarks** for different dataset sizes
- **Interaction testing** for user events
- **Export functionality** validation

Run tests with:
```bash
npm test GraphViewer
```

## Demo Application

See `src/pages/GraphViewerDemo.tsx` for a complete interactive demo with:
- 5 dataset sizes (25 to 2000 nodes)
- Performance measurement tools
- Feature showcase and documentation
- Real-world usage examples

## Browser Support

- ✅ Chrome 88+ (recommended)
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

## Troubleshooting

### Common Issues

**Performance degradation with large datasets:**
- Enable automatic clustering (default behavior)
- Reduce node attribute complexity
- Consider data pagination

**Labels not showing:**
- Check zoom level (labels auto-hide when zoomed out)
- Toggle label visibility with toolbar button
- Verify `showLabels` state

**Export not working:**
- Ensure browser supports file downloads
- Check for popup blockers
- Verify SVG content is rendered

**Simulation not settling:**
- Check force parameters
- Ensure data is well-formed
- Monitor alpha decay rate

### Debug Mode

```typescript
// Enable debug logging
const debugOptions = {
  logPerformance: true,
  showSimulationStatus: true,
  trackMemoryUsage: true,
};
```

## Contributing

When contributing to the GraphViewer component:

1. **Performance First**: Maintain 60 FPS idle, 30 FPS interaction targets
2. **Test Coverage**: Add tests for new features
3. **TypeScript**: Maintain strict type safety
4. **Documentation**: Update README and inline comments
5. **Backward Compatibility**: Avoid breaking API changes

## License

Part of the Krypton Graph project. See main project license for details.

## Changelog

### v1.0 (MVP) - 2025-01-06
- Initial D3.js v7 implementation
- Force-directed layout with clustering
- Interactive controls and SVG export
- Performance optimization for 1000+ nodes
- Comprehensive test suite and demo

### Future Enhancements
- WebGL renderer for >10k nodes
- Multiple layout algorithms
- Real-time collaboration features
- Advanced filtering and search
- Custom node/edge renderers