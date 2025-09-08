import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { NodeDetailPanel } from '@/components/graph/NodeDetailPanel';
import { EdgeDetailPanel } from '@/components/graph/EdgeDetailPanel';
import { FilterPanel } from '@/components/graph/FilterPanel';
import { MiniMap } from '@/components/graph/MiniMap';
import { FilterManager } from '@/components/graph/FilterManager';
import { GraphExporter } from '@/components/graph/GraphExporter';
import { 
  GraphData, 
  NodeDatum, 
  LinkDatum, 
  GraphFilters, 
  Viewport,
  LayoutType 
} from '@/components/graph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Layout, Filter } from 'lucide-react';

// Mock data for demonstration
const mockGraphData: GraphData = {
  nodes: [
    { id: '1', type: 'person', label: 'John Doe', attributes: { age: 30, role: 'Developer' }, x: 100, y: 100 },
    { id: '2', type: 'person', label: 'Jane Smith', attributes: { age: 28, role: 'Designer' }, x: 300, y: 100 },
    { id: '3', type: 'organization', label: 'Tech Corp', attributes: { industry: 'Technology' }, x: 200, y: 250 },
    { id: '4', type: 'location', label: 'San Francisco', attributes: { country: 'USA' }, x: 400, y: 250 },
    { id: '5', type: 'event', label: 'Tech Conference', attributes: { date: '2024-03-15' }, x: 150, y: 400 },
  ],
  edges: [
    { id: 'e1', type: 'works_at', source: '1', target: '3', label: 'Works At' },
    { id: 'e2', type: 'works_at', source: '2', target: '3', label: 'Works At' },
    { id: 'e3', type: 'located_in', source: '3', target: '4', label: 'Located In' },
    { id: 'e4', type: 'participates_in', source: '1', target: '5', label: 'Participates' },
    { id: 'e5', type: 'participates_in', source: '2', target: '5', label: 'Participates' },
  ],
  metadata: {
    entityTypes: ['person', 'organization', 'location', 'event'],
    edgeTypes: ['works_at', 'located_in', 'participates_in'],
    totalNodes: 5,
    totalEdges: 5
  }
};

export const GraphExplorer: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>(mockGraphData);
  const [filteredData, setFilteredData] = useState<GraphData>(mockGraphData);
  const [selectedNode, setSelectedNode] = useState<NodeDatum | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<LinkDatum | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('force');
  const [showFilters, setShowFilters] = useState(true);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, width: 800, height: 600 });
  
  const filterManager = useRef(new FilterManager());
  const graphExporter = useRef(new GraphExporter());
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFiltersChange = useCallback((filters: GraphFilters) => {
    filterManager.current.setFilters(filters);
    const filtered = filterManager.current.applyFilters(graphData);
    setFilteredData(filtered);
  }, [graphData]);

  const handleNodeClick = useCallback((node: NodeDatum) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((edge: LinkDatum) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handleLayoutChange = (layout: LayoutType) => {
    setCurrentLayout(layout);
    // Layout change will be handled in GraphCanvas component
  };

  const handleExportSVG = async () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (svg) {
      await graphExporter.current.exportAndDownloadSVG(
        svg as SVGSVGElement,
        `graph-export-${Date.now()}.svg`,
        { watermark: 'Krypton Graph Explorer' }
      );
    }
  };

  const handleExportPNG = async () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (svg) {
      await graphExporter.current.exportAndDownloadPNG(
        svg as SVGSVGElement,
        `graph-export-${Date.now()}.png`,
        { width: 1920, height: 1080, watermark: 'Krypton Graph Explorer' }
      );
    }
  };

  const handleMiniMapNavigate = (position: { x: number; y: number }) => {
    // This would normally update the main graph viewport
    setViewport(prev => ({
      ...prev,
      x: position.x - prev.width / 2,
      y: position.y - prev.height / 2
    }));
  };

  return (
    <div className="h-screen flex flex-col">
      <Card className="m-4 flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Graph Explorer</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={currentLayout} onValueChange={handleLayoutChange}>
                <SelectTrigger className="w-40">
                  <Layout className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force Layout</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSVG}
              >
                <Download className="h-4 w-4 mr-2" />
                SVG
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
              >
                <Download className="h-4 w-4 mr-2" />
                PNG
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative flex gap-4 h-[calc(100%-5rem)]">
          {showFilters && (
            <FilterPanel
              entityTypes={graphData.metadata.entityTypes}
              edgeTypes={graphData.metadata.edgeTypes}
              onFiltersChange={handleFiltersChange}
              className="flex-shrink-0"
            />
          )}
          
          <div className="flex-1 relative" ref={canvasRef}>
            <GraphCanvas
              data={filteredData}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              className="h-full"
            />
            
            <MiniMap
              graphData={filteredData}
              viewport={viewport}
              onNavigate={handleMiniMapNavigate}
            />
          </div>
          
          {(selectedNode || selectedEdge) && (
            <div className="flex-shrink-0">
              {selectedNode && (
                <NodeDetailPanel
                  node={selectedNode}
                  onClose={() => setSelectedNode(null)}
                  onEdit={(node) => console.log('Edit node:', node)}
                />
              )}
              {selectedEdge && (
                <EdgeDetailPanel
                  edge={selectedEdge}
                  onClose={() => setSelectedEdge(null)}
                  onEdit={(edge) => console.log('Edit edge:', edge)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};