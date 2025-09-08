import { GraphClone } from './graph-clone';

export type ImpactType = 
  | 'ENTITY_DELETED' 
  | 'EDGE_CASCADE_DELETE' 
  | 'EDGE_VALIDITY_CHANGE' 
  | 'RIPPLE_EFFECT'
  | 'ENTITY_MODIFIED'
  | 'EDGE_MODIFIED';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OperationType = 
  | 'DELETE_ENTITY' 
  | 'UPDATE_ENTITY' 
  | 'CREATE_ENTITY'
  | 'DELETE_EDGE'
  | 'UPDATE_EDGE'
  | 'CREATE_EDGE';

export interface Operation {
  type: OperationType;
  entityId?: string;
  edgeId?: string;
  data?: any;
  timestamp?: Date;
}

export interface Impact {
  type: ImpactType;
  elementId: string;
  elementType: 'entity' | 'edge';
  severity: Severity;
  confidence: number;
  cause?: string;
  path?: string[];
  depth?: number;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    affectedAttributes?: string[];
    relatedElements?: string[];
  };
}

export interface ImpactStatistics {
  totalAffected: number;
  byType: Record<string, number>;
  bySeverity: Record<Severity, number>;
  maxDepth: number;
  percentageOfGraph: number;
  criticalPaths: string[][];
}

export interface ConfidenceScore {
  overall: number;
  factors: {
    complexity: number;
    spread: number;
    historical: number | null;
    density: number;
  };
  range: {
    min: number;
    max: number;
  };
}

export interface GraphVisualization {
  nodes: any[];
  edges: any[];
  layout?: string;
}

export interface ImpactReport {
  id: string;
  operation: Operation;
  direct: Impact[];
  indirect: Impact[];
  ripple: Impact[];
  statistics: ImpactStatistics;
  confidence: ConfidenceScore;
  visualizations?: {
    heatmap?: string;
    graph?: GraphVisualization;
  };
  timestamp: Date;
}

export class ImpactAssessmentEngine {
  private clone: GraphClone;
  private impacts: Map<string, Impact> = new Map();

  constructor(clone: GraphClone) {
    this.clone = clone;
  }

  async assessImpact(operation: Operation): Promise<ImpactReport> {
    this.impacts.clear();
    
    // Calculate direct impacts BEFORE modifying the clone
    const direct = this.calculateDirectImpacts(operation);
    
    // Apply operation to clone
    await this.applyToClone(operation);
    
    // Calculate indirect and ripple impacts
    const indirect = this.calculateIndirectImpacts(direct);
    const ripple = this.calculateRippleEffects(indirect);
    
    // Generate statistics
    const stats = this.generateStatistics(direct, indirect, ripple);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(operation, stats);
    
    return {
      id: crypto.randomUUID(),
      operation,
      direct,
      indirect,
      ripple,
      statistics: stats,
      confidence,
      timestamp: new Date()
    };
  }

  private async applyToClone(operation: Operation): Promise<void> {
    const clonedGraph = await this.clone.getClonedGraph();
    
    switch (operation.type) {
      case 'DELETE_ENTITY':
        if (operation.entityId) {
          // Remove entity from cloned graph
          const entityIndex = clonedGraph.entities.findIndex(e => e.id === operation.entityId);
          if (entityIndex !== -1) {
            clonedGraph.entities.splice(entityIndex, 1);
          }
          // Remove connected edges
          clonedGraph.edges = clonedGraph.edges.filter(
            e => e.source !== operation.entityId && e.target !== operation.entityId
          );
        }
        break;
        
      case 'UPDATE_ENTITY':
        if (operation.entityId && operation.data) {
          const entity = clonedGraph.entities.find(e => e.id === operation.entityId);
          if (entity) {
            Object.assign(entity, operation.data);
          }
        }
        break;
        
      case 'CREATE_ENTITY':
        if (operation.data) {
          clonedGraph.entities.push({
            id: crypto.randomUUID(),
            ...operation.data
          });
        }
        break;
        
      case 'DELETE_EDGE':
        if (operation.edgeId) {
          const edgeIndex = clonedGraph.edges.findIndex(e => e.id === operation.edgeId);
          if (edgeIndex !== -1) {
            clonedGraph.edges.splice(edgeIndex, 1);
          }
        }
        break;
        
      case 'UPDATE_EDGE':
        if (operation.edgeId && operation.data) {
          const edge = clonedGraph.edges.find(e => e.id === operation.edgeId);
          if (edge) {
            Object.assign(edge, operation.data);
          }
        }
        break;
        
      case 'CREATE_EDGE':
        if (operation.data) {
          clonedGraph.edges.push({
            id: crypto.randomUUID(),
            ...operation.data
          });
        }
        break;
    }
  }

