import { GraphData, GraphFilters, NodeDatum, LinkDatum } from './types';

export class FilterManager {
  private filters: GraphFilters = {
    entityTypes: new Set(),
    edgeTypes: new Set()
  };
  
  setFilters(filters: GraphFilters) {
    this.filters = filters;
  }
  
  applyFilters(graph: GraphData): GraphData {
    let filteredNodes = [...graph.nodes];
    let filteredEdges = [...graph.edges];
    
    // Filter by entity types if any are selected
    if (this.filters.entityTypes.size > 0) {
      filteredNodes = filteredNodes.filter(node =>
        this.filters.entityTypes.has(node.type)
      );
    }
    
    // Filter by edge types if any are selected
    if (this.filters.edgeTypes.size > 0) {
      filteredEdges = filteredEdges.filter(edge =>
        this.filters.edgeTypes.has(edge.type)
      );
    }
    
    // Filter by search query
    if (this.filters.searchQuery && this.filters.searchQuery.trim() !== '') {
      const query = this.filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node =>
        this.matchesSearch(node, query)
      );
    }
    
    // Apply attribute filters
    if (this.filters.attributes && this.filters.attributes.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        this.matchesAttributeFilters(node, this.filters.attributes!)
      );
    }
    
    // Remove orphaned edges (edges where source or target is filtered out)
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = filteredEdges.filter(edge => {
      const sourceId = typeof edge.source === 'string' 
        ? edge.source 
        : (edge.source as NodeDatum).id;
      const targetId = typeof edge.target === 'string' 
        ? edge.target 
        : (edge.target as NodeDatum).id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: {
        ...graph.metadata,
        totalNodes: filteredNodes.length,
        totalEdges: filteredEdges.length
      }
    };
  }
  
  private matchesSearch(node: NodeDatum, query: string): boolean {
    // Check label
    if (node.label.toLowerCase().includes(query)) {
      return true;
    }
    
    // Check ID
    if (node.id.toLowerCase().includes(query)) {
      return true;
    }
    
    // Check type
    if (node.type.toLowerCase().includes(query)) {
      return true;
    }
    
    // Check attributes
    if (node.attributes) {
      for (const value of Object.values(node.attributes)) {
        if (String(value).toLowerCase().includes(query)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private matchesAttributeFilters(
    node: NodeDatum, 
    attributeFilters: NonNullable<GraphFilters['attributes']>
  ): boolean {
    for (const filter of attributeFilters) {
      const value = node.attributes?.[filter.field];
      if (value === undefined) return false;
      
      switch (filter.operator) {
        case 'equals':
          if (value !== filter.value) return false;
          break;
        case 'contains':
          if (!String(value).toLowerCase().includes(String(filter.value).toLowerCase())) {
            return false;
          }
          break;
        case 'gt':
          if (Number(value) <= Number(filter.value)) return false;
          break;
        case 'lt':
          if (Number(value) >= Number(filter.value)) return false;
          break;
        case 'gte':
          if (Number(value) < Number(filter.value)) return false;
          break;
        case 'lte':
          if (Number(value) > Number(filter.value)) return false;
          break;
      }
    }
    
    return true;
  }
  
  getActiveFilters(): GraphFilters {
    return { ...this.filters };
  }
  
  clearFilters() {
    this.filters = {
      entityTypes: new Set(),
      edgeTypes: new Set()
    };
  }
  
  hasActiveFilters(): boolean {
    return (
      this.filters.entityTypes.size > 0 ||
      this.filters.edgeTypes.size > 0 ||
      (this.filters.searchQuery !== undefined && this.filters.searchQuery !== '') ||
      (this.filters.attributes !== undefined && this.filters.attributes.length > 0) ||
      this.filters.dateRange !== undefined
    );
  }
}