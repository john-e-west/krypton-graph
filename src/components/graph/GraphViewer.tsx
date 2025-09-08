import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, NodeDatum, LinkDatum } from './types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Layers, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GraphViewerProps {
  data: GraphData;
  onNodeClick?: (node: NodeDatum) => void;
  onEdgeClick?: (edge: LinkDatum) => void;
  className?: string;
}

interface ClusterNode extends NodeDatum {
  clusterId?: string;
  isClusterNode?: boolean;
  clusterSize?: number;
  originalNodes?: NodeDatum[];
}

const nodeColors = {
  document: "#3B82F6",
  entity: "#10B981", 
  concept: "#F59E0B",
  fact: "#8B5CF6",
  cluster: "#6B7280",
  default: "#6B7280"
};

export const GraphViewer: React.FC<GraphViewerProps> = ({
  data,
  onNodeClick,
  onEdgeClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<ClusterNode, LinkDatum> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [clusterThreshold, setClusterThreshold] = useState(0.5);
  const [showLabels, setShowLabels] = useState(true);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(clientWidth, 400),
          height: Math.max(clientHeight, 300)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const setupForceSimulation = useCallback((nodes: ClusterNode[], links: LinkDatum[]) => {
    const { width, height } = dimensions;
    
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    simulationRef.current = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: ClusterNode) => 
        d.isClusterNode ? Math.sqrt((d.clusterSize || 1) * 10) + 20 : 25))
      .alphaTarget(0.01)
      .alphaDecay(0.01);

    return simulationRef.current;
  }, [dimensions]);

  const createClusters = useCallback((nodes: NodeDatum[]): ClusterNode[] => {
    if (nodes.length <= 100) {
      return nodes as ClusterNode[];
    }

    const clusters = new Map<string, ClusterNode[]>();
    
    nodes.forEach(node => {
      const clusterKey = node.type || 'default';
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(node as ClusterNode);
    });

    const clusteredNodes: ClusterNode[] = [];

    clusters.forEach((clusterNodes, type) => {
      if (clusterNodes.length > 10) {
        const clusterNode: ClusterNode = {
          id: `cluster_${type}`,
          type: 'cluster',
          label: `${type} (${clusterNodes.length})`,
          attributes: { type, count: clusterNodes.length },
          isClusterNode: true,
          clusterSize: clusterNodes.length,
          originalNodes: clusterNodes,
          x: d3.mean(clusterNodes, d => d.x) || 0,
          y: d3.mean(clusterNodes, d => d.y) || 0
        };
        clusteredNodes.push(clusterNode);
      } else {
        clusteredNodes.push(...clusterNodes);
      }
    });

    return clusteredNodes;
  }, []);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    const container = svg.append('g').attr('class', 'graph-container');
    
    const processedNodes = createClusters(data.nodes);
    const processedLinks = data.edges.filter(link => 
      processedNodes.some(n => n.id === link.source || n.id === (link.source as any)?.id) &&
      processedNodes.some(n => n.id === link.target || n.id === (link.target as any)?.id)
    );

    setNodeCount(processedNodes.length);
    setEdgeCount(processedLinks.length);

    const linkGroup = container.append('g').attr('class', 'links');
    const nodeGroup = container.append('g').attr('class', 'nodes');

    const links = linkGroup.selectAll('line')
      .data(processedLinks)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', d => Math.max(0.1, d.strength || 0.6))
      .attr('stroke-width', d => Math.max(1, (d.strength || 1) * 2))
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onEdgeClick?.(d);
      });

    const nodeElements = nodeGroup.selectAll('g')
      .data(processedNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.isClusterNode && d.originalNodes) {
          console.log('Expanding cluster:', d.originalNodes);
        }
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).select('circle').attr('stroke-width', 4);
      })
      .on('mouseleave', (event, d) => {
        d3.select(event.currentTarget).select('circle').attr('stroke-width', 2);
      });

    nodeElements.append('circle')
      .attr('r', d => d.isClusterNode ? Math.sqrt((d.clusterSize || 1) * 10) + 10 : 
        Math.max(8, Math.min(25, (d.attributes?.importance || 1) * 15)))
      .attr('fill', d => nodeColors[d.type as keyof typeof nodeColors] || nodeColors.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    if (showLabels) {
      nodeElements.append('text')
        .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('font-size', d => d.isClusterNode ? '12px' : '10px')
        .style('font-weight', d => d.isClusterNode ? 'bold' : 'normal')
        .style('fill', '#333')
        .style('pointer-events', 'none')
        .style('user-select', 'none');
    }

    const simulation = setupForceSimulation(processedNodes, processedLinks);
    
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as ClusterNode).x!)
        .attr('y1', d => (d.source as ClusterNode).y!)
        .attr('x2', d => (d.target as ClusterNode).x!)
        .attr('y2', d => (d.target as ClusterNode).y!);

      nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    simulation.on('end', () => {
      setIsSimulationRunning(false);
    });

    setIsSimulationRunning(true);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
        
        const scale = event.transform.k;
        if (scale < 0.5 && showLabels) {
          nodeElements.selectAll('text').style('opacity', 0);
        } else if (showLabels) {
          nodeElements.selectAll('text').style('opacity', 1);
        }
      });

    svg.call(zoom);

    const dragBehavior = d3.drag<SVGGElement, ClusterNode>()
      .on('start', (event, d) => {
        if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active && simulation) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(dragBehavior);

  }, [data, dimensions, createClusters, setupForceSimulation, showLabels, onNodeClick, onEdgeClick]);

  useEffect(() => {
    renderGraph();
    
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [renderGraph]);

  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomTransform(svgRef.current).scale(1.5)
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomTransform(svgRef.current).scale(0.75)
      );
    }
  };

  const handleResetView = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity
      );
    }
  };

  const handleFitToView = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const bounds = svg.select('.graph-container').node()?.getBBox();
      if (bounds) {
        const { width, height } = dimensions;
        const scale = 0.9 / Math.max(bounds.width / width, bounds.height / height);
        const translate = [
          width / 2 - scale * (bounds.x + bounds.width / 2),
          height / 2 - scale * (bounds.y + bounds.height / 2)
        ];

        svg.transition().call(
          d3.zoom<SVGSVGElement, unknown>().transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
    }
  };

  const handleExportSVG = () => {
    if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `graph-export-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const restartSimulation = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsSimulationRunning(true);
    }
  };

  return (
    <TooltipProvider>
      <Card className={`relative ${className}`}>
        <div className="absolute top-4 left-4 z-10">
          <div className="flex gap-2 mb-2">
            <Badge variant="secondary">
              <Info className="w-3 h-3 mr-1" />
              {nodeCount} nodes, {edgeCount} edges
            </Badge>
            {isSimulationRunning && (
              <Badge variant="outline">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Simulation Running
              </Badge>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleFitToView}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleResetView}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowLabels(!showLabels)}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Labels</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleExportSVG}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export SVG</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <div className="flex gap-2 text-xs text-gray-600 bg-white/90 p-2 rounded">
            <span>Drag nodes • Zoom/Pan • Click to select</span>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="w-full h-full relative"
          style={{ minHeight: '600px' }}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: 'grab' }}
          />
        </div>
      </Card>
    </TooltipProvider>
  );
};