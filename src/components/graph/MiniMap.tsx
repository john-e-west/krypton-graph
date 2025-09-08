import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Viewport, NodeDatum } from './types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface MiniMapProps {
  graphData: GraphData;
  viewport: Viewport;
  onNavigate: (position: { x: number; y: number }) => void;
  className?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  graphData,
  viewport,
  onNavigate,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const scale = 0.15;
  const width = 200;
  const height = 150;

  useEffect(() => {
    if (!containerRef.current || !isVisible) return;

    // Clear previous SVG
    d3.select(containerRef.current).selectAll('*').remove();

    // Create mini SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '4px')
      .style('background', '#fafafa')
      .style('cursor', 'pointer');

    svgRef.current = svg.node();

    // Create container group with scaling
    const g = svg.append('g')
      .attr('transform', `scale(${scale})`);

    // Render simplified edges
    if (graphData.edges.length > 0) {
      g.selectAll('line')
        .data(graphData.edges)
        .join('line')
        .attr('x1', d => {
          const source = d.source as NodeDatum;
          return source.x || 0;
        })
        .attr('y1', d => {
          const source = d.source as NodeDatum;
          return source.y || 0;
        })
        .attr('x2', d => {
          const target = d.target as NodeDatum;
          return target.x || 0;
        })
        .attr('y2', d => {
          const target = d.target as NodeDatum;
          return target.y || 0;
        })
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);
    }

    // Render simplified nodes (just dots)
    if (graphData.nodes.length > 0) {
      g.selectAll('circle')
        .data(graphData.nodes)
        .join('circle')
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0)
        .attr('r', 3)
        .attr('fill', '#6b7280');
    }

    // Viewport rectangle
    const viewportRect = svg.append('rect')
      .attr('x', viewport.x * scale)
      .attr('y', viewport.y * scale)
      .attr('width', viewport.width * scale)
      .attr('height', viewport.height * scale)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2')
      .style('pointer-events', 'none');

    // Viewport fill for visibility
    svg.append('rect')
      .attr('x', viewport.x * scale)
      .attr('y', viewport.y * scale)
      .attr('width', viewport.width * scale)
      .attr('height', viewport.height * scale)
      .attr('fill', '#2563eb')
      .attr('fill-opacity', 0.1)
      .style('pointer-events', 'none');

    // Click to navigate
    svg.on('click', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      onNavigate({
        x: x / scale,
        y: y / scale
      });
    });

    // Drag to navigate
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('drag', (event) => {
        const [x, y] = d3.pointer(event);
        onNavigate({
          x: x / scale,
          y: y / scale
        });
      });

    svg.call(drag);

  }, [graphData, isVisible]);

  useEffect(() => {
    if (!svgRef.current || !isVisible) return;

    // Update viewport rectangle position
    d3.select(svgRef.current)
      .selectAll('rect')
      .attr('x', viewport.x * scale)
      .attr('y', viewport.y * scale)
      .attr('width', viewport.width * scale)
      .attr('height', viewport.height * scale);
  }, [viewport, scale, isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Card className={`absolute bottom-4 right-4 p-2 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Mini-map</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={toggleVisibility}
          title={isVisible ? 'Hide mini-map' : 'Show mini-map'}
        >
          {isVisible ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
      {isVisible && (
        <div
          ref={containerRef}
          className="relative"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      )}
    </Card>
  );
};