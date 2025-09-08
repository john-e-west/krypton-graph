import * as d3 from 'd3';

export interface GraphData {
  nodes: NodeDatum[];
  edges: LinkDatum[];
  metadata: {
    entityTypes: string[];
    edgeTypes: string[];
    totalNodes: number;
    totalEdges: number;
  };
}

export interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  attributes: Record<string, any>;
  group?: string;
  size?: number;
  color?: string;
  selected?: boolean;
  highlighted?: boolean;
  showLabel?: boolean;
  simplified?: boolean;
}

export interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  id: string;
  type: string;
  label?: string;
  attributes?: Record<string, any>;
  strength?: number;
  selected?: boolean;
  highlighted?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphFilters {
  entityTypes: Set<string>;
  edgeTypes: Set<string>;
  searchQuery?: string;
  attributes?: AttributeFilter[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AttributeFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

export type LayoutType = 'force' | 'hierarchical' | 'circular' | 'grid';

export interface GraphExporterOptions {
  width?: number;
  height?: number;
  includeMetadata?: boolean;
  watermark?: string;
}