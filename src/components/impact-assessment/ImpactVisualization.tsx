import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImpactReport, Severity } from '@/services/impact-assessment';
import { ImpactVisualizer, NodeStyle, EdgeStyle } from '@/services/impact-visualization';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface ImpactVisualizationProps {
  report: ImpactReport;
  graphData: {
    nodes: any[];
    edges: any[];
  };
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

export const ImpactVisualization: React.FC<ImpactVisualizationProps> = ({
  report,
  graphData,
  onNodeClick,
  onEdgeClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [visualizer] = useState(() => new ImpactVisualizer());
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    renderVisualization();
  }, [report, zoom, pan]);

  const renderVisualization = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Get impact styles
    const impactStyles = visualizer.generateImpactStyles(report);

    // Draw edges
    graphData.edges.forEach(edge => {
      const style = impactStyles.edgeStyles.get(edge.id);
      drawEdge(ctx, edge, style);
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const style = impactStyles.nodeStyles.get(node.id);
      drawNode(ctx, node, style);
    });

    // Draw legend
    drawLegend(ctx, impactStyles.legend);

    ctx.restore();
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: any, style?: NodeStyle) => {
    const x = node.x || Math.random() * 800;
    const y = node.y || Math.random() * 600;
    const radius = 20;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    
    if (style?.color) {
      ctx.fillStyle = style.color;
    } else {
      ctx.fillStyle = '#e5e7eb';
    }
    ctx.fill();

    if (style?.borderColor) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth || 1;
      ctx.stroke();
    }

    // Draw badge if present
    if (style?.badge) {
      ctx.save();
      ctx.fillStyle = style.badge.color;
      ctx.font = '10px sans-serif';
      
      const badgeX = style.badge.position.includes('right') ? x + radius - 5 : x - radius + 5;
      const badgeY = style.badge.position.includes('top') ? y - radius - 5 : y + radius + 15;
      
      ctx.fillText(style.badge.text, badgeX, badgeY);
      ctx.restore();
    }

    // Draw node label
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.id, x, y + radius + 25);
  };

  const drawEdge = (ctx: CanvasRenderingContext2D, edge: any, style?: EdgeStyle) => {
    const sourceNode = graphData.nodes.find(n => n.id === edge.source);
    const targetNode = graphData.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    const x1 = sourceNode.x || 100;
    const y1 = sourceNode.y || 100;
    const x2 = targetNode.x || 200;
    const y2 = targetNode.y || 200;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    if (style?.color) {
      ctx.strokeStyle = style.color;
    } else {
      ctx.strokeStyle = '#9ca3af';
    }
    
    ctx.lineWidth = style?.width || 1;
    
    if (style?.dashArray) {
      const dashArray = style.dashArray.split(',').map(Number);
      ctx.setLineDash(dashArray);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arrow
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - Math.PI / 6),
      y2 - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + Math.PI / 6),
      y2 - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawLegend = (ctx: CanvasRenderingContext2D, legend: any) => {
    if (!legend) return;
    
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(10, 10, 150, 120);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(10, 10, 150, 120);
    
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(legend.title, 20, 30);
    
    ctx.font = '10px sans-serif';
    legend.items.forEach((item: any, index: number) => {
      const y = 50 + index * 20;
      
      // Draw color indicator
      ctx.fillStyle = item.color;
      ctx.fillRect(20, y - 8, 12, 12);
      
      // Draw label
      ctx.fillStyle = '#000';
      ctx.fillText(item.label, 40, y);
    });
    
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  };

  const getSeverityBadge = (severity: Severity) => {
    const variant = severity === 'CRITICAL' || severity === 'HIGH' ? 'destructive' :
                   severity === 'MEDIUM' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{severity}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Impact Visualization</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleFitToScreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Impact Summary Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="destructive">
              Critical: {report.statistics.bySeverity.CRITICAL || 0}
            </Badge>
            <Badge variant="destructive">
              High: {report.statistics.bySeverity.HIGH || 0}
            </Badge>
            <Badge variant="secondary">
              Medium: {report.statistics.bySeverity.MEDIUM || 0}
            </Badge>
            <Badge variant="outline">
              Low: {report.statistics.bySeverity.LOW || 0}
            </Badge>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="relative border rounded-lg overflow-hidden bg-gray-50"
            style={{ height: '600px' }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            {/* Zoom indicator */}
            <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded border">
              Zoom: {(zoom * 100).toFixed(0)}%
            </div>
          </div>

          {/* Selected Element Info */}
          {selectedElement && (
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium">Selected: {selectedElement}</p>
                {(() => {
                  const impact = [...report.direct, ...report.indirect, ...report.ripple]
                    .find(i => i.elementId === selectedElement);
                  
                  if (impact) {
                    return (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">Type: {impact.type}</p>
                        <p className="text-sm">Severity: {getSeverityBadge(impact.severity)}</p>
                        <p className="text-sm">Confidence: {(impact.confidence * 100).toFixed(0)}%</p>
                        {impact.cause && <p className="text-sm">Caused by: {impact.cause}</p>}
                        {impact.depth && <p className="text-sm">Depth: Level {impact.depth}</p>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};