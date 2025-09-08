import * as d3 from 'd3';
import { NodeDatum, LinkDatum, LayoutType } from './types';

export class LayoutManager {
  private currentLayout: LayoutType = 'force';
  private width: number;
  private height: number;
  private simulation: d3.Simulation<NodeDatum, LinkDatum> | null = null;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  applyLayout(
    nodes: NodeDatum[],
    edges: LinkDatum[],
    type: LayoutType,
    onTick?: () => void
  ): d3.Simulation<NodeDatum, LinkDatum> | null {
    this.currentLayout = type;
    
    // Stop any existing simulation
    if (this.simulation) {
      this.simulation.stop();
    }
    
    switch (type) {
      case 'force':
        return this.forceLayout(nodes, edges, onTick);
      case 'hierarchical':
        return this.hierarchicalLayout(nodes, edges, onTick);
      case 'circular':
        return this.circularLayout(nodes, edges, onTick);
      case 'grid':
        return this.gridLayout(nodes, edges, onTick);
      default:
        return this.forceLayout(nodes, edges, onTick);
    }
  }
  
  private forceLayout(
    nodes: NodeDatum[],
    edges: LinkDatum[],
    onTick?: () => void
  ): d3.Simulation<NodeDatum, LinkDatum> {
    this.simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(edges)
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
    
    if (onTick) {
      this.simulation.on('tick', onTick);
    }
    
    return this.simulation;
  }
  
  private hierarchicalLayout(
    nodes: NodeDatum[],
    edges: LinkDatum[],
    onTick?: () => void
  ): d3.Simulation<NodeDatum, LinkDatum> {
    // Create a map of node connections for hierarchy
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const roots: NodeDatum[] = [];
    const children = new Set<string>();
    
    // Find root nodes (nodes with no incoming edges)
    edges.forEach(edge => {
      const targetId = typeof edge.target === 'string' 
        ? edge.target 
        : (edge.target as NodeDatum).id;
      children.add(targetId);
    });
    
    nodes.forEach(node => {
      if (!children.has(node.id)) {
        roots.push(node);
      }
    });
    
    // If no roots found, use first node as root
    if (roots.length === 0 && nodes.length > 0) {
      roots.push(nodes[0]);
    }
    
    // Calculate levels using BFS
    const levels = new Map<string, number>();
    const queue: { node: NodeDatum; level: number }[] = 
      roots.map(r => ({ node: r, level: 0 }));
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { node, level } = queue.shift()!;
      if (visited.has(node.id)) continue;
      
      visited.add(node.id);
      levels.set(node.id, level);
      
      // Find children
      edges.forEach(edge => {
        const sourceId = typeof edge.source === 'string' 
          ? edge.source 
          : (edge.source as NodeDatum).id;
        const targetId = typeof edge.target === 'string' 
          ? edge.target 
          : (edge.target as NodeDatum).id;
        
        if (sourceId === node.id && !visited.has(targetId)) {
          const childNode = nodeMap.get(targetId);
          if (childNode) {
            queue.push({ node: childNode, level: level + 1 });
          }
        }
      });
    }
    
    // Position nodes based on levels
    const maxLevel = Math.max(...Array.from(levels.values()), 0);
    const levelHeight = maxLevel > 0 ? this.height / (maxLevel + 1) : this.height / 2;
    const levelNodes = new Map<number, NodeDatum[]>();
    
    nodes.forEach(node => {
      const level = levels.get(node.id) || 0;
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(node);
    });
    
    // Position nodes
    levelNodes.forEach((nodesAtLevel, level) => {
      const y = levelHeight * (level + 0.5);
      const nodeWidth = this.width / (nodesAtLevel.length + 1);
      
      nodesAtLevel.forEach((node, i) => {
        node.fx = nodeWidth * (i + 1);
        node.fy = y;
      });
    });
    
    // Create simulation with fixed positions initially
    this.simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(-100))
      .alpha(0.3)
      .alphaDecay(0.01);
    
    if (onTick) {
      this.simulation.on('tick', onTick);
    }
    
    // Release fixed positions after initial layout
    setTimeout(() => {
      nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
    }, 1000);
    
    return this.simulation;
  }
  
  private circularLayout(
    nodes: NodeDatum[],
    edges: LinkDatum[],
    onTick?: () => void
  ): d3.Simulation<NodeDatum, LinkDatum> {
    const radius = Math.min(this.width, this.height) / 2 - 100;
    const angleStep = (2 * Math.PI) / nodes.length;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    nodes.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      node.fx = centerX + radius * Math.cos(angle);
      node.fy = centerY + radius * Math.sin(angle);
    });
    
    // Create simulation with fixed positions
    this.simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(-50))
      .alpha(0.3)
      .alphaDecay(0.01);
    
    if (onTick) {
      this.simulation.on('tick', onTick);
    }
    
    // Release fixed positions after initial layout
    setTimeout(() => {
      nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
    }, 1000);
    
    return this.simulation;
  }
  
  private gridLayout(
    nodes: NodeDatum[],
    edges: LinkDatum[],
    onTick?: () => void
  ): d3.Simulation<NodeDatum, LinkDatum> {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const cellWidth = this.width / (cols + 1);
    const cellHeight = this.height / (rows + 1);
    
    nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      node.fx = cellWidth * (col + 1);
      node.fy = cellHeight * (row + 1);
    });
    
    // Create simulation with fixed positions
    this.simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(-50))
      .alpha(0.3)
      .alphaDecay(0.01);
    
    if (onTick) {
      this.simulation.on('tick', onTick);
    }
    
    // Release fixed positions after initial layout
    setTimeout(() => {
      nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
    }, 1000);
    
    return this.simulation;
  }
  
  getCurrentLayout(): LayoutType {
    return this.currentLayout;
  }
  
  stopSimulation() {
    if (this.simulation) {
      this.simulation.stop();
    }
  }
  
  restartSimulation() {
    if (this.simulation) {
      this.simulation.alpha(1).restart();
    }
  }
}