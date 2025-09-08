import React, { useState, useMemo } from 'react';
import { GraphViewer } from '@/components/graph/GraphViewer';
import { GraphData, NodeDatum, LinkDatum } from '@/components/graph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, RotateCcw, Database, Zap, Eye } from 'lucide-react';

// Generate test data with various sizes
const generateGraphData = (nodeCount: number, complexity: 'simple' | 'medium' | 'complex'): GraphData => {
  const nodes: NodeDatum[] = [];
  const edges: LinkDatum[] = [];
  
  const types = {
    simple: ['document', 'entity'],
    medium: ['document', 'entity', 'concept', 'fact'],
    complex: ['document', 'entity', 'concept', 'fact', 'person', 'organization', 'location', 'event']
  };
  
  const edgeTypes = {
    simple: ['relates_to', 'contains'],
    medium: ['relates_to', 'contains', 'supports', 'references'],
    complex: ['relates_to', 'contains', 'supports', 'references', 'works_at', 'located_in', 'participates_in', 'influences']
  };
  
  const nodeTypes = types[complexity];
  const linkTypes = edgeTypes[complexity];
  
  // Create nodes with realistic distributions
  for (let i = 1; i <= nodeCount; i++) {
    const type = nodeTypes[i % nodeTypes.length];
    nodes.push({
      id: `node_${i}`,
      type,
      label: `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i}`,
      attributes: {
        importance: Math.floor(Math.random() * 5) + 1,
        category: `category_${Math.floor(i / Math.max(1, nodeCount / 10))}`,
        score: Math.random(),
        created: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
      },
      x: Math.random() * 800,
      y: Math.random() * 600,
    });
  }
  
  // Create edges with realistic connectivity
  const edgeCount = Math.floor(nodeCount * (complexity === 'simple' ? 1.2 : complexity === 'medium' ? 1.5 : 2.0));
  const edgeSet = new Set<string>();
  
  for (let i = 1; i <= edgeCount; i++) {
    let sourceIdx, targetIdx;
    let attempts = 0;
    
    do {
      // Prefer connections to nearby nodes for clustering
      sourceIdx = Math.floor(Math.random() * nodeCount);
      const range = Math.min(nodeCount / 4, 50);
      targetIdx = Math.max(0, Math.min(nodeCount - 1, 
        sourceIdx + Math.floor((Math.random() - 0.5) * range * 2)));
      
      attempts++;
    } while (
      (sourceIdx === targetIdx || edgeSet.has(`${sourceIdx}-${targetIdx}`)) && 
      attempts < 100
    );
    
    if (attempts < 100) {
      const edgeKey = `${sourceIdx}-${targetIdx}`;
      edgeSet.add(edgeKey);
      
      edges.push({
        id: `edge_${i}`,
        type: linkTypes[i % linkTypes.length],
        source: `node_${sourceIdx + 1}`,
        target: `node_${targetIdx + 1}`,
        strength: Math.random() * 0.8 + 0.2,
        attributes: {
          weight: Math.random(),
          confidence: Math.random(),
        }
      });
    }
  }
  
  return {
    nodes,
    edges,
    metadata: {
      entityTypes: nodeTypes,
      edgeTypes: linkTypes,
      totalNodes: nodeCount,
      totalEdges: edges.length,
    },
  };
};

// Predefined datasets
const datasets = {
  small: generateGraphData(25, 'simple'),
  medium: generateGraphData(100, 'medium'),
  large: generateGraphData(500, 'complex'),
  xlarge: generateGraphData(1000, 'complex'),
  stress: generateGraphData(2000, 'complex'),
};