  private calculateDirectImpacts(operation: Operation): Impact[] {
    const impacts: Impact[] = [];
    const clonedGraph = this.clone.getClonedGraph();
    
    switch (operation.type) {
      case 'DELETE_ENTITY':
        if (operation.entityId) {
          // Entity deletion impact
          impacts.push({
            type: 'ENTITY_DELETED',
            elementId: operation.entityId,
            elementType: 'entity',
            severity: 'HIGH',
            confidence: 1.0
          });
          
          // Find all edges connected to entity from current cloned graph
          // (this should capture the edges before they're deleted)
          const edges = clonedGraph.edges.filter(
            edge => edge.source === operation.entityId || edge.target === operation.entityId
          );
          
          edges.forEach(edge => {
            impacts.push({
              type: 'EDGE_CASCADE_DELETE',
              elementId: edge.id,
              elementType: 'edge',
              severity: 'HIGH',
              confidence: 1.0,
              cause: operation.entityId
            });
          });
        }
        break;
        
      case 'UPDATE_ENTITY':
        if (operation.entityId) {
          impacts.push({
            type: 'ENTITY_MODIFIED',
            elementId: operation.entityId,
            elementType: 'entity',
            severity: 'MEDIUM',
            confidence: 0.9,
            metadata: {
              affectedAttributes: Object.keys(operation.data || {})
            }
          });
          
          // Check if update affects edge validity
          const affectedEdges = this.findAffectedEdges(operation);
          affectedEdges.forEach(edge => {
            impacts.push({
              type: 'EDGE_VALIDITY_CHANGE',
              elementId: edge.id,
              elementType: 'edge',
              severity: 'MEDIUM',
              confidence: 0.8,
              cause: operation.entityId
            });
          });
        }
        break;
        
      case 'DELETE_EDGE':
        if (operation.edgeId) {
          impacts.push({
            type: 'EDGE_MODIFIED',
            elementId: operation.edgeId,
            elementType: 'edge',
            severity: 'MEDIUM',
            confidence: 1.0
          });
        }
        break;
    }
    
    return impacts;
  }

  private calculateIndirectImpacts(directImpacts: Impact[]): Impact[] {
    const indirectImpacts: Impact[] = [];
    const clonedGraph = this.clone.getClonedGraph();
    
    directImpacts.forEach(impact => {
      if (impact.elementType === 'entity' && impact.type === 'ENTITY_DELETED') {
        // For deleted entities, find entities that were connected to them
        // Look through cascade deleted edges to find connected entities
        const cascadeEdges = directImpacts.filter(
          i => i.type === 'EDGE_CASCADE_DELETE' && i.cause === impact.elementId
        );
        
        cascadeEdges.forEach(edgeImpact => {
          // Find the edge to determine connected entities
          // Since we calculated direct impacts before applying to clone, edges should still be there
          const edge = clonedGraph.edges.find(e => e.id === edgeImpact.elementId);
          if (edge) {
            const connectedEntityId = edge.source === impact.elementId 
              ? edge.target 
              : edge.source;
            
            // Don't create indirect impact for the entity being deleted
            if (connectedEntityId !== impact.elementId && !this.impacts.has(connectedEntityId)) {
              const indirectImpact: Impact = {
                type: 'RIPPLE_EFFECT',
                elementId: connectedEntityId,
                elementType: 'entity',
                severity: this.reduceSeverity(impact.severity),
                confidence: impact.confidence * 0.8,
                cause: impact.elementId,
                depth: 1
              };
              
              indirectImpacts.push(indirectImpact);
              this.impacts.set(connectedEntityId, indirectImpact);
            }
          }
        });
      } else if (impact.elementType === 'entity') {
        // For non-deleted entities, find entities connected through edges
        const connectedEdges = clonedGraph.edges.filter(
          edge => edge.source === impact.elementId || edge.target === impact.elementId
        );
        
        connectedEdges.forEach(edge => {
          const connectedEntityId = edge.source === impact.elementId ? edge.target : edge.source;
          
          if (!this.impacts.has(connectedEntityId)) {
            const indirectImpact: Impact = {
              type: 'RIPPLE_EFFECT',
              elementId: connectedEntityId,
              elementType: 'entity',
              severity: this.reduceSeverity(impact.severity),
              confidence: impact.confidence * 0.8,
              cause: impact.elementId,
              depth: 1
            };
            
            indirectImpacts.push(indirectImpact);
            this.impacts.set(connectedEntityId, indirectImpact);
          }
        });
      }
    });
    
    return indirectImpacts;
  }

