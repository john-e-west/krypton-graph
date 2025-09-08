import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ZoomIn, ZoomOut, Maximize2, Download, Filter, Layers, Settings, Play, Pause, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group: number;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  weight?: number;
  metadata?: Record<string, any>;
}

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

type LayoutType = 'force' | 'hierarchical' | 'radial' | 'circular';

export function GraphVisualization({
  nodes,
  edges,
  className,
  height = 600,
  onNodeClick,
  onEdgeClick
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [layout, setLayout] = useState<LayoutType>('force');
  const [isSimulating, setIsSimulating] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string[]>([]);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // Futuristic color palette
  const colorScale = d3.scaleOrdinal()
    .domain(['0', '1', '2', '3', '4', '5'])
    .range(['#00F5FF', '#FF00E5', '#FFE500', '#00FF94', '#FF6B00', '#B794F6']);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll('*').remove();

    // Create container groups
    const g = svg.append('g').attr('class', 'graph-container');
    
    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(Math.round(event.transform.k * 100));
      });

    svg.call(zoomBehavior);

    // Add gradient definitions for futuristic effects
    const defs = svg.append('defs');
    
    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Edge gradients
    edges.forEach((edge, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `edge-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#00F5FF')
        .attr('stop-opacity', 0.6);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#FF00E5')
        .attr('stop-opacity', 0.6);
    });

    // Filter nodes and edges based on type filter
    const filteredNodes = nodeTypeFilter.length > 0 
      ? nodes.filter(n => nodeTypeFilter.includes(n.type))
      : nodes;
    
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
      const targetId = typeof e.target === 'string' ? e.target : e.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Apply layout
    switch (layout) {
      case 'hierarchical':
        applyHierarchicalLayout(filteredNodes, width, height);
        break;
      case 'radial':
        applyRadialLayout(filteredNodes, width, height);
        break;
      case 'circular':
        applyCircularLayout(filteredNodes, width, height);
        break;
    }

    // Create edge elements with animation
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredEdges)
      .enter().append('line')
      .attr('stroke', (d, i) => `url(#edge-gradient-${i})`)
      .attr('stroke-width', d => Math.sqrt(d.weight || 1) * 2)
      .attr('stroke-opacity', 0.6)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onEdgeClick?.(d));

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredNodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add node circles with glow effect
    node.append('circle')
      .attr('r', d => 20 + (d.metadata?.importance || 0) * 5)
      .attr('fill', d => colorScale(String(d.group)))
      .attr('filter', 'url(#glow)')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 25 + (d.metadata?.importance || 0) * 5);
        setHoveredNode(d);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 20 + (d.metadata?.importance || 0) * 5);
        setHoveredNode(null);
      })
      .on('click', (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      });

    // Add pulse animation for selected node
    node.append('circle')
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(String(d.group)))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0)
      .attr('class', 'pulse-ring');

    // Add node labels with futuristic font
    node.append('text')
      .text(d => d.label)
      .attr('dx', 0)
      .attr('dy', -25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .style('text-shadow', '0 0 10px rgba(0, 245, 255, 0.8)');

    // Animation loop
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Pulse animation for selected node
    if (selectedNode) {
      const selectedNodeElement = node.filter(d => d.id === selectedNode.id);
      selectedNodeElement.select('.pulse-ring')
        .attr('r', 20)
        .attr('stroke-opacity', 1)
        .transition()
        .duration(1000)
        .attr('r', 40)
        .attr('stroke-opacity', 0)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', 20)
            .attr('stroke-opacity', 1)
            .transition()
            .duration(1000)
            .attr('r', 40)
            .attr('stroke-opacity', 0)
            .on('end', repeat);
        });
    }

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Control simulation
    if (!isSimulating) {
      simulation.stop();
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, layout, nodeTypeFilter, selectedNode, isSimulating, height]);

  // Layout functions
  function applyHierarchicalLayout(nodes: GraphNode[], width: number, height: number) {
    const stratify = d3.stratify<GraphNode>()
      .id(d => d.id)
      .parentId(() => null);
    
    const treeLayout = d3.tree<GraphNode>()
      .size([width - 100, height - 100]);
    
    try {
      const root = stratify(nodes);
      const tree = treeLayout(root);
      tree.descendants().forEach(d => {
        const node = d.data;
        node.x = d.x + 50;
        node.y = d.y + 50;
        node.fx = node.x;
        node.fy = node.y;
      });
    } catch (e) {
      console.warn('Could not apply hierarchical layout', e);
    }
  }

  function applyRadialLayout(nodes: GraphNode[], width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      node.fx = node.x;
      node.fy = node.y;
    });
  }

  function applyCircularLayout(nodes: GraphNode[], width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2.5;
    
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      node.fx = node.x;
      node.fy = node.y;
    });
  }

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      1.2
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      0.8
    );
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
    setZoom(100);
  };

  const handleExport = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueNodeTypes = Array.from(new Set(nodes.map(n => n.type)));

  return (
    <Card className={cn("relative overflow-hidden bg-gradient-to-br from-gray-900 to-black", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-black/50 backdrop-blur">
        <CardTitle className="text-xl font-bold text-white">
          Knowledge Graph Explorer
          {selectedNode && (
            <Badge variant="outline" className="ml-2 text-cyan-400 border-cyan-400">
              {selectedNode.label}
            </Badge>
          )}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <Select value={layout} onValueChange={(value) => setLayout(value as LayoutType)}>
            <SelectTrigger className="w-32 bg-black/50 text-white border-gray-700">
              <Layers className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">Force Layout</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
              <SelectItem value="circular">Circular</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="bg-black/50 text-white border-gray-700">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="p-2">
                <div className="text-sm font-medium mb-2">Filter by Type</div>
                {uniqueNodeTypes.map(type => (
                  <label key={type} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={nodeTypeFilter.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNodeTypeFilter([...nodeTypeFilter, type]);
                        } else {
                          setNodeTypeFilter(nodeTypeFilter.filter(t => t !== type));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Simulation Control */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSimulating(!isSimulating)}
            className="bg-black/50 text-white border-gray-700"
          >
            {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-black/50 rounded-md p-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/10">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white px-2 min-w-[3rem] text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/10">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={handleReset} className="text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleExport} className="text-white hover:bg-white/10">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0" ref={containerRef}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-black"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 245, 255, 0.1) 0%, transparent 50%)',
          }}
        />
        
        {/* Hover Info Panel */}
        {hoveredNode && (
          <div className="absolute top-20 right-4 bg-black/80 backdrop-blur-lg border border-cyan-500/50 rounded-lg p-4 text-white max-w-xs">
            <h4 className="font-bold text-cyan-400 mb-2">{hoveredNode.label}</h4>
            <div className="text-sm space-y-1">
              <div>Type: <span className="text-gray-400">{hoveredNode.type}</span></div>
              <div>Group: <span className="text-gray-400">{hoveredNode.group}</span></div>
              {hoveredNode.metadata && Object.entries(hoveredNode.metadata).map(([key, value]) => (
                <div key={key}>
                  {key}: <span className="text-gray-400">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Stats Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white text-sm">
          <div className="flex gap-4">
            <span>{nodes.length} nodes</span>
            <span className="text-gray-400">•</span>
            <span>{edges.length} edges</span>
            {nodeTypeFilter.length > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-cyan-400">{nodeTypeFilter.length} filters active</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}