import * as d3 from 'd3';
import { NodeDatum, LinkDatum, GraphData } from './types';

export class GraphRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;
  private simulation: d3.Simulation<NodeDatum, LinkDatum>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private width: number;
  private height: number;
  private links: d3.Selection<SVGLineElement, LinkDatum, SVGGElement, unknown>;
  private nodes: d3.Selection<SVGGElement, NodeDatum, SVGGElement, unknown>;
  
  constructor(containerElement: HTMLElement) {
    this.width = containerElement.clientWidth;
    this.height = containerElement.clientHeight;
    
    this.setupSVG(containerElement);
    this.setupSimulation();
    this.setupZoom();
  }
  
  private setupSVG(containerElement: HTMLElement) {
    this.svg = d3.select(containerElement)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width, this.height].join(' '))
      .style('cursor', 'grab');
    
    const defs = this.svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');
    
    this.container = this.svg.append('g')
      .attr('class', 'graph-container');
  }
  
  private setupSimulation() {
    this.simulation = d3.forceSimulation<NodeDatum>()
      .force('link', d3.forceLink<NodeDatum, LinkDatum>()
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(
        this.width / 2,
        this.height / 2
      ))
      .force('collision', d3.forceCollide()
        .radius(30));
  }
  
  private setupZoom() {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform.toString());
      });
    
    this.svg.call(this.zoom);
  }
  
  render(graph: GraphData) {
    const linksGroup = this.container.append('g')
      .attr('class', 'links');
    
    this.links = linksGroup.selectAll('line')
      .data(graph.edges)
      .join('line')
      .attr('stroke', d => this.getEdgeColor(d.type))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');
    
    const nodesGroup = this.container.append('g')
      .attr('class', 'nodes');
    
    this.nodes = nodesGroup.selectAll('g')
      .data(graph.nodes)
      .join('g')
      .attr('class', 'node')
      .call(this.createDragBehavior());
    
    this.nodes.append('circle')
      .attr('r', d => this.getNodeRadius(d))
      .attr('fill', d => this.getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');
    
    this.nodes.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('user-select', 'none');
    
    this.simulation
      .nodes(graph.nodes)
      .on('tick', () => this.ticked());
    
    const linkForce = this.simulation.force('link') as d3.ForceLink<NodeDatum, LinkDatum>;
    linkForce.links(graph.edges);
    
    this.simulation.alpha(1).restart();
  }
  
  private ticked() {
    this.links
      .attr('x1', d => (d.source as NodeDatum).x!)
      .attr('y1', d => (d.source as NodeDatum).y!)
      .attr('x2', d => (d.target as NodeDatum).x!)
      .attr('y2', d => (d.target as NodeDatum).y!);
    
    this.nodes
      .attr('transform', d => `translate(${d.x},${d.y})`);
  }
  
  private createDragBehavior() {
    return d3.drag<SVGGElement, NodeDatum>()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
  
  private getNodeRadius(node: NodeDatum): number {
    return node.size || 20;
  }
  
  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      person: '#3b82f6',
      organization: '#10b981',
      location: '#f59e0b',
      event: '#ef4444',
      concept: '#8b5cf6',
      default: '#6b7280'
    };
    return colors[type.toLowerCase()] || colors.default;
  }
  
  private getEdgeColor(type: string): string {
    const colors: Record<string, string> = {
      knows: '#3b82f6',
      works_at: '#10b981',
      located_in: '#f59e0b',
      participates_in: '#ef4444',
      relates_to: '#8b5cf6',
      default: '#9ca3af'
    };
    return colors[type.toLowerCase()] || colors.default;
  }
  
  updateData(graph: GraphData) {
    this.container.selectAll('*').remove();
    this.render(graph);
  }
  
  destroy() {
    this.simulation.stop();
    this.svg.remove();
  }
  
  resetZoom() {
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);
  }
  
  zoomToFit() {
    const bounds = (this.container.node() as SVGGElement).getBBox();
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;
    
    const scale = 0.9 / Math.max(width / this.width, height / this.height);
    const translate = [
      this.width / 2 - scale * midX,
      this.height / 2 - scale * midY
    ];
    
    this.svg.transition()
      .duration(750)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale)
      );
  }
}