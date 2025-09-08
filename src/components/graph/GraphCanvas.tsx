import React, { useEffect, useRef, useState } from 'react';
import { GraphRenderer } from './GraphRenderer';
import { GraphData, NodeDatum, LinkDatum } from './types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (node: NodeDatum) => void;
  onEdgeClick?: (edge: LinkDatum) => void;
  className?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  data,
  onNodeClick,
  onEdgeClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    rendererRef.current = new GraphRenderer(containerRef.current);
    rendererRef.current.render(data);
    setIsInitialized(true);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      setIsInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current && isInitialized) {
      rendererRef.current.updateData(data);
    }
  }, [data, isInitialized]);

  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: containerRef.current.clientWidth / 2,
        clientY: containerRef.current.clientHeight / 2,
        bubbles: true
      });
      svg.dispatchEvent(event);
    }
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      const event = new WheelEvent('wheel', {
        deltaY: 100,
        clientX: containerRef.current.clientWidth / 2,
        clientY: containerRef.current.clientHeight / 2,
        bubbles: true
      });
      svg.dispatchEvent(event);
    }
  };

  const handleZoomReset = () => {
    if (rendererRef.current) {
      rendererRef.current.resetZoom();
    }
  };

  const handleZoomToFit = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomToFit();
    }
  };

  return (
    <Card className={`relative ${className}`}>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomToFit}
          title="Fit to View"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
    </Card>
  );
};