  private calculateRippleEffects(indirectImpacts: Impact[]): Impact[] {
    const rippleCalculator = new RippleCalculator(this.clone);
    const startNodes = indirectImpacts.map(i => i.elementId);
    const ripples = rippleCalculator.calculateRipples(startNodes, 3);
    
    const rippleImpacts: Impact[] = [];
    ripples.forEach((impacts, depth) => {
      rippleImpacts.push(...impacts);
    });
    
    return rippleImpacts;
  }

  private findAffectedEdges(operation: Operation): any[] {
    const clonedGraph = this.clone.getClonedGraph();
    
    if (!operation.entityId) return [];
    
    return clonedGraph.edges.filter(
      edge => edge.source === operation.entityId || edge.target === operation.entityId
    );
  }

  private generateStatistics(
    direct: Impact[],
    indirect: Impact[],
    ripple: Impact[]
  ): ImpactStatistics {
    const allImpacts = [...direct, ...indirect, ...ripple];
    const clonedGraph = this.clone.getClonedGraph();
    const totalElements = clonedGraph.entities.length + clonedGraph.edges.length;
    
    const byType: Record<string, number> = {};
    const bySeverity: Record<Severity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    allImpacts.forEach(impact => {
      byType[impact.type] = (byType[impact.type] || 0) + 1;
      bySeverity[impact.severity]++;
    });
    
    const maxDepth = Math.max(...ripple.map(r => r.depth || 0), 0);
    
    return {
      totalAffected: allImpacts.length,
      byType,
      bySeverity,
      maxDepth,
      percentageOfGraph: (allImpacts.length / totalElements) * 100,
      criticalPaths: this.findCriticalPaths(allImpacts)
    };
  }

  private findCriticalPaths(impacts: Impact[]): string[][] {
    const paths: string[][] = [];
    const criticalImpacts = impacts.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL');
    
    criticalImpacts.forEach(impact => {
      if (impact.path && impact.path.length > 0) {
        paths.push(impact.path);
      } else if (impact.cause) {
        paths.push([impact.cause, impact.elementId]);
      }
    });
    
    return paths;
  }

  private calculateConfidence(operation: Operation, stats: ImpactStatistics): ConfidenceScore {
    const calculator = new ConfidenceCalculator(this.clone);
    return calculator.calculate(operation, stats);
  }

  private reduceSeverity(severity: Severity): Severity {
    switch (severity) {
      case 'CRITICAL': return 'HIGH';
      case 'HIGH': return 'MEDIUM';
      case 'MEDIUM': return 'LOW';
      default: return 'LOW';
    }
  }
}

interface RippleNode {
  id: string;
  depth: number;
  confidence: number;
}

class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class RippleCalculator {
  private visited: Set<string> = new Set();
  private queue: Queue<RippleNode> = new Queue();
  private clone: GraphClone;