export const GraphViewerDemo: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof datasets>('medium');
  const [selectedNode, setSelectedNode] = useState<NodeDatum | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<LinkDatum | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    renderTime: number;
    nodeCount: number;
    edgeCount: number;
  } | null>(null);

  const currentData = useMemo(() => datasets[selectedDataset], [selectedDataset]);

  const handleNodeClick = (node: NodeDatum) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    console.log('Node clicked:', node);
  };

  const handleEdgeClick = (edge: LinkDatum) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    console.log('Edge clicked:', edge);
  };

  const measurePerformance = () => {
    const start = performance.now();
    // Force re-render by changing dataset
    setSelectedDataset(prev => prev);
    
    setTimeout(() => {
      const end = performance.now();
      setPerformanceMetrics({
        renderTime: end - start,
        nodeCount: currentData.nodes.length,
        edgeCount: currentData.edges.length,
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">D3.js Graph Viewer Demo</CardTitle>
                <p className="text-gray-600 mt-1">
                  MVP implementation with force-directed layout, clustering, and interactive controls
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600">
                  <Zap className="w-3 h-3 mr-1" />
                  MVP Ready
                </Badge>
                <Badge variant="outline" className="text-green-600">
                  <Database className="w-3 h-3 mr-1" />
                  1K+ Nodes
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Dataset</label>
                <Select value={selectedDataset} onValueChange={(value: any) => setSelectedDataset(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (25 nodes)</SelectItem>
                    <SelectItem value="medium">Medium (100 nodes)</SelectItem>
                    <SelectItem value="large">Large (500 nodes)</SelectItem>
                    <SelectItem value="xlarge">X-Large (1000 nodes)</SelectItem>
                    <SelectItem value="stress">Stress Test (2000 nodes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Performance</h4>
                <Button onClick={measurePerformance} variant="outline" size="sm" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Measure Render Time
                </Button>
                
                {performanceMetrics && (
                  <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                    <div>Render: {performanceMetrics.renderTime.toFixed(2)}ms</div>
                    <div>Nodes: {performanceMetrics.nodeCount}</div>
                    <div>Edges: {performanceMetrics.edgeCount}</div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Dataset Info</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <Badge variant="secondary">{currentData.nodes.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Edges:</span>
                    <Badge variant="secondary">{currentData.edges.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Types:</span>
                    <Badge variant="secondary">{currentData.metadata.entityTypes.length}</Badge>
                  </div>
                </div>
              </div>

              {/* Selection Details */}
              {(selectedNode || selectedEdge) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Selection Details</h4>
                    {selectedNode && (
                      <div className="text-xs bg-blue-50 p-2 rounded">
                        <div className="font-medium text-blue-800">Node: {selectedNode.label}</div>
                        <div>Type: {selectedNode.type}</div>
                        <div>ID: {selectedNode.id}</div>
                        {selectedNode.attributes && (
                          <div className="mt-1 text-gray-600">
                            {Object.entries(selectedNode.attributes).slice(0, 3).map(([key, value]) => (
                              <div key={key}>{key}: {String(value).substring(0, 20)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedEdge && (
                      <div className="text-xs bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-800">Edge: {selectedEdge.type}</div>
                        <div>Source: {typeof selectedEdge.source === 'string' ? selectedEdge.source : selectedEdge.source?.id}</div>
                        <div>Target: {typeof selectedEdge.target === 'string' ? selectedEdge.target : selectedEdge.target?.id}</div>
                        <div>Strength: {selectedEdge.strength?.toFixed(3) || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Graph Viewer */}
          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              <div style={{ height: '700px' }}>
                <GraphViewer
                  data={currentData}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Showcase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="font-semibold text-blue-800">Force-Directed Layout</div>
                <div className="text-sm text-blue-600 mt-1">
                  Optimized D3.js simulation with configurable forces
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="font-semibold text-green-800">Node Clustering</div>
                <div className="text-sm text-green-600 mt-1">
                  Automatic clustering for 1,000+ nodes with expand/collapse
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="font-semibold text-purple-800">Zoom & Pan</div>
                <div className="text-sm text-purple-600 mt-1">
                  Smooth interactions with level-of-detail rendering
                </div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="font-semibold text-orange-800">SVG Export</div>
                <div className="text-sm text-orange-600 mt-1">
                  High-quality vector export with styling preserved
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Graph Interactions:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• <strong>Drag nodes</strong> to reposition them</li>
                  <li>• <strong>Click nodes/edges</strong> to select and view details</li>
                  <li>• <strong>Mouse wheel</strong> to zoom in/out</li>
                  <li>• <strong>Click and drag</strong> background to pan</li>
                  <li>• <strong>Double-click</strong> nodes to focus (if implemented)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Controls:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• <strong>Zoom buttons</strong> for precise zoom control</li>
                  <li>• <strong>Fit to view</strong> to see all nodes</li>
                  <li>• <strong>Reset view</strong> to return to center</li>
                  <li>• <strong>Toggle labels</strong> for better performance</li>
                  <li>• <strong>Export SVG</strong> to save the current view</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};