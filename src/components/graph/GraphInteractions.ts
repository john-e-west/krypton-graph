import * as d3 from 'd3';
import { NodeDatum, LinkDatum } from './types';

export class GraphInteractions {
  private selectedNodes: Set<string> = new Set();
  private selectedEdges: Set<string> = new Set();
  private onNodeSelected?: (node: NodeDatum) => void;
  private onEdgeSelected?: (edge: LinkDatum) => void;
  private onSelectionCleared?: () => void;
  
  setupInteractions(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    container: d3.Selection<SVGGElement, unknown, null, undefined>
  ) {
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
      });
    
    svg.call(zoom);
    
    svg.selectAll('.node')
      .on('click', (event: MouseEvent, d: unknown) => {
        this.nodeClicked(event, d as NodeDatum);
      })
      .on('mouseover', (event: MouseEvent, d: unknown) => {
        this.nodeHovered(event, d as NodeDatum);
      })
      .on('mouseout', (event: MouseEvent, d: unknown) => {
        this.nodeUnhovered(event, d as NodeDatum);
      });
    
    svg.selectAll('.link')
      .on('click', (event: MouseEvent, d: unknown) => {
        this.edgeClicked(event, d as LinkDatum);
      })
      .on('mouseover', (event: MouseEvent, d: unknown) => {
        this.edgeHovered(event, d as LinkDatum);
      })
      .on('mouseout', (event: MouseEvent, d: unknown) => {
        this.edgeUnhovered(event, d as LinkDatum);
      });
    
    svg.on('click', (event: MouseEvent) => {
      if (event.target === svg.node()) {
        this.clearSelection();
      }
    });
  }
  
  private nodeClicked(event: MouseEvent, d: NodeDatum) {
    event.stopPropagation();
    
    if (event.shiftKey) {
      if (this.selectedNodes.has(d.id)) {
        this.selectedNodes.delete(d.id);
      } else {
        this.selectedNodes.add(d.id);
      }
    } else {
      this.clearSelection();
      this.selectedNodes.add(d.id);
    }
    
    this.updateSelection();
    this.onNodeSelected?.(d);
  }
  
  private edgeClicked(event: MouseEvent, d: LinkDatum) {
    event.stopPropagation();
    
    if (event.shiftKey) {
      if (this.selectedEdges.has(d.id)) {
        this.selectedEdges.delete(d.id);
      } else {
        this.selectedEdges.add(d.id);
      }
    } else {
      this.clearSelection();
      this.selectedEdges.add(d.id);
    }
    
    this.updateSelection();
    this.onEdgeSelected?.(d);
  }
  
  private nodeHovered(event: MouseEvent, d: NodeDatum) {
    d3.select(event.currentTarget as SVGGElement)
      .select('circle')
      .transition()
      .duration(200)
      .attr('r', (d: any) => (d.size || 20) * 1.2)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');
  }
  
  private nodeUnhovered(event: MouseEvent, d: NodeDatum) {
    if (!this.selectedNodes.has(d.id)) {
      d3.select(event.currentTarget as SVGGElement)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', (d: any) => d.size || 20)
        .style('filter', 'none');
    }
  }
  
  private edgeHovered(event: MouseEvent, d: LinkDatum) {
    d3.select(event.currentTarget as SVGLineElement)
      .transition()
      .duration(200)
      .attr('stroke-width', 4)
      .attr('opacity', 1);
  }
  
  private edgeUnhovered(event: MouseEvent, d: LinkDatum) {
    if (!this.selectedEdges.has(d.id)) {
      d3.select(event.currentTarget as SVGLineElement)
        .transition()
        .duration(200)
        .attr('stroke-width', 2)
        .attr('opacity', 0.6);
    }
  }
  
  private clearSelection() {
    this.selectedNodes.clear();
    this.selectedEdges.clear();
    this.updateSelection();
    this.onSelectionCleared?.();
  }
  
  private updateSelection() {
    d3.selectAll('.node')
      .classed('selected', (d: any) => this.selectedNodes.has(d.id))
      .select('circle')
      .attr('stroke-width', (d: any) => 
        this.selectedNodes.has(d.id) ? 4 : 2
      )
      .attr('stroke', (d: any) => 
        this.selectedNodes.has(d.id) ? '#2563eb' : '#fff'
      );
    
    d3.selectAll('.link')
      .classed('selected', (d: any) => this.selectedEdges.has(d.id))
      .attr('stroke-width', (d: any) => 
        this.selectedEdges.has(d.id) ? 4 : 2
      )
      .attr('opacity', (d: any) => 
        this.selectedEdges.has(d.id) ? 1 : 0.6
      );
  }
  
  setNodeSelectedHandler(handler: (node: NodeDatum) => void) {
    this.onNodeSelected = handler;
  }
  
  setEdgeSelectedHandler(handler: (edge: LinkDatum) => void) {
    this.onEdgeSelected = handler;
  }
  
  setSelectionClearedHandler(handler: () => void) {
    this.onSelectionCleared = handler;
  }
  
  getSelectedNodes(): Set<string> {
    return new Set(this.selectedNodes);
  }
  
  getSelectedEdges(): Set<string> {
    return new Set(this.selectedEdges);
  }
  
  selectNode(nodeId: string, clearPrevious = true) {
    if (clearPrevious) {
      this.clearSelection();
    }
    this.selectedNodes.add(nodeId);
    this.updateSelection();
  }
  
  selectEdge(edgeId: string, clearPrevious = true) {
    if (clearPrevious) {
      this.clearSelection();
    }
    this.selectedEdges.add(edgeId);
    this.updateSelection();
  }
}