  constructor(clone: GraphClone) {
    this.clone = clone;
  }

  calculateRipples(
    startNodes: string[],
    maxDepth: number = 3
  ): Map<number, Impact[]> {
    const ripples = new Map<number, Impact[]>();
    
    // Initialize with direct impacts (depth 0)
    startNodes.forEach(nodeId => {
      this.queue.enqueue({
        id: nodeId,
        depth: 0,
        confidence: 1.0
      });
    });
    
    while (!this.queue.isEmpty()) {
      const node = this.queue.dequeue();
      if (!node) break;
      
      if (node.depth >= maxDepth) continue;
      if (this.visited.has(node.id)) continue;
      
      this.visited.add(node.id);
      
      // Find connected elements
      const connections = this.getConnections(node.id);
      
      connections.forEach(conn => {
        const impact: Impact = {
          type: 'RIPPLE_EFFECT',
          elementId: conn.id,
          elementType: conn.type as 'entity' | 'edge',
          severity: this.calculateSeverity(node.depth + 1),
          confidence: node.confidence * 0.8,
          depth: node.depth + 1,
          cause: node.id
        };
        
        // Add to ripple map
        const depthImpacts = ripples.get(node.depth + 1) || [];
        depthImpacts.push(impact);
        ripples.set(node.depth + 1, depthImpacts);
        
        // Queue for next level
        if (node.depth + 1 < maxDepth) {
          this.queue.enqueue({
            id: conn.id,
            depth: node.depth + 1,
            confidence: impact.confidence
          });
        }
      });
    }
    
    return ripples;
  }

  private getConnections(nodeId: string): { id: string; type: string }[] {
    const connections: { id: string; type: string }[] = [];
    const clonedGraph = this.clone.getClonedGraph();
    
    // Find edges connected to this node
    clonedGraph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        connections.push({ id: edge.target, type: 'entity' });
      } else if (edge.target === nodeId) {
        connections.push({ id: edge.source, type: 'entity' });
      }
    });
    
    return connections;
  }

  private calculateSeverity(depth: number): Severity {
    if (depth === 1) return 'HIGH';
    if (depth === 2) return 'MEDIUM';
    return 'LOW';
  }
}

export class ConfidenceCalculator {
  private clone: GraphClone;

  constructor(clone: GraphClone) {
    this.clone = clone;
  }

  calculate(
    operation: Operation,
    stats: ImpactStatistics
  ): ConfidenceScore {
    let baseConfidence = 1.0;
    
    // Factor 1: Operation complexity
    const complexity = this.calculateComplexity(operation);
    baseConfidence *= (1.0 - complexity * 0.1);
    
    // Factor 2: Impact spread
    const spread = Math.min(stats.totalAffected / 100, 1.0);
    baseConfidence *= (1.0 - Math.min(spread, 0.5));
    
    // Factor 3: Graph density
    const density = this.calculateGraphDensity();
    baseConfidence *= (1.0 - density * 0.2);
    
    return {
      overall: baseConfidence,
      factors: {
        complexity: complexity,
        spread: spread,
        historical: null,
        density: density
      },
      range: {
        min: Math.max(0, baseConfidence - 0.15),
        max: Math.min(1, baseConfidence + 0.1)
      }
    };
  }

  private calculateComplexity(operation: Operation): number {
    switch (operation.type) {
      case 'DELETE_ENTITY': return 0.8;
      case 'UPDATE_ENTITY': return 0.5;
      case 'CREATE_ENTITY': return 0.3;
      case 'DELETE_EDGE': return 0.6;
      case 'UPDATE_EDGE': return 0.4;
      case 'CREATE_EDGE': return 0.2;
      default: return 0.5;
    }
  }

  private calculateGraphDensity(): number {
    const clonedGraph = this.clone.getClonedGraph();
    const nodeCount = clonedGraph.entities.length;
    const edgeCount = clonedGraph.edges.length;
    
    if (nodeCount === 0) return 0;
    
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    return Math.min(edgeCount / maxPossibleEdges, 1.0);
  }
}